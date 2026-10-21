# Any Tools — guide for AI sessions

Public site with web tools (pixelate photos, generate passwords, …). To use a tool, a visitor
watches an ad and that **one tool** is unlocked for **5 minutes**; then another ad is required.
Production: one VPS (DigitalOcean + Coolify) behind Cloudflare, single domain
`anytools.josemorillo.dev` — web on `/`, API on `/api/*` (Traefik routes it). No API subdomain, no CORS.

## Stack

| Area              | Tech                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Monorepo          | pnpm 12 workspaces (catalog versions in `pnpm-workspace.yaml`) + Turborepo, TypeScript 6 `strict`      |
| `apps/web`        | Next.js 16 (App Router, Turbopack, `output: "standalone"`), Tailwind CSS 4, next-intl 4 (`/es`, `/en`) |
| `apps/api`        | Fastify 5 + Zod 4 (`fastify-type-provider-zod`), pino, jose (JWT), `@fastify/rate-limit` (Redis)       |
| `apps/worker`     | BullMQ 6 on Redis (queue tools + periodic cleanup)                                                     |
| `packages/db`     | Drizzle ORM + Postgres 16: schema, migrations (`drizzle/`), idempotent seed                            |
| `packages/shared` | Zod API contracts, constants, queue job types                                                          |
| `packages/tools`  | `defineTool`, `toolRegistry`, executor, `StorageProvider` (local / S3-R2), one folder per tool         |
| `packages/config` | Shared tsconfig, ESLint 9 flat config, Prettier                                                        |
| Tests             | Vitest 5                                                                                               |

Version notes: TypeScript stays on 6.0.x (TS 7 native has no JS API for typescript-eslint/Next);
ESLint stays on 9.x (eslint-config-next's plugins do not support ESLint 10 yet).

## Layout

```
apps/
  api/      src/{env,app,deps,logger}.ts, ads/ (dev|monetag|applixir), routes/, services/, plugins/; test/
  worker/   src/{index,processor,maintenance,env}.ts
  web/      src/app/[locale]/…, src/components/{unlock,tool,home}, src/tools/<slug>/ (UIs), src/lib, messages/{es,en}.json
packages/
  db/       src/schema.ts, src/seed-data/tools/<slug>.ts, drizzle/ (generated SQL)
  shared/   src/api/*.ts (request/response schemas), constants.ts, queue.ts
  tools/    src/<slug>/{schema,index}.ts + test, registry.ts, execute.ts, storage/
  config/   tsconfig/, eslint/, prettier.js
scripts/    new-tool.ts, smoke.mjs, setup-env.mjs
infra/      caddy/Caddyfile (full stack proxy), postgres/init (creates anytools_test)
```

## Commands

```bash
docker compose up -d        # Postgres :5442, Redis :6390 (non-default host ports on purpose)
pnpm install                # also creates apps/*/.env and packages/db/.env from .env.example
pnpm db:migrate && pnpm db:seed
pnpm dev                    # web :3000, api :4000, worker (health :4100)
pnpm test | pnpm lint | pnpm typecheck | pnpm build
pnpm db:generate            # after editing packages/db/src/schema.ts → new SQL in packages/db/drizzle
pnpm db:studio
pnpm new-tool <slug> [--mode sync|queue] [--category <slug>]
node scripts/smoke.mjs [baseUrl]   # end-to-end check of a running stack (default http://localhost:4000)
docker compose -f docker-compose.full.yml up --build   # production images behind Caddy on :8080
```

API tests are integration tests against the docker-compose Postgres (`anytools_test` DB) and
Redis (DB index 1); override with `TEST_DATABASE_URL` / `TEST_REDIS_URL`.

## Adding a tool (step by step)

1. `pnpm new-tool my-tool --mode sync|queue --category generators`
   (`sync` runs inside the API request; `queue` goes to the worker — use it for images/PDF/heavy work).
2. Logic: `packages/tools/src/my-tool/schema.ts` (Zod input/output + exported constants) and
   `index.ts` (`defineTool({ slug, runMode, input, output, limits, files?, handler })`).
   - Throw `ToolInputError` for user-facing validation errors; anything else becomes a generic `tool_failed`.
   - Queue tools read `ctx.files` and persist results with `ctx.saveFile()` (auto-expire after 30 min).
   - Heavy native modules (e.g. sharp) are imported lazily inside the handler.
   - Check `ctx.signal.throwIfAborted()` between expensive steps (timeouts abort it).
3. Test: `packages/tools/src/my-tool/my-tool.test.ts` using `executeTool` + `createTestOptions`.
4. UI: `apps/web/src/tools/my-tool/index.tsx` (client component receiving `{ run }`).
   `run({ input, files? }, onPhase?)` handles the unlock dialog, the API call, job polling and
   analytics. Swallow `UnlockCancelledError`. Wrap UI texts in `messages/{es,en}.json` (keys must match).
5. Catalog: fill ES/EN texts in `packages/db/src/seed-data/tools/my-tool.ts`, then `pnpm db:seed`.
   Set `status: "published"` when ready (drafts are only listed when `SHOW_DRAFT_TOOLS=true`).
6. `pnpm test && pnpm typecheck && pnpm lint`.

Registries are explicit lists with `// new-tool:imports` / `// new-tool:entries` markers
(`packages/tools/src/registry.ts`, `apps/web/src/tools/registry.ts`, `packages/db/src/seed-data/tools/index.ts`).
Keep the markers.

## Unlock security rules (do not break)

- **The server decides. Never trust the browser.** The frontend only shows the ad and asks for a token.
- Flow: `POST /api/unlock/start {toolSlug, turnstileToken}` (Turnstile verified server-side, rate
  limited) → `pending` session → ad → `GET /api/unlock/:id/status` → only when the `AdProvider`
  verifies it, a **JWT (HS256, jose) for that tool, that visitor, 5 minutes** is issued.
- Expiry is anchored to `verified_at` and `jti` = session id, so polling never extends the window.
  The `jti` lives in Redis (`unlock:jti:*`) so tokens can be revoked (`UnlockTokenService.revoke`).
- `POST /api/tools/:slug/run` guard (`onRequest`, before reading the body): valid, unexpired token,
  same visitor, **same tool**, jti present, and a per-token runs-per-minute budget.
- Providers: `dev` (fake 5 s countdown, refuses to start in production unless `ALLOW_DEV_AD_PROVIDER`),
  `monetag` (minimum time measured on the server, default 20 s), `applixir` (server-to-server
  webhook `GET /api/webhooks/ads/applixir`, `md5(gameApiKey+gameId+userId+tid+secret)` compared
  in constant time, dedupe by unique `provider_tx_id`; duplicates → 200 no-op).
- **Never log query strings.** The AppLixir callback carries the secret in plain text; signed file
  URLs are capabilities. The pino serializer keeps only the path — keep it that way.
- Visitor identity: signed, httpOnly, SameSite=Lax cookie `at_vid` (Secure in production).
  `request.actor = { visitorId, userId: null }` is the seam for future accounts.
- The token is kept **in memory only** on the client (no localStorage). The client uses
  `expiresInMs` (not its own clock) to know when it ends.
- The "most used" ranking only counts a client `tool_used` event after the server confirmed a
  real run of that tool by that visitor (`PopularityService.markEligible`).
- Bypass tests in `apps/api/test/unlock-bypass.test.ts` and webhook tests must keep passing.

## Conventions

- Code, identifiers and comments in English; visible UI text in Spanish and English (next-intl).
- Strict TypeScript everywhere; validate every boundary with Zod (env, requests, responses, tool I/O).
- Env is validated at startup with a readable error (`apps/*/src/env.ts`, web: `src/lib/env.ts`).
- Node packages are ESM with NodeNext resolution: relative imports end in `.js`.
- Workspace packages export sources under the `@anytools/source` condition (dev/tests/typecheck
  need no build) and `dist/` for production. Production builds go through `turbo run build`.
- API and worker are stateless: all state in Postgres/Redis/storage, so they can scale out.
- The web never talks to Postgres; Server Components read the catalog from the API
  (`API_INTERNAL_URL`), the browser calls relative `/api/...` (dev: Next rewrite to :4000).
- Web runtime config is read per request on the server (no `NEXT_PUBLIC_*`), so one image fits every env.
- Errors use the `{ error: { code, message, details? } }` shape (`ApiErrorCode` in shared).
- Third-party analytics (PostHog, Clarity) load only when their keys are set; tool areas are
  marked `ph-no-capture` / `data-clarity-mask` and inputs are masked.
- Next.js 16: read `node_modules/next/dist/docs/` before using unfamiliar APIs (`proxy.ts`
  instead of middleware, async `params`, `next/root-params`).
- On Windows, stopping `pnpm dev` from some terminals can leave orphan `node` processes on
  :3000/:4000/:4100 — kill them before restarting.

## Deployment notes

- Coolify: `docker-compose.coolify.yml` (GHCR images, inline Caddyfile, `migrate` one-shot running
  migrations + seed each deploy, Coolify magic `SERVICE_PASSWORD_*` secrets). Guide: `docs/deploy-coolify.md`.
  Blank env values are treated as unset (`withoutEmptyEnv`), so `${VAR:-}` placeholders are safe.

- CI (`.github/workflows/ci.yml`): PRs run lint, typecheck, test, build; pushes to `main` also
  publish `ghcr.io/<owner>/anytools-{web,api,worker}` (`latest` + commit sha).
- Run migrations before starting new API containers:
  `node node_modules/@anytools/db/dist/migrate.js` (seed: `.../dist/seed.js`) in the API image.
- Production env: `TRUST_PROXY=1` (Traefik hop; never `true`), `TRUST_CLOUDFLARE_HEADERS=true`
  only if the origin accepts traffic exclusively from Cloudflare (firewall to Cloudflare IP ranges
  or Authenticated Origin Pulls) — otherwise per-IP rate limits can be bypassed with spoofed
  headers. Also `STORAGE_DRIVER=s3` (R2), real Turnstile keys, `AD_PROVIDER=monetag|applixir`,
  strong random secrets.
- Monetag is soft protection: it is verified by elapsed time only (no server confirmation on
  regular websites), so a script that waits the minimum time gets a token. Turnstile, the per-IP
  daily cap (`UNLOCK_MAX_PER_IP_PER_DAY`) and rate limits bound the abuse; AppLixir (server
  callback) is the strong option.
