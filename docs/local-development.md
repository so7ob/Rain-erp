# Local frontend development

The authoritative source is `frontend/`. Run it with Node.js 24 and the Corepack/pnpm version pinned in its `package.json`. The ignored `.runtime/frontend` checkout is historical runtime state.

## Source updates and port 3085

A static Nginx build only changes after building/copying assets. Vite development mode serves the source and sends updates over its HMR WebSocket. The owner-authorized local configuration in Issue #17 keeps the existing browser address on port `3085` and proxies its UI requests to Vite.

Current local setup:

- Vite working directory: `/root/So7ob/Rain-erp/frontend`.
- Process: `rain-erp-frontend-dev.service`, a transient systemd service running `corepack pnpm exec vite --host 172.20.0.1 --port 5173 --strictPort` with Node.js 24 on its PATH.
- `172.20.0.1` is the local `rain-erp_default` Docker bridge gateway. It is a host-side listener accessible to the web container; it is not a new public listener.
- Nginx still publishes the existing local `127.0.0.1:3085` binding. Its UI location proxies to Vite with HTTP/1.1 and the WebSocket `Upgrade`/`Connection` headers.
- Existing `/admin-api/`, `/app-api/` and `/infra/ws` locations continue to target the backend container. Source hot updates do not require restarting the backend, databases or Redis.
- The original static output in `script/docker-compose/web/dist` remains available for rollback.

The machine-specific files are ignored runtime state: `.runtime/nginx-development.conf`, `.runtime/compose.frontend-development.yaml` and `.runtime/DEVELOPMENT.md`. Do not commit their environment, dependencies or build output.

After first switching from the static build, refresh the browser once to load `/@vite/client`. Subsequent source changes arrive through Vite. A language saved in that browser remains selected; choose Arabic from the language control if a previous English/Chinese preference is present.

## Inspect and restart

```bash
systemctl status rain-erp-frontend-dev.service
journalctl -u rain-erp-frontend-dev.service --since '10 minutes ago'
```

The service is transient and must be recreated after a host reboot. From the authoritative checkout, the command used for this machine is:

```bash
cd /root/So7ob/Rain-erp/frontend
corepack pnpm install --frozen-lockfile
systemd-run --unit=rain-erp-frontend-dev \
  --description='Rain-erp frontend development from authoritative checkout' \
  --working-directory="$PWD" --property=Restart=on-failure \
  --setenv="PATH=$PATH" --setenv=RAIN_PROXY_TARGET=http://127.0.0.1:3085 \
  "$(command -v corepack)" pnpm exec vite --host 172.20.0.1 --port 5173 --strictPort
```

Use `systemctl restart rain-erp-frontend-dev.service` when the transient unit already exists. Before restoring the proxy after a reboot, confirm Vite is reachable at `http://172.20.0.1:5173/@vite/client`. If the Docker network gateway changes, update the Vite listener and ignored Nginx upstream together; do not change host routing.

Apply the existing local development overrides with:

```bash
cd /root/So7ob/Rain-erp
docker compose -p rain-erp \
  -f script/docker-compose/docker-compose.yml \
  -f .runtime/compose.override.yaml \
  -f .runtime/compose.frontend-development.yaml up -d --no-deps web
```

This targets only the web container. It uses the existing local Compose environment; do not print or copy credential values into commands or documentation.

## Return to the original static UI

```bash
cd /root/So7ob/Rain-erp
docker compose -p rain-erp \
  -f script/docker-compose/docker-compose.yml \
  -f .runtime/compose.override.yaml up -d --no-deps web
systemctl stop rain-erp-frontend-dev.service
```

The development proxy requires its Vite service to be running. Returning to static mode removes that dependency; it does not incorporate unbuilt source changes.

## Verification evidence

Issue #17 records live HTTP 200 responses for `/`, `/@vite/client` and `/src/main.ts`, a connected `vite-hmr` WebSocket through port 3085, and an unauthenticated backend JSON response through the existing API route. Chromium smoke verified locale switching and draft preservation at widths 1280 and 375. This evidence establishes development routing and source delivery; complete product localization and module RTL acceptance remain tracked separately.
