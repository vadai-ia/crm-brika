CREATE TABLE IF NOT EXISTS public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#E8872A',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios leen sus categorias"
  ON public.event_categories FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios crean sus categorias"
  ON public.event_categories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios actualizan sus categorias"
  ON public.event_categories FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios eliminan sus categorias"
  ON public.event_categories FOR DELETE TO authenticated
  USING (user_id = auth.uid());
