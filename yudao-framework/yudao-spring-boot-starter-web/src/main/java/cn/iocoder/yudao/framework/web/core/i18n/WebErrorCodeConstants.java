package cn.iocoder.yudao.framework.web.core.i18n;

import cn.iocoder.yudao.framework.common.exception.ErrorCode;

/** Web response meanings keep distinct identities even when their numeric status is shared. */
public interface WebErrorCodeConstants {
    ErrorCode REQUEST_PARAMETER_MISSING = new ErrorCode(400, "请求参数缺失:{}", "common.request.parameterMissing");
    ErrorCode REQUEST_PARAMETER_TYPE = new ErrorCode(400, "请求参数类型错误:参数 {} 应为 {}，实际值 {}", "common.request.parameterType");
    ErrorCode REQUEST_VALIDATION_FAILED = new ErrorCode(400, "请求参数不正确:{}", "common.request.validationFailed");
    ErrorCode REQUEST_BODY_MISSING = new ErrorCode(400, "请求参数类型错误: request body 缺失", "common.request.bodyMissing");
    ErrorCode UPLOAD_TOO_LARGE = new ErrorCode(400, "上传文件过大，请调整后重试", "common.upload.tooLarge");
    ErrorCode REQUEST_PATH_MISSING = new ErrorCode(404, "请求地址不存在:{}", "common.request.pathMissing");
    ErrorCode REQUEST_METHOD_INVALID = new ErrorCode(405, "请求方法不正确:{}", "common.request.methodInvalid");
    ErrorCode REQUEST_MEDIA_TYPE_INVALID = new ErrorCode(400, "请求类型不正确:{}", "common.request.mediaTypeInvalid");
    ErrorCode BPM_SCHEMA_MISSING = new ErrorCode(501, "[工作流模块 yudao-module-bpm - 表结构未导入][参考 https://cloud.iocoder.cn/bpm/ 开启]", "common.module.bpm.schemaMissing");
    ErrorCode PAY_SCHEMA_MISSING = new ErrorCode(501, "[支付模块 yudao-module-pay - 表结构未导入][参考 https://cloud.iocoder.cn/pay/build/ 开启]", "common.module.pay.schemaMissing");
    ErrorCode REPORT_SCHEMA_MISSING = new ErrorCode(501, "[报表模块 yudao-module-report - 表结构未导入][参考 https://cloud.iocoder.cn/report/ 开启]", "common.module.report.schemaMissing");
    ErrorCode MP_SCHEMA_MISSING = new ErrorCode(501, "[微信公众号 yudao-module-mp - 表结构未导入][参考 https://cloud.iocoder.cn/mp/build/ 开启]", "common.module.mp.schemaMissing");
    ErrorCode MALL_SCHEMA_MISSING = new ErrorCode(501, "[商城系统 yudao-module-mall - 表结构未导入][参考 https://cloud.iocoder.cn/mall/build/ 开启]", "common.module.mall.schemaMissing");
    ErrorCode ERP_SCHEMA_MISSING = new ErrorCode(501, "[ERP 系统 yudao-module-erp - 表结构未导入][参考 https://cloud.iocoder.cn/erp/build/ 开启]", "common.module.erp.schemaMissing");
    ErrorCode WMS_SCHEMA_MISSING = new ErrorCode(501, "[WMS 仓库管理系统 yudao-module-wms - 表结构未导入][参考 https://doc.iocoder.cn/wms/build/ 开启]", "common.module.wms.schemaMissing");
    ErrorCode CRM_SCHEMA_MISSING = new ErrorCode(501, "[CRM 系统 yudao-module-crm - 表结构未导入][参考 https://cloud.iocoder.cn/crm/build/ 开启]", "common.module.crm.schemaMissing");
    ErrorCode MES_SCHEMA_MISSING = new ErrorCode(501, "[MES 系统 yudao-module-mes - 表结构未导入][参考 https://doc.iocoder.cn/mes/build/ 开启]", "common.module.mes.schemaMissing");
    ErrorCode HRM_SCHEMA_MISSING = new ErrorCode(501, "[HRM 人力资源管理系统 yudao-module-hrm - 表结构未导入][参考 https://doc.iocoder.cn/hrm/build/ 开启]", "common.module.hrm.schemaMissing");
    ErrorCode FMS_SCHEMA_MISSING = new ErrorCode(501, "[FMS 财务管理系统 yudao-module-fms - 表结构未导入][参考 https://doc.iocoder.cn/fms/build/ 开启]", "common.module.fms.schemaMissing");
    ErrorCode PMS_SCHEMA_MISSING = new ErrorCode(501, "[PMS 项目管理系统 yudao-module-pms - 表结构未导入][参考 https://doc.iocoder.cn/pms/build/ 开启]", "common.module.pms.schemaMissing");
    ErrorCode OA_SCHEMA_MISSING = new ErrorCode(501, "[OA 协同办公 yudao-module-oa - 表结构未导入][参考 https://doc.iocoder.cn/oa/build/ 开启]", "common.module.oa.schemaMissing");
    ErrorCode AI_SCHEMA_MISSING = new ErrorCode(501, "[AI 大模型 yudao-module-ai - 表结构未导入][参考 https://cloud.iocoder.cn/ai/build/ 开启]", "common.module.ai.schemaMissing");
    ErrorCode IOT_SCHEMA_MISSING = new ErrorCode(501, "[IoT 物联网 yudao-module-iot - 表结构未导入][参考 https://doc.iocoder.cn/iot/build/ 开启]", "common.module.iot.schemaMissing");
    ErrorCode IM_SCHEMA_MISSING = new ErrorCode(501, "[IM 即时通讯 yudao-module-im - 表结构未导入][参考 https://doc.iocoder.cn/im/build/ 开启]", "common.module.im.schemaMissing");
}
