// Columnas de carga masiva hacia public.inventario_industrial (esquema brika).
// header = etiqueta amigable (template y UI); dbColumn = columna real.

export interface ColumnDef {
  dbColumn: string
  header: string
  required: boolean
  type: 'text' | 'number' | 'date'
  aliases?: string[]
}

function col(
  dbColumn: string,
  header: string,
  required = false,
  type: 'text' | 'number' | 'date' = 'text',
  aliases: string[] = []
): ColumnDef {
  return { dbColumn, header, required, type, aliases }
}

// La tabla tiene unique (parque, unidad, operacion) — esos tres son obligatorios.
export const INVENTARIO_COLUMNS: ColumnDef[] = [
  col('parque', 'Parque', true, 'text', ['parque industrial', 'nombre parque', 'nombre del parque', 'desarrollo']),
  col('estado', 'Estado', false, 'text', []),
  col('municipio', 'Municipio', false, 'text', ['ciudad', 'alcaldia']),
  col('zona_corredor', 'Zona / Corredor', false, 'text', ['zona', 'corredor', 'zona corredor']),
  col('producto', 'Producto', false, 'text', ['tipo de inmueble']),
  col('unidad', 'Unidad', true, 'text', ['numero de unidad', 'no unidad', 'nave', 'lote']),
  col('operacion', 'Operación', true, 'text', ['tipo de operacion', 'venta o renta', 'venta renta']),
  col('tipo_producto', 'Tipo de producto', false, 'text', ['tipo producto', 'clase']),
  col('estatus', 'Estatus', false, 'text', ['status', 'estado comercial']),
  col('m2_terreno', 'M2 Terreno', false, 'number', ['superficie terreno', 'terreno m2', 'terreno']),
  col('m2_construccion', 'M2 Construcción', false, 'number', ['superficie construccion', 'construccion m2', 'construccion']),
  col('m2_rentables', 'M2 Rentables', false, 'number', ['area rentable', 'superficie rentable', 'rentables']),
  col('area_base_calculo', 'Área base de cálculo', false, 'text', ['area base', 'base de calculo']),
  col('moneda', 'Moneda', false, 'text', ['divisa', 'currency']),
  col('precio_venta_m2', 'Precio venta por m2', false, 'number', ['precio venta m2', 'venta m2', 'precio m2 venta']),
  col('precio_renta_m2', 'Precio renta por m2', false, 'number', ['precio renta m2', 'renta m2', 'precio m2 renta', 'renta por m2']),
  col('precio_total_venta', 'Precio total venta', false, 'number', ['precio total', 'precio de venta', 'precio venta total']),
  col('renta_mensual', 'Renta mensual', false, 'number', ['renta al mes', 'renta total']),
  col('mantenimiento_m2', 'Mantenimiento por m2', false, 'number', ['mantenimiento m2', 'cuota mantenimiento m2']),
  col('mantenimiento_mensual', 'Mantenimiento mensual', false, 'number', ['cuota de mantenimiento', 'mantenimiento al mes']),
  col('disponibilidad', 'Disponibilidad', false, 'text', ['fecha de disponibilidad', 'entrega', 'disponible desde', 'fecha de entrega']),
  col('kva_disponibles', 'KVA disponibles', false, 'text', ['kva', 'kvas', 'energia', 'energia disponible']),
  col('altura_libre', 'Altura libre', false, 'text', ['altura']),
  col('piso', 'Piso', false, 'text', ['tipo de piso']),
  col('sistema_contra_incendios', 'Sistema contra incendios', false, 'text', ['sci', 'contra incendios', 'sprinklers']),
  col('certificaciones', 'Certificaciones', false, 'text', ['certificacion']),
  col('iluminacion', 'Iluminación', false, 'text', ['lamparas', 'tipo de iluminacion']),
  col('andenes', 'Andenes', false, 'text', ['andenes de carga', 'docks', 'anden']),
  col('rampas', 'Rampas', false, 'text', ['rampa', 'rampas de acceso']),
  col('ultima_actualizacion', 'Última actualización', false, 'date', ['fecha de actualizacion', 'actualizacion']),
  col('notas_tecnicas', 'Notas técnicas', false, 'text', ['notas', 'observaciones', 'comentarios', 'especificaciones']),
  col('links_imagenes_carpetas_drive', 'Links imágenes (Drive)', false, 'text', ['link drive', 'links', 'imagenes', 'fotos', 'drive']),
  col('ubicacion', 'Ubicación', false, 'text', ['direccion', 'domicilio', 'address']),
]

export interface RowData {
  row: number
  values: Record<string, string> // keyed por dbColumn
  errors: string[]
  valid: boolean
  exists?: boolean // ya está en inventario_industrial
  changedCols?: string[] // columnas cuyo valor difiere del actual en la BD
  prev?: Record<string, string> // valor actual en BD de las columnas con cambio
}

// Compara los valores del archivo contra la fila actual de la BD.
// Las celdas vacías del archivo nunca cuentan como cambio (no borran datos).
export function diffAgainstCurrent(
  values: Record<string, string>,
  current: Record<string, unknown>
): { changedCols: string[]; prev: Record<string, string> } {
  const changedCols: string[] = []
  const prev: Record<string, string> = {}
  for (const def of INVENTARIO_COLUMNS) {
    const fileVal = (values[def.dbColumn] ?? '').trim()
    if (!fileVal) continue
    const dbRaw = current[def.dbColumn]
    const dbStr = dbRaw === null || dbRaw === undefined ? '' : String(dbRaw).trim()
    let equal: boolean
    if (def.type === 'number') {
      equal = dbStr !== '' && Number(dbStr) === Number(fileVal)
    } else if (def.type === 'date') {
      equal = dbStr.slice(0, 10) === fileVal
    } else {
      equal = dbStr === fileVal
    }
    if (!equal) {
      changedCols.push(def.dbColumn)
      prev[def.dbColumn] = dbStr
    }
  }
  return { changedCols, prev }
}

export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Sugerencia automática de mapeo: dbColumn → encabezado del archivo.
// Solo empareja coincidencias exactas (normalizadas) contra nombre de columna,
// etiqueta amigable o alias; cada encabezado del archivo se usa una sola vez.
export function autoMapHeaders(fileHeaders: string[]): Record<string, string> {
  const normalized = new Map<string, string>()
  for (const h of fileHeaders) {
    const key = normalizeKey(h)
    if (key && !normalized.has(key)) normalized.set(key, h)
  }
  const used = new Set<string>()
  const map: Record<string, string> = {}
  for (const def of INVENTARIO_COLUMNS) {
    const candidates = [def.dbColumn, def.header, ...(def.aliases ?? [])].map(normalizeKey)
    for (const c of candidates) {
      const match = normalized.get(c)
      if (match && !used.has(match)) {
        map[def.dbColumn] = match
        used.add(match)
        break
      }
    }
  }
  return map
}

export function cleanNumeric(val: string): string {
  return val.replace(/[$,\s]/g, '').trim()
}

// Acepta 'YYYY-MM-DD' o 'DD/MM/YYYY' (es-MX) → ISO; null si no se entiende
export function parseDateValue(v: string): string | null {
  const t = v.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(t)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export function dupKey(values: Record<string, string>): string {
  return [values.parque, values.unidad, values.operacion]
    .map((v) => (v ?? '').trim().toLowerCase())
    .join('|||')
}

export function validateRows(rows: RowData[]): RowData[] {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    const errors: string[] = []
    for (const def of INVENTARIO_COLUMNS) {
      const raw = r.values[def.dbColumn]?.trim() ?? ''
      if (def.required && !raw) {
        errors.push(`"${def.header}" es obligatorio`)
        continue
      }
      if (!raw) continue
      if (def.type === 'number') {
        const cleaned = cleanNumeric(raw)
        if (isNaN(Number(cleaned)) || cleaned === '') {
          errors.push(`"${def.header}" no es un número válido ('${raw}')`)
        } else {
          r.values[def.dbColumn] = cleaned
        }
      } else if (def.type === 'date') {
        const iso = parseDateValue(raw)
        if (!iso) {
          errors.push(`"${def.header}" no es una fecha válida ('${raw}'). Usa AAAA-MM-DD o DD/MM/AAAA`)
        } else {
          r.values[def.dbColumn] = iso
        }
      }
    }
    const key = dupKey(r.values)
    const prev = seen.get(key)
    if (key !== '||||||' && prev !== undefined) {
      errors.push(`Duplicado en el archivo (misma combinación Parque + Unidad + Operación que la fila ${prev})`)
    } else {
      seen.set(key, r.row)
    }
    return { ...r, errors, valid: errors.length === 0 }
  })
}
