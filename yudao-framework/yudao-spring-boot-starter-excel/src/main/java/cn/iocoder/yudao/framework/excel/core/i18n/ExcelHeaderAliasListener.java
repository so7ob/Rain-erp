package cn.iocoder.yudao.framework.excel.core.i18n;

import org.apache.fesod.sheet.context.AnalysisContext;
import org.apache.fesod.sheet.enums.CellDataTypeEnum;
import org.apache.fesod.sheet.metadata.Head;
import org.apache.fesod.sheet.metadata.data.ReadCellData;
import org.apache.fesod.sheet.read.listener.ReadListener;
import org.apache.fesod.sheet.util.ConverterUtils;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Fesod 2.1 invokes header listeners before buildHead; only header cells are canonicalized. */
public final class ExcelHeaderAliasListener implements ReadListener<Object> {
    private final ExcelLocaleCatalog catalog;

    public ExcelHeaderAliasListener(Class<?> type) {
        catalog = ExcelLocaleCatalog.of(type);
    }

    @Override
    public void invokeHead(Map<Integer, ReadCellData<?>> cells, AnalysisContext context) {
        if (catalog == null || context.readRowHolder().getRowIndex() != context.readSheetHolder().getHeadRowNumber() - 1) {
            return;
        }
        Map<String, Map<String, String>> candidates = new HashMap<>();
        for (Head head : context.readSheetHolder().excelReadHeadProperty().getHeadMap().values()) {
            if (head.getField() == null) {
                continue;
            }
            List<String> original = head.getHeadNameList();
            for (String alias : catalog.headerAliases(head.getField(), original)) {
                candidates.computeIfAbsent(alias, ignored -> new LinkedHashMap<>())
                        .put(head.getFieldName(), original.get(original.size() - 1));
            }
        }
        Set<String> usedFields = new HashSet<>();
        for (Map.Entry<Integer, String> cell : ConverterUtils.convertToStringMap(cells, context).entrySet()) {
            String text = cell.getValue();
            if (text == null) {
                continue;
            }
            if (context.currentReadHolder().globalConfiguration().getAutoStrip()) {
                text = org.apache.commons.lang3.StringUtils.strip(text);
            } else if (context.currentReadHolder().globalConfiguration().getAutoTrim()) {
                text = text.trim();
            }
            Map<String, String> matches = candidates.get(text);
            if (matches == null) {
                continue; // Preserve legacy handling of unrelated extra columns.
            }
            if (matches.size() != 1) {
                throw ExcelImportErrors.error("ambiguousHeader", "Excel 表头“{}”存在歧义", text);
            }
            Map.Entry<String, String> match = matches.entrySet().iterator().next();
            if (!usedFields.add(match.getKey())) {
                throw ExcelImportErrors.error("duplicateHeader", "Excel 表头“{}”重复匹配同一字段", text);
            }
            ReadCellData<?> data = cells.get(cell.getKey());
            data.setType(CellDataTypeEnum.STRING);
            data.setStringValue(match.getValue());
        }
    }

    @Override
    public void invoke(Object data, AnalysisContext context) {
    }

    @Override
    public void doAfterAllAnalysed(AnalysisContext context) {
    }
}
