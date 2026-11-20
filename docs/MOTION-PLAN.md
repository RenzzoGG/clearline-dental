# Clearline Dental — Plan de dirección de arte y motion (Fase 5b)

> Alcance: **solo el sitio público** (`/`, `/book`, `/login`). El dashboard sigue funcional y solo recibe
> un pulido ligero. Se aplica el *método* de Pulse Theory, **no su look**: Pulse es oscuro, neón y de alta
> energía; Clearline debe sentirse **tranquilo, limpio, confiable y premium**.
>
> Estado: **propuesta para revisión.** No se construye nada hasta que se apruebe este documento.

---

## 1. Concepto: "La línea clara"

En Pulse, la línea de pulso del logo recorría toda la página. Aquí el hilo conductor sale del propio
nombre de la marca: **Clear-line**.

Una sola línea fina color teal (un trazo SVG) que:

1. **Dibuja una sonrisa** bajo el titular del hero (un arco suave, no una caricatura).
2. **Baja como columna vertebral** de la página y conecta los números de sección (`00` → `06`).
3. **Enmarca las fotos** con trazos que las rodean parcialmente (acentos, no marcos completos).
4. **Avanza paso a paso** en la sección fija "Cómo funciona" (un punto por paso de la reserva).
5. **Se cierra en una sonrisa** alrededor del CTA final.

Por qué funciona para una clínica dental: la *línea de la sonrisa* es un término real de odontología
estética (la curva de los dientes superiores siguiendo el labio inferior). Una línea delgada y precisa
transmite cuidado clínico y calma; un efecto llamativo transmitiría lo contrario.

**Tono visual**
- Paleta clara: blanco, mint y teal (tokens actuales `brand-*`, `mint-*`); coral **solo** para CTAs.
- Mucho espacio en blanco; ritmo editorial con números de sección grandes y composiciones asimétricas.
- Tipografía: **serif de display** (Fraunces o Instrument Serif; se elige con una prueba de legibilidad
  en móvil) para H1/H2 y números grandes + **Plus Jakarta Sans** para interfaz y texto.
- Fotos reales (Pexels/Unsplash, licencia gratuita) con créditos en el footer, como en Pulse. La línea
  clara se dibuja *sobre/alrededor* de las fotos con SVG propio.

---

## 2. Sección por sección

Cada sección define tres comportamientos: **escritorio**, **móvil** y **sin movimiento** (preferencia del
sistema `prefers-reduced-motion` o el toggle de Motion apagado).

| # | Sección | Escritorio | Móvil | Sin movimiento |
|---|---------|------------|-------|----------------|
| 00 | **Hero** | Grid asimétrico 7/5. Titular revelado **por líneas** (máscara `overflow: clip` + `translateY`; el texto es visible desde el primer paint para no castigar el LCP). La línea dibuja la sonrisa bajo "minute." (`pathLength`). CTAs **magnéticos** (solo `pointer: fine`). Tarjeta de reserva de ejemplo flotando. | Una columna; mismo reveal por líneas; sin efecto magnético. CTA arriba del pliegue. | Todo estático, sonrisa ya dibujada. |
| 01 | **Servicios** | Lista editorial numerada: numerales serif grandes, nombre, duración y precio alineados a la derecha. En hover, la línea subraya el servicio. Aparición escalonada. | Lista apilada, sin hover. | Lista estática. |
| 02 | **Cómo funciona** (FIJA / *pinned*) | 4 pasos (Servicio → Dentista → Horario → Listo) en un panel `position: sticky`. El progreso del scroll (`useScroll`) mueve la línea de un paso al siguiente y cambia el contenido del panel. | **Sin pin**: pasos apilados con reveals simples (los pins en móvil suelen trabarse). | Sin pin, pasos apilados. |
| 03 | **La clínica** | Dos fotos asimétricas con **reveal ligado al scroll** (`clip-path: inset()` + escala 1.06 → 1). Trazos SVG de la línea alrededor. | Una foto por fila, mismo reveal pero más corto. | Fotos visibles, sin reveal. |
| 04 | **Cifras** | Contadores animados actuales (`useCountUp`) con numerales serif grandes. | Igual, grid 2×2. | Valor final directo (ya funciona así). |
| 05 | **Equipo** | Fotos del equipo con el mismo reveal; nombre y especialidad. Iniciales como respaldo si una foto falla. | Carrusel horizontal con scroll nativo (sin JS). | Estático. |
| 06 | **Visítanos + CTA final** | La línea **cierra en sonrisa** alrededor del CTA "Book a visit". Datos de contacto. | Igual, apilado. | Sonrisa ya dibujada. |
| — | **Footer** | Créditos de fotos (autor + fuente + enlace). | Igual. | Igual. |

**Toggle de Motion (encendido/apagado)**
- Un switch accesible en el header (`role="switch"`, `aria-checked`).
- Estado inicial = preferencia del sistema; si el usuario elige, se guarda en `localStorage`.
- Un script inline mínimo en `index.html` pone `<html data-motion="on|off">` **antes del primer paint**
  (sin parpadeo).
- Tailwind v4: `@custom-variant motion-on` reemplaza a `motion-safe:`, para que el CSS obedezca al toggle y
  no solo a la preferencia del sistema. `MotionConfig reducedMotion` también sigue al toggle.
- Apagado = sin transforms, sin pin, sin dibujo de la línea (se muestra completa). Los fades cortos
  también se apagan.

---

## 3. ¿Motion o GSAP?

**Recomendación: quedarse con Motion (ya aprobado) y no agregar GSAP.**

- Motion ya cubre todo lo que pide el plan:
  - `useScroll` + `useTransform` → animaciones ligadas al scroll y el progreso de la sección fija
    (el pin lo hace CSS con `position: sticky`; Motion solo lee el progreso).
  - `pathLength` → dibujar la línea.
  - `useSpring` + `useMotionValue` → CTAs magnéticos.
  - `AnimatePresence` → cambio de pasos.
- GSAP + ScrollTrigger (hoy gratuito) es excelente para timelines complejos y pins, pero agregaría
  **un segundo motor de animación** (~40–50 KB gz) encima de Motion, que el dashboard y el flujo de
  reserva ya usan. Dos librerías para lo mismo = más JS y dos modelos mentales.
- Comparación: es como tener React Query y SWR en el mismo proyecto de Next — ambas buenas, pero una basta.
- **Se reconsidera solo si** la sección fija no alcanza la calidad esperada con `sticky` + `useScroll`.
  En ese caso pregunto antes de agregarla.

---

## 4. Reglas técnicas

**Código crítico vs código de motion**
- El bundle inicial (`index`) lleva solo el markup estático y CSS. Las animaciones del hero que corren
  al cargar son `@keyframes` de CSS (corren en el compositor, como hoy).
- Las *features* de Motion se cargan de forma asíncrona (`LazyMotion features={() => import(...)}`): los
  componentes `m.*` se pintan sin animar hasta que llegan.
- Las mejoras del landing (línea conductora, driver del pin, magnéticos, reveals de fotos) viven en un
  chunk aparte que se monta después del primer paint.
- **Mejora progresiva**: el layout es idéntico con o sin ese chunk → no hay saltos (CLS).

**Imágenes**
- Originales fuera de git (`.cache/images-src/`). Script `frontend/scripts/optimize-images.mjs` con
  `sharp` (aprobado como dependencia de desarrollo) → AVIF + WebP en 2–3 anchos a `frontend/public/img/`.
- `<picture>` con `srcset`/`sizes`, `width`/`height` explícitos, `loading="lazy"` y `decoding="async"`
  debajo del pliegue.
- **Ninguna foto arriba del pliegue en móvil** → el LCP sigue siendo texto (rápido).
- Créditos en `src/features/site/photo-credits.ts`, renderizados en el footer.

**Arreglar `/book` y `/login` en móvil** (hoy ≈63–84 y ≈85; el LCP ≈3.6 s viene de la cascada
`index` → chunk de la ruta):
1. Features de Motion asíncronas → `index` más chico.
2. Un plugin mínimo de Vite en `vite.config.ts` (sin dependencias) que inyecta `modulepreload` del chunk
   de la ruta actual → el navegador baja ambos en paralelo, sin cascada.
3. Evaluar `zod/mini` para el chunk de formularios.
4. Medir cada paso por separado y quedarse solo con lo que mueva los números.

**Dashboard**: pulido ligero (serif en títulos de página, espaciado). Sin motion nuevo.

---

## 5. Presupuestos

Se verifican con `frontend/scripts/check-budgets.mjs` (Node + `zlib`, sin dependencias) después de cada
build. Si algo se pasa, el script falla.

| Recurso | Presupuesto | Hoy |
|---------|-------------|-----|
| JS crítico (`index`) | ≤ 110 KB gz | 142 KB gz |
| Chunk de features de Motion (asíncrono) | ≤ 35 KB gz | — |
| Chunk de mejoras del landing | ≤ 25 KB gz | — |
| Ruta `/book` (con dependencias de formulario) | ≤ 50 KB gz | — |
| Ruta `/login` | ≤ 45 KB gz | — |
| CSS | ≤ 15 KB gz | — |
| Fuentes | ≤ 4 archivos woff2 | — |
| Cada imagen | ≤ 120 KB | — |
| Total de imágenes del landing | ≤ 600 KB | 0 |

**Métricas** (Lighthouse contra el **build de producción** con `vite preview`, mediana de 3 corridas):

| Ruta | Escritorio perf. | Móvil perf. | A11y / BP / SEO |
|------|------------------|-------------|-----------------|
| `/` | 100 | ≥ 90 | 100 |
| `/book` | 100 | ≥ 90 | 100 |
| `/login` | 100 | ≥ 90 | 100 |

- CLS ≤ 0.02; TBT móvil ≤ 200 ms.
- CTAs arriba del pliegue en **1440×900, 1366×768, 1280×720** y 390×844.
- Como Lighthouse móvil es ruidoso en esta laptop (WSL), cada cambio se confirma también con una
  medición propia basada en el trace (TBT/CLS reales con CPU ×4).

---

## 6. Fases

Cada fase: construir → verificar yo mismo (lint, typecheck, tests, capturas, Lighthouse) → commit(s) →
**detenerme con un resumen** para revisión antes de la siguiente.

| Fase | Contenido | Criterio para darla por terminada |
|------|-----------|-----------------------------------|
| **5b.1 Base** | Toggle de Motion + variante `motion-on`, features de Motion asíncronas, `modulepreload` por ruta, script de presupuestos, arreglo de rendimiento de `/book` y `/login` en móvil. | Presupuestos de JS en verde; móvil ≥ 90 en las 3 rutas. |
| **5b.2 Tipografía y layout** | Fuente serif de display, números de sección, grids asimétricos, pulido ligero del dashboard. | Sin overflow; CTAs arriba del pliegue en los 4 tamaños. |
| **5b.3 Hero** | Titular revelado por líneas, sonrisa dibujada, CTAs magnéticos. | LCP sin regresión; funciona con el toggle apagado. |
| **5b.4 La línea clara** | Línea conductora entre secciones + lista editorial de servicios. | Chunk de mejoras ≤ 25 KB gz; sin CLS. |
| **5b.5 Cómo funciona** | Sección fija (pin) en ≥ lg, apilada en móvil y sin movimiento. | Pin estable a 1440/1366/1280; ausente en móvil y apagado. |
| **5b.6 Fotos** | Descarga, optimización con `sharp`, reveals ligados al scroll, créditos. | Presupuestos de imágenes en verde; lazy-load debajo del pliegue. |
| **5b.7 QA final** | Ronda completa de capturas y Lighthouse; actualizar `docs/PLAN.md`. | Todas las metas de la sección 5. |

**Verificación en cada fase**
- `docker compose exec -T frontend`: prettier, eslint, tsc y vitest en verde.
- Capturas con Playwright en `.cache/shots/5b-*/`: 1440×900, 1366×768, 1280×720, 390×844 y 360×800 ×
  {motion encendido, `prefers-reduced-motion`, toggle apagado}. Revisiones automáticas: sin scroll
  horizontal, CTA arriba del pliegue, sin errores de consola, pin presente solo cuando corresponde.
- Build de producción (`vite preview`, puerto 4173) + Lighthouse (mediana de 3, móvil y escritorio) +
  script de presupuestos.
- Solo commits locales. Nunca `git push`.
