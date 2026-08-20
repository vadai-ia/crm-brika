CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leen roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins gestionan roles"
  ON public.roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.roles (name, display_name, description, is_system, permissions) VALUES
('admin', 'Administrador', 'Acceso completo a toda la plataforma', true, '{
  "propiedades.view": true, "propiedades.create": true, "propiedades.edit": true, "propiedades.delete": true,
  "pdf.view": true, "calendario.view": true, "whaapy.view": true,
  "anuncios.view": true, "anuncios.create": true,
  "asesores.view": true, "asesores.create": true, "asesores.edit": true, "asesores.delete": true,
  "desarrollos.view": true, "desarrollos.create": true, "desarrollos.edit": true, "desarrollos.delete": true,
  "columnas.view": true, "columnas.edit": true,
  "webhooks.view": true, "webhooks.manage": true,
  "apikeys.view": true, "apikeys.manage": true
}'),
('asesor', 'Asesor', 'Acceso basico para asesores de ventas', true, '{
  "propiedades.view": true, "propiedades.create": false, "propiedades.edit": false, "propiedades.delete": false,
  "pdf.view": true, "calendario.view": true, "whaapy.view": true,
  "anuncios.view": true, "anuncios.create": false,
  "asesores.view": false, "asesores.create": false, "asesores.edit": false, "asesores.delete": false,
  "desarrollos.view": false, "desarrollos.create": false, "desarrollos.edit": false, "desarrollos.delete": false,
  "columnas.view": false, "columnas.edit": false,
  "webhooks.view": false, "webhooks.manage": false,
  "apikeys.view": false, "apikeys.manage": false
}'),
('gerencia', 'Gerencia', 'Acceso de gerencia', false, '{
  "propiedades.view": true, "propiedades.create": true, "propiedades.edit": true, "propiedades.delete": true,
  "pdf.view": true, "calendario.view": true, "whaapy.view": true,
  "anuncios.view": true, "anuncios.create": true,
  "asesores.view": true, "asesores.create": false, "asesores.edit": false, "asesores.delete": false,
  "desarrollos.view": true, "desarrollos.create": true, "desarrollos.edit": true, "desarrollos.delete": false,
  "columnas.view": true, "columnas.edit": false,
  "webhooks.view": true, "webhooks.manage": false,
  "apikeys.view": true, "apikeys.manage": false
}')
ON CONFLICT (name) DO NOTHING;
