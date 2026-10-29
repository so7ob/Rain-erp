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

The six configuration regressions verify Maven version parsing, rejection of conflicting versions, public-only environment definitions, local overrides, valid ports, same-origin requests and empty credential/provider defaults. The production build compiles the imported Vue source; artifact verification checks the actual HTML entry scripts and Maven-matching `version.json`. Local browser smoke additionally verifies the login page and the API proxy against the existing local backend.

Production builds generate the ignored auto-import/component declarations before full `corepack pnpm ts:check`; this fixes the missing-global diagnostics observed when running the unprepared upstream checkout directly. Full frontend type verification passes after generation and is a required CI step. The upstream lint command remains available; this import does not claim a full lint/style audit.
