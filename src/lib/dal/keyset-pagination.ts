// Paginación keyset (cursor compuesto) para listas ordenadas por una
// columna con empates o nulos: el cursor lleva el valor de la columna de
// orden Y el id de la última fila, y la siguiente página se corta con
// (columna, id) > (valor, id). Sin el id de desempate, filas con el mismo
// valor de orden (p. ej. created_at idéntico por carga masiva) quedan en
// orden indefinido y el corte repite o salta filas (ERROR-JOURNAL #37).
// Requiere ordenar por (columna, id) en la misma dirección y nulos al
// final (`nullsFirst: false`) — los nulos son su propio bloque terminal.

export interface KeysetCursor {
  /** Valor crudo de la columna de orden en la última fila de la página */
  v: string | number | null
  /** id (uuid) de la última fila de la página */
  id: string
}

export function encodeKeysetCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

/**
 * null si el cursor no es válido (p. ej. el formato viejo de solo-uuid que
 * un cliente abierto durante el deploy pueda mandar): se sirve la primera
 * página en vez de fallar.
 */
export function decodeKeysetCursor(raw: string): KeysetCursor | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    )
    if (typeof parsed !== 'object' || parsed === null) return null
    const { v, id } = parsed as Record<string, unknown>
    if (typeof id !== 'string' || id === '') return null
    if (v === null || typeof v === 'string' || typeof v === 'number') {
      return { v, id }
    }
    return null
  } catch {
    return null
  }
}

/** Valor de una fila crudo listo para el cursor (solo string/number/null). */
export function cursorValue(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return raw
  return String(raw)
}

// Un valor dentro de un filtro or=() de PostgREST va entre comillas
// escapadas: comas, paréntesis o comillas en el valor romperían el parseo.
function pgQuote(value: string | number): string {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

interface KeysetFilterable {
  or(filters: string): this
  is(column: string, value: null): this
  gt(column: string, value: string): this
  lt(column: string, value: string): this
}

/**
 * Aplica el corte de página al query builder de supabase-js. El query debe
 * venir ordenado por (sortColumn, id) en la misma dirección con
 * `nullsFirst: false` en la columna de orden.
 */
export function applyKeysetCursor<Q extends KeysetFilterable>(
  query: Q,
  sortColumn: string,
  ascending: boolean,
  cursor: KeysetCursor
): Q {
  const op = ascending ? 'gt' : 'lt'
  if (sortColumn === 'id') {
    return ascending ? query.gt('id', cursor.id) : query.lt('id', cursor.id)
  }
  if (cursor.v === null) {
    // La última fila mostrada estaba en el bloque de nulos (siempre al
    // final): solo queda avanzar por id dentro de ese bloque.
    const inNulls = query.is(sortColumn, null)
    return ascending ? inNulls.gt('id', cursor.id) : inNulls.lt('id', cursor.id)
  }
  const quoted = pgQuote(cursor.v)
  return query.or(
    `${sortColumn}.${op}.${quoted},and(${sortColumn}.eq.${quoted},id.${op}.${cursor.id}),${sortColumn}.is.null`
  )
}
