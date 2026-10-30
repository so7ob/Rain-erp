package cn.iocoder.yudao.framework.web.core.i18n;

import java.util.Locale;

public final class RequestLocalePolicy {
    public static final Locale LEGACY_LOCALE = Locale.SIMPLIFIED_CHINESE;

    private RequestLocalePolicy() {
    }

    public record Selection(Locale locale, boolean provided) {
        public String languageTag() {
            return locale.toLanguageTag();
        }
    }

    public static Selection resolve(String header) {
        if (header == null || header.isBlank()) {
            return new Selection(LEGACY_LOCALE, false);
        }
        try {
            for (Locale.LanguageRange range : Locale.LanguageRange.parse(header)) {
                if (range.getWeight() == 0) {
                    continue;
                }
                String tag = range.getRange();
                if (tag.equals("ar") || tag.startsWith("ar-")) {
                    return new Selection(Locale.forLanguageTag("ar"), true);
                }
                if (tag.equals("en") || tag.startsWith("en-")) {
                    return new Selection(Locale.ENGLISH, true);
                }
                if (tag.equals("zh") || tag.equals("zh-cn") || tag.startsWith("zh-cn-")
                        || tag.equals("zh-hans") || tag.startsWith("zh-hans-")) {
                    return new Selection(LEGACY_LOCALE, true);
                }
                if (tag.equals("*")) {
                    return new Selection(LEGACY_LOCALE, true);
                }
            }
        } catch (IllegalArgumentException ignored) {
            // A malformed language preference must not block authentication or business requests.
        }
        return new Selection(LEGACY_LOCALE, true);
    }
}
