import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/** Traduce errores de validación / Supabase a respuestas HTTP con mensajes amigables. */
export function asesorErrorResponse(err: unknown, fallback: string): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
  }

  const message = err instanceof Error ? err.message : fallback
  const lower = message.toLowerCase()

  if (lower.includes('already') || lower.includes('duplicate') || lower.includes('23505')) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }
  if (lower.includes('no existe')) {
    return NextResponse.json({ error: message }, { status: 400 })
  }
  if (lower.includes('not found') || lower.includes('user not found')) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ error: message }, { status: 500 })
}
