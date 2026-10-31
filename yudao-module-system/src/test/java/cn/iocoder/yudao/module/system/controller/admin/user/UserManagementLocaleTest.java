package cn.iocoder.yudao.module.system.controller.admin.user;

import cn.hutool.core.util.ReflectUtil;
import cn.iocoder.yudao.framework.common.biz.infra.logger.ApiErrorLogCommonApi;
import cn.iocoder.yudao.framework.common.biz.system.dict.DictDataCommonApi;
import cn.iocoder.yudao.framework.common.biz.system.dict.dto.DictDataRespDTO;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.web.core.handler.GlobalExceptionHandler;
import cn.iocoder.yudao.framework.web.core.i18n.ModuleMessageSources;
import cn.iocoder.yudao.framework.web.core.i18n.RequestLocaleFilter;
import cn.iocoder.yudao.framework.web.core.i18n.RequestMessageInterpolator;
import cn.iocoder.yudao.module.system.controller.admin.permission.PermissionController;
import cn.iocoder.yudao.module.system.service.permission.PermissionService;
import cn.iocoder.yudao.module.system.service.user.AdminUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exercise actual request DTOs, controller routes, locale negotiation and Bean Validation. */
class UserManagementLocaleTest {
    private MockMvc mvc;
    private AdminUserService users;
    private PermissionService permissions;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setup() throws Exception {
        var messages = ModuleMessageSources.create(new PathMatchingResourcePatternResolver());
        validator = new LocalValidatorFactoryBean();
        validator.setMessageInterpolator(new RequestMessageInterpolator(messages));
        validator.afterPropertiesSet();
        users = mock(AdminUserService.class);
        permissions = mock(PermissionService.class);
        var dictionaries = mock(DictDataCommonApi.class);
        when(dictionaries.getDictDataList("common_status")).thenReturn(List.of(
                dictionary("0"), dictionary("1")));
        DictFrameworkUtils.init(dictionaries);
        var userController = new UserController();
        ReflectUtil.setFieldValue(userController, "userService", users);
        var permissionController = new PermissionController();
        ReflectUtil.setFieldValue(permissionController, "permissionService", permissions);
        mvc = MockMvcBuilders.standaloneSetup(userController, permissionController)
                .setValidator(validator)
                .addFilters(new RequestLocaleFilter(messages))
                .setControllerAdvice(new GlobalExceptionHandler("user-management-fixture", mock(ApiErrorLogCommonApi.class)))
                .build();
    }

    @AfterEach
    void closeValidator() { validator.close(); }

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
                .andExpect(jsonPath("$.msg", containsString(invalidStatus)))
                .andExpect(jsonPath("$.msg", containsString(invalidDictionary)));
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
    private static DictDataRespDTO dictionary(String value) {
        var result = new DictDataRespDTO();
        result.setDictType("common_status");
        result.setValue(value);
        result.setLabel(value.equals("0") ? "开启" : "关闭");
        return result;
    }
}
