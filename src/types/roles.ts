export interface Role {
  id: string
  name: string
  display_name: string
  description: string | null
  permissions: Record<string, boolean>
  is_system: boolean
  created_at: string
}

export const ALL_PERMISSIONS: Record<string, string> = {
  'propiedades.view': 'Ver propiedades',
  'propiedades.create': 'Crear propiedades',
  'propiedades.edit': 'Editar propiedades',
  'propiedades.delete': 'Eliminar propiedades',
  'pdf.view': 'Generar PDFs',
  'carta_propuesta.view': 'Generar Cartas Propuesta',
  'calendario.view': 'Ver calendario',
  'whaapy.view': 'Ver Whaapy',
  'anuncios.view': 'Ver anuncios',
  'anuncios.create': 'Crear anuncios',
  'asesores.view': 'Ver asesores',
  'asesores.create': 'Crear asesores',
  'asesores.edit': 'Editar asesores',
  'asesores.delete': 'Eliminar asesores',
  'desarrollos.view': 'Ver desarrollos',
  'desarrollos.create': 'Crear desarrollos',
  'desarrollos.edit': 'Editar desarrollos',
  'desarrollos.delete': 'Eliminar desarrollos',
  'columnas.view': 'Ver config columnas',
  'columnas.edit': 'Editar columnas',
  'webhooks.view': 'Ver webhooks',
  'webhooks.manage': 'Gestionar webhooks',
  'apikeys.view': 'Ver API keys',
  'apikeys.manage': 'Gestionar API keys',
  'carga_masiva.view': 'Carga Masiva',
  'formularios.view': 'Ver formularios web (leads)',
  'logs.view': 'Ver historial (Logs)',
}

export const PERMISSION_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Propiedades', keys: ['propiedades.view', 'propiedades.create', 'propiedades.edit', 'propiedades.delete'] },
  { label: 'PDF', keys: ['pdf.view'] },
  { label: 'Carta Propuesta', keys: ['carta_propuesta.view'] },
  { label: 'Calendario', keys: ['calendario.view'] },
  { label: 'Whaapy', keys: ['whaapy.view'] },
  { label: 'Anuncios', keys: ['anuncios.view', 'anuncios.create'] },
  { label: 'Asesores', keys: ['asesores.view', 'asesores.create', 'asesores.edit', 'asesores.delete'] },
  { label: 'Desarrollos', keys: ['desarrollos.view', 'desarrollos.create', 'desarrollos.edit', 'desarrollos.delete'] },
  { label: 'Columnas', keys: ['columnas.view', 'columnas.edit'] },
  { label: 'Webhooks', keys: ['webhooks.view', 'webhooks.manage'] },
  { label: 'API Keys', keys: ['apikeys.view', 'apikeys.manage'] },
  { label: 'Carga Masiva', keys: ['carga_masiva.view'] },
  { label: 'Formularios Web', keys: ['formularios.view'] },
  { label: 'Logs', keys: ['logs.view'] },
]
