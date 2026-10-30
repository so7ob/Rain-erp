package cn.iocoder.yudao.framework.web.core.i18n;

import cn.iocoder.yudao.framework.common.biz.infra.logger.ApiErrorLogCommonApi;
import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.web.config.YudaoI18nAutoConfiguration;
import cn.iocoder.yudao.framework.web.core.handler.GlobalExceptionHandler;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.MessageSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LocalizedApiTest {
    private final WebApplicationContextRunner context = new WebApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(YudaoI18nAutoConfiguration.class,
                    MessageSourceAutoConfiguration.class, ValidationAutoConfiguration.class, WebMvcAutoConfiguration.class))
            .withUserConfiguration(FixtureController.class)
            .withBean(GlobalExceptionHandler.class, () -> new GlobalExceptionHandler("localization-fixture", mock(ApiErrorLogCommonApi.class)));

    @Test
    void languageNegotiationAndLegacyRequestsKeepCodesDataAndDistinctErrorKeys() {
        context.run(application -> {
            assertThat(application).hasNotFailed();
            RequestLocaleFilter filter = (RequestLocaleFilter) application.getBean("requestLocaleFilter", FilterRegistrationBean.class).getFilter();
            MockMvc mvc = MockMvcBuilders.webAppContextSetup(application).addFilters(filter).build();
            String[][] cases = {
                    {"ar-SA", "ar", "معامل الطلب مفقود: id"},
                    {"en-US", "en", "Missing request parameter: id"},
                    {"zh-CN", "zh-CN", "请求参数缺失:id"},
                    {"fr-FR", "zh-CN", "请求参数缺失:id"},
                    {"invalid locale", "zh-CN", "请求参数缺失:id"}
            };
            for (String[] fixture : cases) {
                mvc.perform(get("/fixture/parameter").header("Accept-Language", fixture[0]))
                        .andExpect(status().isOk()).andExpect(header().string("Content-Language", fixture[1]))
                        .andExpect(jsonPath("$.code").value(400))
                        .andExpect(jsonPath("$.msg").value(fixture[2]))
                        .andExpect(jsonPath("$.data").isEmpty())
                        .andExpect(jsonPath("$.messageKey").value("common.request.parameterMissing"))
                        .andExpect(jsonPath("$.messageArguments").doesNotExist());
            }
            mvc.perform(get("/fixture/parameter"))
                    .andExpect(header().string("Content-Language", "zh-CN"))
                    .andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.msg").value("请求参数缺失:id"));
            mvc.perform(get("/fixture/parameter").param("id", "alpha").header("Accept-Language", "ar"))
                    .andExpect(jsonPath("$.code").value(400))
                    .andExpect(jsonPath("$.messageKey").value("common.request.parameterType"))
                    .andExpect(jsonPath("$.msg").value("نوع المعامل id غير صحيح؛ النوع المتوقع: Integer، والقيمة المستلمة: alpha"));
            mvc.perform(post("/fixture/parameter").header("Accept-Language", "ar"))
                    .andExpect(jsonPath("$.msg").value("طريقة الطلب غير صحيحة: POST"));
            mvc.perform(get("/fixture/upload").header("Accept-Language", "ar"))
                    .andExpect(jsonPath("$.code").value(400))
                    .andExpect(jsonPath("$.messageKey").value("common.upload.tooLarge"))
                    .andExpect(jsonPath("$.msg").value("الملف المرفوع كبير جدًا، عدّله وحاول مجددًا"));
            mvc.perform(get("/fixture/success").header("Accept-Language", "ar"))
                    .andExpect(jsonPath("$.code").value(0)).andExpect(jsonPath("$.msg").value(""))
                    .andExpect(jsonPath("$.data.identifier").value("00123-عميل"))
                    .andExpect(jsonPath("$.data.amount").isNumber())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("\"amount\":1234.560")))
                    .andExpect(jsonPath("$.messageKey").doesNotExist());
        });
    }

    @Test
    void validationUsesTheRequestLanguageAndPreservesOwnedLegacyMessages() {
        context.run(application -> {
            assertThat(application).hasNotFailed();
            RequestLocaleFilter filter = (RequestLocaleFilter) application.getBean("requestLocaleFilter", FilterRegistrationBean.class).getFilter();
            MockMvc mvc = MockMvcBuilders.webAppContextSetup(application).addFilters(filter).build();
            String[][] cases = {
                    {"ar", "معاملات الطلب غير صحيحة: هذا الحقل مطلوب"},
                    {"en", "Invalid request parameters: This field is required"},
                    {"zh-CN", "请求参数不正确:此字段不能为空"}
            };
            for (String[] fixture : cases) {
                mvc.perform(post("/fixture/validation").header("Accept-Language", fixture[0])
                                .contentType("application/json").content("{\"name\":\"\"}"))
                        .andExpect(jsonPath("$.code").value(400))
                        .andExpect(jsonPath("$.messageKey").value("common.request.validationFailed"))
                        .andExpect(jsonPath("$.msg").value(fixture[1]));
            }
            mvc.perform(post("/fixture/validation").contentType("application/json").content("{\"name\":\"\"}"))
                    .andExpect(jsonPath("$.msg").value("请求参数不正确:此字段不能为空"));
            mvc.perform(post("/fixture/builtin-validation").contentType("application/json").content("{\"name\":\"\"}"))
                    .andExpect(jsonPath("$.msg").value("请求参数不正确:must not be blank"));
            mvc.perform(post("/fixture/length").header("Accept-Language", "ar")
                            .contentType("application/json").content("{\"name\":\"X\"}"))
                    .andExpect(jsonPath("$.msg").value("معاملات الطلب غير صحيحة: يجب أن يتراوح الطول بين 2 و20"));
        });
    }

    @RestController
    static class FixtureController {
        @GetMapping("/fixture/parameter")
        CommonResult<?> parameter(@RequestParam("id") Integer id) {
            return CommonResult.success(id);
        }

        @GetMapping("/fixture/upload")
        CommonResult<?> upload() {
            throw new MaxUploadSizeExceededException(1);
        }

        @GetMapping("/fixture/success")
        CommonResult<?> success() {
            return CommonResult.success(java.util.Map.of("identifier", "00123-عميل", "amount", new java.math.BigDecimal("1234.560")));
        }

        @PostMapping("/fixture/validation")
        CommonResult<?> validation(@Valid @RequestBody OwnedInput input) {
            return CommonResult.success(input.name);
        }

        @PostMapping("/fixture/builtin-validation")
        CommonResult<?> builtinValidation(@Valid @RequestBody BuiltinInput input) {
            return CommonResult.success(input.name);
        }

        @PostMapping("/fixture/length")
        CommonResult<?> length(@Valid @RequestBody SizedInput input) {
            return CommonResult.success(input.name);
        }
    }

    static class OwnedInput {
        @NotBlank(message = "{common.validation.required}")
        public String name;
    }

    static class BuiltinInput {
        @NotBlank
        public String name;
    }

    static class SizedInput {
        @Size(min = 2, max = 20, message = "{common.validation.length}")
        public String name;
    }
}
