# CLAUDE.md — Clearline Dental

Sistema de citas para una clínica dental ficticia. Proyecto de portafolio **y de aprendizaje**.
El plan completo está en [`docs/PLAN.md`](docs/PLAN.md).

## Stack

- **Backend:** Django + Django REST Framework + PostgreSQL
- **Frontend:** React + TypeScript + Vite + Tailwind + Motion
- **Infra:** Docker Compose, GitHub Actions, Railway
- **Tests:** pytest (backend), Vitest (frontend), Playwright (E2E)
- **Futuro:** chatbot en n8n que agenda citas a través de esta API

## Reglas del repo (obligatorias)

1. **Solo commits locales. NUNCA `git push`** (ni `--force`, ni a ningún remoto). El usuario hace push.
2. **Secretos:** nunca leer, imprimir ni commitear secretos reales.
   - Los valores reales viven en `.env` (en `.gitignore`). No abrir `.env` ni hacer `cat`/`echo` de sus variables.
   - `.env.example` lleva solo placeholders (`changeme`, `your-secret-here`) y se mantiene sincronizado con las variables que usa el código.
   - Nunca hardcodear secretos en settings, Dockerfiles, workflows ni tests.
3. **Dependencias:** preguntar antes de agregar cualquier dependencia (Python, npm, imagen Docker, GitHub Action) que **no** esté listada en `docs/PLAN.md` → sección "Dependencias aprobadas". Si se aprueba una nueva, agregarla a esa lista.
4. **Fases pequeñas:** trabajar una fase a la vez (ver `docs/PLAN.md`). Al terminar cada fase, **detenerse** y mostrar un resumen para revisión. No empezar la siguiente fase sin aprobación explícita.
5. **No `rm -rf`.** Borrar archivos puntuales y con intención.

## Cómo explicar (modo aprendizaje)

- Explicar cada decisión importante en **español de México**.
- Comparar con lo que el usuario ya conoce: **Node/Next.js, Drizzle, Supabase, Docker básico**.
  Ej.: "las migraciones de Django son como `drizzle-kit generate` + `migrate`, pero se generan a partir de los modelos".
- Decir el *por qué* y la alternativa descartada en 1–2 líneas, no ensayos.
- El código, nombres de variables y commits van en **inglés**.

## Convenciones

- Commits pequeños, estilo Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Backend: apps Django dentro de `backend/apps/`, settings en `backend/config/`.
- Frontend: código por *feature* en `frontend/src/features/`.
- Accesibilidad: todas las animaciones respetan `prefers-reduced-motion`.
