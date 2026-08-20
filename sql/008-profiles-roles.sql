-- ============================================================
-- 008 — Asesores: perfiles con roles personalizados + permisos faltantes
--
-- Contexto:
--   * `profiles.role` se creó (001) con CHECK (role IN ('asesor','admin')).
--     Los roles ahora viven en `public.roles` (006) y el módulo de Asesores
--     permite asignar cualquier rol de esa tabla (p. ej. "gerencia"), así que
--     el CHECK se reemplaza por una FK a roles(name).
--   * 007 (formularios.view) pudo no ejecutarse: se re-aplica de forma idempotente.
--   * El rol admin NO depende de esta matriz (bypass en lib/dal/roles.ts),
--     pero se mantiene completo por claridad.
--
-- Es idempotente: se puede pegar más de una vez.
-- Pegar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Función/trigger updated_at (por si el proyecto no trae la de 001)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_roles ON public.roles;
CREATE TRIGGER set_updated_at_roles
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2) Cualquier rol en uso que no exista en `roles` se crea vacío (sin permisos)
--    para que la FK del paso 3 no falle. Revisar después en Asesores → Roles y permisos.
INSERT INTO public.roles (name, display_name, description, permissions, is_system)
SELECT DISTINCT p.role, initcap(p.role), 'Creado automáticamente por 008 (sin permisos)', '{}'::jsonb, false
FROM public.profiles p
LEFT JOIN public.roles r ON r.name = p.role
WHERE r.id IS NULL
ON CONFLICT (name) DO NOTHING;

-- 3) CHECK ('asesor','admin') → FK a roles(name)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_fkey
  FOREIGN KEY (role) REFERENCES public.roles(name)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;   -- no se puede borrar un rol con usuarios (la app también lo valida)

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4) Claves de permisos que faltan en los roles existentes.
--    `'{defaults}' || permissions` conserva el valor ya configurado si la clave existe.
UPDATE public.roles
SET permissions = '{
  "pdf.view": true, "carta_propuesta.view": true, "calendario.view": true, "whaapy.view": true,
  "anuncios.view": true, "anuncios.create": true,
  "asesores.view": true, "asesores.create": true, "asesores.edit": true, "asesores.delete": true,
  "desarrollos.view": true, "desarrollos.create": true, "desarrollos.edit": true, "desarrollos.delete": true,
  "columnas.view": true, "columnas.edit": true,
  "webhooks.view": true, "webhooks.manage": true,
  "apikeys.view": true, "apikeys.manage": true,
  "carga_masiva.view": true, "formularios.view": true,
  "propiedades.view": true, "propiedades.create": true, "propiedades.edit": true, "propiedades.delete": true
}'::jsonb || permissions
WHERE name = 'admin';

UPDATE public.roles
SET permissions = '{
  "pdf.view": true, "carta_propuesta.view": true, "formularios.view": true,
  "carga_masiva.view": false
}'::jsonb || permissions
WHERE name = 'asesor';

-- 5) Verificación rápida
SELECT p.email, p.role, r.display_name, p.is_active
FROM public.profiles p
LEFT JOIN public.roles r ON r.name = p.role
ORDER BY p.created_at DESC;
