package cn.iocoder.yudao.framework.web.core.i18n;

import cn.iocoder.yudao.framework.common.exception.ErrorCode;
import cn.iocoder.yudao.framework.common.exception.enums.GlobalErrorCodeConstants;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.MessageFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class ModuleMessageCatalogTest {
    private static final Pattern INDEX = Pattern.compile("\\{(\\d+)\\}");

    @Test
    void allSourceCatalogsIncludingInactiveModulesHaveCompleteArabicAndMatchingArguments() throws Exception {
        Path repository = Path.of("").toAbsolutePath();
        while (repository != null && !Files.isDirectory(repository.resolve("frontend"))) {
            repository = repository.getParent();
        }
        assertNotNull(repository, "Repository root not found");
        Set<Path> directories = new TreeSet<>();
        try (var projects = Files.list(repository)) {
            for (Path project : projects.filter(path -> Files.isDirectory(path) && path.getFileName().toString().startsWith("yudao-")).toList()) {
                try (var files = Files.walk(project)) {
                    files.filter(Files::isRegularFile)
                            .filter(path -> path.toString().replace('\\', '/').contains("/src/main/resources/i18n/"))
                            .filter(path -> path.getFileName().toString().endsWith(".properties"))
                            .map(Path::getParent).forEach(directories::add);
                }
            }
        }
        assertFalse(directories.isEmpty());
        Set<String> globalKeys = new HashSet<>();
        for (Path directory : directories) {
            Map<String, String> english = read(directory.resolve("messages.properties"));
            Map<String, String> arabic = read(directory.resolve("messages_ar.properties"));
            Map<String, String> chinese = read(directory.resolve("messages_zh_CN.properties"));
            assertEquals(english.keySet(), arabic.keySet(), directory.toString());
            assertEquals(english.keySet(), chinese.keySet(), directory.toString());
            for (String key : english.keySet()) {
                assertTrue(key.matches("[a-z][A-Za-z0-9]*(\\.[a-z][A-Za-z0-9]*)+"), key);
                assertTrue(globalKeys.add(key), "Duplicate cross-module key: " + key);
                assertEquals(parameters(english.get(key)), parameters(arabic.get(key)), key);
                assertEquals(parameters(english.get(key)), parameters(chinese.get(key)), key);
                for (Map<String, String> language : List.of(english, arabic, chinese)) {
                    assertFalse(language.get(key).isBlank(), key);
                    validateIndexedFormat(key, language.get(key));
                }
                assertFalse(Pattern.compile("\\p{IsHan}").matcher(arabic.get(key)).find(), key);
            }
        }
    }

    @Test
    void everyCoveredErrorMeaningHasAllThreeTranslationsAndEnglishFallback() throws Exception {
        var source = ModuleMessageSources.create(new PathMatchingResourcePatternResolver());
        for (Class<?> constants : List.of(GlobalErrorCodeConstants.class, WebErrorCodeConstants.class)) {
            for (var field : constants.getFields()) {
                if (field.getType() != ErrorCode.class) {
                    continue;
                }
                ErrorCode code = (ErrorCode) field.get(null);
                assertNotNull(code.getMessageKey(), field.getName());
                Matcher parameter = INDEX.matcher(source.getMessage(code.getMessageKey(), null, Locale.ENGLISH));
                int count = 0;
                while (parameter.find()) count = Math.max(count, Integer.parseInt(parameter.group(1)) + 1);
                Object[] arguments = new Object[count];
                Arrays.fill(arguments, "fixture");
                for (Locale locale : List.of(Locale.ENGLISH, Locale.forLanguageTag("ar"), Locale.SIMPLIFIED_CHINESE)) {
                    String rendered = source.getMessage(code.getMessageKey(), arguments, locale);
                    assertFalse(rendered.isBlank());
                    assertFalse(INDEX.matcher(rendered).find());
                }
                assertEquals(source.getMessage(code.getMessageKey(), arguments, Locale.ENGLISH),
                        source.getMessage(code.getMessageKey(), arguments, Locale.FRENCH));
            }
        }
    }

    private static Map<String, String> read(Path file) throws IOException {
        assertTrue(Files.isRegularFile(file), "Missing translation catalog: " + file);
        Properties properties = new Properties() {
            @Override
            public synchronized Object put(Object key, Object value) {
                assertFalse(containsKey(key), "Duplicate key in " + file + ": " + key);
                return super.put(key, value);
            }
        };
        try (Reader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            properties.load(reader);
        }
        return properties.stringPropertyNames().stream().collect(Collectors.toMap(key -> key, properties::getProperty));
    }

    private static Set<String> parameters(String message) {
        Set<String> result = new TreeSet<>();
        Matcher matcher = Pattern.compile("\\{([A-Za-z0-9_.]+)\\}").matcher(message);
        while (matcher.find()) {
            result.add(matcher.group(1));
        }
        return result;
    }

    private static void validateIndexedFormat(String key, String pattern) {
        Matcher matcher = INDEX.matcher(pattern);
        Set<Integer> indices = new TreeSet<>();
        while (matcher.find()) {
            indices.add(Integer.parseInt(matcher.group(1)));
        }
        if (indices.isEmpty()) {
            if (!key.contains(".validation.")) {
                assertDoesNotThrow(() -> new MessageFormat(pattern, Locale.ENGLISH), key);
            }
            return; // Named Bean Validation tokens are interpolated by Hibernate.
        }
        Object[] arguments = new Object[Collections.max(indices) + 1];
        for (int index = 0; index < arguments.length; index++) {
            arguments[index] = "ARGUMENT_" + index + "_END";
        }
        String formatted = new MessageFormat(pattern, Locale.ENGLISH).format(arguments);
        for (int index : indices) {
            assertTrue(formatted.contains(arguments[index].toString()), "Lost interpolation argument: " + pattern);
        }
    }
}
