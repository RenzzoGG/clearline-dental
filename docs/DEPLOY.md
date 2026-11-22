# Clearline Dental — CI, endurecimiento y deploy (Fase 6)

> Estado: **desplegado** en `clearline.renzzogg.com` (6.1–6.5; App Sleeping encendido, ver sección 7).
> Resultados de la revisión post-deploy y pendientes de configuración: **sección 10**.
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

**Pruebas E2E (Playwright, `frontend/e2e/`)** — 4 pruebas de humo:
1. **Sitio público:** `/` carga, el CTA "Book a visit" es visible, sin errores de consola.
2. **Reserva de punta a punta:** un paciente nuevo elige servicio → dentista → horario → se registra →
   confirma → ve "You're booked!".
3. **Recepción confirma:** login con la cuenta demo de recepción → encuentra esa cita en el dashboard →
   la confirma → el estado cambia a "Confirmed".
4. **Paciente demo:** login con la cuenta demo de paciente → cae en `/` (no en el dashboard; `/dashboard`
   lo regresa al login) → reserva como sí mismo ("Booking as …") → ve "You're booked!".

Contra producción (no es parte de CI): `E2E_BASE_URL=https://clearline.renzzogg.com npx playwright test`.
Crea citas de prueba reales en la demo; el `demo-reset` nocturno las borra.

Las contraseñas demo de CI también se generan al vuelo dentro del job (no son secretos del repo).
Si un E2E falla, el job sube el reporte HTML y las capturas como *artifact*.

Acciones usadas (aprobadas): `actions/checkout`, `actions/setup-python`, `actions/setup-node`,
`astral-sh/setup-uv` y `actions/upload-artifact` (solo para el reporte de Playwright cuando falla).

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
| Deploy → Pre-deploy Command | `python manage.py migrate --noinput` (también crea la tabla de caché del throttling) |
| Deploy → Custom Start Command | *(vacío: usa el `CMD` del Dockerfile = gunicorn)* |
| Deploy → Healthcheck Path | `/api/health/` |
| Deploy → Healthcheck Timeout | `120` segundos |
| Deploy → Restart Policy | On Failure (máx. 3 reintentos) |
| Deploy → Serverless (App Sleeping) | **Encendido** (ver sección 7: arranque en frío) |
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

### Variables de entorno

Las dos primeras son **secretos**: los generas tú y nunca van al repo ni al chat. El resto no son
secretos; te indico el valor sugerido. Mismas variables en `web` y `demo-reset` (usa *Shared
Variables* del proyecto).

| Variable | Tipo | Valor sugerido / para qué |
|----------|------|---------------------------|
| `DJANGO_SECRET_KEY` | **Secreto** | ≥ 50 caracteres aleatorios (también firma los JWT) |
| `DEMO_RECEPTIONIST_PASSWORD` | Público por diseño | Contraseña de `demo-reception`; se muestra en el login |
| `DEMO_PATIENT_PASSWORD` | Público por diseño | Contraseña del paciente demo; se muestra en el login |
| `DATABASE_URL` | Referencia | `${{Postgres.DATABASE_URL}}` (red privada de Railway) |
| `DJANGO_ALLOWED_HOSTS` | Config | `clearline.renzzogg.com,healthcheck.railway.app` (sin `*.up.railway.app`, a propósito: ver abajo) |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Config | `https://clearline.renzzogg.com` |
| `DJANGO_HTTPS` | Config | `true` (redirección a HTTPS, cookies seguras, HSTS) |
| `DJANGO_SECURE_HSTS_SECONDS` | Config | `3600` al principio; `31536000` cuando todo funcione |
| `DJANGO_NUM_PROXIES` | Config | `1` (respaldo si falta el header de abajo) |
| `DJANGO_CLIENT_IP_HEADER` | Config | `X-Real-IP` (el edge de Railway lo sobrescribe con la IP real; es la que usa el throttling, ver sección 10) |
| `WEB_CONCURRENCY` | Config | `2` (o `1` para ahorrar RAM) |
| `DEMO_MODE` | Config | `true` |

`PORT` lo pone Railway solo. `healthcheck.railway.app` debe estar en `DJANGO_ALLOWED_HOSTS`: es el
`Host` con el que llega el healthcheck de Railway. `.env.example` tiene todos los nombres con
placeholders.

**Dominio canónico único (decisión de la fase 6):** `<tu-servicio>.up.railway.app` **no** va en
`DJANGO_ALLOWED_HOSTS`, así que Django responde **400** a cualquier petición con ese `Host`. Es a
propósito: un solo dominio público (`clearline.renzzogg.com`) evita contenido duplicado para buscadores,
mantiene HSTS y cookies atados a un solo origen y deja una sola URL que monitorear. Alternativa
descartada: redirigir con 301 desde `*.up.railway.app` (requiere middleware propio para ganar poco en
una demo). Si alguna vez hace falta probar sin el dominio propio, agrégalo temporalmente a ambas
variables y quítalo después.

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
   restart policy, App Sleeping encendido).
5. *Networking → Generate Domain* (opcional; `*.up.railway.app` responde 400 a propósito, ver
   sección 4) y luego *Custom Domain → `clearline.renzzogg.com`*. Railway te mostrará el registro CNAME a crear.
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
   ⚠️ En 6.5 el registro estaba en **naranja (proxied)**: Cloudflare inyecta su script de detección de
   bots en cada página (−10 a −17 puntos de Lighthouse móvil) y rompe el conteo del throttling por IP.
   Ver sección 10.
3. Espera a que Railway marque el dominio como verificado.

**D. Avísame** cuando el dominio responda: corro Lighthouse contra la URL real (`/`, `/book`,
`/login`, móvil y escritorio) y reviso headers de seguridad y caché.

---

## 7. Estimación de uso en Railway (plan Hobby) y App Sleeping

> Los precios cambian; verifica los vigentes en la página de precios de Railway. Referencia usada:
> Hobby = US$5/mes que incluye US$5 de consumo (compartido con tus otros proyectos: Stocktill, Pulse,
> portafolio); ~US$10 por GB-mes de RAM, ~US$20 por vCPU-mes, ~US$0.15 por GB-mes de volumen,
> ~US$0.05 por GB de salida.

**App Sleeping encendido en `web`** (decisión aprobada): si el servicio no envía tráfico de salida
durante ~10 minutos, Railway lo duerme y deja de cobrar su CPU/RAM. La siguiente petición lo despierta.

| Servicio | RAM típica | CPU típica | Costo aprox./mes |
|----------|-----------|------------|------------------|
| web (gunicorn, 2 workers), despierto unas pocas horas al día | ~180 MB mientras está despierto | ~0.01–0.02 vCPU | ~US$0.2–0.6 |
| Postgres (siempre encendido) | ~100–150 MB | ~0.01 vCPU | ~US$1.2–1.7 |
| Volumen de Postgres | < 0.5 GB | — | ~US$0.08 |
| demo-reset (cron, ~20 s/día) | — | — | < US$0.05 |
| Salida de red | < 2 GB (~250 KB por visita) | — | < US$0.10 |
| **Total** | | | **~US$1.6–2.5/mes** |

**Arranque en frío (cold start) — qué implica y cómo queda cubierto:**
- La primera visita después de dormir espera a que arranque el contenedor (Django + gunicorn):
  típicamente **unos segundos**. Las siguientes son normales. Medido en 6.5: ver sección 10.
- **Nada pesado al arrancar:** las migraciones (incluida la tabla de caché) corren en el
  *Pre-deploy Command* (una vez por deploy), no al despertar. El `CMD` de la imagen solo lanza gunicorn.
- **El healthcheck** de Railway solo se usa al desplegar; despertar no lo vuelve a correr.
- **Los datos demo no dependen de `web`:** viven en Postgres (siempre encendido) y los rehace el cron
  `demo-reset`, que corre aunque `web` esté dormido.
- **Nada que lo mantenga despierto sin querer:** sin pings salientes ni telemetría; las conexiones a
  Postgres inactivas no envían tráfico.
- **Lighthouse en producción** (6.5): se mide con el servicio ya despierto (una petición previa) y el
  tiempo del arranque en frío se reporta aparte, para no mezclar ambas cosas.

Palanca extra si hiciera falta: `WEB_CONCURRENCY=1` (≈ −60 MB mientras está despierto).

---

## 8. Sub-fases de implementación

Cada una: construir → verificar yo mismo → commit(s) locales.

| Fase | Contenido | Cómo lo verifico |
|------|-----------|------------------|
| **6.1 Producción** | `Dockerfile` raíz, gunicorn, WhiteNoise + SPA, settings de seguridad, throttling | Imagen de producción local + Postgres: headers, redirecciones, 429, SPA al recargar, admin con estáticos |
| **6.2 Demo** | Cuentas demo, `GET /api/demo/`, tarjeta en el login, `reset_demo`, protecciones | Tests de pytest + prueba manual con Playwright |
| **6.3 CI + E2E** | `ci.yml`, `docker-compose.e2e.yml`, 3 pruebas Playwright (4 desde 6.5), cobertura ≥ 85 % | Corro los mismos comandos localmente (incluida la imagen de producción) |
| **6.4 Docs** | `.env.example`, este documento con lo final, README de despliegue | — |
| **6.5 Post-deploy** | Lighthouse y revisión de headers contra `clearline.renzzogg.com` | Cuando me avises que el deploy está arriba |

---

## 9. Verificación local (antes de desplegar)

La imagen de producción se puede probar igual que en CI:

```bash
# Variables desechables solo para esta prueba (no son las de Railway):
export E2E_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')"
export E2E_DEMO_RECEPTIONIST_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(16))')"
export E2E_DEMO_PATIENT_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(16))')"
docker compose -f docker-compose.e2e.yml up --build -d --wait
docker compose -f docker-compose.e2e.yml exec web python manage.py reset_demo
# Sitio completo en http://localhost:8088 ; E2E: cd frontend && npx playwright test
```

Verificado en la fase 6 con esa imagen: rutas de la SPA, 404 reales para API/assets faltantes,
assets con gzip y caché `immutable`, admin con estáticos con hash, redirección a HTTPS salvo el
healthcheck, HSTS, cookies `Secure`, host desconocido → 400, throttling por IP real,
`check --deploy` limpio, modo demo de punta a punta y los E2E.

---

## 10. Revisión post-deploy (sub-fase 6.5, 2026-11-21)

Medido desde Hermosillo con Lighthouse 12.8 (Chromium de Playwright, perfiles móvil y escritorio
por defecto), con el servicio ya despierto. Reportes HTML/JSON en `.cache/lighthouse-6.5/` (ignorado
por git).

### Lighthouse

| Página | Móvil (clearline.renzzogg.com, vía Cloudflare) | Escritorio (vía Cloudflare) | Móvil (`*.up.railway.app`, sin Cloudflare) |
|--------|------------------|------------------|------------------|
| `/`      | 80 · 100 · 82 · 100 | 98 · 100 · 81 · 100 | **97** · 100 · 100 · 100 |
| `/book`  | 85 · 100 · 82 · 100 | 97 · 100 · 81 · 100 | **94** · 100 · 100 · 100 |
| `/login` | 88 · 100 · 82 · 100 | 98 · 100 · 81 · 100 | **93–99** · 100 · 100 · 100 |

(Rendimiento · Accesibilidad · Buenas prácticas · SEO.) CLS ≈ 0 en todas; TTFB del HTML ≈ 130 ms.
La columna `*.up.railway.app` se midió con ese host habilitado temporalmente; hoy responde 400 a
propósito (dominio canónico único, sección 4).

**Causa de la diferencia:** con el proxy naranja, Cloudflare inyecta
`/cdn-cgi/challenge-platform/scripts/jsd/main.js` (Bot Fight Mode / JavaScript Detections) en cada
página: ~18 KB más de JS y trabajo en el hilo principal (LCP móvil 3.1–3.7 s en vez de 2.1–2.8 s) y
dos avisos de APIs obsoletas (Buenas prácticas 82 en vez de 100). La app es la misma en ambas columnas.
**Arreglo (tú, en Cloudflare):** poner el CNAME `clearline` en **DNS only (nube gris)**, como dice el
paso C.2. Alternativa si quieres conservar el proxy: apagar *Security → Bots → Bot Fight Mode* y
*JavaScript Detections*; pero el throttling seguiría viendo IPs de Cloudflare (ver abajo).

### Headers y caché

- ✅ HSTS (`max-age=3600`, sin `includeSubDomains`), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Cross-Origin-Opener-Policy`, cookies
  `Secure; SameSite=Lax`, HTTP → HTTPS 301, sin páginas de debug, 404 reales para assets/API faltantes.
- ✅ `index.html`: `Cache-Control: no-cache`. `/assets/*` (con hash): `public, max-age=315360000,
  immutable`, gzip. Archivos sin hash (`/robots.txt`, `/favicon.svg`, `/img/*`): WhiteNoise manda 60 s;
  Cloudflare lo sube a 4 h (su *Browser Cache TTL*); con nube gris vuelve a 60 s.
- 🔧 **Arreglado:** `HEAD` respondía **405** en `/`, rutas de la SPA y `/api/health/` (las vistas usaban
  `@require_GET`). Monitores de uptime y algunos crawlers usan `HEAD`. Ahora `@require_safe` (GET + HEAD).
- 🔧 **Arreglado:** el throttling **no funcionaba en producción**: 12 logins fallidos seguidos → ningún
  429 (ni por Cloudflare ni directo a Railway). El edge de Railway reconstruye `X-Forwarded-For` con un
  salto propio que cambia en cada petición, así que con `NUM_PROXIES=1` cada intento parecía otro
  cliente. Railway sobrescribe `X-Real-IP` con la IP real del cliente: la nueva clase
  `apps.core.throttling.ClientIPScopedRateThrottle` usa ese header cuando
  `DJANGO_CLIENT_IP_HEADER=X-Real-IP` (vacío en local/CI = comportamiento normal de DRF, porque ahí
  nadie lo sobrescribe y se podría falsificar). Con el proxy naranja, `X-Real-IP` sería la IP de
  Cloudflare: otra razón para la nube gris.
- Sin CSP ni `Permissions-Policy`: se queda así para la demo (un CSP estricto requiere quitar los
  estilos inline de Motion y la hoja de Google Fonts; no vale la pena ahora).

### Flujo demo en producción

Las 4 pruebas E2E pasan contra `https://clearline.renzzogg.com`. Además, por API: el paciente demo solo
ve sus propias citas, la cita de otro paciente → 404, `/api/patients/` como paciente → 403, citas sin
sesión → 401.

### Arranque en frío (App Sleeping)

**No se pudo medir: el servicio no se durmió.** Dos intentos sin que yo mandara tráfico (16 min y
30 min, 21:33–22:20 UTC): la primera petición tardó 0.22 s y 0.21 s, igual que con el servicio
despierto. App Sleeping solo duerme el servicio si **no envía tráfico de salida** durante ~10 min, y
cualquier visita (incluidos bots que lleguen por el dominio público) cuenta. Qué revisar en Railway →
`web`: *HTTP Logs* entre esas horas (¿hubo peticiones de alguien más?) y si el deployment llega a
mostrarse como *Sleeping*. Cuando duerma, mídelo con
`curl -o /dev/null -w '%{time_total}\n' https://clearline.renzzogg.com/` tras ≥ 15 min sin tráfico.

### Pendientes tuyos (en orden)

1. Railway → `web` y `demo-reset` → *Variables*: agregar `DJANGO_CLIENT_IP_HEADER=X-Real-IP`.
2. Cloudflare → DNS → `clearline`: **DNS only (nube gris)**. Railway emitirá su propio certificado;
   espera a que el dominio salga verificado en *Networking*.
3. `git push` (despliega `HEAD` + throttling).
4. Verificar: 11 logins fallidos seguidos en un minuto → el 11.º responde **429**; `curl -I` a `/` → 200;
   `server:` ya no dice `cloudflare`.
5. Revisar por qué `web` no se duerme (arriba, "Arranque en frío").
6. Después, HSTS: ver la recomendación de abajo.

### Cuándo subir `DJANGO_SECURE_HSTS_SECONDS` a `31536000`

Cuando el dominio ya sirva HTTPS directo desde Railway (pasos 1–4 hechos) y lleve **unos días (≈ 1
semana) sin errores de certificado** con `3600`. Riesgo real: con HSTS de un año, si el certificado
falla los navegadores que ya visitaron no dejan "continuar de todos modos" durante un año. Como no lleva
`includeSubDomains` ni `preload`, solo afecta a `clearline.renzzogg.com` y se puede bajar de nuevo (los
navegadores lo actualizan en la siguiente visita por HTTPS). No lo subas *antes* del cambio de nube
naranja → gris: el certificado cambia de Cloudflare a Railway en ese momento.
