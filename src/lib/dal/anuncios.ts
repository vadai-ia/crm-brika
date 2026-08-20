// DAL de notas/recordatorios (tabla public.anuncios del esquema brika).
// Acceso con cliente admin: la tabla tiene RLS sin políticas y las rutas
// verifican sesión/permiso antes de llamar aquí.

import { createAdminClient } from '@/lib/supabase/admin'
import { INVENTARIO_TABLE } from '@/lib/utils/inventario'
import type { CreateNotaInput, UpdateNotaInput } from '@/lib/validations/anuncio'

export interface Nota {
  id: string
  id_creador: string | null
  id_responsable: string | null
  id_propiedad: string | null
  titulo: string | null
  nota: string
  after_date: string | null
  completada: boolean | null
  created_at: string | null
  updated_at: string | null
  creador_nombre?: string | null
  responsable_nombre?: string | null
  propiedad_nombre?: string | null
}

export type EstadoFilter = 'pendientes' | 'completadas' | 'todas'

export const NOTAS_PAGE_SIZE = 50

interface GetNotasParams {
  userId: string
  isAdmin: boolean
  estado: EstadoFilter
  before?: string | null
}

// Adjunta nombres de creador/responsable y etiqueta de propiedad.
async function enrich(rows: Nota[]): Promise<Nota[]> {
  if (rows.length === 0) return rows
  const supabase = createAdminClient()

  const userIds = new Set<string>()
  const propIds = new Set<string>()
  for (const n of rows) {
    if (n.id_creador) userIds.add(n.id_creador)
    if (n.id_responsable) userIds.add(n.id_responsable)
    if (n.id_propiedad) propIds.add(n.id_propiedad)
  }

  const nameMap = new Map<string, string>()
  if (userIds.size > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...userIds])
    for (const p of data ?? []) nameMap.set(p.id as string, (p.full_name as string) ?? '')
  }

  const propMap = new Map<string, string>()
  if (propIds.size > 0) {
    const { data } = await supabase
      .from(INVENTARIO_TABLE)
      .select('id, parque, unidad')
      .in('id', [...propIds])
    for (const p of data ?? []) {
      const label = [p.parque, p.unidad].filter(Boolean).join(' · ')
      propMap.set(p.id as string, label)
    }
  }

  return rows.map((n) => ({
    ...n,
    creador_nombre: n.id_creador ? nameMap.get(n.id_creador) ?? null : null,
    responsable_nombre: n.id_responsable ? nameMap.get(n.id_responsable) ?? null : null,
    propiedad_nombre: n.id_propiedad ? propMap.get(n.id_propiedad) ?? null : null,
  }))
}

export async function getNotas(params: GetNotasParams): Promise<Nota[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('anuncios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(NOTAS_PAGE_SIZE)

  if (!params.isAdmin) {
    query = query.or(`id_creador.eq.${params.userId},id_responsable.eq.${params.userId}`)
  }
  if (params.estado === 'pendientes') {
    query = query.or('completada.is.null,completada.eq.false')
  } else if (params.estado === 'completadas') {
    query = query.eq('completada', true)
  }
  if (params.before) {
    query = query.lt('created_at', params.before)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return enrich((data ?? []) as Nota[])
}

export async function getNotaById(id: string): Promise<Nota | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('anuncios').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Nota) ?? null
}

export async function createNota(input: CreateNotaInput, creadorId: string): Promise<Nota> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('anuncios')
    .insert({
      id_creador: creadorId,
      id_responsable: input.id_responsable ?? null,
      id_propiedad: input.id_propiedad ?? null,
      titulo: input.titulo || null,
      nota: input.nota,
      after_date: input.after_date ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const [nota] = await enrich([data as Nota])
  return nota
}

export async function updateNota(id: string, patch: UpdateNotaInput): Promise<Nota> {
  const supabase = createAdminClient()
  const update: Record<string, unknown> = {}
  if (patch.titulo !== undefined) update.titulo = patch.titulo || null
  if (patch.nota !== undefined) update.nota = patch.nota
  if (patch.id_responsable !== undefined) update.id_responsable = patch.id_responsable
  if (patch.id_propiedad !== undefined) update.id_propiedad = patch.id_propiedad
  if (patch.after_date !== undefined) update.after_date = patch.after_date
  if (patch.completada !== undefined) update.completada = patch.completada

  const { data, error } = await supabase
    .from('anuncios')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const [nota] = await enrich([data as Nota])
  return nota
}

export async function deleteNota(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('anuncios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
