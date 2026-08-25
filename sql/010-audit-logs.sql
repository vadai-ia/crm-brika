-- ============================================================================
-- 010: Historial de auditoría (módulo "Logs" del dashboard)
-- Pegar en: Supabase Dashboard → SQL Editor. Idempotente (IF NOT EXISTS).
--
-- Registra TODA modificación hecha desde el CRM: altas, ediciones campo a
-- campo (antes → después), bajas y cargas masivas (qué se insertó y qué se
-- actualizó), con el usuario que la hizo. EXCLUIDO a pedido del usuario:
-- la selección/orden de fotos para la web (propiedad_imagenes_visibilidad)
-- y la importación de fotos (photo-sync / image_sets).
--
-- Los datos del actor se guardan como snapshot (nombre/email al momento del
-- evento) para que el historial sobreviva si el usuario se elimina.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,        -- create | update | delete | carga_masiva | reset_password | test | actualizar_fotos
  entity TEXT NOT NULL,        -- propiedad | usuario | rol | webhook | api_key | nota | desarrollo | columnas
  entity_id TEXT,              -- id del registro afectado (uuid o numérico, como texto)
  entity_label TEXT,           -- etiqueta legible: "Acupark · 14 · Venta", "Juan Pérez (correo)"
  changes JSONB,               -- { "Etiqueta del campo": { "antes": ..., "despues": ... } }
  metadata JSONB,              -- extra: carga masiva { inserted, updated, nuevas[], actualizadas[] }, errores…
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- El CRM escribe y lee con service role (bypassa RLS). Esta política solo
-- permite lectura directa a admins o roles con el permiso logs.view.
DROP POLICY IF EXISTS "Leen logs admin o logs.view" ON public.audit_logs;
CREATE POLICY "Leen logs admin o logs.view"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      LEFT JOIN public.roles r ON r.name = p.role
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR COALESCE((r.permissions ->> 'logs.view')::boolean, false))
    )
  );

-- Permiso nuevo del módulo (ver types/roles.ts). Se otorga al rol admin;
-- a otros roles se les da desde Asesores → Roles y permisos.
UPDATE public.roles
SET permissions = permissions || '{"logs.view": true}'::jsonb
WHERE name = 'admin';
