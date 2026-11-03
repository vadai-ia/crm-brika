import { createAdminClient } from '@/lib/supabase/admin'
import type { ContactoParque } from '@/types/contactos'

// Contactos del inventario (columnas contacto / celular_contacto /
// correo_contacto / comision de inventario_industrial), agrupados por
// parque + contacto. Son pocas decenas de grupos, así que se devuelve el
// directorio completo y la UI filtra en el cliente.

const COLUMNS =
  'id, parque, unidad, estado, municipio, zona_corredor, producto, operacion, estatus, contacto, celular_contacto, correo_contacto, comision'

// Tope de filas por request de PostgREST
const PAGE = 1000

interface ContactoRow {
  id: string
  parque: string | null
  unidad: string | null
  estado: string | null
  municipio: string | null
  zona_corredor: string | null
  producto: string | null
  operacion: string | null
  estatus: string | null
  contacto: string | null
  celular_contacto: string | null
  correo_contacto: string | null
  comision: string | null
}

const clean = (v: string | null) => (v && v.trim() ? v.trim() : null)

export async function getContactosInventario(): Promise<ContactoParque[]> {
  const supabase = createAdminClient()
  const rows: ContactoRow[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('inventario_industrial')
      .select(COLUMNS)
      .or('contacto.not.is.null,celular_contacto.not.is.null,correo_contacto.not.is.null')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as ContactoRow[]))
    if (!data || data.length < PAGE) break
  }

  const groups = new Map<string, ContactoParque>()
  for (const r of rows) {
    const contacto = clean(r.contacto)
    const celular = clean(r.celular_contacto)
    const correo = clean(r.correo_contacto)
    if (!contacto && !celular && !correo) continue

    const parque = clean(r.parque)
    const key = [parque, contacto, celular, correo].map((v) => v ?? '').join('|')
    let g = groups.get(key)
    if (!g) {
      g = {
        key,
        parque,
        estado: clean(r.estado),
        municipio: clean(r.municipio),
        zona_corredor: clean(r.zona_corredor),
        contacto,
        celular,
        correo,
        comisiones: [],
        unidades: [],
      }
      groups.set(key, g)
    }
    const comision = clean(r.comision)
    if (comision && !g.comisiones.includes(comision)) g.comisiones.push(comision)
    g.unidades.push({
      id: r.id,
      unidad: clean(r.unidad),
      producto: clean(r.producto),
      operacion: clean(r.operacion),
      estatus: clean(r.estatus),
    })
  }

  const byText = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '', 'es', { numeric: true })
  const result = Array.from(groups.values())
  for (const g of result) g.unidades.sort((a, b) => byText(a.unidad, b.unidad))
  return result.sort((a, b) => byText(a.parque, b.parque) || byText(a.contacto, b.contacto))
}
