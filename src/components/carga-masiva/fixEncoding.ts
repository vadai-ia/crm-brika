// Repara mojibake común en archivos Excel/CSV guardados con encoding
// equivocado: UTF-8 leído como Windows-1252, como Mac Roman, o ambos en
// cadena. Ej.: "lâˆšÂ°mina" → "lámina", "traslâˆšâˆ«cido" → "traslúcido",
// "Ã±" → "ñ". Solo se sustituyen secuencias inequívocas.

const REPLACEMENTS: Array<[string, string]> = [
  // Doble corrupción: UTF-8 → Mac Roman → UTF-8 → Windows-1252
  ['âˆšÂ°', 'á'], ['âˆšÂ©', 'é'], ['âˆšâ‰ ', 'í'], ['âˆšâ‰¥', 'ó'],
  ['âˆšâˆ«', 'ú'], ['âˆšÂ±', 'ñ'], ['âˆšÂº', 'ü'],
  ['âˆšÃ…', 'Á'], ['âˆšÃ¢', 'É'], ['âˆšÃ§', 'Í'], ['âˆšÃ¬', 'Ó'], ['âˆšÃ¶', 'Ú'], ['âˆšÃ«', 'Ñ'],
  // UTF-8 leído como Mac Roman
  ['√°', 'á'], ['√©', 'é'], ['√≠', 'í'], ['√≥', 'ó'], ['√∫', 'ú'], ['√±', 'ñ'], ['√º', 'ü'],
  ['√Å', 'Á'], ['√â', 'É'], ['√ç', 'Í'], ['√ì', 'Ó'], ['√ö', 'Ú'], ['√ë', 'Ñ'],
  // Doble Windows-1252: colapsa a corrupción simple (cae en las reglas de abajo)
  ['Ãƒ', 'Ã'], ['Ã‚', 'Â'],
  // Puntuación tipográfica: UTF-8 leído como Windows-1252
  ['â€œ', '“'], ['â€™', '’'], ['â€˜', '‘'], ['â€“', '–'], ['â€”', '—'],
  ['â€¦', '…'], ['â€¢', '•'],
  // UTF-8 leído como Windows-1252 / Latin-1
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'], ['Ã¼', 'ü'],
  ['Ã‰', 'É'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ'],
  ['Â°', '°'], ['Â¿', '¿'], ['Â¡', '¡'], ['Â²', '²'], ['Â³', '³'], ['Âº', 'º'], ['Âª', 'ª'],
  ['Â ', ' '],
]

export function fixMojibake(s: string): string {
  // Marcadores de mojibake; el texto limpio sale intacto sin recorrer nada
  if (!/[ÃÂ√]|â[€ˆ]/.test(s)) return s
  let out = s
  // Dos pasadas: la corrupción doble deja residuos que resuelve la segunda
  for (let pass = 0; pass < 2; pass++) {
    for (const [from, to] of REPLACEMENTS) {
      if (out.includes(from)) out = out.split(from).join(to)
    }
  }
  return out
}
