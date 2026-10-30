package cn.iocoder.yudao.framework.excel.core.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Explicitly opts a project-owned spreadsheet schema into localized presentation and import aliases. */
@Inherited
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ExcelLocale {
    String module();
    String value();
}
