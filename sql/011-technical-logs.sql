-- ============================================================================
-- 011: Logs técnicos (pestaña "Técnicos" del módulo Logs)
-- Pegar en: Supabase Dashboard → SQL Editor. Idempotente (IF NOT EXISTS).
--
-- Registra requests de la API del CRM: método, ruta, status HTTP, duración y
-- mensaje de error. Para no inflar la tabla NO se registra todo:
--   · SIEMPRE los errores (status >= 400), con su mensaje
--   · las escrituras (POST/PUT/PATCH/DELETE) con status y duración
--   · los requests lentos (> 2 s) aunque sean GET
--   · los GET normales que salen bien NO se registran
-- Rutas de altísima frecuencia (photo-sync, portadas, permisos) solo
-- registran errores. NUNCA se guardan cuerpos de request (ahí viajan
-- contraseñas y llaves).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.technical_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,          -- GET | POST | PUT | PATCH | DELETE
  route TEXT NOT NULL,           -- plantilla de la ruta: /api/properties/[id]
  path TEXT,                     -- ruta real del request: /api/properties/8f3a…
  status INT NOT NULL,           -- status HTTP de la respuesta
  duration_ms INT,               -- duración del request en milisegundos
  user_id UUID,                  -- usuario de la sesión (sin FK: el log sobrevive bajas)
  user_email TEXT,
  error TEXT,                    -- mensaje de error cuando status >= 400
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technical_logs_created_at ON public.technical_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_technical_logs_status ON public.technical_logs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_technical_logs_route ON public.technical_logs (route, created_at DESC);

ALTER TABLE public.technical_logs ENABLE ROW LEVEL SECURITY;

-- El CRM escribe y lee con service role. Lectura directa: admin o logs.view
-- (mismo criterio que audit_logs, sql/010).
DROP POLICY IF EXISTS "Leen logs tecnicos admin o logs.view" ON public.technical_logs;
CREATE POLICY "Leen logs tecnicos admin o logs.view"
  ON public.technical_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      LEFT JOIN public.roles r ON r.name = p.role
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR COALESCE((r.permissions ->> 'logs.view')::boolean, false))
    )
  );

-- ── Retención automática: borrar logs técnicos de más de 90 días ────────────
-- Requiere la extensión pg_cron: Dashboard → Database → Extensions → pg_cron.
-- Si NO está habilitada, este bloque solo avisa (NOTICE) y todo lo demás del
-- archivo funciona igual; habilítala y vuelve a correr SOLO este bloque.
-- El job corre dentro de la base (sin costo en Vercel), todos los días 03:00 UTC.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-technical-logs',
      '0 3 * * *',
      $job$ DELETE FROM public.technical_logs WHERE created_at < now() - interval '90 days' $job$
    );
    RAISE NOTICE 'Purga automática programada: technical_logs > 90 días, diario 03:00 UTC.';
  ELSE
    RAISE NOTICE 'pg_cron NO está habilitado: los logs técnicos no se purgan solos. Habilítalo en Database → Extensions y vuelve a correr este bloque.';
  END IF;
END $$;
