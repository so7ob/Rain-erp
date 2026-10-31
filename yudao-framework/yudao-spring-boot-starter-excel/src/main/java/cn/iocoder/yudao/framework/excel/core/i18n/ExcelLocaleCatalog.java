package cn.iocoder.yudao.framework.excel.core.i18n;

import cn.iocoder.yudao.framework.common.biz.system.dict.dto.DictDataRespDTO;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import cn.iocoder.yudao.framework.excel.core.annotations.ExcelLocale;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.fesod.sheet.annotation.ExcelProperty;
import org.apache.fesod.sheet.annotation.ExcelIgnore;
import org.apache.fesod.sheet.annotation.ExcelIgnoreUnannotated;
import org.springframework.context.i18n.LocaleContextHolder;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;

/** Immutable source catalogs only. Tenant dictionary records and translated display values are never cached here. */
public final class ExcelLocaleCatalog {
    private static final ClassValue<Optional<ExcelLocaleCatalog>> CATALOGS = new ClassValue<>() {
        @Override
        protected Optional<ExcelLocaleCatalog> computeValue(Class<?> type) {
            ExcelLocale annotation = type.getAnnotation(ExcelLocale.class);
            return annotation == null ? Optional.empty() : Optional.of(new ExcelLocaleCatalog(type, annotation));
        }
    };

    private final String prefix;
    private final Map<String, Properties> messages;
    private final List<DictionaryDefault> dictionaries;

    public static ExcelLocaleCatalog of(Class<?> type) {
        return CATALOGS.get(type).orElse(null);
    }

    private ExcelLocaleCatalog(Class<?> type, ExcelLocale annotation) {
        if (!annotation.module().matches("[a-z][a-z0-9-]*")
                || !annotation.value().matches("[a-zA-Z][a-zA-Z0-9.]*")) {
            throw new IllegalArgumentException("Invalid spreadsheet catalog identity: " + type.getName());
        }
        prefix = annotation.value();
        String root = "i18n/" + annotation.module() + "/";
        Map<String, Properties> catalogs = new LinkedHashMap<>();
        Map<String, String> files = Map.of("en", "messages.properties", "ar", "messages_ar.properties",
                "zh", "messages_zh_CN.properties");
        try {
            for (String language : List.of("en", "ar", "zh")) {
                Properties properties = new Properties();
                try (InputStream input = requiredResource(type, root + files.get(language))) {
                    properties.load(new InputStreamReader(input, StandardCharsets.UTF_8));
                }
                catalogs.put(language, properties);
            }
            try (InputStream input = requiredResource(type, root + "excel-defaults.json")) {
                dictionaries = List.copyOf(Arrays.asList(new ObjectMapper().readValue(input, DictionaryDefault[].class)));
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot load spreadsheet catalog for " + type.getName(), exception);
        }
        messages = Map.copyOf(catalogs);
        Set<String> identities = new LinkedHashSet<>();
        for (DictionaryDefault item : dictionaries) {
            if (item.type() == null || item.value() == null || item.label() == null || item.key() == null
                    || !identities.add(item.type() + "\0" + item.value() + "\0" + item.label())) {
                throw new IllegalStateException("Invalid or duplicate spreadsheet dictionary default: " + type.getName());
            }
            translations(item.key());
        }
        // Fail before opening an export stream if any registered column lacks a supported language.
        for (Class<?> owner = type; owner != null && owner != Object.class; owner = owner.getSuperclass()) {
            for (Field field : owner.getDeclaredFields()) {
                if (field.isSynthetic() || Modifier.isTransient(field.getModifiers())
                        || (Modifier.isStatic(field.getModifiers()) && Modifier.isFinal(field.getModifiers()))
                        || field.isAnnotationPresent(ExcelIgnore.class)
                        || (type.isAnnotationPresent(ExcelIgnoreUnannotated.class)
                        && !field.isAnnotationPresent(ExcelProperty.class))) {
                    continue;
                }
                ExcelProperty property = field.getAnnotation(ExcelProperty.class);
                int levels = property == null ? 1 : Math.max(1, property.value().length);
                for (int level = 0; level < levels; level++) {
                    translations(headerKey(field, levels, level));
                }
            }
        }
    }

    private static InputStream requiredResource(Class<?> owner, String path) throws IOException {
        InputStream input = owner.getClassLoader().getResourceAsStream(path);
        if (input == null) {
            throw new IOException("Missing spreadsheet catalog resource: " + path);
        }
        return input;
    }

    /** Validates every supported catalog, without falling back across languages. */
    public List<String> translations(String key) {
        List<String> values = new ArrayList<>();
        for (String language : List.of("en", "ar", "zh")) {
            String value = messages.get(language).getProperty(key);
            if (value == null || value.isBlank()) {
                throw new IllegalStateException("Missing " + language + " spreadsheet message: " + key);
            }
            values.add(value);
        }
        return List.copyOf(values);
    }

    public String message(String suffix, String original) {
        String key = prefix + "." + suffix;
        translations(key);
        // Only the registered source caption is a default; callers may provide a custom caption.
        return java.util.Objects.equals(original, messages.get("zh").getProperty(key))
                ? resolve(key, original) : original;
    }

    private String resolve(String key, String original) {
        translations(key);
        return ErrorMessageContext.resolve(key, new Object[0], original);
    }

    private String headerKey(Field field, int levels, int level) {
        return prefix + ".headers." + field.getName() + (levels > 1 ? "." + level : "");
    }

    public List<String> headers(Field field, List<String> original) {
        List<String> result = new ArrayList<>();
        for (int index = 0; index < original.size(); index++) {
            result.add(resolve(headerKey(field, original.size(), index), original.get(index)));
        }
        return result;
    }

    public Set<String> headerAliases(Field field, List<String> original) {
        Set<String> aliases = new LinkedHashSet<>(translations(headerKey(field, original.size(), original.size() - 1)));
        aliases.add(original.get(original.size() - 1));
        return Set.copyOf(aliases);
    }

    public String fieldLabel(Field field) {
        ExcelProperty property = field.getAnnotation(ExcelProperty.class);
        List<String> original = property == null ? List.of(field.getName()) : Arrays.asList(property.value());
        return headers(field, original).get(original.size() - 1);
    }

    private DictionaryDefault dictionary(String type, String value, String originalLabel) {
        return dictionaries.stream().filter(item -> item.type().equals(type) && item.value().equals(value)
                && item.label().equals(originalLabel)).findFirst().orElse(null);
    }

    public String dictionaryLabel(String type, String value, String originalLabel) {
        DictionaryDefault item = dictionary(type, value, originalLabel);
        return item == null ? originalLabel : resolve(item.key(), originalLabel);
    }

    public Set<String> dictionaryAliases(String type, DictDataRespDTO data) {
        Set<String> aliases = new LinkedHashSet<>();
        aliases.add(data.getLabel());
        DictionaryDefault item = dictionary(type, data.getValue(), data.getLabel());
        if (item != null) {
            aliases.addAll(translations(item.key()));
        }
        return Set.copyOf(aliases);
    }

    public static boolean isArabicRequest() {
        return ErrorMessageContext.isLocalizedRequest() && "ar".equals(LocaleContextHolder.getLocale().getLanguage());
    }

    private record DictionaryDefault(String type, String value, String label, String key) {
    }
}
