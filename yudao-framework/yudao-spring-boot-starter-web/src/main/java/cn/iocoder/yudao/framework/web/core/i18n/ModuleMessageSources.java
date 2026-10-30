package cn.iocoder.yudao.framework.web.core.i18n;

import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ModuleMessageSources {
    private static final Pattern MODULE = Pattern.compile("/i18n/([a-z][a-z0-9-]*)/messages\\.properties$");

    private ModuleMessageSources() {
    }

    public static ResourceBundleMessageSource create(ResourcePatternResolver resources) throws IOException {
        Set<String> basenames = new TreeSet<>();
        for (Resource resource : resources.getResources("classpath*:i18n/*/messages.properties")) {
            Matcher matcher = MODULE.matcher(resource.getURL().toExternalForm());
            if (!matcher.find()) {
                throw new IllegalStateException("Invalid module catalog location: " + resource.getDescription());
            }
            String basename = "i18n." + matcher.group(1) + ".messages";
            if (!basenames.add(basename)) {
                throw new IllegalStateException("Duplicate module catalog: " + basename);
            }
        }
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames(basenames.toArray(String[]::new));
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        source.setDefaultLocale(Locale.ENGLISH);
        // Bean Validation resolves named tokens itself; API messages format indexed arguments.
        source.setAlwaysUseMessageFormat(false);
        return source;
    }
}
