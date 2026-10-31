package cn.iocoder.yudao.framework.dict.validation;

import cn.hutool.core.util.StrUtil;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;

public class InDictValidator implements ConstraintValidator<InDict, Object> {

    private String dictType;
    private String messageKey;

    @Override
    public void initialize(InDict annotation) {
        this.messageKey = annotation.messageKey();
        this.dictType = annotation.type();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        // 为空时，默认不校验，即认为通过
        if (value == null) {
            return true;
        }
        // 校验通过
        final List<String> values = DictFrameworkUtils.getDictDataValueList(dictType);
        boolean match = values.stream().anyMatch(v -> StrUtil.equalsIgnoreCase(v, value.toString()));
        if (match) {
            return true;
        }

        // 校验不通过，自定义提示语句
        context.disableDefaultConstraintViolation(); // 禁用默认的 message 的值
        String argument = values.toString();
        String original = context.getDefaultConstraintMessageTemplate().replace("{value}", argument);
        String message = messageKey.isEmpty() ? original
                : ErrorMessageContext.resolve(messageKey, new Object[]{argument}, original);
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        return false;
    }

}

