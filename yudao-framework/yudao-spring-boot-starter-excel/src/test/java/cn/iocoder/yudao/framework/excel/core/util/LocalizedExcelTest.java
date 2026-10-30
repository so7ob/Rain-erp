package cn.iocoder.yudao.framework.excel.core.util;

import cn.iocoder.yudao.framework.common.biz.system.dict.DictDataCommonApi;
import cn.iocoder.yudao.framework.common.biz.system.dict.dto.DictDataRespDTO;
import cn.iocoder.yudao.framework.common.exception.ServiceException;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.excel.core.annotations.DictFormat;
import cn.iocoder.yudao.framework.excel.core.annotations.ExcelColumnSelect;
import cn.iocoder.yudao.framework.excel.core.annotations.ExcelLocale;
import cn.iocoder.yudao.framework.excel.core.convert.DictConvert;
import cn.iocoder.yudao.framework.excel.core.i18n.ExcelLocaleCatalog;
import lombok.Data;
import lombok.experimental.Accessors;
import org.apache.fesod.sheet.FesodSheet;
import org.apache.fesod.sheet.annotation.ExcelProperty;
import org.apache.fesod.sheet.annotation.format.DateTimeFormat;
import org.apache.fesod.sheet.annotation.format.NumberFormat;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LocalizedExcelTest {
    private ResourceBundleMessageSource messages;

    @BeforeEach
    void setup() {
        messages = new ResourceBundleMessageSource();
        messages.setBasenames("i18n.excel-test.messages", "i18n.excel.messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
        DictDataCommonApi dictionaries = mock(DictDataCommonApi.class);
        when(dictionaries.getDictDataList("test_status")).thenReturn(List.of(
                new DictDataRespDTO().setDictType("test_status").setValue("0").setLabel("开启"),
                new DictDataRespDTO().setDictType("test_status").setValue("01").setLabel("تخصيص 01")));
        DictFrameworkUtils.init(dictionaries);
        DictFrameworkUtils.clearCache();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ar", "en", "zh-CN"})
    void realWorkbooksKeepDecimalCellsLargeIdentifiersGregorianDatesAndOriginalMixedText(String language) throws Exception {
        AmountRow original = new AmountRow().setId(Long.MAX_VALUE).setAmount(new BigDecimal("123456.7891"))
                .setAt(LocalDateTime.of(2026, 10, 31, 14, 5, 6)).setCode("01")
                .setText("عميل ACME 00123 person@example.test <raw>");
        byte[] bytes = write(language, AmountRow.class, List.of(original));
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals(language.equals("ar"), sheet.isRightToLeft());
            assertEquals(CellType.STRING, sheet.getRow(1).getCell(0).getCellType());
            assertEquals("9223372036854775807", sheet.getRow(1).getCell(0).getStringCellValue());
            assertEquals(CellType.NUMERIC, sheet.getRow(1).getCell(1).getCellType());
            assertEquals(123456.7891, sheet.getRow(1).getCell(1).getNumericCellValue());
            assertEquals("0.0000", sheet.getRow(1).getCell(1).getCellStyle().getDataFormatString());
            assertEquals("2026-10-31 14:05:06", sheet.getRow(1).getCell(2).getStringCellValue());
            assertEquals("تخصيص 01", sheet.getRow(1).getCell(3).getStringCellValue());
            assertEquals(original.getText(), sheet.getRow(1).getCell(4).getStringCellValue());
        }
        // Reading aliases does not depend on an active request locale.
        AmountRow read = ExcelUtils.read(new MockMultipartFile("file", bytes), AmountRow.class).get(0);
        assertEquals(original.getId(), read.getId());
        assertEquals(0, original.getAmount().compareTo(read.getAmount()));
        assertEquals(original.getAt(), read.getAt());
        assertEquals("01", read.getCode());
        assertEquals(original.getText(), read.getText());
    }

    @Test
    void dropdownSheetReferencesAndValidationMessagesUseArabicWithoutChangingValues() throws Exception {
        byte[] bytes = write("ar", OptionRow.class, List.of(new OptionRow().setCode("0")));
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals("مفعّل", sheet.getRow(1).getCell(0).getStringCellValue());
            assertNotNull(workbook.getSheet("القواميس"));
            assertTrue(workbook.getSheet("القواميس").isRightToLeft());
            assertEquals("مفعّل", workbook.getSheet("القواميس").getRow(0).getCell(0).getStringCellValue());
            assertEquals("التحقق من القيمة", sheet.getDataValidations().get(0).getErrorBoxTitle());
            assertEquals("اختر قيمة من القائمة", sheet.getDataValidations().get(0).getErrorBoxText());
            assertTrue(workbook.getName("dict0").getRefersToFormula().startsWith("'القواميس'!"));
        }
    }

    @Test
    void concurrentLocalesDoNotMutateSharedAnnotationsOrOtherWorkbooks() throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        try {
            Future<byte[]> arabic = executor.submit(() -> write("ar", AmountRow.class, List.of()));
            Future<byte[]> english = executor.submit(() -> write("en", AmountRow.class, List.of()));
            try (var ar = WorkbookFactory.create(new ByteArrayInputStream(arabic.get()));
                 var en = WorkbookFactory.create(new ByteArrayInputStream(english.get()))) {
                assertEquals("المعرّف", ar.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
                assertEquals("Identifier", en.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
                assertTrue(ar.getSheetAt(0).isRightToLeft());
                assertFalse(en.getSheetAt(0).isRightToLeft());
            }
            assertArrayEquals(new String[]{"编号"}, AmountRow.class.getDeclaredField("id").getAnnotation(ExcelProperty.class).value());
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void ambiguousRecognizedHeadersAreRejectedBeforeDomainDataIsBuilt() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        FesodSheet.write(output).head(List.of(List.of("Field"))).sheet().doWrite(List.of(List.of("raw")));
        ServiceException error = assertThrows(ServiceException.class,
                () -> ExcelUtils.read(new MockMultipartFile("file", output.toByteArray()), AmbiguousRow.class));
        assertEquals("excel.import.ambiguousHeader", error.getMessageKey());
    }

    @Test
    void missingArabicColumnTranslationFailsBeforeAWorkbookIsWritten() {
        assertThrows(IllegalStateException.class, () -> ExcelLocaleCatalog.of(MissingArabic.class));
    }

    private <T> byte[] write(String language, Class<T> type, List<T> data) throws Exception {
        Locale locale = Locale.forLanguageTag(language);
        var previous = LocaleContextHolder.getLocaleContext();
        LocaleContextHolder.setLocale(locale);
        try (var ignored = ErrorMessageContext.open((key, arguments, original) -> messages.getMessage(key, arguments, original, locale))) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            ExcelUtils.write(response, "原始.xls", "原始", type, data);
            assertNotNull(response.getHeader("Content-Disposition"));
            return response.getContentAsByteArray();
        } finally {
            LocaleContextHolder.setLocaleContext(previous);
        }
    }

    @Data
    @Accessors(chain = true)
    @ExcelLocale(module = "excel-test", value = "excelTest.amounts")
    public static class AmountRow {
        @ExcelProperty("编号") private Long id;
        @ExcelProperty("金额") @NumberFormat("0.0000") private BigDecimal amount;
        @ExcelProperty("日期") @DateTimeFormat("yyyy-MM-dd HH:mm:ss") private LocalDateTime at;
        @ExcelProperty(value = "状态", converter = DictConvert.class) @DictFormat("test_status") private String code;
        @ExcelProperty("原文") private String text;
    }

    @Data
    @Accessors(chain = true)
    @ExcelLocale(module = "excel-test", value = "excelTest.options")
    public static class OptionRow {
        @ExcelProperty(value = "状态", converter = DictConvert.class)
        @DictFormat("test_status") @ExcelColumnSelect(dictType = "test_status") private String code;
    }

    @Data
    @ExcelLocale(module = "excel-test", value = "excelTest.ambiguous")
    public static class AmbiguousRow {
        @ExcelProperty("编号") private String id;
        @ExcelProperty("名称") private String name;
    }

    @Data
    @ExcelLocale(module = "excel-test", value = "excelTest.missing")
    public static class MissingArabic {
        @ExcelProperty("编号") private String id;
    }
}
