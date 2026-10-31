package cn.iocoder.yudao.framework.excel.core.util;

import cn.iocoder.yudao.framework.common.util.http.HttpUtils;
import cn.iocoder.yudao.framework.common.i18n.ErrorMessageContext;
import cn.iocoder.yudao.framework.excel.core.handler.ColumnWidthMatchStyleStrategy;
import cn.iocoder.yudao.framework.excel.core.handler.SelectSheetWriteHandler;
import cn.iocoder.yudao.framework.excel.core.i18n.ExcelHeaderAliasListener;
import cn.iocoder.yudao.framework.excel.core.i18n.ExcelImportErrors;
import cn.iocoder.yudao.framework.excel.core.i18n.ExcelLocaleCatalog;
import cn.iocoder.yudao.framework.excel.core.i18n.LocalizedExcelWriteHandler;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.fesod.sheet.FesodSheet;
import org.apache.fesod.sheet.context.AnalysisContext;
import org.apache.fesod.sheet.converters.Converter;
import org.apache.fesod.sheet.converters.longconverter.LongStringConverter;
import org.apache.fesod.sheet.enums.CellDataTypeEnum;
import org.apache.fesod.sheet.read.listener.ReadListener;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.FilterOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Excel 工具类
 *
 * @author 芋道源码
 */
public class ExcelUtils {

    /**
     * Long 转 String 的转换器，避免 Long 类型丢失精度
     *
     * 参考 https://t.zsxq.com/a0w1V 帖子：Fesod 写入 xlsx 时，按 supportExcelTypeKey 为 null 查找全局转换器，
     * 所以需要返回 null，否则 registerConverter 的 LongStringConverter 不生效。关联 https://github.com/apache/fesod/issues/648
     */
    private static final Converter<Long> LONG_STRING_CONVERTER = new LongStringConverter() {

        @Override
        public CellDataTypeEnum supportExcelTypeKey() {
            return null;
        }

    };

    /**
     * 将列表以 Excel 响应给前端
     *
     * @param response  响应
     * @param filename  文件名
     * @param sheetName Excel sheet 名
     * @param head      Excel head 头
     * @param data      数据列表哦
     * @param <T>       泛型，保证 head 和 data 类型的一致性
     * @throws IOException 写入失败的情况
     */
    public static <T> void write(HttpServletResponse response, String filename, String sheetName,
                                 Class<T> head, List<T> data) throws IOException {
        ExcelLocaleCatalog catalog = ExcelLocaleCatalog.of(head);
        if (catalog != null) {
            filename = catalog.message("filename", filename);
            sheetName = catalog.message("sheet", sheetName);
        }
        // 输出 Excel
        FesodSheet.write(catalog == null ? response.getOutputStream() : downloadStream(response, filename), head)
                .autoCloseStream(false) // 不要自动关闭，交给 Servlet 自己处理
                .registerWriteHandler(new ColumnWidthMatchStyleStrategy()) // 基于 column 长度，自动适配。最大 255 宽度
                .registerWriteHandler(new SelectSheetWriteHandler(head)) // 基于固定 sheet 实现下拉框
                .registerWriteHandler(new LocalizedExcelWriteHandler(head))
                .registerConverter(LONG_STRING_CONVERTER) // 避免 Long 类型丢失精度
                .sheet(sheetName).doWrite(data);
        // 设置 header 和 contentType。写在最后的原因是，避免报错时，响应 contentType 已经被修改了
        if (catalog == null) {
            response.addHeader("Content-Disposition", "attachment;filename=" + HttpUtils.encodeUtf8(filename));
            response.setContentType("application/vnd.ms-excel;charset=UTF-8");
        }
    }

    /** Publish metadata with the first workbook byte, before the servlet buffer can commit a large export. */
    private static OutputStream downloadStream(HttpServletResponse response, String filename) throws IOException {
        String encoded = HttpUtils.encodeUtf8(filename);
        String disposition = "attachment;filename=" + encoded
                + (ErrorMessageContext.isLocalizedRequest() ? ";filename*=UTF-8''" + encoded : "");
        return new FilterOutputStream(response.getOutputStream()) {
            private boolean started;

            private void start() {
                if (!started) {
                    response.setHeader("Content-Disposition", disposition);
                    response.setContentType("application/vnd.ms-excel;charset=UTF-8");
                    started = true;
                }
            }

            @Override
            public void write(int value) throws IOException {
                start();
                out.write(value);
            }

            @Override
            public void write(byte[] bytes, int offset, int length) throws IOException {
                if (length > 0) {
                    start();
                }
                out.write(bytes, offset, length);
            }
        };
    }

    /**
     * 将动态表头和数据以 Excel 响应给前端
     *
     * @param response 响应
     * @param filename 文件名
     * @param sheetName Excel sheet 名
     * @param head Excel head 头
     * @param data 数据列表
     * @throws IOException 写入失败的情况
     */
    public static void write(HttpServletResponse response, String filename, String sheetName,
                             List<List<String>> head, List<List<Object>> data) throws IOException {
        // 输出 Excel
        FesodSheet.write(response.getOutputStream())
                .autoCloseStream(false) // 不要自动关闭，交给 Servlet 自己处理
                .registerWriteHandler(new ColumnWidthMatchStyleStrategy()) // 基于 column 长度，自动适配。最大 255 宽度
                .registerConverter(LONG_STRING_CONVERTER) // 避免 Long 类型丢失精度
                .head(head).sheet(sheetName).doWrite(data);
        // 设置 header 和 contentType。写在最后的原因是，避免报错时，响应 contentType 已经被修改了
        response.addHeader("Content-Disposition", "attachment;filename=" + HttpUtils.encodeUtf8(filename));
        response.setContentType("application/vnd.ms-excel;charset=UTF-8");
    }

    public static <T> List<T> read(MultipartFile file, Class<T> head) throws IOException {
        if (file == null || file.isEmpty()) {
            return Collections.emptyList();
        }
        // 参考 https://t.zsxq.com/zM77F 帖子，增加 try 处理，兼容 windows 场景
        try (InputStream inputStream = file.getInputStream()) {
            return FesodSheet.read(inputStream, head, null)
                    .autoCloseStream(false) // 不要自动关闭，交给 Servlet 自己处理
                    .registerReadListener(new ExcelHeaderAliasListener(head))
                    .doReadAllSync();
        } catch (RuntimeException exception) {
            throw ExcelImportErrors.unwrap(exception);
        }
    }

    /**
     * 读取指定数量以内的 Excel 数据，达到上限后停止继续解析。
     *
     * @param file Excel 文件，可为空
     * @param head Excel 表头类型
     * @param maxRowCount 最大读取行数
     * @return Excel 数据
     */
    public static <T> List<T> read(MultipartFile file, Class<T> head, int maxRowCount) throws IOException {
        if (file == null || file.isEmpty()) {
            return Collections.emptyList();
        }
        if (maxRowCount <= 0) {
            throw new IllegalArgumentException("maxRowCount must be greater than 0");
        }
        List<T> rows = new ArrayList<>(Math.min(maxRowCount, 1024));
        try (InputStream inputStream = file.getInputStream()) {
            FesodSheet.read(inputStream, head, new ReadListener<T>() {

                @Override
                public void invoke(T data, AnalysisContext context) {
                    rows.add(data);
                }

                @Override
                public void doAfterAllAnalysed(AnalysisContext context) {
                    // 无需处理
                }

                @Override
                public boolean hasNext(AnalysisContext context) {
                    return rows.size() < maxRowCount;
                }

            }).registerReadListener(new ExcelHeaderAliasListener(head)).autoCloseStream(false).doReadAll();
        } catch (RuntimeException exception) {
            throw ExcelImportErrors.unwrap(exception);
        }
        return rows;
    }

    /**
     * 读取动态表头 Excel 数据
     *
     * @param file Excel 文件，可为空
     * @return 按列下标存储的行数据
     * @throws IOException 读取失败
     */
    public static List<Map<Integer, String>> read(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return Collections.emptyList();
        }
        // 参考 https://t.zsxq.com/zM77F 帖子，增加 try 处理，兼容 windows 场景
        try (InputStream inputStream = file.getInputStream()) {
            return FesodSheet.read(inputStream)
                    .autoCloseStream(false) // 不要自动关闭，交给 Servlet 自己处理
                    .headRowNumber(1)
                    .sheet()
                    .doReadSync();
        }
    }

}
