import { ColumnVisibilityManager } from '@/components/admin/ColumnVisibilityManager'

export default function ColumnasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="brika-page-title">
          Configuración de Columnas
        </h1>
        <p className="brika-page-desc mt-1">
          Controla qué columnas pueden ver los asesores en los filtros y en el detalle de propiedades
        </p>
      </div>
      <ColumnVisibilityManager />
    </div>
  )
}
