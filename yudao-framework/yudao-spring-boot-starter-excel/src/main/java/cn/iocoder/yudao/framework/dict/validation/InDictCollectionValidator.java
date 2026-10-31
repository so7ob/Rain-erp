package cn.iocoder.yudao.framework.dict.validation;

import cn.hutool.core.collection.CollUtil;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Collection;
import java.util.List;

public class InDictCollectionValidator implements ConstraintValidator<InDict, Collection<?>> {

    private String dictType;
    private String messageKey;

    @Override
    public void initialize(InDict annotation) {
        this.messageKey = annotation.messageKey();
        this.dictType = annotation.type();
    }

    @Override
    public boolean isValid(Collection<?> list, ConstraintValidatorContext context) {
        // 为空时，默认不校验，即认为通过
        if (CollUtil.isEmpty(list)) {
            return true;
        }
        // 校验全部通过
        List<String> dbValues = DictFrameworkUtils.getDictDataValueList(dictType);
        boolean match = list.stream().allMatch(v -> dbValues.stream()
                .anyMatch(dbValue -> dbValue.equalsIgnoreCase(v.toString())));
        if (match) {
            return true;
        }

        // 校验不通过，自定义提示语句
        context.disableDefaultConstraintViolation(); // 禁用默认的 message 的值
        String argument = dbValues.toString();
        String original = context.getDefaultConstraintMessageTemplate().replace("{value}", argument);
        String message = messageKey.isEmpty() ? original
                : ErrorMessageContext.resolve(messageKey, new Object[]{argument}, original);
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        return false;
    }

}

