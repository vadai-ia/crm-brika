-- 009: Visibilidad de fotos por propiedad para la página web
-- Aplicado por el usuario desde el dashboard de Supabase el 2026-08-21
-- (ver ERROR-JOURNAL #20). Referencia del esquema; NO volver a ejecutar.
--
-- Las fotos viven en el bucket público `Imagenes`, en la carpeta
-- `{image_set_id}/` que `propiedad_image_sets` liga a cada propiedad.
-- Varias propiedades comparten el mismo set, por eso la visibilidad va por
-- propiedad_id + nombre de archivo (nunca por set ni por índice).
--
-- Regla: SIN FILA = VISIBLE y sin posición. La web lista la carpeta del set
-- como siempre, excluye los archivos con visible = false y acomoda por `orden`
-- (0 = primera; las fotos sin fila o con orden null van al final, en orden
-- natural de nombre). La #1 visible es la portada, igual que en el CRM:
--
--   select image_name, visible, orden
--   from public.propiedad_imagenes_visibilidad
--   where propiedad_id = :id
--   order by orden nulls last, image_name;

create table public.propiedad_imagenes_visibilidad (
  propiedad_id uuid not null references public.inventario_industrial(id) on delete cascade,
  image_name   text not null,              -- archivo dentro del set: "1.jpg", "2 AP2.webp"
  visible      boolean not null default true,
  orden        int,                        -- reservado: orden en la web (sin uso aún)
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id),
  primary key (propiedad_id, image_name)
);

alter table public.propiedad_imagenes_visibilidad enable row level security;

-- Solo el CRM escribe (service role). Si la web lee con la anon key desde el
-- navegador, habilitar lectura pública (las fotos ya son públicas):
-- create policy "lectura publica"
--   on public.propiedad_imagenes_visibilidad for select using (true);
