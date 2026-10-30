package cn.iocoder.yudao.framework.common.i18n;

/** Request-scoped translation at the response boundary; domain errors retain their original text. */
public final class ErrorMessageContext {

    private static final ThreadLocal<Resolver> CURRENT = new ThreadLocal<>();

    private ErrorMessageContext() {
    }

    @FunctionalInterface
    public interface Resolver {
        String resolve(String key, Object[] arguments, String originalMessage);
    }

    public static String resolve(String key, Object[] arguments, String originalMessage) {
        Resolver resolver = CURRENT.get();
        if (key == null || resolver == null) {
            return originalMessage;
        }
        String translated = resolver.resolve(key, arguments == null ? new Object[0] : arguments.clone(), originalMessage);
        return translated == null ? originalMessage : translated;
    }

    public static Scope open(Resolver resolver) {
        Resolver previous = CURRENT.get();
        set(resolver);
        return new Scope(previous);
    }

    public static boolean isLocalizedRequest() {
        return CURRENT.get() != null;
    }

    private static void set(Resolver resolver) {
        if (resolver == null) {
            CURRENT.remove();
        } else {
            CURRENT.set(resolver);
        }
    }

    public static final class Scope implements AutoCloseable {
        private final Resolver previous;
        private boolean closed;

        private Scope(Resolver previous) {
            this.previous = previous;
        }

        @Override
        public void close() {
            if (!closed) {
                set(previous);
                closed = true;
            }
        }
    }
}
