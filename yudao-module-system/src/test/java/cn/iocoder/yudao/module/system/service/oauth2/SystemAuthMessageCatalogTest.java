package cn.iocoder.yudao.module.system.service.oauth2;

import cn.iocoder.yudao.framework.common.exception.ErrorCode;
import cn.iocoder.yudao.framework.web.core.i18n.ModuleMessageSources;
import cn.iocoder.yudao.module.system.enums.ErrorCodeConstants;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

class SystemAuthMessageCatalogTest {
    @Test
    void allKeyedSystemErrorsResolveFromTheActualModuleClasspathInAllLanguages() throws Exception {
        var source = ModuleMessageSources.create(new PathMatchingResourcePatternResolver());
        int covered = 0;
        for (var field : ErrorCodeConstants.class.getFields()) {
            if (field.getType() != ErrorCode.class) continue;
            ErrorCode code = (ErrorCode) field.get(null);
            if (code.getMessageKey() == null) continue;
            covered++;
            for (Locale locale : new Locale[]{Locale.ENGLISH, Locale.forLanguageTag("ar"), Locale.SIMPLIFIED_CHINESE}) {
                assertFalse(source.getMessage(code.getMessageKey(), new Object[]{"fixture"}, locale).isBlank());
            }
        }
        assertTrue(covered >= 15);
        assertEquals("رمز تجديد الجلسة غير صالح", source.getMessage("system.oauth2.refreshToken.invalid", null, Locale.forLanguageTag("ar")));
    }
}
