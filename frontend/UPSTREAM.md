# Frontend provenance

- Source: https://github.com/yudaocode/yudao-ui-admin-vue3
- Imported commit: `f6d3a83d2d3a553afaf08d863e88fe5cf7450fc8`
- Import date: 2026-10-30 (Asia/Aden).
- Upstream package version: `2026.09-snapshot`.
- License: MIT; the original notice is retained in `LICENSE` and the upstream documentation in `UPSTREAM.README.md`.

This is a source snapshot, tracked directly in Rain-erp. No nested Git repository or submodule is needed to clone/build the product. Future upstream updates must compare against the recorded commit and pass the normal Issue/branch/review/CI path.

Rain-erp adaptations:

- The backend stays in its existing Maven layout; this frontend lives in `frontend/`.
- The package is private and uses pinned pnpm 10.34.9 with the upstream dependency lockfile. It has no independent npm package version. The product version is read from the root Maven `revision`, exposed as `import.meta.env.VITE_APP_VERSION`, and emitted in `dist/version.json`. Release preparation therefore updates the authoritative Maven value once, without introducing an incompatible second writer.
- Upstream `.env*` files were omitted. They contained demo account/provider/analytics configuration. Safe public defaults live in `config/project.mjs`; `.env.example` documents local overrides. Private local settings remain ignored.
- Default API requests use the same origin. Development/preview can proxy them to the configured backend with `RAIN_PROXY_TARGET`.
- Production builds generate the ignored auto-import/component type declarations needed by a fresh checkout.
- Four upstream whitespace findings were normalized: Markdown line breaks, BPMN XML spacing, and equivalent escaped space/tab literals in the vendored Tinyflow bundles. Runtime string content is retained.
- Configuration regression tests and build artifact/version checks cover these adaptations.

Application screens and locale catalogs otherwise retain their upstream behavior. This import does not translate the interface or enable optional backend modules.
