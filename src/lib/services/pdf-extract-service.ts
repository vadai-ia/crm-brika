import { z } from 'zod'
import {
  INVENTARIO_AREA_BASE_OPTIONS,
  INVENTARIO_ESTATUS_OPTIONS,
  INVENTARIO_MONEDA_OPTIONS,
  INVENTARIO_OPERACION_OPTIONS,
  INVENTARIO_PRODUCTO_OPTIONS,
  PDF_EXTRACT_MODEL,
} from '@/lib/utils/constants'

// "Subir PDF" en el alta de propiedades: Claude lee la ficha/brochure y
// devuelve los campos de inventario_industrial para prellenar el formulario.
// Se llama a la API por fetch (sin SDK) para no agregar dependencias.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Campos que en el formulario son <select>: solo se aceptan sus opciones.
const FIXED_OPTIONS: Record<string, string[]> = {
  operacion: INVENTARIO_OPERACION_OPTIONS,
  estatus: INVENTARIO_ESTATUS_OPTIONS,
  producto: INVENTARIO_PRODUCTO_OPTIONS,
  area_base_calculo: INVENTARIO_AREA_BASE_OPTIONS,
  moneda: INVENTARIO_MONEDA_OPTIONS,
}

const oneOf = (key: string) => `Uno de: ${FIXED_OPTIONS[key].join(', ')}`

// Campo → descripción para el modelo. Las claves coinciden con PropertyForm.
const TEXT_FIELDS: Record<string, string> = {
  parque: 'Nombre del parque industrial o desarrollo (ej. "Acupark 3")',
  unidad: 'Identificador de la nave/lote/bodega dentro del parque (ej. "95", "Bodega 16", "Nave A")',
  operacion: oneOf('operacion'),
  estatus: oneOf('estatus'),
  producto: oneOf('producto'),
  tipo_producto: 'Subtipo del producto si se menciona',
  estado: 'Estado de la república (ej. Querétaro, Guanajuato)',
  municipio: 'Municipio',
  zona_corredor: 'Zona o corredor industrial (ej. "PIQ", "Carretera 57 / Aeropuerto")',
  ubicacion: 'Dirección, nombre del parque para maps o link de Google Maps',
  area_base_calculo: `Sobre qué superficie se calcula el precio por m². ${oneOf('area_base_calculo')}`,
  moneda: oneOf('moneda'),
  disponibilidad: 'Fecha o condición de entrega (ej. "Inmediata", "Q3 2027", "En construcción >80%")',
  kva_disponibles: 'Energía eléctrica disponible, con unidades (ej. "500 KVA")',
  altura_libre: 'Altura libre interior, con unidades (ej. "10 m")',
  piso: 'Especificación del piso (ej. "Concreto MR45 15 cm")',
  sistema_contra_incendios: 'Sistema contra incendios',
  certificaciones: 'Certificaciones (LEED, etc.)',
  iluminacion: 'Tipo de iluminación (ej. "LED", "Domos 5%")',
  andenes: 'Número o descripción de andenes de carga',
  rampas: 'Número o descripción de rampas',
  notas_tecnicas: 'Resumen breve de cualquier otra característica relevante que no encaje en otro campo (muros, techo, estacionamiento, oficinas, financiamiento...)',
}

const NUMERIC_FIELDS: Record<string, string> = {
  m2_terreno: 'Superficie de terreno en m²',
  m2_construccion: 'Superficie construida en m²',
  m2_rentables: 'Superficie rentable en m²',
  precio_venta_m2: 'Precio de venta por m² (solo el número)',
  precio_total_venta: 'Precio total de venta (solo el número)',
  precio_renta_m2: 'Renta mensual por m² (solo el número)',
  renta_mensual: 'Renta mensual total (solo el número)',
  mantenimiento_m2: 'Cuota de mantenimiento por m² (solo el número)',
  mantenimiento_mensual: 'Cuota de mantenimiento mensual total (solo el número)',
}

// Todo viaja como string obligatorio ("" = no encontrado): structured outputs
// admite máximo 16 campos con unión de tipos (nullable), y aquí hay 31.
// Los numéricos se convierten en el servidor.
const ALL_FIELDS = { ...TEXT_FIELDS, ...NUMERIC_FIELDS }

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(ALL_FIELDS),
  properties: Object.fromEntries(
    Object.entries(ALL_FIELDS).map(([k, description]) => [k, { type: 'string', description }]),
  ),
}

const extractedSchema = z.record(z.string(), z.string())

const PROMPT = `Este PDF describe una propiedad industrial en México (ficha técnica, brochure o propuesta).
Extrae los datos para dar de alta la propiedad en el inventario de BRIKA.

Reglas:
- Usa "" (cadena vacía) en cualquier campo que el documento no mencione. No inventes ni supongas valores.
- Campos numéricos: solo el número, sin símbolos, comas ni unidades (ej. "12500.5"). Convierte ft² a m² si el documento solo da pies cuadrados.
- Si el PDF describe varias unidades, extrae solo la primera o principal.
- Para campos con opciones fijas, usa exactamente una de las opciones listadas o "".
- Textos en español, tal como aparecen en el documento cuando sea posible.`

export class PdfExtractError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export type ExtractedProperty = Record<string, string | number>

export async function extractPropertyFromPdf(pdf: Buffer): Promise<ExtractedProperty> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new PdfExtractError('Falta configurar ANTHROPIC_API_KEY en el servidor', 500)

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: PDF_EXTRACT_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[pdf-extract] Anthropic API', res.status, detail)
    if (res.status === 413) throw new PdfExtractError('El PDF es demasiado grande', 413)
    throw new PdfExtractError('No se pudo leer el PDF con IA. Intenta de nuevo.', 502)
  }

  const message = (await res.json()) as {
    stop_reason: string
    content: { type: string; text?: string }[]
  }
  if (message.stop_reason === 'refusal') throw new PdfExtractError('La IA no pudo procesar este PDF', 422)
  if (message.stop_reason === 'max_tokens') throw new PdfExtractError('El PDF es demasiado extenso para procesarlo', 422)

  const text = message.content.find((b) => b.type === 'text')?.text
  if (!text) throw new PdfExtractError('La IA no devolvió datos', 502)

  const parsed = extractedSchema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new PdfExtractError('Respuesta de la IA con formato inesperado', 502)

  // Solo los campos encontrados: el formulario conserva lo demás.
  const result: ExtractedProperty = {}
  for (const [key, raw] of Object.entries(parsed.data)) {
    const value = raw.trim()
    if (!value || !(key in ALL_FIELDS)) continue
    if (key in NUMERIC_FIELDS) {
      const n = parseFloat(value.replace(/[^\d.-]/g, ''))
      if (Number.isFinite(n)) result[key] = n
    } else {
      result[key] = value
    }
  }
  for (const [key, options] of Object.entries(FIXED_OPTIONS)) {
    if (typeof result[key] !== 'string') continue
    const match = options.find((o) => normalize(o) === normalize(result[key] as string))
    if (match) result[key] = match
    else delete result[key]
  }
  return result
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}
