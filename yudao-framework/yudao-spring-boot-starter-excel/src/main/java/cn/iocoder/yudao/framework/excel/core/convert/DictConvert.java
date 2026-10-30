package cn.iocoder.yudao.framework.excel.core.convert;

import cn.hutool.core.convert.Convert;
import cn.iocoder.yudao.framework.dict.core.DictFrameworkUtils;
import cn.iocoder.yudao.framework.excel.core.annotations.DictFormat;
import cn.iocoder.yudao.framework.excel.core.i18n.ExcelImportErrors;
import cn.iocoder.yudao.framework.excel.core.i18n.ExcelLocaleCatalog;
import lombok.extern.slf4j.Slf4j;
import org.apache.fesod.sheet.converters.Converter;
import org.apache.fesod.sheet.enums.CellDataTypeEnum;
import org.apache.fesod.sheet.metadata.GlobalConfiguration;
import org.apache.fesod.sheet.metadata.data.ReadCellData;
import org.apache.fesod.sheet.metadata.data.WriteCellData;
import org.apache.fesod.sheet.metadata.property.ExcelContentProperty;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Excel 数据字典转换器
 *
 * @author 芋道源码
 */
@Slf4j
public class DictConvert implements Converter<Object> {

    @Override
    public Class<?> supportJavaTypeKey() {
        throw new UnsupportedOperationException("暂不支持，也不需要");
    }

    @Override
    public CellDataTypeEnum supportExcelTypeKey() {
        throw new UnsupportedOperationException("暂不支持，也不需要");
    }

    @Override
    public Object convertToJavaData(ReadCellData readCellData, ExcelContentProperty contentProperty,
                                    GlobalConfiguration globalConfiguration) {
        // 使用字典解析
        String type = getType(contentProperty);
        String label = readCellData.getStringValue();
        ExcelLocaleCatalog catalog = ExcelLocaleCatalog.of(contentProperty.getField().getDeclaringClass());
        String value;
        if (catalog == null) {
            value = DictFrameworkUtils.parseDictDataValue(type, label);
        } else {
            Set<String> candidates = new LinkedHashSet<>();
            DictFrameworkUtils.getDictDataList(type).forEach(data -> {
                if (catalog.dictionaryAliases(type, data).contains(label)) {
                    candidates.add(data.getValue());
                }
            });
            if (candidates.size() > 1) {
                throw ExcelImportErrors.error("ambiguousDictionary", "列“{}”中的字典标签“{}”存在歧义",
                        catalog.fieldLabel(contentProperty.getField()), label);
            }
            if (candidates.isEmpty()) {
                throw ExcelImportErrors.error("unknownDictionary", "列“{}”中的字典标签“{}”无效",
                        catalog.fieldLabel(contentProperty.getField()), label);
            }
            value = candidates.iterator().next();
        }
        if (value == null) {
            log.error("[convertToJavaData][type({}) 解析不掉 label({})]", type, label);
            return null;
        }
        // 将 String 的 value 转换成对应的属性
        Class<?> fieldClazz = contentProperty.getField().getType();
        return Convert.convert(fieldClazz, value);
    }

    @Override
    public WriteCellData<String> convertToExcelData(Object object, ExcelContentProperty contentProperty,
                                                    GlobalConfiguration globalConfiguration) {
        // 空时，返回空
        if (object == null) {
            return new WriteCellData<>("");
        }

        // 使用字典格式化
        String type = getType(contentProperty);
        String value = String.valueOf(object);
        String label = DictFrameworkUtils.parseDictDataLabel(type, value);
        if (label == null) {
            log.error("[convertToExcelData][type({}) 转换不了 label({})]", type, value);
            return new WriteCellData<>("");
        }
        // 生成 Excel 小表格
        ExcelLocaleCatalog catalog = ExcelLocaleCatalog.of(contentProperty.getField().getDeclaringClass());
        return new WriteCellData<>(catalog == null ? label : catalog.dictionaryLabel(type, value, label));
    }

    private static String getType(ExcelContentProperty contentProperty) {
        return contentProperty.getField().getAnnotation(DictFormat.class).value();
    }

}
