# واجهة Rain-erp

[English](README.en.md) | [دليل المشروع](../README.md)

مصدر واجهة الإدارة بـVue 3 وElement Plus، متتبع داخل مستودع Rain-erp. بقي الخادم في بنية Maven الحالية. المصدر الأصلي والنسخة المستوردة والتعديلات موثقة في [UPSTREAM.md](UPSTREAM.md)، والترخيص الأصلي محفوظ في [LICENSE](LICENSE).

## التشغيل أثناء التطوير

استخدم Node.js 24 وCorepack، ثم من هذا المجلد:

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm dev
```

تفتح الواجهة على `http://localhost:5173`. يوجّه الوكيل `/admin-api` إلى `http://127.0.0.1:48080` افتراضيًا؛ غيّر `RAIN_PROXY_TARGET` في `.env.local` إذا كان الخادم بعنوان مختلف. عند استخدام بيئة Rain-erp المحلية التي تعمل عبر المنفذ 3085، يمكن توجيه الوكيل إلى `http://127.0.0.1:3085` للوصول إلى API الخاص بها.

اضبط خياري المستأجر والتحقق البصري بما يطابق إعداد الخادم. لا تُملأ بيانات دخول تلقائيًا. جميع قيم `VITE_*` تظهر داخل شيفرة المتصفح، لذلك لا تضع فيها أسرار الخادم. التكاملات الاختيارية للخرائط والإحصاءات غير مفعلة افتراضيًا.

## الفحوص والبناء

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm ts:check
corepack pnpm check:build
```

توجد نتيجة البناء في `dist/`. يحمل `dist/version.json` رقم المنتج المشتق من `../pom.xml`، والمتاح أيضًا عبر `import.meta.env.VITE_APP_VERSION`. لا يوجد رقم إصدار npm مستقل لهذه الواجهة الخاصة. يمكن ضبط إعداد بناء محلي في `.env.production.local`، وهو مستثنى من Git.

ينشئ البناء تصريحات الأنواع المولّدة قبل فحص TypeScript الشامل؛ لذلك اتّبع ترتيب الأوامر أعلاه. يبقى `corepack pnpm lint` متاحًا كأمر تنسيق وتحليل إضافي من المصدر. تفاصيل الفحوص في [دليل الاختبارات](../docs/testing.md).

ملفات `.env.local` و`.env.*.local` والتبعيات والمخرجات المولدة تبقى خارج Git. أنشئ Issue وفرعًا من `develop` لكل تعديل، وادمج عبر PR مراجع وفق [سياسة المساهمة](../CONTRIBUTING.md).
