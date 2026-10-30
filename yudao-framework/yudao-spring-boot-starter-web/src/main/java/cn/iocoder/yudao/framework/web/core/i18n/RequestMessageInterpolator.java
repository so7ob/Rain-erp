package cn.iocoder.yudao.framework.web.core.i18n;

import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import jakarta.validation.MessageInterpolator;
import org.hibernate.validator.messageinterpolation.ResourceBundleMessageInterpolator;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.validation.beanvalidation.MessageSourceResourceBundleLocator;

import java.util.Locale;

/** Choose the effective locale before Hibernate caches interpolation by template and locale. */
public final class RequestMessageInterpolator implements MessageInterpolator {
    private final MessageSource messages;
    private final MessageInterpolator delegate;

    public RequestMessageInterpolator(MessageSource messages) {
        this.messages = messages;
        this.delegate = new ResourceBundleMessageInterpolator(new MessageSourceResourceBundleLocator(messages));
    }

    @Override
    public String interpolate(String template, Context context) {
        return interpolate(template, context, LocaleContextHolder.getLocale());
    }

    @Override
    public String interpolate(String template, Context context, Locale requested) {
        Locale effective = requested;
        if (!ErrorMessageContext.isLocalizedRequest() && template.startsWith("{") && template.endsWith("}")) {
            String key = template.substring(1, template.length() - 1);
            if (messages.getMessage(key, null, null, RequestLocalePolicy.LEGACY_LOCALE) != null) {
                effective = RequestLocalePolicy.LEGACY_LOCALE;
            }
        }
        return delegate.interpolate(template, context, effective);
    }
}
