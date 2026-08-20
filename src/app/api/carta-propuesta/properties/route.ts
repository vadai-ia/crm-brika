import { NextResponse } from 'next/server'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { getInventarioList } from '@/lib/dal/properties'

/** Propiedades del inventario (versión ligera) para el selector de la Carta Propuesta. */
export async function GET() {
  const auth = await requirePermission('carta_propuesta.view')
  if (isAuthError(auth)) return auth

  try {
    // inventario_industrial tiene RLS sin políticas (la administra Laravel):
    // el DAL lee con el cliente admin después de verificar la sesión (ERROR-JOURNAL #6)
    const items = await getInventarioList()
    return NextResponse.json({ data: items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading properties'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
