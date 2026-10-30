package cn.iocoder.yudao.framework.web.core.i18n;

import cn.iocoder.yudao.framework.common.exception.ErrorCode;
import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.util.servlet.ServletUtils;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.RequestContextFilter;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

import static cn.iocoder.yudao.framework.common.exception.enums.GlobalErrorCodeConstants.UNAUTHORIZED;
import static org.junit.jupiter.api.Assertions.*;

class RequestLocaleFilterTest {
    @Test
    void translatesSecurityJsonBeforeMvcAndRestoresBothContexts() throws Exception {
        RequestLocaleFilter filter = new RequestLocaleFilter(ModuleMessageSources.create(new PathMatchingResourcePatternResolver()));
        CommonResult<Void> result = CommonResult.error(UNAUTHORIZED);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept-Language", "ar-SA");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.addHeader("Vary", "Origin");
        Locale previous = LocaleContextHolder.getLocale();
        try {
            LocaleContextHolder.setLocale(Locale.FRENCH);
            filter.doFilter(request, response, (localized, outgoing) -> {
                assertEquals("ar", ((HttpServletRequest) localized).getLocale().getLanguage());
                new RequestContextFilter().doFilter(localized, outgoing, (inside, resultResponse) -> {
                    assertEquals("ar", LocaleContextHolder.getLocale().getLanguage());
                    ServletUtils.writeJSON((MockHttpServletResponse) resultResponse, result);
                });
            });
            assertEquals(Locale.FRENCH, LocaleContextHolder.getLocale());
        } finally {
            LocaleContextHolder.setLocale(previous);
        }
        assertEquals("ar", response.getHeader("Content-Language"));
        assertTrue(response.getHeaders("Vary").contains("Origin"));
        assertTrue(response.getHeaders("Vary").contains("Accept-Language"));
        assertTrue(response.getContentAsString(StandardCharsets.UTF_8).contains("سجّل الدخول للمتابعة"));
        assertEquals("账号未登录", result.getMsg());
    }

    @Test
    void absentLanguageLeavesTheExistingMessageAndRequestLocaleIntact() throws Exception {
        RequestLocaleFilter filter = new RequestLocaleFilter(ModuleMessageSources.create(new PathMatchingResourcePatternResolver()));
        CommonResult<Void> result = CommonResult.error(new ErrorCode(401, "legacy-original", "common.error.unauthorized"));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addPreferredLocale(Locale.FRENCH);
        request.removeHeader("Accept-Language");
        assertNull(request.getHeader("Accept-Language"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (localized, outgoing) -> {
            assertEquals(Locale.FRENCH, ((HttpServletRequest) localized).getLocale());
            assertEquals("legacy-original", result.getMsg());
        });
        assertEquals("zh-CN", response.getHeader("Content-Language"));
    }

    @Test
    void formattingRetainsLatinDigitsPrecisionIdentifiersAndUnknownLegacyText() throws Exception {
        StaticMessageSource messages = new StaticMessageSource();
        messages.addMessage("erp.amount.invalid", Locale.forLanguageTag("ar"), "المبلغ {0} / {1}");
        RequestLocaleFilter filter = new RequestLocaleFilter(messages);
        CommonResult<Void> result = CommonResult.error(new ErrorCode(400, "原始 {} / {}", "erp.amount.invalid"),
                new BigDecimal("1234.560"), "00123-عميل");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept-Language", "ar");
        filter.doFilter(request, new MockHttpServletResponse(), (localized, outgoing) -> {
            assertEquals("المبلغ 1234.560 / 00123-عميل", result.getMsg());
            assertEquals("legacy", CommonResult.error(new ErrorCode(400, "legacy", "erp.pending.translation")).getMsg());
        });
    }

    @Test
    void exceptionsAndAsyncDispatchDoNotLeakRequestLanguage() throws Exception {
        RequestLocaleFilter filter = new RequestLocaleFilter(ModuleMessageSources.create(new PathMatchingResourcePatternResolver()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setDispatcherType(DispatcherType.ASYNC);
        request.addHeader("Accept-Language", "en-GB");
        Locale previous = LocaleContextHolder.getLocale();
        assertThrows(ServletException.class, () -> filter.doFilter(request, new MockHttpServletResponse(), (localized, outgoing) -> {
            assertEquals("Sign in to continue", CommonResult.error(UNAUTHORIZED).getMsg());
            throw new ServletException("fixture");
        }));
        assertEquals(previous, LocaleContextHolder.getLocale());
        assertEquals("账号未登录", CommonResult.error(UNAUTHORIZED).getMsg());
    }

    @Test
    void alreadySerializedErrorsNeverExposeUnboundInterpolationTokens() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        CommonResult<?> result = mapper.readValue("{\"messageKey\":\"common.request.parameterMissing\",\"msg\":\"Missing request parameter: fixture\",\"code\":400}", CommonResult.class);
        RequestLocaleFilter filter = new RequestLocaleFilter(ModuleMessageSources.create(new PathMatchingResourcePatternResolver()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept-Language", "ar");
        filter.doFilter(request, new MockHttpServletResponse(), (localized, outgoing) -> {
            assertEquals("Missing request parameter: fixture", result.getMsg());
            assertFalse(result.getMsg().contains("{0}"));
        });
    }
}
