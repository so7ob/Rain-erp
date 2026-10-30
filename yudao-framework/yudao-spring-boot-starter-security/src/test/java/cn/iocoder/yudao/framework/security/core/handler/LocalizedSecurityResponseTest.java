package cn.iocoder.yudao.framework.security.core.handler;

import cn.iocoder.yudao.framework.common.enums.WebFilterOrderEnum;
import cn.iocoder.yudao.framework.web.config.YudaoI18nAutoConfiguration;
import cn.iocoder.yudao.framework.web.core.i18n.ModuleMessageSources;
import cn.iocoder.yudao.framework.web.core.i18n.RequestLocaleFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class LocalizedSecurityResponseTest {
    @Test
    void realSecurityHandlersWriteLocalizedJsonBeforeMvcAndKeepLegacyCodes() throws Exception {
        var messages = ModuleMessageSources.create(new PathMatchingResourcePatternResolver());
        var registration = new YudaoI18nAutoConfiguration().requestLocaleFilter(messages);
        assertTrue(registration.getOrder() < SecurityProperties.DEFAULT_FILTER_ORDER);
        assertTrue(registration.getOrder() < WebFilterOrderEnum.API_ENCRYPT_FILTER);
        RequestLocaleFilter filter = registration.getFilter();
        String[][] cases = {
                {"ar", "ar", "سجّل الدخول للمتابعة", "ليست لديك صلاحية لتنفيذ هذا الإجراء"},
                {"en", "en", "Sign in to continue", "You do not have permission for this action"},
                {"zh-CN", "zh-CN", "账号未登录", "没有该操作权限"},
                {"fr-FR", "zh-CN", "账号未登录", "没有该操作权限"},
                {null, "zh-CN", "账号未登录", "没有该操作权限"}
        };
        ObjectMapper mapper = new ObjectMapper();
        for (String[] fixture : cases) {
            for (boolean denied : new boolean[]{false, true}) {
                MockHttpServletRequest request = new MockHttpServletRequest();
                if (fixture[0] != null) request.addHeader("Accept-Language", fixture[0]);
                MockHttpServletResponse response = new MockHttpServletResponse();
                filter.doFilter(request, response, (incoming, outgoing) -> {
                    if (denied) {
                        new AccessDeniedHandlerImpl().handle((jakarta.servlet.http.HttpServletRequest) incoming,
                                (jakarta.servlet.http.HttpServletResponse) outgoing, new AccessDeniedException("fixture"));
                    } else {
                        new AuthenticationEntryPointImpl().commence((jakarta.servlet.http.HttpServletRequest) incoming,
                                (jakarta.servlet.http.HttpServletResponse) outgoing, new InsufficientAuthenticationException("fixture"));
                    }
                });
                var json = mapper.readTree(response.getContentAsString(StandardCharsets.UTF_8));
                assertEquals(200, response.getStatus());
                assertEquals(denied ? 403 : 401, json.get("code").intValue());
                assertEquals(denied ? fixture[3] : fixture[2], json.get("msg").textValue());
                assertEquals(denied ? "common.error.forbidden" : "common.error.unauthorized", json.get("messageKey").textValue());
                assertEquals(fixture[1], response.getHeader("Content-Language"));
            }
        }
    }
}
