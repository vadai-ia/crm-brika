import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  ImageRun, TabStopType, TabStopPosition,
} from 'docx'
import {
  LOGO_WORDMARK_RATIO, LOGO_WORDMARK_SRC, dataUrlToBytes, loadImageAsBase64,
} from '@/components/pdf/ficha/assets'
import { buildCartaContent, type CartaPropuestaData } from './cartaContent'

const INK = '1A1A1A'
const SIGN_TABS = [
  { type: TabStopType.CENTER, position: TabStopPosition.MAX / 4 },
  { type: TabStopType.CENTER, position: (TabStopPosition.MAX * 3) / 4 },
]

/**
 * Genera la Carta Propuesta en Word. Misma redacción que el PDF
 * (`buildCartaContent`): lo vacío o en 0 no aparece.
 */
export async function generateCartaDocx(data: CartaPropuestaData): Promise<Blob> {
  const c = buildCartaContent(data)
  const logoB64 = await loadImageAsBase64(LOGO_WORDMARK_SRC)
  const logoBuffer = logoB64 ? dataUrlToBytes(logoB64) : null

  const children: Paragraph[] = []

  // Logo + fecha
  children.push(
    logoBuffer
      ? new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 130, height: Math.round(130 / LOGO_WORDMARK_RATIO) },
              type: 'png',
            }),
          ],
        })
      : new Paragraph({ children: [new TextRun({ text: 'BRIKA', bold: true, size: 40, color: INK })] })
  )
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new TextRun({ text: c.fecha, size: 20 })],
    })
  )

  // Título
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      children: [new TextRun({ text: c.titulo, bold: true, size: 32, color: INK })],
    })
  )

  // Cuerpo
  children.push(
    new Paragraph({ children: [new TextRun({ text: c.saludo, size: 22 })], spacing: { after: 200 } }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: c.asesorLabel, bold: true, size: 22 }),
        new TextRun({ text: c.asesorNombre, size: 22 }),
      ],
    }),
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: c.intro, size: 22 })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: c.ofrecen, size: 22 })] })
  )

  if (c.valorLine) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: c.valorLine, bold: true, size: 22, color: INK })],
      })
    )
  }

  for (const text of c.bullets) {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text, size: 22 })],
      })
    )
  }

  // Documentos
  children.push(
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [new TextRun({ text: c.documentosTitulo, bold: true, size: 24, color: INK })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: c.documentos.map((s) => new TextRun({ text: s.text, bold: s.bold, size: 20 })),
    })
  )

  // Firmas
  children.push(
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({
      spacing: { after: 0 },
      tabStops: SIGN_TABS,
      children: [new TextRun({ text: '\t___________________________\t___________________________', size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      tabStops: SIGN_TABS,
      children: [new TextRun({ text: `\t${c.firmaComprador.label}\t${c.firmaPropietario.label}`, size: 18 })],
    }),
    new Paragraph({
      tabStops: SIGN_TABS,
      children: [
        new TextRun({
          text: `\t${c.firmaComprador.nombre}\t${c.firmaPropietario.nombre}`,
          bold: true,
          size: 20,
          color: INK,
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children,
    }],
  })

  return Packer.toBlob(doc)
}
