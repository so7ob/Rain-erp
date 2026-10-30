package cn.iocoder.yudao.framework.web.config;

import cn.iocoder.yudao.framework.common.enums.WebFilterOrderEnum;
import cn.iocoder.yudao.framework.web.core.i18n.ModuleMessageSources;
import cn.iocoder.yudao.framework.web.core.i18n.RequestLocaleFilter;
import cn.iocoder.yudao.framework.web.core.i18n.RequestLocalePolicy;
import cn.iocoder.yudao.framework.web.core.i18n.RequestMessageInterpolator;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.context.MessageSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.io.IOException;
import java.util.Locale;

@AutoConfiguration(before = {MessageSourceAutoConfiguration.class, ValidationAutoConfiguration.class, WebMvcAutoConfiguration.class})
public class YudaoI18nAutoConfiguration {

    @Bean(name = "messageSource")
    @ConditionalOnMissingBean(name = "messageSource")
    public static ResourceBundleMessageSource moduleMessageSource(ResourcePatternResolver resources) throws IOException {
        return ModuleMessageSources.create(resources);
    }

    @Bean
    public FilterRegistrationBean<RequestLocaleFilter> requestLocaleFilter(MessageSource messages) {
        FilterRegistrationBean<RequestLocaleFilter> bean = new FilterRegistrationBean<>(new RequestLocaleFilter(messages));
        bean.setOrder(WebFilterOrderEnum.REQUEST_LOCALE_FILTER);
        bean.setDispatcherTypes(DispatcherType.REQUEST, DispatcherType.ASYNC, DispatcherType.ERROR);
        return bean;
    }

    @Bean(name = "localeResolver")
    @ConditionalOnMissingBean(LocaleResolver.class)
    public LocaleResolver localeResolver() {
        return new AcceptHeaderLocaleResolver() {
            @Override
            public Locale resolveLocale(HttpServletRequest request) {
                RequestLocalePolicy.Selection selection = RequestLocalePolicy.resolve(request.getHeader("Accept-Language"));
                return selection.provided() ? selection.locale() : request.getLocale();
            }
        };
    }

    @Bean
    @ConditionalOnMissingBean(jakarta.validation.Validator.class)
    public LocalValidatorFactoryBean localizedValidator(MessageSource messages) {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.setMessageInterpolator(new RequestMessageInterpolator(messages));
        return validator;
    }
}
