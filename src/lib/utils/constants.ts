import type { ThemePreference } from '@/types'

export const DISPONIBILIDAD_COLORS: Record<string, { bg: string; text: string }> = {
  Disponible: { bg: 'bg-emerald-500/15 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' },
  Apartado: { bg: 'bg-amber-500/15 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' },
  Rentado: { bg: 'bg-red-500/15 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' },
}

export const TIPO_PREVENTA_COLORS: Record<string, { bg: string; text: string }> = {
  preventa: { bg: 'bg-orange/15 dark:bg-orange/20', text: 'text-orange-700 dark:text-orange-400' },
  'entrega inmediata': { bg: 'bg-blue-500/15 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
}

export const DISPONIBILIDAD_OPTIONS = ['Disponible', 'Apartado', 'Rentado'] as const
export const TIPO_PREVENTA_OPTIONS = ['preventa', 'entrega inmediata'] as const
export const TIPO_ENTREGA_OPTIONS = ['Terminado', 'Obra blanca', 'Obra Gris', 'Obra Negra'] as const
export const BODEGA_OPTIONS = ['Si', 'No'] as const

// ── Usuarios / roles ─────────────────────────────────────────────────────────
/** Rol con acceso total: ignora la matriz de permisos de `roles.permissions`. */
export const ROLE_ADMIN = 'admin'
/** Rol por defecto al crear un usuario. */
export const ROLE_ASESOR = 'asesor'

export const THEME_OPTIONS = ['system', 'light', 'dark'] as const
export const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
}

/** Clase de badge para mostrar un rol (admin en morado, el resto en azul). */
export function roleBadgeClass(role: string): string {
  return role === ROLE_ADMIN ? 'brika-badge-preventa' : 'brika-badge-entrega'
}

// ── Logs (historial de auditoría) ────────────────────────────────────────────
export const AUDIT_PAGE_SIZE = 20

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Creó',
  update: 'Editó',
  delete: 'Eliminó',
  carga_masiva: 'Carga masiva',
  reset_password: 'Reseteó contraseña',
  test: 'Probó',
  actualizar_fotos: 'Actualizó fotos',
}

export const AUDIT_ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-emerald-500/15 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' },
  update: { bg: 'bg-blue-500/15 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
  delete: { bg: 'bg-red-500/15 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' },
  carga_masiva: { bg: 'bg-orange/15 dark:bg-orange/20', text: 'text-orange-700 dark:text-orange-400' },
  reset_password: { bg: 'bg-amber-500/15 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' },
  test: { bg: 'bg-slate-500/15 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-400' },
  actualizar_fotos: { bg: 'bg-cyan-500/15 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-400' },
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  propiedad: 'Propiedad',
  usuario: 'Usuario',
  rol: 'Rol',
  webhook: 'Webhook',
  api_key: 'API Key',
  nota: 'Nota',
  desarrollo: 'Desarrollo',
  columnas: 'Columnas',
}

// "Subir PDF" en el alta de propiedades: extracción de campos con Claude.
// Haiku 5.5: el modelo más barato (~$0.002 USD por PDF de pocas páginas).
export const PDF_EXTRACT_MODEL = 'claude-haiku-5-5'
// Vercel corta los bodies de funciones en 4.5 MB.
export const PDF_EXTRACT_MAX_BYTES = 4 * 1024 * 1024

// Opciones fijas del formulario de inventario (PropertyForm + extracción de PDF)
export const INVENTARIO_OPERACION_OPTIONS = ['Venta', 'Renta', 'Preventa', 'Build to Suit']
export const INVENTARIO_ESTATUS_OPTIONS = ['Disponible', 'Apartado', 'Vendido', 'Rentado', 'No disponible']
export const INVENTARIO_PRODUCTO_OPTIONS = ['Nave industrial', 'Lote industrial', 'BTS']
export const INVENTARIO_AREA_BASE_OPTIONS = ['Construcción', 'Terreno']
export const INVENTARIO_MONEDA_OPTIONS = ['MXN', 'USD']
