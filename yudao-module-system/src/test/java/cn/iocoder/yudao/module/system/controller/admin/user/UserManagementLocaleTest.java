package cn.iocoder.yudao.module.system.controller.admin.user;

import cn.hutool.core.util.ReflectUtil;
import cn.iocoder.yudao.framework.common.biz.infra.logger.ApiErrorLogCommonApi;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.web.core.handler.GlobalExceptionHandler;
import cn.iocoder.yudao.framework.web.core.i18n.ModuleMessageSources;
import cn.iocoder.yudao.framework.web.core.i18n.RequestLocaleFilter;
import cn.iocoder.yudao.framework.web.core.i18n.RequestMessageInterpolator;
import cn.iocoder.yudao.module.system.controller.admin.permission.PermissionController;
import cn.iocoder.yudao.module.system.service.permission.PermissionService;
import cn.iocoder.yudao.module.system.service.user.AdminUserService;
import cn.iocoder.yudao.module.system.controller.admin.user.vo.user.UserUpdateStatusReqVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.anyOf;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exercise actual request DTOs, controller routes, locale negotiation and Bean Validation. */
class UserManagementLocaleTest {
    private MockMvc mvc;
    private AdminUserService users;
    private PermissionService permissions;
    private LocalValidatorFactoryBean validator;
    private RequestLocaleFilter localeFilter;
    private MockedStatic<DictFrameworkUtils> dictionaries;

    @BeforeEach
    void setup() throws Exception {
        var messages = ModuleMessageSources.create(new PathMatchingResourcePatternResolver());
        localeFilter = new RequestLocaleFilter(messages);
        validator = new LocalValidatorFactoryBean();
        validator.setMessageInterpolator(new RequestMessageInterpolator(messages));
        validator.afterPropertiesSet();
        users = mock(AdminUserService.class);
        permissions = mock(PermissionService.class);
        dictionaries = mockStatic(DictFrameworkUtils.class);
        dictionaries.when(() -> DictFrameworkUtils.getDictDataValueList("common_status"))
                .thenReturn(List.of("0", "1"));
        var userController = new UserController();
        ReflectUtil.setFieldValue(userController, "userService", users);
        var permissionController = new PermissionController();
        ReflectUtil.setFieldValue(permissionController, "permissionService", permissions);
        mvc = MockMvcBuilders.standaloneSetup(userController, permissionController)
                .setValidator(validator)
                .addFilters(localeFilter)
                .setControllerAdvice(new GlobalExceptionHandler("user-management-fixture", mock(ApiErrorLogCommonApi.class)))
                .build();
    }

    @AfterEach
    void closeValidator() {
        validator.close();
        dictionaries.close();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"ar", "en", "zh-CN", "fr"})
    void statusErrorsUseTheRequestLanguageWithoutChangingAllowedValues(String language) throws Exception {
        String expected = isArabic(language) ? "معرّف المستخدم مطلوب"
                : isEnglish(language) ? "User ID is required" : "角色编号不能为空";
        mvc.perform(localized(put("/system/user/update-status"), language, "{\"status\":0}"))
                .andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.msg", containsString(expected)));
        String invalidStatus = isArabic(language) ? "يجب أن تكون الحالة إحدى القيم [0, 1]"
                : isEnglish(language) ? "Status must be one of [0, 1]" : "修改状态必须是 [0, 1]";
        String invalidDictionary = isArabic(language) ? "يجب أن تكون حالة الحساب ضمن [0, 1]"
                : isEnglish(language) ? "Account status must be within [0, 1]" : "必须在指定范围 [0, 1]";
        mvc.perform(localized(put("/system/user/update-status"), language, "{\"id\":1,\"status\":2}"))
                .andExpect(jsonPath("$.code").value(400))
                // The existing API contract exposes the first field error, whose constraint order is unspecified.
                .andExpect(jsonPath("$.msg", anyOf(containsString(invalidStatus), containsString(invalidDictionary))));
        var request = new MockHttpServletRequest();
        if (language != null) request.addHeader("Accept-Language", language);
        var invalid = new UserUpdateStatusReqVO();
        invalid.setId(1L);
        invalid.setStatus(2);
        var allViolations = new AtomicReference<Set<String>>();
        localeFilter.doFilter(request, new MockHttpServletResponse(), (ignoredRequest, ignoredResponse) ->
                allViolations.set(validator.validate(invalid).stream().map(jakarta.validation.ConstraintViolation::getMessage).collect(Collectors.toSet())));
        assertEquals(Set.of(invalidStatus, invalidDictionary), allViolations.get());
        mvc.perform(localized(put("/system/user/update-status"), language, "{\"id\":1,\"status\":1}"))
                .andExpect(jsonPath("$.code").value(0)).andExpect(jsonPath("$.data").value(true));
        verify(users).updateUserStatus(1L, 1);
        verifyNoMoreInteractions(users);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"ar", "en", "zh-CN", "fr"})
    void passwordAndRoleValidationKeepBoundsAndAllowRemovingEveryRole(String language) throws Exception {
        String idRequired = isArabic(language) ? "معرّف المستخدم مطلوب"
                : isEnglish(language) ? "User ID is required" : "用户编号不能为空";
        mvc.perform(localized(put("/system/user/update-password"), language, "{\"password\":\"fixture1234\"}"))
                .andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.msg", containsString(idRequired)));
        String length = isArabic(language) ? "يجب أن تتكون كلمة المرور من 4 إلى 16 محرفًا"
                : isEnglish(language) ? "Password must contain 4–16 characters" : "密码长度为 4-16 位";
        mvc.perform(localized(put("/system/user/update-password"), language, "{\"id\":1,\"password\":\"123\"}"))
                .andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.msg", containsString(length)));
        mvc.perform(localized(post("/system/permission/assign-user-role"), language, "{\"roleIds\":[]}"))
                .andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.msg", containsString(idRequired)));
        mvc.perform(localized(post("/system/permission/assign-user-role"), language, "{\"userId\":1,\"roleIds\":[]}"))
                .andExpect(jsonPath("$.code").value(0)).andExpect(jsonPath("$.data").value(true));
        verify(permissions).assignUserRole(1L, java.util.Set.of());
        verifyNoInteractions(users);
    }

    private MockHttpServletRequestBuilder localized(MockHttpServletRequestBuilder request, String language, String body) {
        if (language != null) request.header("Accept-Language", language);
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static boolean isArabic(String language) { return "ar".equals(language); }
    private static boolean isEnglish(String language) { return "en".equals(language); }
}
