# Desplegar en Coolify

Producción usa un solo archivo: [`docker-compose.coolify.yml`](../docker-compose.coolify.yml). Levanta
Postgres, Redis, migraciones y seed, API, worker, web y un Caddy interno. Caddy envía `/api/*` a la
API y el resto a la web. Coolify (Traefik) solo publica el servicio `proxy` en
`https://anytools.josemorillo.dev` y se encarga del certificado HTTPS.

Las imágenes salen de GHCR. CI las publica en cada push a `main`:
`ghcr.io/jant7070/anytools-{web,api,worker}:latest`.

## 1. Que el VPS pueda descargar las imágenes

GHCR publica los paquetes como **privados**. Elige una opción:

- **Hacerlos públicos** (lo más simple; las imágenes no contienen secretos):
  1. Abre `https://github.com/jant7070?tab=packages`.
  2. En cada paquete (`anytools-web`, `anytools-api`, `anytools-worker`), entra en **Package settings → Change visibility → Public**.
- **Mantenerlos privados:**
  1. Crea un token de GitHub (classic) con el permiso `read:packages`.
  2. En el VPS, ejecuta `docker login ghcr.io -u jant7070` y usa el token como contraseña.

## 2. Cloudflare

1. **DNS:** crea un registro `A` llamado `anytools` que apunte a la IP del VPS, con el proxy activado (nube naranja).
2. **SSL/TLS:** pon el modo en **Full (strict)**. Si Coolify no consigue el certificado de Let's Encrypt, cambia el registro a "DNS only" (nube gris), espera a que lo emita y vuelve a activar el proxy.
3. **Turnstile:** ve a **Turnstile → Add widget** y añade el hostname `anytools.josemorillo.dev`. Guarda la _Site key_ y la _Secret key_.

## 3. Crear el recurso en Coolify

1. Ve a **Projects → (tu proyecto) → + New → Docker Compose Empty**.
2. Pega el contenido de `docker-compose.coolify.yml` y guarda.
3. En el servicio **proxy**, pon el dominio `https://anytools.josemorillo.dev`. No asignes dominio a ningún otro servicio.
4. Abre **Environment Variables** y rellena estas:

| Variable               | Valor                                     |
| ---------------------- | ----------------------------------------- |
| `TURNSTILE_SITE_KEY`   | Site key del widget de Turnstile          |
| `TURNSTILE_SECRET_KEY` | Secret key del widget                     |
| `AD_PROVIDER`          | `monetag`, `applixir` o `dev` (ver abajo) |

Las variables `SERVICE_PASSWORD_*` (contraseña de Postgres y secretos de cookies, JWT y archivos) las
genera Coolify una sola vez y las conserva entre despliegues. No las cambies después: invalidarías
las sesiones y los enlaces de descarga.

### Proveedor de anuncios

- **`monetag`:** además, rellena `MONETAG_ZONE_ID` y `MONETAG_SDK_URL`. Ambos salen del panel de Monetag, de una zona con anuncio recompensado o intersticial. La zona del `sw.js` (12084274) es la del service worker de Multitag; no sirve para esto.
- **`applixir`:** además, rellena `APPLIXIR_API_KEY`, `APPLIXIR_GAME_ID` y `APPLIXIR_SECRET`. En AppLixir, configura el callback como `https://anytools.josemorillo.dev/api/webhooks/ads/applixir`, en modo **MD5 and TID**.
- **`dev`:** muestra el anuncio falso de 5 s. Solo sirve para probar el despliegue antes de tener un proveedor real y exige `ALLOW_DEV_AD_PROVIDER=true`. Con él cualquiera desbloquea gratis, así que no lo dejes en producción.

## 4. Desplegar y comprobar

1. Pulsa **Deploy**. El servicio `migrate` aplica las migraciones y el seed, y termina. Que aparezca como _exited_ es normal.
2. Comprueba estas direcciones:
   - `https://anytools.josemorillo.dev/api/health` responde `{"status":"ok"}`.
   - `https://anytools.josemorillo.dev/es` muestra el sitio.
   - `https://anytools.josemorillo.dev/sw.js` devuelve el archivo de Monetag. Entonces pulsa **Verify** en Monetag.

## 5. Cerrar el origen a Cloudflare (obligatorio)

El compose usa `TRUST_CLOUDFLARE_HEADERS=true`: la API toma la IP real del visitante de la cabecera
`CF-Connecting-IP` para los límites por IP. Si el VPS acepta tráfico que no viene de Cloudflare,
cualquiera puede falsear esa cabecera y saltarse esos límites.

En **DigitalOcean → Networking → Firewalls**, crea un firewall para el droplet:

- **80 y 443:** solo desde los rangos de Cloudflare (<https://www.cloudflare.com/ips/>).
- **22 (SSH), 8000 (panel de Coolify), 6001 y 6002:** solo desde tu IP.

## 6. Actualizaciones

Cada push a `main` publica imágenes nuevas. Para desplegarlas:

- **A mano:** pulsa **Redeploy** en Coolify. El compose usa `pull_policy: always`, así que descarga la versión `latest`.
- **Automático:**
  1. En Coolify, entra en **(recurso) → Webhooks** y copia la _Deploy Webhook_ URL.
  2. Ve a **Keys & Tokens → API tokens** y crea un token con permiso de _deploy_.
  3. En GitHub, entra en **Settings → Secrets and variables → Actions** y añade los secretos `COOLIFY_WEBHOOK_URL` y `COOLIFY_TOKEN`.

  A partir de ahí, el job _Trigger Coolify deploy_ de CI redespliega después de publicar las imágenes. Sin esos secretos, el job no hace nada.

## Notas

- **Herramientas en borrador:** todas siguen en `draft` y se ven porque `SHOW_DRAFT_TOOLS=true`. Cuando publiques herramientas, pon `status: "published"` en `packages/db/src/seed-data/tools/<slug>.ts` y luego `SHOW_DRAFT_TOOLS=false`. El seed se ejecuta en cada despliegue y sobrescribe el catálogo, así que no edites el estado directamente en la base de datos.
- **Archivos:** las subidas y los resultados viven en el volumen `storage`, que comparten la API y el worker, y se borran a los 30 minutos. Para usar Cloudflare R2, añade `STORAGE_DRIVER=s3` y las variables `S3_*` (ver `apps/api/.env.example`) a la API y al worker.
- **Copias de seguridad:** este Postgres no lo gestiona Coolify como base de datos, así que no tiene backups automáticos. Programa un `pg_dump` o migra a una base de datos gestionada.
