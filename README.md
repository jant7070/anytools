# Any Tools

Sitio público con herramientas web (pixelar fotos, generar contraseñas, …). Cada herramienta se
desbloquea viendo un anuncio breve, **solo esa herramienta y durante 5 minutos**. El servidor decide
siempre si el anuncio cuenta.

- **Web:** Next.js 16 + Tailwind 4 + next-intl (`/es`, `/en`)
- **API:** Fastify 5 + Zod 4
- **Worker:** BullMQ (tools pesadas)
- **Datos:** Postgres 16 (Drizzle) + Redis 7
- **Monorepo:** pnpm + Turborepo, TypeScript estricto

## Requisitos

- **Node.js 24 LTS**
- **pnpm 12** (versión fijada en `package.json#packageManager`). Cualquiera de estas opciones:
  - `corepack enable pnpm` (usa automáticamente la versión del proyecto)
  - `npm i -g pnpm@12`
- **Docker Desktop**
- git

## Puesta en marcha

```bash
docker compose up -d     # Postgres en :5442 y Redis en :6390
pnpm install             # crea los .env de cada app a partir de .env.example
pnpm db:migrate
pnpm db:seed
pnpm dev                 # web :3000 · api :4000 · worker
```

Abre <http://localhost:3000>. `/` redirige a `/es` o `/en` según `Accept-Language`.

En local:

- El anuncio es falso, con una cuenta regresiva de 5 s.
- Turnstile usa las claves de prueba de Cloudflare.
- Las 10 tools del seed están en `draft` y se muestran porque `SHOW_DRAFT_TOOLS` vale `true` en desarrollo.
- Están implementadas el **generador de contraseñas** y **pixelar/difuminar foto**.

> Los puertos 5442/6390 evitan choques con otros Postgres/Redis locales. Puedes cambiarlos con
> `POSTGRES_HOST_PORT`/`REDIS_HOST_PORT`; si lo haces, actualiza también `DATABASE_URL` y `REDIS_URL` en los `.env`.

## Comandos

| Comando                                      | Qué hace                                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                   | Levanta web, API y worker en modo desarrollo                         |
| `pnpm build`                                 | Compila todo (paquetes, API, worker y Next.js standalone)            |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Calidad (los tests de la API usan la DB `anytools_test` del compose) |
| `pnpm db:generate`                           | Genera una migración SQL tras cambiar `packages/db/src/schema.ts`    |
| `pnpm db:migrate` / `pnpm db:seed`           | Aplica migraciones / carga el catálogo (idempotente)                 |
| `pnpm db:studio`                             | Abre Drizzle Studio                                                  |
| `pnpm new-tool <slug>`                       | Crea una tool nueva (ver abajo)                                      |
| `node scripts/smoke.mjs [url]`               | Prueba de punta a punta de un stack en marcha                        |

### Stack completo en contenedores

```bash
docker compose -f docker-compose.full.yml up --build
# http://localhost:8080  (Caddy enruta /api → API y el resto → web, como Traefik en producción)
node scripts/smoke.mjs http://localhost:8080
```

Usa los Dockerfiles de producción y sus propios volúmenes. Puede correr junto al compose de desarrollo.

## Cómo agregar una tool

1. Crea la estructura:

   ```bash
   pnpm new-tool json-formatter --mode sync --category development
   ```

   - `--mode sync` se ejecuta en la API.
   - `--mode queue` va al worker (imágenes, PDF, procesos pesados) y acepta archivos.

   El script crea y registra:
   - la lógica en `packages/tools/src/<slug>/`
   - un test base
   - la UI en `apps/web/src/tools/<slug>/`
   - la fila del seed con traducciones vacías

2. Implementa el `handler` (y su esquema Zod) en `packages/tools/src/<slug>/index.ts` y ajusta el test.
3. Construye la UI en `apps/web/src/tools/<slug>/index.tsx`. Recibe `run()`, que ya gestiona el anuncio, la llamada a la API y la cola.
4. Completa los textos ES/EN en `packages/db/src/seed-data/tools/<slug>.ts` y ejecuta `pnpm db:seed`. Cambia `status` a `"published"` cuando esté lista.
5. Ejecuta `pnpm test && pnpm typecheck && pnpm lint`.

Más detalle (reglas de seguridad del desbloqueo, convenciones, despliegue) en [CLAUDE.md](CLAUDE.md).

## Variables de entorno

Cada app tiene su `.env.example` documentado:

- [`apps/api`](apps/api/.env.example)
- [`apps/worker`](apps/worker/.env.example)
- [`apps/web`](apps/web/.env.example)
- [`packages/db`](packages/db/.env.example)

Todas se validan con Zod al arrancar: si falta algo, el proceso termina con la lista de variables a corregir.

## CI y despliegue

GitHub Actions (`.github/workflows/ci.yml`):

- En cada PR: lint, typecheck, tests (con Postgres y Redis como servicios) y build.
- En cada push a `main`, además: construye y publica `ghcr.io/<owner>/anytools-web`, `-api` y `-worker` (etiquetas `latest` y el SHA del commit).

El despliegue en Coolify se configura aparte. Antes de arrancar una versión nueva de la API, ejecuta las migraciones desde la imagen de la API:

```bash
node node_modules/@anytools/db/dist/migrate.js
```
