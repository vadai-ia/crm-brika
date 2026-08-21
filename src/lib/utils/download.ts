/**
 * Descarga un archivo generado en el navegador (Blob).
 *
 * La URL del blob NO se libera de inmediato: Chrome lee el archivo de forma
 * asíncrona y, si se revoca antes de que termine, cancela la descarga con
 * "Error: Permisos insuficientes" (pasaba con fichas PDF de 2+ propiedades;
 * ver ERROR-JOURNAL #30). Se libera un minuto después.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
