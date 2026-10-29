# Rain-erp frontend

[العربية](README.md) | [Project guide](../README.en.md)

The Vue 3 / Element Plus administration source is tracked here. The existing Maven backend layout is retained. See [UPSTREAM.md](UPSTREAM.md) for the pinned source revision and adaptations, and [LICENSE](LICENSE) for upstream attribution.

## Development

Use Node.js 24 and Corepack. From this directory:

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm dev
```

Open `http://localhost:5173`. The dev/preview proxy forwards `/admin-api` to `http://127.0.0.1:48080` by default. Set `RAIN_PROXY_TARGET` in `.env.local` for another backend. For the existing local Docker service on port 3085, use `http://127.0.0.1:3085` to reach its API.

Match tenant/captcha flags to the backend. Login credentials are not prefilled. All `VITE_*` values are public browser configuration; never use them for server secrets. Optional map/analytics integrations are disabled by default.

## Verification and build

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm ts:check
corepack pnpm check:build
```

Output is in `dist/`. `dist/version.json` and `import.meta.env.VITE_APP_VERSION` derive the product version from `../pom.xml`; this private application has no independently versioned npm package. Optional `.env.production.local` build settings are ignored by Git.

Build generates the auto-import/component declarations before full TypeScript verification; keep the command order above. The upstream `corepack pnpm lint` command remains available for additional formatting/static analysis. See [verification details](../docs/testing.md).

Keep local environment files, dependencies and generated output outside Git. Every change follows the [Issue / develop branch / reviewed PR workflow](../CONTRIBUTING.md).
