# BRIKA — App de Asesores (Inventario Industrial)

## Qué es
Plataforma interna para asesores de BRIKA (fork del CRM Kibah adaptado a inventario industrial). Consulta de propiedades con filtros avanzados (lista/tarjetas), CRUD admin, control de visibilidad de columnas, webhooks y API keys. Dark/light mode con toggle.

## Stack
- Next.js 14.2.x (App Router, TypeScript estricto)
- Supabase (Auth, PostgreSQL, RLS) — proyecto existente
- Tailwind CSS 3.4.x (`darkMode: 'class'`)
- Zod 3.x (validación)
- Lucide React (iconos)
- Vercel (deploy)

## Estructura
```
src/
├── app/            # Pages y API routes (App Router)
├── components/
│   ├── ui/         # Componentes base reutilizables
│   ├── layout/     # Sidebar, Topbar, ThemeToggle
│   ├── properties/ # PropertyCard, PropertyTable, PropertyDetail, PropertyFilters, PropertyForm
│   └── admin/      # WebhookForm, ApiKeyCard, ColumnVisibilityManager
├── lib/
│   ├── supabase/   # client.ts, server.ts, admin.ts
│   ├── dal/        # Data Access Layer (queries)
│   ├── services/   # Business logic
│   ├── validations/# Zod schemas
│   └── utils/      # format.ts, constants.ts
├── hooks/          # useProperties, useFilters, useTheme
└── types/          # TypeScript types
```

## Convenciones
- Server Components por defecto. Client Components solo cuando necesiten interactividad (`"use client"`).
- DAL pattern: toda query a Supabase va en `lib/dal/`. Los services llaman al DAL, nunca queries directas en componentes.
- Validación con Zod en API routes antes de procesar.
- Inventario (brika): lectura Y escritura van a `inventario_industrial` vía `KEY_TO_COLUMN`/`mapInventarioRow` de `lib/utils/inventario.ts` (ver ERROR-JOURNAL #6 y #7). Los módulos legacy del fork (desarrollos, carga-masiva) aún referencian `base_kibah`/`pagina_web_kibah` — esos nombres de tabla/columna NO se renombran.
- Fotos de propiedades: bucket público `Imagenes` (`<set>/<nombre>` en tamaño web, `_thumbs/<set>/<nombre>` miniatura, `_manifest/<set>.json`), tabla `image_sets` (una carpeta de Drive = un set) y `propiedad_image_sets`. Se importan solas desde Drive vía `lib/services/photo-sync/` (ver ERROR-JOURNAL #21–#23). NUNCA usar `/render/image/` (transformaciones de Supabase: se cobran por imagen) ni subir fotos a mano al bucket; herramienta manual en `scripts/fotos/`.
- Precios formateados: `$X,XXX,XXX MXN` — usar `Intl.NumberFormat('es-MX')`.
- Paginación cursor-based en todas las listas.
- TypeScript strict mode. No usar `any`. Types en `types/`. Constants en `lib/utils/constants.ts`.
- NUNCA hardcodear strings de status, roles, o valores repetidos — importar de constants.

## Identidad Visual
- **Colores:** Navy `#1B2A4A`, Naranja `#E8872A` (accent), fondos dark `#0F1923`, fondos light `#F8FAFB`
- **Font:** Inter (Google Fonts), weights 400/500/600/700
- **Cards:** Glass effect en dark (backdrop-filter blur 16px, bg semi-transparente, border 0.5px rgba), sólidas en light
- **Sidebar:** Sólida navy oscuro (NO glass), nunca cambia entre modos
- **Border-radius:** 16px cards/modals, 8px inputs/buttons
- **Iconos:** Lucide React, stroke-width 1.5

## Antigravity Skills disponibles
Este proyecto usa Antigravity IDE con las siguientes skills instaladas. Usarlas activamente:
- **GSD** — Descomponer cada milestone en tareas, ejecutar en orden, verificar checklist
- **UI/UX Pro Max** — Diseño profesional en todos los componentes (no UI genérica)
- **Vercel React Best Practices** — Server Components por default, dynamic imports, optimización de bundle
- **Vercel Composition Patterns** — Layouts, slots, composición de componentes
- **Supabase Developer** — Queries optimizadas, RLS, Edge Functions, storage
- **Next.js Supabase Auth** — Auth flow con App Router, middleware, cookies

## Reglas
- NO instalar dependencias que el milestone no pida explícitamente.
- NO modificar archivos fuera del scope del milestone actual.
- Máximo 300 líneas por archivo. Si un archivo crece más, dividirlo.
- Manejar error states y loading states en cada página.
- Toda ruta `/dashboard/admin/*` debe verificar `role = 'admin'` en middleware Y en API route.
- NUNCA hardcodear datos que deben ser dinámicos.
- NUNCA exponer service role key en el frontend.
- "Verify build passes." al final de cada milestone.

## Dark Mode
- Tailwind `dark:` prefix para estilos duales.
- CSS variables en `:root` (light) y `.dark` (dark).
- Toggle guarda en localStorage (inmediato) + BD profiles.theme_preference (background).

## Workflow
- Cada milestone se ejecuta en una NUEVA sesión de Claude Code en Antigravity.
- Después de cada milestone: verificar build (`npm run build`), verificar checklist, guardar con git.
- Si algo falla: no pasar al siguiente milestone. Corregir primero.

## Error Journal
Archivo: `ERROR-JOURNAL.md` en la raíz del proyecto.
- ANTES de ejecutar cualquier milestone, leer ERROR-JOURNAL.md completo.
- DESPUÉS de arreglar un bug o cometer un error, agregar una entrada con:
  - **Error:** Qué pasó
  - **Causa:** Por qué pasó
  - **Fix:** Cómo se arregló
  - **Regla:** Qué hacer diferente en el futuro para evitarlo
- NUNCA borrar entradas anteriores.