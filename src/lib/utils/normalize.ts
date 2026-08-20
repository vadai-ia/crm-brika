// Normalización de textos de catálogo (zona, municipio, estatus, operación…)
// para que "Colon", "Colón", "colon " y "COLÓN" cuenten como el mismo valor.

/** Clave de comparación: sin acentos, minúsculas, espacios colapsados. */
export function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface VariantGroup {
  /** Clave normalizada (ver normalizeKey). */
  key: string
  /** Variante que se muestra al usuario. */
  label: string
  /** Todas las variantes crudas tal como están en la BD (sirven para `.in()`). */
  variants: string[]
}

// Conectores que van en minúscula salvo al inicio ("Apaseo el Grande", "Build to Suit")
const SMALL_WORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'a', 'al', 'en', 'con', 'por', 'para',
  'to', 'of', 'the', 'and',
])
// Siglas que se conservan en mayúsculas aunque el texto venga todo en mayúsculas
const KNOWN_ACRONYMS = new Set(['CDMX', 'QRO', 'GTO', 'PIQ', 'BTS', 'MX', 'SA', 'CV', 'SLP', 'NL', 'BC', 'BCS'])
const ROMAN_RE = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/i
const WORD_RE = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g

/**
 * Formato Título para etiquetas de catálogo: "nave industrial" → "Nave Industrial",
 * "el marqués" → "El Marqués", "Zona Norte (PIQ)" y "Carretera CDMX - QRO (45)" intactos.
 * Las siglas en mayúsculas (≤ 4 letras) se respetan cuando el texto no está todo en mayúsculas.
 */
export function toTitleLabel(s: string): string {
  const text = s.trim().replace(/\s+/g, ' ')
  const allCaps = text === text.toUpperCase()
  let index = 0
  return text.replace(WORD_RE, (word) => {
    const i = index++
    if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(word)) return word // números
    const upper = word.toUpperCase()
    const lower = word.toLowerCase()
    if (KNOWN_ACRONYMS.has(upper) || ROMAN_RE.test(word)) return upper
    if (!allCaps && word.length <= 4 && word === upper) return word // sigla escrita a propósito
    if (i > 0 && SMALL_WORDS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}

// Entre variantes igual de frecuentes, gana la que trae acentos (conserva la ortografía real)
function accentScore(s: string): number {
  return (s.match(/[áéíóúñüÁÉÍÓÚÑÜ]/g) ?? []).length
}

function pickLabel(counts: Map<string, number>): string {
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || accentScore(b[0]) - accentScore(a[0]) || a[0].localeCompare(b[0], 'es')
  )
  return toTitleLabel(ranked[0][0])
}

/**
 * Agrupa valores crudos que solo difieren en mayúsculas/acentos/espacios.
 * La etiqueta es la variante más frecuente en formato Título; el orden es alfabético (es-MX).
 */
export function groupVariants(values: string[]): VariantGroup[] {
  const groups = new Map<string, Map<string, number>>()
  for (const raw of values) {
    const key = normalizeKey(raw)
    if (!key) continue
    const counts = groups.get(key) ?? new Map<string, number>()
    counts.set(raw, (counts.get(raw) ?? 0) + 1)
    groups.set(key, counts)
  }

  const result: VariantGroup[] = []
  for (const [key, counts] of groups) {
    result.push({ key, label: pickLabel(counts), variants: [...counts.keys()] })
  }
  return result.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
}
