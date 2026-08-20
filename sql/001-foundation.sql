-- ============================================================
-- KIBAH FOUNDATION SCHEMA — M1 (CORREGIDO)
-- Columnas reales de base_kibah
-- Execute in Supabase SQL Editor in order
-- ============================================================

-- ------------------------------------------------------------
-- 1. View: propiedades_view (read-only, snake_case)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.propiedades_view
WITH (security_invoker = true)
AS
SELECT
  id,
  created_at,
  id_propiedad,
  "Nombre Desarrollador" AS nombre_desarrollador,
  "Unidad" AS unidad,
  "Fecha de Actualización" AS fecha_actualizacion,
  "Disponibilidad" AS disponibilidad,
  "Precio por unidad" AS precio_unidad,
  "M2 Totales" AS m2_totales,
  "M2 Habitables" AS m2_habitables,
  "M2 Exteriores" AS m2_exteriores,
  "M2 Roof Garden/Jardín" AS m2_roof_garden,
  "Número de recámaras" AS num_recamaras,
  "Número de baños" AS num_banos,
  "Lugares de estacionamiento" AS estacionamiento,
  "Bodega" AS bodega,
  "Amenidades" AS amenidades,
  "Dirección" AS direccion,
  "Colonia" AS colonia,
  LOWER(TRIM("Alcaldia")) AS alcaldia,
  "Desarrollador/Propietario (Whats grupo)" AS contacto_desarrollador,
  "Fecha de Construcción/Entrega" AS fecha_entrega,
  LOWER(TRIM("Entrega Inmediata/Preventa")) AS tipo_preventa,
  "Tipo de Entrega" AS tipo_entrega,
  CASE
    WHEN "% Comisión" IS NULL OR TRIM("% Comisión") = '' THEN NULL
    WHEN TRIM("% Comisión") ~ '^[0-9]*\.?[0-9]+$' THEN
      CASE
        WHEN CAST(TRIM("% Comisión") AS NUMERIC) < 1
          THEN CAST(TRIM("% Comisión") AS NUMERIC) * 100
        ELSE CAST(TRIM("% Comisión") AS NUMERIC)
      END
    ELSE NULL
  END AS pct_comision,
  "Link Drive" AS link_drive,
  "Nombre Kibah" AS nombre_kibah
FROM public.base_kibah;

-- ------------------------------------------------------------
-- 2. Function & Trigger: normalize_property_data
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_property_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."Alcaldia" IS NOT NULL THEN
    NEW."Alcaldia" := INITCAP(TRIM(NEW."Alcaldia"));
  END IF;
  IF NEW."Entrega Inmediata/Preventa" IS NOT NULL THEN
    NEW."Entrega Inmediata/Preventa" := INITCAP(TRIM(NEW."Entrega Inmediata/Preventa"));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_property_data ON public.base_kibah;
CREATE TRIGGER normalize_property_data
  BEFORE INSERT OR UPDATE ON public.base_kibah
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_property_data();

-- ------------------------------------------------------------
-- 3. Default UUID for id_propiedad
-- ------------------------------------------------------------
ALTER TABLE public.base_kibah
  ALTER COLUMN id_propiedad SET DEFAULT gen_random_uuid();

-- ------------------------------------------------------------
-- 4. Table: profiles + RLS + index
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'asesor' CHECK (role IN ('asesor', 'admin')),
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados leen perfiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuario actualiza su propio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins crean perfiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 5. Table: column_visibility + RLS + seed data
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.column_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_name TEXT NOT NULL UNIQUE,
  visible_to_asesores BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  display_label TEXT,
  filter_type TEXT CHECK (filter_type IN ('range', 'select', 'text', 'boolean', 'none')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.column_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos los autenticados leen visibilidad"
  ON public.column_visibility FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insertan visibilidad"
  ON public.column_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins actualizan visibilidad"
  ON public.column_visibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins eliminan visibilidad"
  ON public.column_visibility FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO public.column_visibility (column_name, visible_to_asesores, display_order, display_label, filter_type) VALUES
  ('nombre_desarrollador', true, 1, 'Desarrollo', 'text'),
  ('unidad', true, 2, 'Unidad', 'text'),
  ('disponibilidad', true, 3, 'Disponibilidad', 'select'),
  ('precio_unidad', true, 4, 'Precio', 'range'),
  ('m2_totales', true, 5, 'M² Totales', 'range'),
  ('m2_habitables', true, 6, 'M² Habitables', 'range'),
  ('m2_exteriores', false, 7, 'M² Exteriores', 'range'),
  ('m2_roof_garden', false, 8, 'M² Roof/Jardín', 'range'),
  ('num_recamaras', true, 9, 'Recámaras', 'range'),
  ('num_banos', true, 10, 'Baños', 'range'),
  ('estacionamiento', true, 11, 'Estacionamiento', 'range'),
  ('bodega', false, 12, 'Bodega', 'boolean'),
  ('amenidades', false, 13, 'Amenidades', 'text'),
  ('direccion', true, 14, 'Dirección', 'text'),
  ('colonia', true, 15, 'Colonia', 'select'),
  ('alcaldia', true, 16, 'Alcaldía', 'select'),
  ('contacto_desarrollador', false, 17, 'Contacto Desarrollador', 'text'),
  ('fecha_entrega', true, 18, 'Fecha Entrega', 'text'),
  ('tipo_preventa', true, 19, 'Tipo', 'select'),
  ('tipo_entrega', true, 20, 'Estado Obra', 'select'),
  ('pct_comision', false, 21, 'Comisión %', 'range'),
  ('link_drive', false, 22, 'Link Drive', 'none'),
  ('nombre_kibah', true, 23, 'Nombre Kibah', 'text'),
  ('fecha_actualizacion', false, 24, 'Última Actualización', 'none'),
  ('created_at', false, 25, 'Fecha Creación', 'none'),
  ('id_propiedad', false, 26, 'ID Propiedad', 'none')
ON CONFLICT (column_name) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Table: webhooks + RLS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  secret TEXT,
  headers JSONB DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  last_status_code INT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leen webhooks"
  ON public.webhooks FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins insertan webhooks"
  ON public.webhooks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins actualizan webhooks"
  ON public.webhooks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins eliminan webhooks"
  ON public.webhooks FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 7. Table: api_keys + RLS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_salt TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{"properties.read"}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leen api keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins insertan api keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins eliminan api keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 8. RLS for base_kibah (4 separate policies)
-- ------------------------------------------------------------
ALTER TABLE public.base_kibah ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leen propiedades"
  ON public.base_kibah FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insertan propiedades"
  ON public.base_kibah FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins actualizan propiedades"
  ON public.base_kibah FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins eliminan propiedades"
  ON public.base_kibah FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 9. Indexes on base_kibah filter columns
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_base_kibah_disponibilidad ON public.base_kibah("Disponibilidad");
CREATE INDEX IF NOT EXISTS idx_base_kibah_colonia ON public.base_kibah("Colonia");
CREATE INDEX IF NOT EXISTS idx_base_kibah_alcaldia ON public.base_kibah("Alcaldia");
CREATE INDEX IF NOT EXISTS idx_base_kibah_precio ON public.base_kibah("Precio por unidad");
CREATE INDEX IF NOT EXISTS idx_base_kibah_recamaras ON public.base_kibah("Número de recámaras");
CREATE INDEX IF NOT EXISTS idx_base_kibah_tipo_preventa ON public.base_kibah("Entrega Inmediata/Preventa");

-- ------------------------------------------------------------
-- 10. Function: update_updated_at()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 11. Triggers: update_updated_at on new tables
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_column_visibility ON public.column_visibility;
CREATE TRIGGER set_updated_at_column_visibility
  BEFORE UPDATE ON public.column_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_webhooks ON public.webhooks;
CREATE TRIGGER set_updated_at_webhooks
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();