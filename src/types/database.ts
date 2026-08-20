// `admin` y `asesor` son roles del sistema; el resto se definen en la tabla `roles`
// (ver sql/006-roles.sql), por eso el tipo acepta cualquier string con autocompletado.
export type UserRole = 'admin' | 'asesor' | (string & {})
export type ThemePreference = 'light' | 'dark' | 'system'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  theme_preference: ThemePreference | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Perfil + datos de `auth.users` que no viven en `profiles` (solo accesibles con service role). */
export interface ProfileWithAuth extends Profile {
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

export interface Property {
  id: number
  created_at: string
  id_propiedad: string
  nombre_desarrollador: string | null
  unidad: string | null
  fecha_actualizacion: string | null
  disponibilidad: string | null
  precio_unidad: string | null
  m2_totales: string | null
  m2_habitables: string | null
  m2_exteriores: string | null
  m2_roof_garden: string | null
  num_recamaras: string | null
  num_banos: string | null
  estacionamiento: string | null
  bodega: string | null
  amenidades: string | null
  direccion: string | null
  colonia: string | null
  alcaldia: string | null
  contacto_desarrollador: string | null
  fecha_entrega: string | null
  tipo_preventa: string | null
  tipo_entrega: string | null
  pct_comision: number | null
  link_drive: string | null
  nombre_kibah: string | null
}

export interface ColumnVisibility {
  id: string
  column_name: string
  visible_to_asesores: boolean
  display_order: number
  display_label: string | null
  filter_type: 'range' | 'select' | 'text' | 'boolean' | 'none' | null
  updated_at: string
  updated_by: string | null
}

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  secret: string | null
  headers: Record<string, string>
  last_triggered_at: string | null
  last_status_code: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  name: string
  key_hash: string
  key_salt: string
  key_prefix: string
  permissions: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_by: string | null
  created_at: string
}
