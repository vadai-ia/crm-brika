// DAL de leads de formularios web (tablas public.leads_propiedades y
// public.leads_proyectos del esquema brika — las alimenta el sitio web).
// Acceso con cliente admin: las tablas tienen RLS sin políticas y las rutas
// verifican sesión/permiso antes de llamar aquí.

import { createAdminClient } from '@/lib/supabase/admin'

export interface LeadPropiedad {
  id: number
  interes: string | null
  nombre: string | null
  email: string | null
  telefono: string | null
  mensaje: string | null
  propiedad: string | null
  propiedad_id: number | null
  created_at: string
  updated_at: string | null
}

export interface LeadProyecto {
  id: number
  nombre: string | null
  empresa: string | null
  email: string | null
  telefono: string | null
  industria: string | null
  metros: string | null
  mensaje: string | null
  created_at: string
  updated_at: string | null
}

export const LEADS_PAGE_SIZE = 20

async function getLeads<T>(table: string, before?: string | null): Promise<T[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LEADS_PAGE_SIZE)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as T[]
}

export function getLeadsPropiedades(before?: string | null): Promise<LeadPropiedad[]> {
  return getLeads<LeadPropiedad>('leads_propiedades', before)
}

export function getLeadsProyectos(before?: string | null): Promise<LeadProyecto[]> {
  return getLeads<LeadProyecto>('leads_proyectos', before)
}
