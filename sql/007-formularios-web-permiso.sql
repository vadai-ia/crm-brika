-- ============================================================
-- 007 — Permiso "formularios.view" (módulo Formularios Web)
--
-- Las tablas public.leads_propiedades y public.leads_proyectos YA existen
-- en el proyecto Supabase de brika (las alimenta el sitio web público).
-- Este SQL solo otorga el permiso del nuevo módulo a los roles existentes
-- para que el menú "Formularios Web" sea visible.
--
-- Nota: los usuarios con role = 'admin' ven el módulo aunque no se corra
-- este SQL (bypass de admin); esto habilita al resto de los roles.
--
-- Pegar en: Supabase Dashboard → SQL Editor
-- ============================================================

UPDATE public.roles
SET permissions = permissions || '{"formularios.view": true}'::jsonb
WHERE name IN ('admin', 'asesor');
