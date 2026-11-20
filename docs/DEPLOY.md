# Clearline Dental — CI, endurecimiento y deploy (Fase 6)

> Estado: **propuesta para revisión.** No se implementa nada hasta que se apruebe este documento.
>
> Reglas: Renzzo configura todos los secretos y los ajustes de Railway / Cloudflare / GitHub.
> Este documento solo nombra variables (nunca valores). Solo commits locales; nunca `git push`.
> **No se usa `railway.json` ni `railway.toml`** (Railway deja de leerlos el 2026-12-01): toda la
> configuración de Railway vive en el dashboard y está documentada en la sección 4.

---

## 1. Resumen de la arquitectura

```
                 clearline.renzzogg.com  (Cloudflare DNS → Railway)
                              │  HTTPS
                              ▼
        ┌─────────────────────────────────────────────┐
        │ Servicio "web" (un solo contenedor)         │
        │  gunicorn + Django                          │
        │   · /api/*        → DRF                     │
        │   · /admin/       → Django admin            │
        │   · /static/*     → WhiteNoise (admin, DRF) │
        │   · /assets/* ... → WhiteNoise (build Vite) │
        │   · /* (resto)    → index.html de la SPA    │
        └──────────────────────┬──────────────────────┘
                               │ DATABASE_URL (red privada)
        ┌──────────────────────▼──────────────────────┐
        │ Servicio "Postgres" (plantilla de Railway)  │
        └─────────────────────────────────────────────┘
        ┌─────────────────────────────────────────────┐
        │ Servicio "demo-reset" (cron diario)         │
        │  misma imagen, corre `reset_demo` y termina │
        └─────────────────────────────────────────────┘
```

**Decisión clave: un solo servicio web, sin servicio de frontend aparte.**
Django sirve el build de Vite con **WhiteNoise** (ya aprobado) y la API en el mismo dominio:
- **Sin CORS** (mismo origen) y **sin proxy** que mantener.
- **Lo más ligero posible para el plan Hobby:** 2 servicios siempre encendidos (web + Postgres)
  en lugar de 3, y un cron que solo corre unos segundos al día.
- Alternativa descartada: un servicio de frontend (Caddy/nginx) que haga proxy de `/api` al backend.
  Es el patrón clásico, pero suma un contenedor más (más RAM y costo) y una imagen nueva que habría
  que aprobar. Comparación: es como desplegar un Next.js que sirve también tu API, en vez de Vercel
  para el front y otro servidor para el back.

**Cómo se construye:** un `Dockerfile` **en la raíz del repo** (multi-stage, Railway lo detecta solo):
1. Etapa `node:22-alpine`: `npm ci` + `npm run build` del frontend.
2. Etapa `python:3.13-slim`: dependencias con `uv`, copia el backend y el `dist/` del frontend,
   corre `collectstatic`. Usuario no-root. Los `Dockerfile` de `backend/` y `frontend/` siguen siendo
   solo para desarrollo local con Docker Compose.

**Detalles del servido de la SPA:**
- `WHITENOISE_ROOT` = `dist/` → `/assets/*`, `/img/*`, `/robots.txt`, `/favicon.svg`.
  Los archivos con hash de `/assets/` llevan `Cache-Control: immutable` (1 año).
- Una vista catch-all devuelve `index.html` (con `Cache-Control: no-cache`) para cualquier ruta que
  no sea `/api/`, `/admin/` ni `/static/` → las rutas de React (`/book`, `/dashboard`) funcionan al
  recargar.
- El plugin `route-preload` sigue funcionando igual (está dentro de `index.html`).

---

## 2. CI (GitHub Actions)

Archivo: `.github/workflows/ci.yml`. Corre en **cada push y cada pull request**. Sin secretos:
el `DJANGO_SECRET_KEY` de CI se genera al vuelo en el propio job (es desechable).

| Job | Pasos | Detalles |
|-----|-------|----------|
| **backend** | `ruff check` · `ruff format --check` · `pytest --cov` | Servicio `postgres:17-alpine` del runner. `astral-sh/setup-uv` con caché. Cobertura mínima **85 %** (`--cov-fail-under=85`, meta del plan). |
| **frontend** | `npm ci` · `eslint` · `tsc -b` · `vitest` · `npm run build` · `npm run budgets` | `actions/setup-node` (Node 22, caché de npm). Si un presupuesto se rompe, el job falla. |
| **e2e** | Build de la imagen de producción + Postgres con `docker compose -f docker-compose.e2e.yml` · `seed` + `reset_demo` · Playwright (Chromium) | Corre después de que `backend` y `frontend` pasan. Prueba la **misma imagen** que irá a Railway. |

**Pruebas E2E (Playwright, `frontend/e2e/`)** — 3 pruebas de humo:
1. **Sitio público:** `/` carga, el CTA "Book a visit" es visible, sin errores de consola.
2. **Reserva de punta a punta:** un paciente nuevo elige servicio → dentista → horario → se registra →
   confirma → ve "You're booked!".
3. **Recepción confirma:** login con la cuenta demo de recepción → encuentra esa cita en el dashboard →
   la confirma → el estado cambia a "Confirmed".

Las contraseñas demo de CI también se generan al vuelo dentro del job (no son secretos del repo).
Si un E2E falla, el job sube el reporte HTML y las capturas como *artifact*.

Acciones usadas (ya aprobadas): `actions/checkout`, `actions/setup-python`, `actions/setup-node`,
`astral-sh/setup-uv`. **Una nueva que pediría aprobar:** `actions/upload-artifact` (solo para subir
el reporte de Playwright cuando algo falla). Si prefieres no agregarla, se omite.

Dependencias nuevas que esta fase usa y **ya están aprobadas**: `gunicorn`, `whitenoise`,
`pytest-cov`, `@playwright/test`. No hace falta ninguna otra.

---

## 3. Endurecimiento para producción

**Throttling (DRF)** — `ScopedRateThrottle`, contador compartido en la base de datos
(`DatabaseCache` de Django, sin Redis) para que funcione con varios workers de gunicorn:

| Scope | Endpoints | Límite propuesto |
|-------|-----------|------------------|
| `auth_login` | `POST /api/auth/token/` | 10 / min por IP |
| `auth_register` | `POST /api/auth/register/` | 5 / hora por IP |
| `auth_refresh` | `POST /api/auth/token/refresh/` | 30 / min por IP |
| `booking` | `POST /api/appointments/` | 20 / hora por usuario |
| `availability` | `GET /api/availability/` | 120 / min por IP |

Respuesta al exceder: `429` con `Retry-After`. Detrás del proxy de Railway, la IP real viene en
`X-Forwarded-For`; se configura `NUM_PROXIES` para no confundir a todos los visitantes con el proxy.

**Settings de producción** (todo por variables de entorno; desarrollo local no cambia):
- `DEBUG = False` por defecto (ya lo es); `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS` desde env.
- `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` (Railway termina TLS).
- `SECURE_SSL_REDIRECT = True`, exceptuando `/api/health/` (el healthcheck interno de Railway entra
  por HTTP; si se redirige, el deploy nunca pasa a "healthy").
- `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_CONTENT_TYPE_NOSNIFF`,
  `X_FRAME_OPTIONS = "DENY"`, `SECURE_REFERRER_POLICY = "same-origin"`.
- **HSTS:** se empieza con `SECURE_HSTS_SECONDS = 3600` y **sin** `includeSubDomains`
  (renzzogg.com tiene otros subdominios); cuando todo funcione, se sube a 1 año por variable.
- CORS: en producción no se necesita (mismo origen); la variable queda vacía.
- `CONN_MAX_AGE = 60` + `CONN_HEALTH_CHECKS` (reutiliza conexiones a Postgres).
- Logs a stdout (Railway los muestra en su panel).
- Swagger (`/api/docs/`) se queda público: es parte del portafolio.

**Servidor:** `gunicorn config.wsgi` con `--workers ${WEB_CONCURRENCY:-2} --threads 2
--timeout 30 --bind 0.0.0.0:$PORT`, en lugar de `runserver`.

**Estáticos:** `collectstatic` en el build de la imagen; WhiteNoise con
`CompressedManifestStaticFilesStorage` (admin + DRF, comprimidos con gzip y con hash).

---

## 4. Railway (todo en el dashboard; sin `railway.json`)

### Servicios

| Servicio | Origen | Qué corre |
|----------|--------|-----------|
| **Postgres** | Plantilla "PostgreSQL" de Railway | Base de datos con volumen persistente |
| **web** | Repo de GitHub, `Dockerfile` de la raíz | gunicorn (sitio + API + admin) |
| **demo-reset** | Mismo repo y `Dockerfile` | Cron diario: `reset_demo` y termina |

### Ajustes del servicio `web` (Settings)

| Ajuste | Valor |
|--------|-------|
| Source → Root Directory | *(vacío = raíz del repo)* |
| Build → Builder | Dockerfile (se detecta solo con `Dockerfile` en la raíz) |
| Deploy → Pre-deploy Command | `python manage.py migrate --noinput && python manage.py createcachetable` |
| Deploy → Custom Start Command | *(vacío: usa el `CMD` del Dockerfile = gunicorn)* |
| Deploy → Healthcheck Path | `/api/health/` |
| Deploy → Healthcheck Timeout | `120` segundos |
| Deploy → Restart Policy | On Failure (máx. 3 reintentos) |
| Deploy → Serverless (App Sleeping) | **Apagado** (ver sección 7) |
| Networking → Custom Domain | `clearline.renzzogg.com` (puerto 8080, el `$PORT` que asigna Railway) |
| Regions | La más cercana a tus usuarios (p. ej. US West) |

### Ajustes del servicio `demo-reset`

| Ajuste | Valor |
|--------|-------|
| Source / Build | Igual que `web` (mismo repo y `Dockerfile`) |
| Deploy → Custom Start Command | `python manage.py reset_demo` |
| Deploy → Cron Schedule | `0 9 * * *` (09:00 UTC = 02:00 en Hermosillo) |
| Deploy → Healthcheck | *(sin healthcheck: es un job que termina)* |
| Networking | Sin dominio público |

### Variables de entorno (**solo nombres**; tú pones los valores)

Servicio `web` y `demo-reset` (las mismas en ambos; Railway permite "Shared Variables"):

| Variable | Para qué |
|----------|----------|
| `DJANGO_SECRET_KEY` | Llave de Django y de los JWT (≥ 50 caracteres, generada por ti) |
| `DATABASE_URL` | Referencia al Postgres: `${{Postgres.DATABASE_URL}}` |
| `DJANGO_ALLOWED_HOSTS` | Tu dominio + el dominio `*.up.railway.app` del servicio |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://` + tu dominio (para el admin) |
| `DJANGO_SECURE_HSTS_SECONDS` | Duración de HSTS (empieza bajo, sube después) |
| `WEB_CONCURRENCY` | Workers de gunicorn (2) |
| `DEMO_MODE` | Activa el modo demo (`true`) |
| `DEMO_RECEPTIONIST_PASSWORD` | Contraseña de la cuenta demo de recepción (se mostrará en el login) |
| `DEMO_PATIENT_PASSWORD` | Contraseña de la cuenta demo de paciente (se mostrará en el login) |

`PORT` lo pone Railway solo. `.env.example` se actualizará con estos nombres y placeholders.

---

## 5. Modo demo público

**Cuentas demo** (creadas por `reset_demo`, con contraseñas de las variables de entorno):
- Recepción: usuario `demo-reception`, rol `receptionist` (no es superusuario ni entra al admin).
- Paciente: `demo.patient@clearline.test`, rol `patient`, con un par de citas propias.

**En la página de login:** si `DEMO_MODE` está activo, un endpoint público `GET /api/demo/` devuelve
los usuarios y contraseñas demo; la página muestra una tarjeta "Try the demo" con botones
"Sign in as reception" / "Sign in as patient" que llenan el formulario. Las contraseñas demo son
públicas por diseño, pero viven en variables (no en el repo) para poder rotarlas sin commit.
Con `DEMO_MODE` apagado, el endpoint responde 404 y la tarjeta no aparece.

**Protecciones de la demo:**
- Las cuentas demo no pueden cambiar su contraseña ni borrarse (validación en el backend).
- El throttling de la sección 3 limita el abuso (registros, logins, reservas).
- El sitio ya dice "fictional clinic — no real appointments are made".

**Reset nocturno (`python manage.py reset_demo`):**
1. Borra las citas, pacientes y cuentas de pacientes creadas por visitantes.
2. Vuelve a sembrar dentistas, servicios, pacientes y citas (el `seed` actual).
3. Recrea las dos cuentas demo con las contraseñas de las variables.
4. Nunca toca superusuarios ni cuentas de staff que no sean demo.
Todo en una transacción: si algo falla, la base queda como estaba. Corre como servicio cron de Railway.

---

## 6. Pasos que haces tú (en orden)

**A. GitHub** (antes de empujar)
1. Haz `git push` de `main` cuando estés listo. Actions corre solo (no necesita secretos).
2. En el repo → *Actions*: verifica que el workflow **CI** quede en verde.
3. (Opcional) *Settings → Branches*: protege `main` exigiendo que pase **CI** antes de hacer merge.

**B. Railway**
1. *New Project → Deploy PostgreSQL* (plantilla oficial).
2. En el mismo proyecto: *New → GitHub Repo → clearline-dental* → nómbralo `web`.
3. En `web` → *Variables*: crea las variables de la sección 4 (genera tú `DJANGO_SECRET_KEY` y las
   contraseñas demo). Para `DATABASE_URL` usa la referencia `${{Postgres.DATABASE_URL}}`.
4. En `web` → *Settings*: pon los ajustes de la tabla de la sección 4 (pre-deploy, healthcheck,
   restart policy, App Sleeping apagado).
5. *Networking → Generate Domain* (para probar con `*.up.railway.app`) y luego
   *Custom Domain → `clearline.renzzogg.com`*. Railway te mostrará el registro CNAME a crear.
6. Despliega y revisa en *Deployments* que el healthcheck pase.
7. *New → GitHub Repo* otra vez (mismo repo) → nómbralo `demo-reset` → mismas variables (o
   "Shared Variables") → *Start Command* y *Cron Schedule* de la sección 4.
8. Corre `demo-reset` una vez a mano (*Deployments → Run now* o redeploy) para crear las cuentas demo.
9. (Opcional) Superusuario propio: en `web` → *⋯ → Railway Shell* (o `railway run` en tu máquina):
   `python manage.py createsuperuser`.

**C. Cloudflare** (zona `renzzogg.com`)
1. *DNS → Add record*: tipo **CNAME**, nombre `clearline`, destino = el que te dio Railway.
2. Proxy status: **DNS only (nube gris)**. Railway emite y renueva el certificado TLS; con el proxy
   naranja hay que ajustar SSL a "Full" y depurar cachés dobles — no vale la pena para esta demo.
3. Espera a que Railway marque el dominio como verificado.

**D. Avísame** cuando el dominio responda: corro Lighthouse contra la URL real (`/`, `/book`,
`/login`, móvil y escritorio) y reviso headers de seguridad y caché.

---

## 7. Estimación de uso en Railway (plan Hobby)

> Los precios cambian; verifica los vigentes en la página de precios de Railway. Referencia usada:
> Hobby = US$5/mes que incluye US$5 de consumo; ~US$10 por GB-mes de RAM, ~US$20 por vCPU-mes,
> ~US$0.15 por GB-mes de volumen, ~US$0.05 por GB de salida.

| Servicio | RAM típica | CPU típica (demo con poco tráfico) | Costo aprox./mes |
|----------|-----------|-------------------------------------|------------------|
| web (gunicorn, 2 workers) | ~180 MB | ~0.01–0.02 vCPU | ~US$2.0–2.3 |
| Postgres | ~100–150 MB | ~0.01 vCPU | ~US$1.2–1.7 |
| Volumen de Postgres | < 0.5 GB | — | ~US$0.08 |
| demo-reset (cron, ~20 s/día) | — | — | < US$0.05 |
| Salida de red | < 2 GB (sitio de ~250 KB por visita) | — | < US$0.10 |
| **Total** | | | **~US$3.5–4.3** (dentro de los US$5 incluidos) |

Palancas si se acerca al límite: `WEB_CONCURRENCY=1` (≈ −60 MB) o activar *App Sleeping* en `web`
(ahorra casi todo el costo del servicio, pero la primera visita tras dormir tarda unos segundos en
despertar, lo cual afecta a una demo de portafolio y a Lighthouse; por eso queda apagado).

---

## 8. Sub-fases de implementación

Cada una: construir → verificar yo mismo → commit(s) locales.

| Fase | Contenido | Cómo lo verifico |
|------|-----------|------------------|
| **6.1 Producción** | `Dockerfile` raíz, gunicorn, WhiteNoise + SPA, settings de seguridad, throttling | Imagen de producción local + Postgres: headers, redirecciones, 429, SPA al recargar, admin con estáticos |
| **6.2 Demo** | Cuentas demo, `GET /api/demo/`, tarjeta en el login, `reset_demo`, protecciones | Tests de pytest + prueba manual con Playwright |
| **6.3 CI + E2E** | `ci.yml`, `docker-compose.e2e.yml`, 3 pruebas Playwright, cobertura ≥ 85 % | Corro los mismos comandos localmente (incluida la imagen de producción) |
| **6.4 Docs** | `.env.example`, este documento con lo final, README de despliegue | — |
| **6.5 Post-deploy** | Lighthouse y revisión de headers contra `clearline.renzzogg.com` | Cuando me avises que el deploy está arriba |
