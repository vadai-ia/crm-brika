# Fotos del inventario: Drive → Supabase Storage

> **Desde ERROR-JOURNAL #23 la importación es automática**: el CRM registra la
> carpeta al guardar una propiedad (alta, edición o carga masiva), la importa al
> abrir Propiedades y ahí mismo revisa (una vez al día por carpeta) si cambió
> algo en Drive (`src/lib/services/photo-sync/`). Sin cron ni servicios extra. Este script es la herramienta manual para
> reoptimizar todo (`--reoptimize`), borrar respaldos o resolver emergencias.
> Comparte con el CRM el formato del manifiesto y la tabla `image_sets`.

Las fotos que ven el CRM y la página web viven en el bucket público `Imagenes`
de Supabase, en una carpeta numerada por **set** (`2/1.jpg`, `2/2.jpg`…), ya en
**tamaño web** (máx. 1600 px, ~150–400 KB), con su **miniatura** de 640 px en
`_thumbs/<set>/<mismo nombre>`. Se sirven directo (`/object/public/…`): no se usan
transformaciones de Supabase, que se cobran por cada imagen transformada al mes.

- `propiedad_image_sets`: qué set usa cada propiedad.
- `image_sets`: una fila por set = por carpeta de Drive (id, estado, última sincronización).
- `_manifest/<set>.json` en el bucket: qué archivo de Drive es cada foto del set.

Regla: **una carpeta de Drive = un set**. El link de Drive de cada propiedad está en
`inventario_industrial.links_imagenes_carpetas_drive`; las propiedades con el mismo
link comparten set (y fotos).

## Requisitos

- `.env.local` en la raíz del proyecto con `NEXT_PUBLIC_SUPABASE_URL` y
  `SUPABASE_SERVICE_ROLE_KEY` (el script escribe con service role).
- Cada carpeta de Drive compartida como **"Cualquier persona con el enlace → Lector"**
  (Compartir → Acceso general). Una carpeta privada se reporta como `PRIVADA` y se salta.
- Windows con PowerShell: `optimize-images.ps1` genera las versiones web y miniaturas
  (JPG/PNG/BMP/TIFF con System.Drawing; HEIC y WebP con WIC, que requiere las
  extensiones de imagen HEIF/WebP de Windows, normalmente ya instaladas).

## Uso

```bash
node scripts/fotos/sync-fotos.cjs                    # dry-run: qué cambiaría; no toca nada
node scripts/fotos/sync-fotos.cjs --apply            # aplica los cambios
node scripts/fotos/sync-fotos.cjs --only 5,14        # solo esos sets
node scripts/fotos/sync-fotos.cjs --only nuevo       # solo carpetas que aún no tienen set
node scripts/fotos/sync-fotos.cjs --reoptimize       # regenera todas las fotos (no solo las nuevas)
node scripts/fotos/sync-fotos.cjs --delete-backups   # borra los respaldos de _backup/
```

Corre desde la carpeta del proyecto, o con la ruta completa del script. Desde Claude
Code, anteponer `!` al comando (las escrituras al bucket requieren permiso del usuario).

## Qué hace

1. Lee el inventario y agrupa las propiedades por carpeta de Drive (id del link).
   Carpeta sin fila en `image_sets` → set nuevo con el siguiente número libre.
2. Lista la carpeta (con subcarpetas) y compara con el manifiesto: solo descarga y
   procesa los archivos de Drive que no estaban (o todos con `--reoptimize`).
   Descargas en `scripts/fotos/.cache/<carpeta>/` (gitignored).
3. Genera versión web y miniatura. Un original que ya es web (jpg/webp, ≤1600 px,
   ≤400 KB) se conserva tal cual; todo lo demás (PNG pesados, HEIC, fotos de 10 MB)
   pasa a JPG. Se aplica la orientación EXIF.
4. Con `--apply`: respalda el set en `_backup/<fecha>/<set>/` (solo si va a
   reemplazar o borrar algo), sube `<set>/<nombre>` y `_thumbs/<set>/<nombre>`,
   borra lo que ya no está en Drive, escribe el manifiesto, actualiza `image_sets`
   y mapea en `propiedad_image_sets` las propiedades con link que no tenían set.

## Reglas para las fotos en Drive

- JPG, PNG o WebP (HEIC se convierte, pero lo ideal es subir JPG).
- No hay límite de peso: el script las reduce. Sí importa la calidad de origen.
- El orden en la app es el orden natural de los nombres (`1`, `2`, `10`);
  una foto llamada `portada`, `fachada` o `cover` va primero.
- Para quitar o cambiar una foto, cámbiala en Drive y vuelve a correr el script:
  el bucket queda igual que Drive.

## Cuando agregan un parque o propiedad con fotos

1. Ponerle a la propiedad (o a todas las unidades del parque) el link de la carpeta
   de Drive en `links_imagenes_carpetas_drive`.
2. Compartir la carpeta como "Cualquier persona con el enlace → Lector".
3. `node scripts/fotos/sync-fotos.cjs --only nuevo` para ver el plan y luego `--apply`.

Historia y detalles técnicos: ERROR-JOURNAL #12, #19–#22.
