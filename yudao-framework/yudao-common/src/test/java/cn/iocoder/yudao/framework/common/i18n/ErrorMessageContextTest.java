package cn.iocoder.yudao.framework.common.i18n;

import cn.iocoder.yudao.framework.common.exception.ErrorCode;
import cn.iocoder.yudao.framework.common.exception.ServiceException;
import cn.iocoder.yudao.framework.common.exception.util.ServiceExceptionUtil;
import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

class ErrorMessageContextTest {

    @Test
    void numericCollisionsKeepDistinctMeaningsAndLegacyMessages() {
        CommonResult<Void> stock = CommonResult.error(new ErrorCode(400, "库存不足", "erp.stock.insufficient"));
        CommonResult<Void> customer = CommonResult.error(new ErrorCode(400, "客户不存在", "crm.customer.notFound"));
        Map<String, String> translations = Map.of("erp.stock.insufficient", "المخزون غير كافٍ",
                "crm.customer.notFound", "العميل غير موجود");
        try (ErrorMessageContext.Scope ignored = ErrorMessageContext.open((key, args, fallback) -> translations.get(key))) {
            assertEquals("المخزون غير كافٍ", stock.getMsg());
            assertEquals("العميل غير موجود", customer.getMsg());
            assertEquals("原始的自定义文字", CommonResult.error(400, "原始的自定义文字").getMsg());
        }
        assertEquals("库存不足", stock.getMsg());
        assertEquals("客户不存在", customer.getMsg());
        assertEquals(400, stock.getCode());
    }

    @Test
    void exceptionAndResultCopiesRetainArgumentsUntilResponseFormatting() {
        Object[] arguments = {new BigDecimal("1234.560"), "00123-عميل"};
        ErrorCode code = new ErrorCode(400, "原始金额 {} / {}", "erp.amount.invalid");
        ServiceException original = ServiceExceptionUtil.exception(code, arguments);
        arguments[0] = "changed";
        CommonResult<Void> copied = CommonResult.error(CommonResult.error(original));
        Object[] returned = copied.getMessageArguments();
        returned[1] = "changed";
        ServiceException rethrown = assertThrows(ServiceException.class, copied::checkError);
        CommonResult<Void> result = CommonResult.error(rethrown);
        assertEquals("原始金额 1234.560 / 00123-عميل", result.getMsg());
        try (ErrorMessageContext.Scope ignored = ErrorMessageContext.open((key, args, fallback) -> {
            assertEquals("erp.amount.invalid", key);
            return "المبلغ " + args[0] + " / " + args[1];
        })) {
            assertEquals("المبلغ 1234.560 / 00123-عميل", result.getMsg());
        }
        assertEquals("原始金额 1234.560 / 00123-عميل", rethrown.getMessage());
    }

    @Test
    void serializationKeepsTheExistingContractAndHidesDeferredArguments() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        CommonResult<Void> result = CommonResult.error(new ErrorCode(401, "原始提示 {}", "system.session.expired"), "fixture");
        try (ErrorMessageContext.Scope ignored = ErrorMessageContext.open((key, args, fallback) -> "انتهت الجلسة")) {
            JsonNode json = mapper.readTree(mapper.writeValueAsString(result));
            assertEquals(4, json.size());
            assertEquals(401, json.get("code").intValue());
            assertEquals("انتهت الجلسة", json.get("msg").textValue());
            assertTrue(json.get("data").isNull());
            assertEquals("system.session.expired", json.get("messageKey").textValue());
            assertFalse(json.has("messageArguments"));
        }
        JsonNode legacy = mapper.readTree(mapper.writeValueAsString(CommonResult.error(400, "legacy")));
        assertEquals(3, legacy.size());
        assertFalse(legacy.has("messageKey"));
        JsonNode success = mapper.readTree(mapper.writeValueAsString(CommonResult.success("00123")));
        assertEquals(3, success.size());
        assertEquals("00123", success.get("data").textValue());
        assertEquals("", success.get("msg").textValue());
    }

    @Test
    void nestedScopesRestoreAfterExceptionsWithoutLeakingIntoOtherThreads() throws Exception {
        CommonResult<Void> result = CommonResult.error(new ErrorCode(400, "legacy", "common.test.error"));
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try (ErrorMessageContext.Scope outer = ErrorMessageContext.open((key, args, fallback) -> "عربي")) {
            assertEquals("legacy", executor.submit(result::getMsg).get());
            assertThrows(IllegalStateException.class, () -> {
                try (ErrorMessageContext.Scope inner = ErrorMessageContext.open((key, args, fallback) -> "English")) {
                    assertEquals("English", result.getMsg());
                    throw new IllegalStateException("fixture");
                }
            });
            assertEquals("عربي", result.getMsg());
            assertEquals("English", executor.submit(() -> {
                try (ErrorMessageContext.Scope ignored = ErrorMessageContext.open((key, args, fallback) -> "English")) {
                    return result.getMsg();
                }
            }).get());
            assertEquals("legacy", executor.submit(result::getMsg).get());
        } finally {
            executor.shutdownNow();
        }
        assertEquals("legacy", result.getMsg());
    }

    @Test
    void languageDoesNotChangeValueEqualityAndUnkeyedMessagesRemainCustom() {
        ErrorCode code = new ErrorCode(400, "legacy", "common.test.error");
        CommonResult<Void> first = CommonResult.error(code);
        CommonResult<Void> second = CommonResult.error(code);
        int originalHash = first.hashCode();
        try (ErrorMessageContext.Scope ignored = ErrorMessageContext.open((key, args, fallback) -> "translated")) {
            assertEquals(originalHash, first.hashCode());
            assertEquals(first, second);
            CommonResult<Void> custom = CommonResult.error(400, "custom-عميل");
            assertEquals("custom-عميل", custom.getMsg());
            assertNull(custom.getMessageKey());
        }
    }

    @Test
    void optionalMessageIdentitySurvivesEitherJsonPropertyOrder() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        for (String json : new String[]{
                "{\"code\":400,\"msg\":\"rendered\",\"messageKey\":\"common.request.parameterMissing\"}",
                "{\"messageKey\":\"common.request.parameterMissing\",\"msg\":\"rendered\",\"code\":400}"}) {
            CommonResult<?> result = mapper.readValue(json, CommonResult.class);
            assertEquals("common.request.parameterMissing", result.getMessageKey());
            assertEquals("rendered", result.getMsg());
        }
    }
}
