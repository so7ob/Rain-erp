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

Playwright starts an isolated production preview on `127.0.0.1:4173`. `RAIN_BROWSER_BASE_URL` selects an already running local development server instead; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an installed Chromium binary. CI installs the matching Playwright browser and tests the production build.

The suite covers Arabic defaults, all three languages, saved preferences, request language headers, live page titles, preserved login/profile/password drafts and validation limits, SMS countdown, QR help, SSO scope selection, keyboard language selection and keyboard avatar-dialog opening/closing. Login and the owned profile content are checked with axe at 375/1280 in light/dark modes. Profile checks include mixed Arabic/Latin customer values, visible mobile tabs/language controls, and document overflow after responsive layout settles. The profile axe scope is `.profile-layout`, scanned before and after scrolling to the form; shell-wide accessibility and the remaining shared widgets remain part of #15 acceptance.

All API and backend WebSocket requests in these tests are intercepted with synthetic fixtures. The suite sends no real login, SMS, profile update, upload or authorization request. It does not establish backend translation, security or external provider integration coverage. CI retains screenshots, failure traces and the HTML report under its localization browser artifact for 14 days; local reports stay ignored in `.runtime/`.

Navigation progress is checked while deliberately unfinished, using the real application and intercepted permission requests for each language. A separate real-library fixture checks the full fixture document, live accessible-name updates, indeterminate semantics and removal. The visible progress is part of a polite status region so it remains accessible outside the page landmark. These checks retain every existing axe rule; they cover the transient progress element instead of waiting for it to disappear. Issue #25 corrects the invalid upstream role detected by post-merge run 40985203327.

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

## Local source preview

Use [the local development guide](local-development.md) to serve the authoritative frontend through Vite on the existing local port 3085, verify HMR/API routing, or restore the original static output. Runtime overrides remain ignored; this workflow does not publish an application release.
