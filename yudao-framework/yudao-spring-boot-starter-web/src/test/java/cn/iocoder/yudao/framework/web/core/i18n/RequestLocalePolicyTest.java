package cn.iocoder.yudao.framework.web.core.i18n;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class RequestLocalePolicyTest {
    @ParameterizedTest
    @CsvSource(value = {
            "ar|ar", "ar-SA|ar", "ar-DZ|ar", "en|en", "en-US|en", "EN-GB|en",
            "zh-CN|zh-CN", "zh-Hans|zh-CN", "zh-Hans-CN|zh-CN", "zh|zh-CN",
            "fr-FR,ar-SA;q=0.8,en;q=0.5|ar", "ar;q=0,en;q=0.5|en",
            "zh-TW,en;q=0.7|en", "fr-FR|zh-CN", "*|zh-CN", "ar;q=0,en;q=0|zh-CN",
            "ar;q=2|zh-CN", "invalid locale|zh-CN"
    }, delimiter = '|')
    void resolvesSupportedWeightedRegionalAndUnsupportedPreferences(String header, String expected) {
        RequestLocalePolicy.Selection selection = RequestLocalePolicy.resolve(header);
        assertTrue(selection.provided());
        assertEquals(expected, selection.languageTag());
    }

    @Test
    void absentOrEmptyLanguageRetainsLegacyBehavior() {
        for (String header : new String[]{null, "", " "}) {
            RequestLocalePolicy.Selection selection = RequestLocalePolicy.resolve(header);
            assertFalse(selection.provided());
            assertEquals("zh-CN", selection.languageTag());
        }
    }
}
