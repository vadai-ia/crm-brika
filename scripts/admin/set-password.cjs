#!/usr/bin/env node
// Cambia la contraseña de un usuario del CRM usando la service role de .env.local
// (para cuentas cuyo correo no existe y no pueden usar "Olvidé mi contraseña").
//
//   node scripts/admin/set-password.cjs correo@dominio.com "NuevaContraseña"
//
// La contraseña no se guarda ni se imprime. Requiere .env.local en la raíz.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error('Uso: node scripts/admin/set-password.cjs <correo> "<nueva contraseña>"')
  process.exit(2)
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(2)
}

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
  const user = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
  if (!user) {
    console.error(`No existe un usuario con el correo ${email}.`)
    process.exit(1)
  }
  const { error: upErr } = await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true })
  if (upErr) throw upErr
  console.log(`Contraseña actualizada para ${user.email}. Ya puedes entrar al CRM con ella.`)
})().catch((e) => { console.error('Error:', e.message); process.exit(1) })
