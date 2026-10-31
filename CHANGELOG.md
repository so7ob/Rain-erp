# Changelog

## [Unreleased]

- Localize registered user spreadsheet filenames, sheets, headers, dictionary labels and import failures; accept Arabic/English/legacy templates, preserve typed data and custom labels, and retain import drafts across language changes and verified session renewal (#34).

- Respect reduced motion in shared overlays, wait for actual entry before accessibility measurements, and increase selection table header contrast (#32).

- Localize shared shell controls and overlays, synchronize language across tabs without losing drafts, guard notification contexts, and preserve tenant visit/selection behavior with responsive keyboard and axe coverage (#28).

- Localize contextual core menu/dictionary names without rewriting source data; isolate display state across language, user and tenant changes (#24).

- Give navigation progress a valid, localized indeterminate progress role and test it while visible (#25).

- Add request-scoped server languages, semantic API error identities and deferred message arguments; localize shared/authentication errors and coordinate session refresh across concurrent requests (#22).

- Localize authentication/profile text and validation, preserve drafts during language changes, improve Arabic responsive controls and add Chromium/axe coverage (#19).

- Add Arabic shared catalogs, locale negotiation in frontend requests, reactive language switching and an explicit localization inventory; full module acceptance remains tracked in #15.

- Include the Vue administration frontend in the product repository with frozen dependencies, safe configuration and required frontend build/type verification.

- Establish the Rain-erp Issue, review, protected-branch and release workflow (#1).
