# Changelog


## [0.1.0]

Rain-erp v0.1.0

- chore: establish development and release policy (#2) ([cb1b82b](https://github.com/so7ob/Rain-erp/commit/cb1b82b45a41c07e854e6f4959984ea71f7da487))
- ci: reject invalid policy dispatch identities (#5) ([c3f6935](https://github.com/so7ob/Rain-erp/commit/c3f69356ae6396b392a2fdd7c6ceed3d5e852fd8))
- docs: record protected workflow acceptance evidence (#8) ([368c55f](https://github.com/so7ob/Rain-erp/commit/368c55f6690cfa1a1309db746c6eac51ba8beb36))
- chore: prepare repository ownership transfer to so7ob (#10) ([75153d6](https://github.com/so7ob/Rain-erp/commit/75153d61caf067a326d6134988de40115ea9805f))
- feat: integrate frontend source into the product repository (#14) ([8172a62](https://github.com/so7ob/Rain-erp/commit/8172a6258c84e3f28077034afe8e41b778378153))
- feat(i18n): add Arabic catalogs and locale foundation (#18) ([c1c824e](https://github.com/so7ob/Rain-erp/commit/c1c824e63ac15a134202b2ef5134aa71e5b1a1ad))
- docs(dev): explain live frontend source updates on port 3085 (#20) ([c59d14d](https://github.com/so7ob/Rain-erp/commit/c59d14d46f94ecea0b658d0d8730713b5a1b6c00))
- feat(i18n): localize authentication and profile flows (#21) ([52ced34](https://github.com/so7ob/Rain-erp/commit/52ced341aefb3b118d2ece8be965b6775b0373b4))
- feat(i18n): localize API errors and session recovery (#23) ([5047e6d](https://github.com/so7ob/Rain-erp/commit/5047e6d5eaaa6875c33fddfaa3548f2057487041))
- fix(a11y): localize navigation progress semantics (#26) ([f94c4fc](https://github.com/so7ob/Rain-erp/commit/f94c4fcb93e3b2fe5ebe554ac238edc920833e4c))
- feat(i18n): localize core navigation and dictionary display (#27) ([365d0e4](https://github.com/so7ob/Rain-erp/commit/365d0e48e41e6df8f25743950706bc908b24b816))

Release tracking: https://github.com/so7ob/Rain-erp/issues/29

## [Unreleased]

- Localize contextual core menu/dictionary names without rewriting source data; isolate display state across language, user and tenant changes (#24).

- Give navigation progress a valid, localized indeterminate progress role and test it while visible (#25).

- Add request-scoped server languages, semantic API error identities and deferred message arguments; localize shared/authentication errors and coordinate session refresh across concurrent requests (#22).

- Localize authentication/profile text and validation, preserve drafts during language changes, improve Arabic responsive controls and add Chromium/axe coverage (#19).

- Add Arabic shared catalogs, locale negotiation in frontend requests, reactive language switching and an explicit localization inventory; full module acceptance remains tracked in #15.

- Include the Vue administration frontend in the product repository with frozen dependencies, safe configuration and required frontend build/type verification.

- Establish the Rain-erp Issue, review, protected-branch and release workflow (#1).
