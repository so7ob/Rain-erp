# Verification and test limits

Required commands:

```bash
node --test tools/workflow/*.test.mjs
mvn -B -ntp -pl yudao-server -am verify
python3 tools/workflow/test_report.py
```

Maven verifies the active reactor (core framework, infrastructure, system and server). Enabling optional business modules requires extending verification to their tests. Tests use H2 and an embedded Redis mock on port 16379, separately from runtime databases/Redis. CI retains Surefire XML reports for 14 days.

CI adds `-s .github/maven-settings.xml` to use Maven Central for the primary mirror while retaining the repository's Aliyun fallback. The same settings were used for local verification; they change download routing, not dependency versions.

The unmodified baseline at 606b3a2 passed on 2026-10-29: 920 reported test cases, 902 executed, 18 skipped, no errors or failures. Existing disabled tests are listed exactly in `tools/workflow/disabled-tests.json`; the report checker rejects additional skipped tests. This records the existing limits instead of treating them as tested behavior:

- Seven `SmsClientTests` methods require real SMS provider credentials/services.
- `MailSendServiceImplTest.testDemo` is a manual mail example.
- Eight S3/FTP/SFTP integration methods require configured storage services/credentials.
- Two `LocalFileClientTest` methods require the original author's local filesystem setup.

No new disabled tests are added for this workflow. Changes to the explicit baseline require review and a documented reason. Tests of workflow policy, SemVer, stale reviews/CI, immutable tags, dry-run behavior and delivery side effects run separately through Node's built-in test runner; they do not contact live cloud services or publish releases.

## Frontend verification

Use Node.js 24 and Corepack in `frontend/`:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
corepack pnpm ts:check
corepack pnpm check:build
```

Configuration regressions verify Maven version parsing, rejection of conflicting versions, public-only environment definitions, local overrides, valid ports, same-origin requests and empty credential/provider defaults. The production build compiles the imported Vue source; artifact verification checks the actual HTML entry scripts and Maven-matching `version.json`. Local browser smoke additionally verifies the login page and the API proxy against the existing local backend.

Production builds generate the ignored auto-import/component declarations before full `corepack pnpm ts:check`; this fixes the missing-global diagnostics observed when running the unprepared upstream checkout directly. Full frontend type verification passes after generation and is a required CI step. The upstream lint command remains available; this import does not claim a full lint/style audit.

## Localization verification

`corepack pnpm test` also verifies Arabic/English/Chinese catalog parity and message compilation, interpolation parameters, saved locale normalization, document direction, competing/failed language loads, composer reactivity, Arabic relative-time forms and visible-text scanner behavior. `corepack pnpm i18n:check` checks the committed source inventory and catalogs in CI. Regenerate and review inventory changes with `corepack pnpm i18n:inventory`.

These checks do not establish full module localization. `corepack pnpm i18n:accept` explicitly fails while module/browser/API/output acceptance remains pending under Issue #15. See [the localization guide](localization.md) for scope, scanner limits, glossary and external integration boundaries.

### Authentication and profile browser checks

After the frontend gate above, run in `frontend/`:

```bash
corepack pnpm exec playwright install --with-deps chromium
corepack pnpm test:browser
```

Playwright starts an isolated production preview on `127.0.0.1:4173` and a separate Vite source fixture server on `127.0.0.1:4174`. Application cases use the production preview. The isolated `tests/components/index.html` fixture exercises the exported, currently unused TableSelectForm and shared Error components with synthetic data; it is outside the production build entry. It uses the real locale/store/component code and does not activate a business module. `RAIN_BROWSER_BASE_URL` selects an already running local Vite development server for both kinds of cases instead; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an installed Chromium binary. CI installs the matching Playwright browser.

The suite covers Arabic defaults, all three languages, saved preferences, request language headers, live page titles, preserved login/profile/password drafts and validation limits, SMS countdown, QR help, SSO scope selection, keyboard language selection and keyboard avatar-dialog opening/closing. Login and the owned profile content are checked with axe at 375/1280 in light/dark modes. Profile checks include mixed Arabic/Latin customer values, visible mobile tabs/language controls, and document overflow after responsive layout settles. The profile axe scope is `.profile-layout`, scanned before and after scrolling to the form; shell-wide accessibility and the remaining shared widgets remain part of #15 acceptance.

All API and backend WebSocket requests in these tests are intercepted with synthetic fixtures. The suite sends no real login, SMS, profile update, upload or authorization request. It does not establish backend translation, security or external provider integration coverage. CI retains screenshots, failure traces and the HTML report under its localization browser artifact for 14 days; local reports stay ignored in `.runtime/`.

Navigation progress is checked while deliberately unfinished, using the real application and intercepted permission requests for each language. A separate real-library fixture checks the full fixture document, live accessible-name updates, indeterminate semantics and removal. The visible progress is part of a polite status region so it remains accessible outside the page landmark. These checks retain every existing axe rule; they cover the transient progress element instead of waiting for it to disappear. Issue #25 corrects the invalid upstream role detected by post-merge run 40985203327.

## Contextual core display verification

Source checks match the complete #24 target manifest against the recorded SQL seed (58 navigation entries, 103 dictionary values). They verify all three catalogs, exact identity/text/meaning matching, custom and unknown values, the precise 16 literal exceptions, preserved original fields and reactive captured options. Cache tests cover opaque identity persistence, language/user/tenant/visited-tenant separation, shared requests, stale responses and edit-triggered invalidation.

Browser fixtures cover all ten supported navigation layouts, document titles, breadcrumbs/tabs/menu search, dictionary switching with retained query drafts, custom key-shaped names, search at 375/1280 in light/dark with axe, delayed responses, user/tenant switching and ignored legacy cache entries. Browser requests remain synthetic; no real account, dictionary edit or tenant switch is performed. These checks establish this display adapter and cache behavior, not full system/infrastructure or other module acceptance.

## Server localization and session verification

The shared error tests verify optional `messageKey` serialization, unchanged code/msg/data, argument preservation through copies/rethrows, duplicate numeric codes with different meanings, JSON property order, and thread/context restoration. Catalog tests read every owned main-source message bundle, including inactive modules, to reject missing Arabic, duplicate keys, parameter differences and invalid indexed templates. Separate classpath checks verify the shared and keyed system errors actually resolve from their packaged modules.

MockMvc exercises the real locale filter, MessageSource, validator, JSON serializers and exception handler with Arabic/English/Chinese, weighted/regional preferences, unsupported/malformed/absent language, validation cache ordering, named constraint arguments, upload errors and numeric financial values. Security tests execute the actual authentication/denial handlers before MVC. These tests use isolated contexts and synthetic data; they do not call the running API or external providers. Unconverted module/annotation/provider messages remain outside full #15 acceptance.

`corepack pnpm test` also verifies refresh coordination: one attempt per session identity, rejected waiters settling, retry after failure and independent user/tenant identities. Browser session cases exercise concurrent and late 401 responses, terminal failures, failed connections, bounded retry, preserved language after re-login and a delayed response after a user/tenant change. A deliberate fixture reuses an old Chinese session string for a business error with a different key to prove behavior follows identity. All transport is intercepted; no actual token, SMS or live database operation is involved. Intentional terminal/stale request rejections are observed separately from successful-page smoke tests.

Focused commands are available while developing:

```bash
mvn -B -ntp -pl yudao-framework/yudao-spring-boot-starter-web -am test -s .github/maven-settings.xml
mvn -B -ntp -pl yudao-module-system -am test -s .github/maven-settings.xml
```

They supplement the complete required gate, rather than replacing verification of the active reactor or optional-module acceptance.

## Shared shell and overlay localization

Issue #28 adds literal guards for the owned controls, notification plural cases, external-load cancellation and delayed-startup preference tests. Browser cases cover cross-tab preferences and headers with retained drafts and one write per user choice, native navigation/fullscreen/menu actions, reactive lock validation, tenant selection, and obsolete notification responses across login/tenant/visited-tenant identities. All account/tenant/API values are fixtures; no runtime writes occur.

Settings, lock validation, notification popovers, and isolated selection/error content have 375/1280 light/dark axe matrices. Settings scans cover the initial viewport and bottom actions after scrolling. The picker is operated by keyboard, and original mixed text/selection/confirm/cancel/pagination/custom titles are asserted. The TableSelectForm cases use the isolated source fixture described above; they do not establish acceptance of an enabled module. The Element Plus pagination naming adapter is exercised after language changes. Source and browser checks keep failures visible and add no exclusions or retries.

Local #28 acceptance passed 40 configuration/catalog cases, 70 Chromium cases (65 production application cases and five isolated source-component cases), 50 workflow cases, and 956 Maven cases with the unchanged 18-test disabled baseline. The initial plain Maven gate and a clean retry failed five MQ cases with missing generated classes while VS Code's Java builder was active. A standard `mvn -B -ntp -s .github/maven-settings.xml -pl yudao-server -am clean verify` succeeded with the verified Java language server temporarily paused; it was resumed afterward. Keep IDE and Maven writers apart when diagnosing disappearing outputs, for example by checking the same commit in an isolated worktree. No test or compiler configuration was weakened for the successful gate.

## Overlay entry and contrast correction (#32)

The reviewed #28 head passed PR CI, but the identical-tree post-merge run [41137404450](https://github.com/so7ob/Rain-erp/actions/runs/41137404450) failed three selection contrast scans. Element Plus animates opacity on both the outer overlay and inner overlay-dialog container. Visibility can therefore precede stable rendered colors. The failed browser step also prevented Maven from running, causing the always-run test-report check to fail; that secondary report failure is not a Maven test result.

The project adapter now honors reduced motion on these containers, settings and notification overlays. The fixture exposes the real Element Plus `opened` event; contrast and geometry scans wait for that event, full ancestor opacity and completion of finite animations. A regression holds the real normal-motion entrance at its midpoint, verifies readiness stays pending, finishes it, and then runs axe. The reduced-motion case verifies the same controlled entrance does not animate. Both retain full contrast checks without sleeps, test retries or rule exclusions. Stable measurement also exposed the selection table's low-contrast default header color; its project-scoped token now uses primary body text.

The browser suite contains 72 cases: 65 production application cases and seven isolated source-component cases. The existing 375/1280 light/dark matrices remain in place. #28 and #32 were subsequently closed after successful corrective develop CI [41141533145](https://github.com/so7ob/Rain-erp/actions/runs/41141533145).

## Local source preview

Use [the local development guide](local-development.md) to serve the authoritative frontend through Vite on the existing local port 3085, verify HMR/API routing, or restore the original static output. Runtime overrides remain ignored; this workflow does not publish an application release.


## User spreadsheet localization (#34)

The opt-in workbook tests use the real Apache Fesod and POI codecs. They cover all three output languages, regional/unsupported/malformed headers, legacy requests, cross-language template import, duplicate/ambiguous headers, dictionary aliases colliding with custom labels, customized labels, numeric dictionary cells rejected with a structured validation result, exact large Long text, numeric decimals and Gregorian dates, original mixed text and `01` dictionary identity. Concurrent exports check independent headers and unchanged annotations; the download stream test checks metadata before the first byte. The existing ModuleMessageCatalogTest scans every main-source module catalog, including inactive modules, for duplicate keys, Arabic completeness, parameter parity and valid formats. Intentionally incomplete negative fixtures remain in test resources only.

The real user controller and locale filter run against a mocked domain service, without runtime data writes. H2 service tests exercise actual localized Bean Validation, original usernames, duplicate accounts and department error arguments; no-header expectations retain the original Chinese messages. The shared dictionary source identities and terminology are cross-checked against the frontend defaults.

Ten additional source-component browser cases cover the user import dialog, error/retry/results at 375/1280 in light/dark modes with full scoped axe rules, retained files/checkboxes across languages, chosen download filenames, literal mixed names, required/type/one-file checks, keyboard removal, multipart refresh/replay and another tab's retained draft. Obsolete user/tenant/visited-tenant results cannot reappear. Network and domain services use explicit synthetic fixtures; the browser does not write to the running application's backend. The original 65 production cases and seven shared-source cases remain required. There are no browser retries or new accessibility exclusions.

Focused checks passed 44 frontend configuration/catalog cases, ten import browser cases, and 78 Java cases across ExcelUtilsTest, LocalizedExcelTest, UserSpreadsheetLocaleTest and AdminUserServiceImplTest. The final complete gates remain required for delivery. Use an exact-head detached verification worktree outside the IDE workspace for Maven; keep the Java language server active and avoid concurrent writers to the same target directory. Do not copy local frontend environments or dependencies into that worktree.


During the final #34 gate, the two numeric-dictionary cases initially expected integer text although the real workbook codec supplied numeric cell values `0.0`/`1.0`. Both API responses already had the intended localized code/key; the assertions now retain the actual numeric-cell representation. This was a genuine two-test failure and requires a complete gate rerun, without skips or changed production conversion.

## User management and selectors (#36)

The scoped source scanner owns the user page, create/edit, role assignment and confirmation/password dialogs, both user selectors, their selection dialog, department tree and documentation link. Catalog parity covers the project-owned Element Plus additions as well. The adapter tests preserve the original library definitions, native arrays and all untouched entries, keep English/Chinese values, and reject English leftovers in the reached Arabic control sections.

Real user/permission controller routes run with the request locale filter and the configured Bean Validator. They exercise Arabic, English, Chinese, unsupported and absent language headers; status IDs/required values, enum and dictionary constraints, password limits and removal of every role. Direct validation checks every constraint while API assertions preserve its existing first-field-error response. Optional message-key tests cover scalar/collection enums and dictionaries, computed arguments, legacy constraints, null/empty behavior and restored scopes. An H2 service test verifies mixed original display-name searches combined with existing status filtering.

The source browser fixture initializes the actual permissions directives and uses synthetic API responses, without runtime user or tenant writes. It checks language changes with retained drafts, validation and selections, preselection/disabled IDs/cross-page selection, custom titles, keyboard selection/clear/status/password controls, query-only permissions, load/save failures, credential renewal with identical request replay, and obsolete login/tenant/visited-tenant responses. The 375/1280 light/dark matrices retain all axe rules for forms, roles, selectors, the list and the Gregorian date popup, including actual selected date ranges and unchanged Latin date request values. The mixed-state checkbox correction leaves the native input's indeterminate property intact.

Initial focused checks exposed compilation errors in new test setup, an incorrect expectation that an API response includes every simultaneous constraint message, missing native array types in the locale adapter, and actual contrast/ARIA/keyboard/date-popup defects. These were corrected without skips, axe exclusions, changed validation bounds or changed first-error API behavior. The date test uses the installed Arabic library's actual confirmation label and registered export filename; it also checks cleared filters. The first full browser attempt stopped after existing display tests searched for the old Chinese user-field labels. All three affected display/cache tests now anchor controls by their current accessible name and stable input ID, retaining their dictionary/context/draft assertions. Focused regressions also exercise cancelled/single/batch deletion, literal custom titles/placeholders and original ID payloads. The complete gate must pass on the stable implementation before delivery.

The first full Maven attempt exposed one additional fixture-isolation failure: an earlier workbook case had cached an extra `common_status` value, so the new constraint test's supposedly invalid value was actually valid. The two new constraint/API fixtures now scope their mocked dictionary-value provider to each test thread and close it afterwards. Actual validators, message interpolation, controllers and legacy behavior remain exercised; production caches and validation rules are unchanged. A complete Maven/report rerun is required after this correction.
