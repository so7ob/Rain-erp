package cn.iocoder.yudao.framework.excel.core.i18n;

import cn.iocoder.yudao.framework.common.exception.ErrorCode;
import cn.iocoder.yudao.framework.common.exception.ServiceException;
import cn.iocoder.yudao.framework.common.exception.util.ServiceExceptionUtil;

/** Semantic identities are independent of the shared HTTP-style bad-request numeric code. */
public final class ExcelImportErrors {
    private ExcelImportErrors() {
    }

    public static ServiceException error(String meaning, String original, Object... arguments) {
        return ServiceExceptionUtil.exception(new ErrorCode(400, original, "excel.import." + meaning), arguments);
    }

    /** Fesod wraps converter/listener exceptions; preserve our structured API validation errors. */
    public static RuntimeException unwrap(RuntimeException exception) {
        Throwable current = exception;
        for (int depth = 0; current != null && depth < 32; depth++, current = current.getCause()) {
            if (current instanceof ServiceException service && service.getMessageKey() != null
                    && service.getMessageKey().startsWith("excel.import.")) {
                return service;
            }
        }
        return exception;
    }
}
