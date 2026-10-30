package cn.iocoder.yudao.framework.excel.core.i18n;

import org.apache.fesod.sheet.metadata.Head;
import org.apache.fesod.sheet.write.handler.SheetWriteHandler;
import org.apache.fesod.sheet.write.metadata.holder.WriteSheetHolder;
import org.apache.fesod.sheet.write.metadata.holder.WriteWorkbookHolder;

public final class LocalizedExcelWriteHandler implements SheetWriteHandler {
    private final ExcelLocaleCatalog catalog;

    public LocalizedExcelWriteHandler(Class<?> type) {
        catalog = ExcelLocaleCatalog.of(type);
    }

    @Override
    public void beforeSheetCreate(WriteWorkbookHolder workbook, WriteSheetHolder sheet) {
        if (catalog == null) {
            return;
        }
        for (Head head : sheet.getExcelWriteHeadProperty().getHeadMap().values()) {
            if (head.getField() != null) {
                head.setHeadNameList(catalog.headers(head.getField(), head.getHeadNameList()));
            }
        }
    }

    @Override
    public void afterSheetCreate(WriteWorkbookHolder workbook, WriteSheetHolder sheet) {
        if (catalog != null && ExcelLocaleCatalog.isArabicRequest()) {
            sheet.getSheet().setRightToLeft(true);
        }
    }
}
