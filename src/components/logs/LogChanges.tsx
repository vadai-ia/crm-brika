'use client'

import type { AuditChange, AuditLog, BulkRowDetail } from '@/types/audit'

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'number') return new Intl.NumberFormat('es-MX').format(v)
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.map((x) => String(x)).join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function ChangesTable({ changes }: { changes: Record<string, AuditChange> }) {
  const entries = Object.entries(changes)
  if (entries.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-tertiary">
            <th className="py-1.5 pr-4 font-medium">Campo</th>
            <th className="py-1.5 pr-4 font-medium">Antes</th>
            <th className="py-1.5 font-medium">Después</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([campo, change]) => (
            <tr key={campo} className="border-t border-border-primary/60 align-top">
              <td className="py-1.5 pr-4 font-medium text-text-primary whitespace-nowrap">{campo}</td>
              <td className="py-1.5 pr-4 text-text-secondary break-words max-w-[280px]">
                {fmtVal(change.antes)}
              </td>
              <td className="py-1.5 text-text-primary break-words max-w-[280px]">
                {fmtVal(change.despues)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BulkDetail({ metadata }: { metadata: Record<string, unknown> }) {
  const nuevas = (metadata.nuevas as string[] | undefined) ?? []
  const actualizadas = (metadata.actualizadas as BulkRowDetail[] | undefined) ?? []
  const nuevasOmitidas = (metadata.nuevas_omitidas as number | undefined) ?? 0
  const actualizadasOmitidas = (metadata.actualizadas_omitidas as number | undefined) ?? 0
  const error = metadata.error as string | undefined

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          La carga terminó con un error: {error}
        </p>
      )}

      {nuevas.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-1.5">
            Propiedades nuevas ({fmtVal(metadata.inserted)})
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {nuevas.map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                {label}
              </span>
            ))}
            {nuevasOmitidas > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-bg-tertiary text-text-tertiary">
                +{nuevasOmitidas} más
              </span>
            )}
          </div>
        </div>
      )}

      {actualizadas.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-1.5">
            Propiedades actualizadas ({fmtVal(metadata.updated)})
          </p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {actualizadas.map((item, i) => (
              <div key={`${item.propiedad}-${i}`} className="rounded-[var(--radius-sm)] bg-bg-tertiary/50 px-3 py-2">
                <p className="text-sm font-medium text-text-primary mb-1">{item.propiedad}</p>
                <ChangesTable changes={item.cambios} />
              </div>
            ))}
            {actualizadasOmitidas > 0 && (
              <p className="text-xs text-text-tertiary">
                +{actualizadasOmitidas} propiedades más (detalle omitido por tamaño)
              </p>
            )}
          </div>
        </div>
      )}

      {nuevas.length === 0 && actualizadas.length === 0 && !error && (
        <p className="text-sm text-text-tertiary">La carga no produjo cambios.</p>
      )}
    </div>
  )
}

/** Etiquetas conocidas de la metadata genérica (resultado del botón de fotos, pruebas, etc.). */
const META_LABELS: Record<string, string> = {
  resultado: 'Resultado',
  mensaje: 'Mensaje',
  tipo: 'Tipo',
  error: 'Error',
}

function MetadataList({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata)
  if (entries.length === 0) return null
  return (
    <dl className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-sm">
          <dt className="font-medium text-text-primary whitespace-nowrap">
            {META_LABELS[key] ?? key}:
          </dt>
          <dd className="text-text-secondary break-words">{fmtVal(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export function LogChanges({ log }: { log: AuditLog }) {
  const hasChanges = log.changes && Object.keys(log.changes).length > 0
  const isBulk = log.action === 'carga_masiva' && log.metadata
  const hasMetadata = !isBulk && log.metadata && Object.keys(log.metadata).length > 0

  if (!hasChanges && !isBulk && !hasMetadata) {
    return <p className="text-sm text-text-tertiary">Sin detalle de cambios para este registro.</p>
  }

  return (
    <div className="space-y-4">
      {hasChanges && <ChangesTable changes={log.changes!} />}
      {isBulk && <BulkDetail metadata={log.metadata!} />}
      {hasMetadata && <MetadataList metadata={log.metadata!} />}
    </div>
  )
}
