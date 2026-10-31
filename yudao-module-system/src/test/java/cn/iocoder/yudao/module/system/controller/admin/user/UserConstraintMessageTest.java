package cn.iocoder.yudao.module.system.controller.admin.user;

import cn.iocoder.yudao.framework.common.biz.system.dict.DictDataCommonApi;
import cn.iocoder.yudao.framework.common.biz.system.dict.dto.DictDataRespDTO;
import cn.iocoder.yudao.framework.common.enums.CommonStatusEnum;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import cn.iocoder.yudao.framework.common.validation.InEnum;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.dict.validation.InDict;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Optional message keys must not change validation or the original unregistered messages. */
class UserConstraintMessageTest {
    @Test
    void scalarAndCollectionArgumentsAreResolvedOnlyForOptedInConstraints() {
        var dictionaries = mock(DictDataCommonApi.class);
        when(dictionaries.getDictDataList("common_status")).thenReturn(List.of(dictionary("0"), dictionary("1")));
        DictFrameworkUtils.init(dictionaries);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var fixture = new Values();
            Map<String, String> legacy = messages(validator.validate(fixture));
            assertEquals("Enum [0, 1]", legacy.get("scalar"));
            assertEquals("Enum list 2,3", legacy.get("collection"));
            assertEquals("Dictionary [0, 1]", legacy.get("dictionary"));
            assertEquals("Dictionary list [0, 1]", legacy.get("dictionaryCollection"));
            try (var ignored = ErrorMessageContext.open((key, arguments, original) -> "مترجم " + key + " " + arguments[0])) {
                Map<String, String> localized = messages(validator.validate(fixture));
                assertEquals("مترجم fixture.scalar [0, 1]", localized.get("scalar"));
                assertEquals("مترجم fixture.collection 2,3", localized.get("collection"));
                assertEquals("مترجم fixture.dictionary [0, 1]", localized.get("dictionary"));
                assertEquals("مترجم fixture.dictionaryCollection [0, 1]", localized.get("dictionaryCollection"));
                assertEquals("Original [0, 1]", localized.get("unregistered"));
            }
            assertEquals(legacy, messages(validator.validate(fixture)));
            fixture.scalar = 0;
            fixture.collection = List.of(0, 1);
            fixture.dictionary = 1;
            fixture.dictionaryCollection = List.of(0, 1);
            fixture.unregistered = 0;
            assertTrue(validator.validate(fixture).isEmpty());
            fixture.scalar = null;
            fixture.collection = List.of();
            fixture.dictionary = null;
            fixture.dictionaryCollection = List.of();
            assertTrue(validator.validate(fixture).isEmpty());
        }
    }

    private static Map<String, String> messages(java.util.Set<jakarta.validation.ConstraintViolation<Values>> violations) {
        return violations.stream().collect(Collectors.toMap(item -> item.getPropertyPath().toString(), jakarta.validation.ConstraintViolation::getMessage));
    }

    private static DictDataRespDTO dictionary(String value) {
        var result = new DictDataRespDTO();
        result.setDictType("common_status");
        result.setValue(value);
        result.setLabel(value);
        return result;
    }

    static class Values {
        @InEnum(value = CommonStatusEnum.class, message = "Enum {value}", messageKey = "fixture.scalar")
        Integer scalar = 2;
        @InEnum(value = CommonStatusEnum.class, message = "Enum list {value}", messageKey = "fixture.collection")
        List<Integer> collection = List.of(2, 3);
        @InDict(type = "common_status", message = "Dictionary {value}", messageKey = "fixture.dictionary")
        Integer dictionary = 2;
        @InDict(type = "common_status", message = "Dictionary list {value}", messageKey = "fixture.dictionaryCollection")
        List<Integer> dictionaryCollection = List.of(2);
        @InEnum(value = CommonStatusEnum.class, message = "Original {value}")
        Integer unregistered = 2;
    }
}
