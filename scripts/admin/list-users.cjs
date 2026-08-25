#!/usr/bin/env node
// Lista los usuarios de Supabase Auth contra los perfiles del CRM (solo lectura):
// sirve para detectar usuarios sin perfil (no pueden usar el CRM) o perfiles huérfanos.
//
//   node scripts/admin/list-users.cjs
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

const envFile = path.resolve(__dirname, '..', '..', '.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  const { data: { users }, error } = await sb.auth.admin.listUsers({ perPage: 500 })
  if (error) throw error
  const { data: profiles } = await sb.from('profiles').select('id,email,full_name,role,is_active')
  const pById = new Map((profiles ?? []).map((p) => [p.id, p]))
  console.log(`usuarios en Auth: ${users.length} | perfiles: ${(profiles ?? []).length}`)
  for (const u of users) {
    const p = pById.get(u.id)
    const perfil = p ? `${p.role}${p.is_active ? '' : ' (inactivo)'} — ${p.full_name}` : 'SIN PERFIL (no puede usar el CRM)'
    console.log(`  ${u.email} | confirmado: ${!!u.email_confirmed_at} | último acceso: ${(u.last_sign_in_at || 'nunca').slice(0, 10)} | ${perfil} | id: ${u.id}`)
  }
  const orphans = (profiles ?? []).filter((p) => !users.some((u) => u.id === p.id))
  if (orphans.length) console.log('perfiles sin usuario en Auth:', orphans.map((p) => p.email).join(', '))
})().catch((e) => { console.error('Error:', e.message); process.exit(1) })
