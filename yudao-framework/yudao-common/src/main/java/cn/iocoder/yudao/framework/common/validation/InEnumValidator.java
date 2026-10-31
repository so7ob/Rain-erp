package cn.iocoder.yudao.framework.common.validation;

import cn.iocoder.yudao.framework.common.core.ArrayValuable;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class InEnumValidator implements ConstraintValidator<InEnum, Object> {

    private List<?> values;
    private String messageKey;

    @Override
    public void initialize(InEnum annotation) {
        this.messageKey = annotation.messageKey();
        ArrayValuable<?>[] values = annotation.value().getEnumConstants();
        if (values.length == 0) {
            this.values = Collections.emptyList();
        } else {
            this.values = Arrays.asList(values[0].array());
        }
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        // 为空时，默认不校验，即认为通过
        if (value == null) {
            return true;
        }
        // 校验通过
        if (values.contains(value)) {
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

