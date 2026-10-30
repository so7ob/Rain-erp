package cn.iocoder.yudao.framework.web.core.i18n;

import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContext;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class RequestLocaleFilter extends OncePerRequestFilter {
    private static final Pattern ARGUMENT = Pattern.compile("\\{(\\d+)(?:[,}])");
    private static final Pattern VALIDATION_ARGUMENT = Pattern.compile("\\{[A-Za-z][A-Za-z0-9_.]*\\}");
    private final MessageSource messages;

    public RequestLocaleFilter(MessageSource messages) {
        this.messages = messages;
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        RequestLocalePolicy.Selection selection = RequestLocalePolicy.resolve(request.getHeader(HttpHeaders.ACCEPT_LANGUAGE));
        LocaleContext previous = LocaleContextHolder.getLocaleContext();
        response.setHeader(HttpHeaders.CONTENT_LANGUAGE, selection.languageTag());
        response.addHeader(HttpHeaders.VARY, HttpHeaders.ACCEPT_LANGUAGE);
        ErrorMessageContext.Resolver resolver = selection.provided() ? (key, arguments, original) ->
                translate(key, arguments, original, selection.locale()) : null;
        try (ErrorMessageContext.Scope ignored = ErrorMessageContext.open(resolver)) {
            if (selection.provided()) {
                LocaleContextHolder.setLocale(selection.locale());
            }
            HttpServletRequest localized = selection.provided() ? new HttpServletRequestWrapper(request) {
                @Override
                public Locale getLocale() {
                    return selection.locale();
                }

                @Override
                public Enumeration<Locale> getLocales() {
                    return Collections.enumeration(List.of(selection.locale()));
                }
            } : request;
            chain.doFilter(localized, response);
        } finally {
            if (selection.provided()) {
                LocaleContextHolder.setLocaleContext(previous);
            }
        }
    }

    private String translate(String key, Object[] arguments, String original, Locale locale) {
        String pattern = messages.getMessage(key, null, null, locale);
        if (pattern == null || VALIDATION_ARGUMENT.matcher(pattern).find()) {
            return original;
        }
        Matcher required = ARGUMENT.matcher(pattern);
        while (required.find()) {
            if (Integer.parseInt(required.group(1)) >= arguments.length) {
                // Serialized remote errors carry their rendered text, not internal argument data.
                return original;
            }
        }
        return messages.getMessage(key, Arrays.stream(arguments).map(String::valueOf).toArray(), null, locale);
    }
}
