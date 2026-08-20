import { PdfBuilder } from '@/components/pdf/PdfBuilder'

export default function PdfPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Ficha Técnica Comercial</h1>
        <p className="text-sm text-text-secondary mt-1">
          Selecciona propiedades para generar fichas técnicas con la plantilla BRIKA, listas para enviar a clientes
        </p>
      </div>
      <PdfBuilder />
    </div>
  )
}
