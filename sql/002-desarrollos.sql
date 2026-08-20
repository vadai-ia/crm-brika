CREATE OR REPLACE VIEW public.desarrollos_view
WITH (security_invoker = true)
AS
SELECT
  id,
  created_at,
  id_propiedad,
  "Nombre Kibah" AS nombre_kibah,
  "Nombre Desarrollador" AS nombre_desarrollador,
  "Fecha de Actualización" AS fecha_actualizacion,
  "Disponibilidad" AS disponibilidad,
  "Precio Min" AS precio_min,
  "Precio Max" AS precio_max,
  "M2 Totales Min" AS m2_totales_min,
  "M2 Totales Max" AS m2_totales_max,
  "Recámaras Min" AS recamaras_min,
  "Recámaras Max" AS recamaras_max,
  "Baños Min" AS banos_min,
  "Baños Max" AS banos_max,
  "Estacionamientos Min" AS estacionamientos_min,
  "Estacionamientos Max" AS estacionamientos_max,
  "Bodega" AS bodega,
  "Amenidades" AS amenidades,
  "Dirección" AS direccion,
  "Dirección BDD" AS direccion_bdd,
  "Colonia" AS colonia,
  LOWER(TRIM("Alcaldia")) AS alcaldia,
  "Desarrollador/Propietario (Whats grupo)" AS contacto_desarrollador,
  "Fecha de Construcción/Entrega" AS fecha_entrega,
  LOWER(TRIM("Entrega Inmediata/Preventa")) AS tipo_preventa,
  "Tipo de Entrega" AS tipo_entrega,
  CASE
    WHEN "% Comisión" IS NULL OR "% Comisión" = '' THEN NULL
    WHEN "% Comisión" ~ '^[0-9]*\.?[0-9]+$' THEN
      CASE
        WHEN CAST("% Comisión" AS NUMERIC) < 1 THEN CAST("% Comisión" AS NUMERIC) * 100
        ELSE CAST("% Comisión" AS NUMERIC)
      END
    ELSE NULL
  END AS pct_comision,
  "Descripción Desarrollo" AS descripcion,
  NULLIF(TRIM("Link Imagen"), '') AS imagen_principal,
  "Link Maps" AS link_maps,
  NULLIF(TRIM("Imagen 1"), '') AS imagen_1,
  NULLIF(TRIM("Imagen 2"), '') AS imagen_2,
  NULLIF(TRIM("Imagen 3"), '') AS imagen_3
FROM public.pagina_web_kibah;

ALTER TABLE public.pagina_web_kibah ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leen desarrollos"
  ON public.pagina_web_kibah FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insertan desarrollos"
  ON public.pagina_web_kibah FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins actualizan desarrollos"
  ON public.pagina_web_kibah FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins eliminan desarrollos"
  ON public.pagina_web_kibah FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

ALTER TABLE public.pagina_web_kibah
  ALTER COLUMN id_propiedad SET DEFAULT gen_random_uuid();
