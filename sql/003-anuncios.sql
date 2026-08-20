-- Tabla de anuncios
CREATE TABLE IF NOT EXISTS public.anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de lecturas (qué asesor leyó qué anuncio)
CREATE TABLE IF NOT EXISTS public.anuncio_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anuncio_id, user_id)
);

-- RLS
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncio_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leen anuncios"
  ON public.anuncios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins crean anuncios"
  ON public.anuncios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins eliminan anuncios"
  ON public.anuncios FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Usuarios leen sus lecturas"
  ON public.anuncio_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios marcan como leido"
  ON public.anuncio_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Índices
CREATE INDEX idx_anuncios_created ON public.anuncios(created_at DESC);
CREATE INDEX idx_anuncio_reads_user ON public.anuncio_reads(user_id);
CREATE INDEX idx_anuncio_reads_anuncio ON public.anuncio_reads(anuncio_id);
