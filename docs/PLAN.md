# Clearline Dental — Plan del proyecto

Sistema de citas para una clínica dental ficticia: sitio público animado + flujo de reserva,
dashboard para la clínica, y una API REST que más adelante usará un chatbot de n8n.

> Regla de trabajo: **una fase a la vez**. Al terminar cada fase me detengo para revisión.
> Nada de `git push` (lo hace Renzzo). Commits locales pequeños.

---

## Arquitectura en una imagen

```
                ┌──────────────────────────────┐
  Navegador ──► │ frontend (React + Vite)      │
                │  · sitio público + reserva   │
                │  · dashboard de la clínica   │
                └──────────────┬───────────────┘
                               │ HTTP/JSON + JWT
  n8n chatbot ─────────────────┤  (fase futura)
                               ▼
                ┌──────────────────────────────┐
                │ backend (Django + DRF)       │
                │  /api/...   /api/docs/       │
                │  /admin/                     │
                └──────────────┬───────────────┘
                               │ SQL (psycopg)
                               ▼
                ┌──────────────────────────────┐
                │ db (PostgreSQL)              │
                └──────────────────────────────┘
```

**Monorepo**: `backend/` y `frontend/` viven en este mismo repo (como un monorepo de
Turborepo, pero sin herramienta extra: Docker Compose es quien los une).

---

## Estructura de carpetas (objetivo final)

```
clearline-dental/
├── CLAUDE.md                  # reglas del repo para Claude
├── README.md                  # portafolio (fase 7)
├── docker-compose.yml         # todos los servicios
├── .env.example               # placeholders; el .env real está en .gitignore
├── .gitignore
├── .claude/settings.json      # deny: git push, rm -rf, leer .env
├── .github/workflows/ci.yml   # fase 6
├── docs/
│   ├── PLAN.md
│   ├── architecture.md        # diagrama (fase 7)
│   └── screenshots/
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml         # deps (equivalente a package.json)
│   ├── uv.lock                # lockfile (equivalente a pnpm-lock.yaml)
│   ├── manage.py              # CLI de Django (como "next" o "drizzle-kit")
│   ├── config/                # proyecto Django
│   │   ├── settings.py
│   │   ├── urls.py            # router raíz
│   │   └── wsgi.py / asgi.py
│   ├── apps/
│   │   ├── core/              # healthcheck, utilidades compartidas
│   │   ├── accounts/          # User personalizado + roles
│   │   ├── clinic/            # Patient, Dentist, Service
│   │   └── appointments/      # Appointment + reglas de traslape
│   └── conftest.py            # fixtures de pytest
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/               # router, layouts, providers
│   │   ├── features/
│   │   │   ├── site/          # landing animada
│   │   │   ├── booking/       # flujo de reserva multi-paso
│   │   │   ├── dashboard/     # calendario, estados, gráficas
│   │   │   └── auth/
│   │   ├── components/ui/     # botones, inputs, cards
│   │   ├── lib/               # cliente API, tipos, helpers
│   │   └── hooks/             # useReducedMotion, etc.
│   └── e2e/                   # Playwright
└── n8n/                       # fase futura (workflows exportados)
```

---

## Servicios de Docker Compose

| Servicio   | Imagen / build        | Puerto | Healthcheck                         | Fase |
|------------|-----------------------|--------|-------------------------------------|------|
| `db`       | `postgres:17-alpine`  | 5432   | `pg_isready -U $POSTGRES_USER`      | 1    |
| `backend`  | `./backend`           | 8000   | `GET /api/health/` (verifica la BD) | 1    |
| `frontend` | `./frontend`          | 5173   | Vite dev server responde            | 5    |
| `n8n`      | `n8nio/n8n` (profile) | 5678   | —                                   | futuro |

- `backend` usa `depends_on: db: condition: service_healthy` → no arranca hasta que Postgres
  acepta conexiones (evita el clásico "connection refused" al primer `up`).
- Volumen nombrado `pgdata` para que los datos sobrevivan a `docker compose down`.
- En desarrollo se monta el código como volumen (hot reload). En producción (Railway) se usa
  `gunicorn` y el build del frontend.
- **Un solo comando:** `docker compose up --build`. El contenedor de backend corre
  `migrate` al arrancar (script `entrypoint.sh`).

---

## Dependencias aprobadas

Si algo no está aquí, **se pregunta antes de instalarlo**.

**Backend (Python)**
- `django`, `djangorestframework`
- `psycopg[binary]` — driver de Postgres (como `pg`/`postgres.js` en Node)
- `django-environ` — leer `.env` (como `dotenv` + validación básica)
- `drf-spectacular` — OpenAPI/Swagger (fase 3)
- `django-filter` — filtros en la API, ej. `?dentist=3&date=...` (fase 3)
- `djangorestframework-simplejwt` — JWT (fase 4)
- `django-cors-headers` — CORS para el frontend (fase 3)
- `gunicorn`, `whitenoise` — servidor y estáticos en producción (fase 6)
- Dev/test: `pytest`, `pytest-django`, `pytest-cov`, `factory-boy`, `ruff`
- Gestor de paquetes: **`uv`** (rápido, con lockfile; como `pnpm` para Python)

**Frontend (npm)**
- `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`
- `tailwindcss` + `@tailwindcss/vite` (Tailwind v4)
- `motion` (antes Framer Motion)
- `react-router` — rutas y transiciones de página
- `@tanstack/react-query` — cache/fetch de la API (como SWR)
- `react-hook-form` + `zod` + `@hookform/resolvers` — formularios del flujo de reserva
- `recharts` — gráficas del dashboard
- `date-fns` — fechas
- Dev/test: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`,
  `@playwright/test`, `eslint`, `prettier`
- Aprobadas en la fase 5: `@types/react`, `@types/react-dom` (tipos de React 19),
  `@testing-library/dom` (peer de Testing Library), `@testing-library/user-event`,
  `typescript-eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `globals` (ESLint para TS/React)
- Gestor de paquetes: `npm` (decidido en la fase 5: viene con Node, sin corepack ni pasos extra)

**Infra**
- Imágenes: `python:3.13-slim`, `node:22-alpine`, `postgres:17-alpine`
- GitHub Actions oficiales: `actions/checkout`, `actions/setup-python`, `actions/setup-node`,
  `astral-sh/setup-uv`

> El calendario del dashboard se construirá a mano (grid de CSS + date-fns) para no meter
> una librería pesada. Si se vuelve demasiado, pregunto antes de agregar una.

---

## Fases

### Fase 0 — Planeación ✅
- `CLAUDE.md` con reglas, `.claude/settings.json` (deny `git push`, `rm -rf`, leer `.env`),
  `.gitignore`, este plan.

### Fase 1 — Base con Docker ✅
**Objetivo:** `docker compose up --build` levanta Django + Postgres listos para trabajar.
- Proyecto Django en `backend/` con `uv` y `pyproject.toml`.
- **User personalizado** (`accounts.User`) creado *antes* de la primera migración
  (Django no deja cambiarlo fácilmente después — es el error #1 de los principiantes).
- Settings leídos de variables de entorno; `.env.example` con placeholders.
- `Dockerfile` del backend + `entrypoint.sh` (espera BD → `migrate` → servidor).
- `docker-compose.yml` con `db` y `backend`, healthchecks y volumen `pgdata`.
- Endpoint `GET /api/health/` que hace `SELECT 1` contra la BD.
- **Listo cuando:** un `docker compose up --build` en limpio deja ambos servicios `healthy`
  y `/admin/` carga.

### Fase 2 — Modelos + admin ✅
**Objetivo:** el dominio de la clínica modelado y administrable.
- `Patient`, `Dentist`, `Service` (nombre, duración, precio), `Appointment`
  (paciente, dentista, servicio, inicio, fin, estado: `pending → confirmed → completed`, o `cancelled`).
- **Sin traslapes por dentista**, en dos capas:
  1. Validación en `clean()` → mensaje de error amigable.
  2. `ExclusionConstraint` de Postgres (rango `tstzrange(start, end)` + `btree_gist`) →
     garantía a nivel BD aunque dos requests lleguen al mismo tiempo. Las citas canceladas
     no cuentan.
- Admin de Django personalizado (listas, filtros, búsqueda).
- Comando `seed` con datos ficticios (dentistas, servicios, citas).
- Tests de modelos con pytest (incluido el de traslape).

### Fase 3 — API REST + docs ✅
**Objetivo:** API completa y documentada.
- Serializers + ViewSets + Routers de DRF para los 4 recursos.
- Filtros (`?dentist=`, `?status=`, `?date_from=`), paginación.
- Endpoint de **disponibilidad**: `GET /api/availability/?dentist=&service=&date=` →
  slots libres (clave para el flujo de reserva y para el chatbot de n8n).
- Acción para cambiar estado: `POST /api/appointments/{id}/confirm/`, `/complete/`, `/cancel/`.
- OpenAPI con `drf-spectacular`: Swagger UI en `/api/docs/`.
- CORS para el frontend.
- Tests de API.

### Fase 4 — Auth JWT + roles ✅
**Objetivo:** cada quien ve y hace solo lo que le toca.
- Login/refresh con SimpleJWT (`/api/auth/token/`, `/api/auth/token/refresh/`), `/api/auth/me/`.
- Roles: `admin`, `receptionist`, `patient` (campo `role` en `User`).
- Permisos de DRF:
  - `patient`: solo sus citas (filtrado en `get_queryset`, no solo en el frontend), puede
    reservar y cancelar las suyas.
  - `receptionist`: CRUD de citas y pacientes, cambia estados.
  - `admin`: todo.
- Registro de pacientes; endpoint público de disponibilidad.
- Tests de permisos (un paciente **no** puede ver citas de otro → 404).

### Fase 5 — Frontend ✅
**5a. Sitio público animado**
- Landing con secciones de color, reveals al hacer scroll (`whileInView`), contadores
  animados (pacientes atendidos, años, etc.), transiciones suaves entre páginas
  (`AnimatePresence`).
- **Flujo de reserva multi-paso:** servicio → dentista → fecha/hora → datos → confirmar.
  Barra de progreso animada; checklist lateral donde cada paso se marca ✓ y se tacha en
  tiempo real al completarse.

**5b. Dashboard de la clínica**
- Login; calendario semanal/diario de citas.
- Cambios de estado animados (`pending → confirmed → completed`, este último con
  tachado animado) con actualización optimista (React Query).
- Gráficas: citas por día, por servicio, tasa de cancelación.

**Rendimiento y accesibilidad**
- `useReducedMotion()` en todos los componentes animados → sin movimiento, solo fades o nada.
- Animar solo `transform` y `opacity` (GPU), lazy-load de rutas (`React.lazy`), imágenes
  optimizadas. Meta: Lighthouse móvil ≥ 90.
- Servicio `frontend` agregado a Docker Compose.

### Fase 6 — Tests, CI y deploy
- Backend: pytest con cobertura (meta ≥ 85%).
- Frontend: Vitest + Testing Library para componentes clave (stepper, cambio de estado).
- 3–5 tests E2E con Playwright: reservar cita, login de recepción, confirmar/completar cita.
- GitHub Actions: lint (`ruff`, `eslint`) + tests backend (con servicio Postgres) + tests
  frontend + build. Corre en cada PR y push a `main`.
- Deploy a Railway: Postgres administrado + backend (gunicorn) + frontend estático.
  Variables de entorno configuradas en Railway (nunca en el repo).

### Fase 7 — Portafolio
- README: qué es, stack, diagrama de arquitectura (Mermaid), cómo correrlo, decisiones técnicas.
- Screenshots / GIFs del sitio, reserva y dashboard.
- Imágenes para Upwork (portada + 2–3 capturas con mockup).

### Futuro — Chatbot n8n
- Usuario de servicio con rol propio, usa `/api/availability/` y `POST /api/appointments/`.

---

## Qué voy a aprender en cada fase

| Fase | Aprendizaje clave | Comparación con lo que ya sé |
|------|-------------------|------------------------------|
| 1 | Estructura proyecto/apps de Django, settings por env, healthchecks, `depends_on` con condición | `manage.py` ≈ CLI de Next + drizzle-kit; `pyproject.toml`/`uv` ≈ `package.json`/`pnpm`; Compose como el `supabase start` local pero armado por ti |
| 2 | ORM de Django, migraciones autogeneradas, constraints de Postgres, admin gratis | Modelos ≈ schema de Drizzle, pero `makemigrations` lee las clases (no escribes SQL); el admin ≈ el Table Editor de Supabase, generado desde tu código |
| 3 | Serializers, ViewSets, Routers, OpenAPI automático | Serializer ≈ esquema Zod + mapper; ViewSet ≈ un `route.ts` con GET/POST/PATCH/DELETE ya hechos; Swagger ≈ la API auto-documentada de Supabase (PostgREST) |
| 4 | JWT access/refresh, permisos por rol, filtrar por usuario en el queryset | `get_queryset` por usuario ≈ las políticas RLS de Supabase, pero en la capa de aplicación |
| 5 | Motion (variants, `whileInView`, `AnimatePresence`, layout animations), React Query, accesibilidad de animaciones | Rutas con React Router en vez del App Router de Next; SPA pura en lugar de SSR |
| 6 | pytest + fixtures, Vitest, Playwright, CI con servicio Postgres, deploy de Django | Fixtures de pytest ≈ `beforeEach` de Jest pero inyectadas por nombre; Railway ≈ Vercel + Supabase en un solo lugar |
| 7 | Contar la historia técnica de un proyecto para clientes | — |
