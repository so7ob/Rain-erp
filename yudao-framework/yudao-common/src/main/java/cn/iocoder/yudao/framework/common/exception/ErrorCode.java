package cn.iocoder.yudao.framework.common.exception;

import cn.iocoder.yudao.framework.common.exception.enums.GlobalErrorCodeConstants;
import cn.iocoder.yudao.framework.common.exception.enums.ServiceErrorCodeRange;
import lombok.Data;

/**
 * 错误码对象
 *
 * 全局错误码，占用 [0, 999], 参见 {@link GlobalErrorCodeConstants}
 * 业务异常错误码，占用 [1 000 000 000, +∞)，参见 {@link ServiceErrorCodeRange}
 *
 * Semantic message keys distinguish translated meanings independently of numeric codes.
 */
@Data
public class ErrorCode {

    /**
     * 错误码
     */
    private final Integer code;
    /**
     * 错误提示
     */
    private final String msg;

    /** Stable semantic identity, independent of the (sometimes repeated) numeric code. */
    private final String messageKey;

    public ErrorCode(Integer code, String message) {
        this(code, message, null);
    }

    public ErrorCode(Integer code, String message, String messageKey) {
        this.code = code;
        this.msg = message;
        this.messageKey = messageKey;
    }

}
