package cn.iocoder.yudao.module.system.controller.admin.user;

import cn.hutool.core.util.ReflectUtil;
import cn.iocoder.yudao.framework.common.biz.infra.logger.ApiErrorLogCommonApi;
import cn.iocoder.yudao.framework.common.biz.system.dict.DictDataCommonApi;
import cn.iocoder.yudao.framework.common.biz.system.dict.dto.DictDataRespDTO;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.web.core.handler.GlobalExceptionHandler;
import cn.iocoder.yudao.framework.web.core.i18n.ModuleMessageSources;
import cn.iocoder.yudao.framework.web.core.i18n.RequestLocaleFilter;
import cn.iocoder.yudao.module.system.controller.admin.user.vo.user.UserImportExcelVO;
import cn.iocoder.yudao.module.system.controller.admin.user.vo.user.UserImportRespVO;
import cn.iocoder.yudao.module.system.dal.dataobject.user.AdminUserDO;
import cn.iocoder.yudao.module.system.service.dept.DeptService;
import cn.iocoder.yudao.module.system.service.user.AdminUserService;
import org.apache.fesod.sheet.FesodSheet;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controller, locale filter and workbook codecs; the domain service is mocked, with no runtime database writes. */
class UserSpreadsheetLocaleTest {
    private AdminUserService users;
    private DictDataCommonApi dictionaries;
    private MockMvc mvc;
    private ResourceBundleMessageSource messages;

    @BeforeEach
    void setup() throws Exception {
        users = mock(AdminUserService.class);
        dictionaries = mock(DictDataCommonApi.class);
        when(dictionaries.getDictDataList("common_status")).thenReturn(List.of(
                dictionary("common_status", "0", "开启"), dictionary("common_status", "1", "关闭")));
        when(dictionaries.getDictDataList("system_user_sex")).thenReturn(List.of(
                dictionary("system_user_sex", "1", "男"), dictionary("system_user_sex", "2", "女")));
        DictFrameworkUtils.init(dictionaries);
        DictFrameworkUtils.clearCache();
        messages = ModuleMessageSources.create(new PathMatchingResourcePatternResolver());
        UserController controller = new UserController();
        ReflectUtil.setFieldValue(controller, "userService", users);
        DeptService departments = mock(DeptService.class);
        when(departments.getDeptMap(anyCollection())).thenReturn(new HashMap<>());
        ReflectUtil.setFieldValue(controller, "deptService", departments);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .addFilters(new RequestLocaleFilter(messages))
                .setControllerAdvice(new GlobalExceptionHandler("spreadsheet-fixture", mock(ApiErrorLogCommonApi.class)))
                .build();
        when(users.importUserList(anyList(), anyBoolean())).thenReturn(UserImportRespVO.builder()
                .createUsernames(List.of("yunai", "yuanma")).updateUsernames(List.of()).failureUsernames(Map.of()).build());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"ar", "en", "zh-CN", "ar-EG", "en-US", "zh-TW", "fr", "invalid header"})
    void localizedTemplatesRoundTripUnderEveryReadingLanguage(String language) throws Exception {
        var request = get("/system/user/get-import-template");
        if (language != null) request.header("Accept-Language", language);
        var response = mvc.perform(request).andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/vnd.ms-excel")).andReturn().getResponse();
        String tag = effective(language);
        Locale locale = Locale.forLanguageTag(tag);
        assertEquals(tag, response.getHeader("Content-Language"));
        assertTrue(response.getHeader("Vary").contains("Accept-Language"));
        assertTrue(URLDecoder.decode(response.getHeader("Content-Disposition"), StandardCharsets.UTF_8)
                .contains(messages.getMessage("system.user.import.filename", null, locale)));
        if (language == null) assertFalse(response.getHeader("Content-Disposition").contains("filename*="));
        else assertTrue(response.getHeader("Content-Disposition").contains("filename*=UTF-8''"));
        byte[] bytes = response.getContentAsByteArray();
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            var sheet = workbook.getSheet(messages.getMessage("system.user.import.sheet", null, locale));
            assertNotNull(sheet);
            assertEquals("ar".equals(tag), sheet.isRightToLeft());
            String[] fields = {"username", "nickname", "deptId", "email", "mobile", "sex", "status"};
            for (int column = 0; column < fields.length; column++) {
                assertEquals(messages.getMessage("system.user.import.headers." + fields[column], null, locale),
                        sheet.getRow(0).getCell(column).getStringCellValue());
            }
            assertEquals("yunai", sheet.getRow(1).getCell(0).getStringCellValue());
            assertEquals("芋道", sheet.getRow(1).getCell(1).getStringCellValue());
            assertEquals(CellType.STRING, sheet.getRow(1).getCell(2).getCellType());
            assertEquals("1", sheet.getRow(1).getCell(2).getStringCellValue());
            assertEquals("15601691300", sheet.getRow(1).getCell(4).getStringCellValue());
            assertEquals(messages.getMessage("system.user.excel.dictionary.male", null, locale),
                    sheet.getRow(1).getCell(5).getStringCellValue());
        }
        for (String readingLanguage : new String[]{null, "ar", "en", "zh-CN"}) {
            clearInvocations(users);
            var upload = multipart("/system/user/import").file(new MockMultipartFile("file", "template.xls", null, bytes))
                    .param("updateSupport", "true");
            if (readingLanguage != null) upload.header("Accept-Language", readingLanguage);
            mvc.perform(upload).andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.createUsernames[0]").value("yunai"));
            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<UserImportExcelVO>> rows = ArgumentCaptor.forClass(List.class);
            verify(users).importUserList(rows.capture(), eq(true));
            assertEquals(2, rows.getValue().size());
            UserImportExcelVO first = rows.getValue().get(0);
            assertEquals("yunai", first.getUsername());
            assertEquals("芋道", first.getNickname());
            assertEquals(1L, first.getDeptId());
            assertEquals(1, first.getSex());
            assertEquals(0, first.getStatus());
            assertEquals(2, rows.getValue().get(1).getSex());
            assertEquals(1, rows.getValue().get(1).getStatus());
        }
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"ar", "en", "zh-CN", "fr"})
    void exportedIdentityAndOriginalUserDataStayUnchanged(String language) throws Exception {
        var user = new AdminUserDO().setId(Long.MAX_VALUE).setUsername("raw000123").setNickname("عميل ACME 00123")
                .setEmail("person@example.test").setMobile("15601691300").setSex(1).setStatus(0)
                .setLoginIp("192.0.2.123").setLoginDate(LocalDateTime.of(2026, 10, 31, 14, 5, 6));
        when(users.getUserPage(any())).thenReturn(new PageResult<>(List.of(user), 1L));
        MockHttpServletRequestBuilder request = get("/system/user/export-excel");
        if (language != null) request.header("Accept-Language", language);
        var response = mvc.perform(request).andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/vnd.ms-excel")).andReturn().getResponse();
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(response.getContentAsByteArray()))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals("9223372036854775807", sheet.getRow(1).getCell(0).getStringCellValue());
            assertEquals(CellType.STRING, sheet.getRow(1).getCell(0).getCellType());
            assertEquals("raw000123", sheet.getRow(1).getCell(1).getStringCellValue());
            assertEquals("عميل ACME 00123", sheet.getRow(1).getCell(2).getStringCellValue());
            assertEquals("ar".equals(effective(language)), sheet.isRightToLeft());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"ar", "en", "zh-CN"})
    void duplicateAliasIsAStructuredLocalizedBadRequest(String language) throws Exception {
        byte[] bytes = workbook(List.of("Username", "اسم تسجيل الدخول"), List.of("yunai", "yuanma"));
        var response = mvc.perform(multipart("/system/user/import").file(new MockMultipartFile("file", bytes))
                        .header("Accept-Language", language)).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.messageKey").value("excel.import.duplicateHeader"))
                .andExpect(jsonPath("$.msg").value(messages.getMessage("excel.import.duplicateHeader",
                        new Object[]{"اسم تسجيل الدخول"}, Locale.forLanguageTag(language))))
                .andReturn().getResponse();
        assertEquals(language, response.getHeader("Content-Language"));
        verify(users, never()).importUserList(any(), anyBoolean());
    }

    @Test
    void localizedDictionaryAliasesRejectCollisionsWithCustomLabels() throws Exception {
        when(dictionaries.getDictDataList("common_status")).thenReturn(List.of(
                dictionary("common_status", "0", "开启"), dictionary("common_status", "1", "关闭"),
                dictionary("common_status", "2", "Enabled")));
        DictFrameworkUtils.clearCache();
        mvc.perform(multipart("/system/user/import").file(new MockMultipartFile("file",
                        workbook(List.of("Username", "Account status"), List.of("yunai", "Enabled"))))
                        .header("Accept-Language", "ar"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.messageKey").value("excel.import.ambiguousDictionary"));
        verify(users, never()).importUserList(any(), anyBoolean());
    }

    @Test
    void customDictionaryLabelsAreNeitherOverwrittenNorGuessed() throws Exception {
        when(dictionaries.getDictDataList("common_status")).thenReturn(List.of(
                dictionary("common_status", "0", "مخصص Custom 00123"), dictionary("common_status", "1", "关闭")));
        DictFrameworkUtils.clearCache();
        var response = mvc.perform(get("/system/user/get-import-template").header("Accept-Language", "ar"))
                .andReturn().getResponse();
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(response.getContentAsByteArray()))) {
            assertEquals("مخصص Custom 00123", workbook.getSheetAt(0).getRow(1).getCell(6).getStringCellValue());
        }
        mvc.perform(multipart("/system/user/import").file(new MockMultipartFile("file", response.getContentAsByteArray()))
                .header("Accept-Language", "en")).andExpect(jsonPath("$.code").value(0));
        mvc.perform(multipart("/system/user/import").file(new MockMultipartFile("file",
                        workbook(List.of("Username", "Account status"), List.of("yunai", "Enabled"))))
                        .header("Accept-Language", "en"))
                .andExpect(jsonPath("$.messageKey").value("excel.import.unknownDictionary"));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void numericDictionaryCellsFailAsStructuredValidationWithoutGuessingACode(int number) throws Exception {
        mvc.perform(multipart("/system/user/import").file(new MockMultipartFile("file",
                        workbook(List.of("Username", "Account status"), List.of("yunai", number))))
                        .header("Accept-Language", "ar"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.messageKey").value("excel.import.unknownDictionary"))
                .andExpect(jsonPath("$.msg").value(messages.getMessage("excel.import.unknownDictionary",
                        new Object[]{"حالة الحساب", String.valueOf(number)}, Locale.forLanguageTag("ar"))));
        verify(users, never()).importUserList(any(), anyBoolean());
    }

    private static DictDataRespDTO dictionary(String type, String value, String label) {
        return new DictDataRespDTO().setDictType(type).setValue(value).setLabel(label);
    }

    private static String effective(String language) {
        if (language != null && language.startsWith("ar")) return "ar";
        if (language != null && language.startsWith("en")) return "en";
        return "zh-CN";
    }

    private static byte[] workbook(List<String> headers, List<?> values) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        List<List<String>> head = new ArrayList<>();
        headers.forEach(value -> head.add(List.of(value)));
        FesodSheet.write(output).head(head).sheet("Fixture").doWrite(List.of(values));
        return output.toByteArray();
    }
}
