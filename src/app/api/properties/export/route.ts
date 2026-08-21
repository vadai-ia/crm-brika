import { NextResponse } from 'next/server'
import { requireAdmin, isAuthError } from '@/lib/auth/permissions'
import { buildInventarioWorkbook, exportFileName } from '@/lib/services/inventario-export'

export const dynamic = 'force-dynamic'

/** Descarga todo el inventario (inventario_industrial) en Excel. Solo admin. */
export async function GET() {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth

  try {
    const { buffer, rows } = await buildInventarioWorkbook()
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportFileName()}"`,
        'Content-Length': String(buffer.length),
        'X-Row-Count': String(rows),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al exportar el inventario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
