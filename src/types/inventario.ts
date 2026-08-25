/**
 * Fila ligera del inventario para selectores (PDF, Carta Propuesta): solo lo
 * necesario para listar y buscar. Columnas reales de `inventario_industrial`.
 */
export interface InventarioListItem {
  id: string
  parque: string | null
  unidad: string | null
  zona_corredor: string | null
  municipio: string | null
  estado: string | null
  /** En la BD suele ser un link de Google Maps, no una dirección postal. */
  ubicacion: string | null
  producto: string | null
  tipo_producto: string | null
  operacion: string | null
  precio_total_venta: number | null
  renta_mensual: number | null
}

/**
 * Imagen del bucket público `Imagenes` (carpeta `{image_set_id}/{name}`).
 * Las URLs salen del endpoint de transformación (los originales pesan >10MB).
 */
export interface PropertyImage {
  /** Nombre de archivo dentro del set: clave estable (PK con propiedad_id en BD). */
  name: string
  /** Miniatura (~320px) para la galería de la tarjeta. */
  thumbUrl: string
  /** Versión grande (~1600px) para ver en detalle o incrustar en PDF. */
  url: string
  /** Visible en la página web (`propiedad_imagenes_visibilidad`; sin fila = visible). */
  visible: boolean
}

export interface PropertyImageSet {
  propertyId: string
  /** null cuando la propiedad no tiene set ligado en `propiedad_image_sets`. */
  setId: number | null
  images: PropertyImage[]
}

/** Portada + conteos: previsualización de la tarjeta. */
export interface PropertyCover {
  /** Miniatura (640 px) de la primera foto visible en la web (o la primera del set si todas están ocultas). */
  url: string
  /** Versión web (≤1600 px) de la misma foto; respaldo si la miniatura no existe. */
  fullUrl: string
  /** Total de fotos del set. */
  count: number
  /** Fotos ocultas para la web. */
  hidden: number
}

// ---- Sincronización Drive → bucket (tabla image_sets; ver ERROR-JOURNAL #21–#23) ----

export type ImageSetStatus = 'pending' | 'syncing' | 'ok' | 'error'

export interface SyncSkipped {
  /** id del archivo en Drive */
  id: string
  name: string
  reason: string
}

export interface SyncProgress {
  total: number
  done: number
  skipped: SyncSkipped[]
  /** Última revisión de cambios en la carpeta de Drive (ISO). */
  checkedAt?: string
}

/** Fila de `image_sets`: una carpeta de Drive = un set (número de carpeta en el bucket). */
export interface ImageSetRow {
  id: number
  drive_folder_id: string
  drive_title: string | null
  status: ImageSetStatus
  progress: SyncProgress | null
  last_synced_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface PhotoManifestFile {
  name: string
  sourceName: string
  sourceSize: number
  width: number
  height: number
}

/** `_manifest/<set>.json` en el bucket: archivo de Drive (id) → foto guardada. */
export interface PhotoManifest {
  setId: number
  driveFolderId: string
  driveTitle: string
  syncedAt: string
  files: Record<string, PhotoManifestFile>
}

export interface PendingSet {
  setId: number
  title: string | null
  status: ImageSetStatus
  progress: SyncProgress | null
  propertyIds: string[]
  lastError: string | null
}

export interface SyncStepResult {
  setId: number
  done: boolean
  status: ImageSetStatus
  progress: SyncProgress
  title: string | null
  error: string | null
  propertyIds: string[]
}

/**
 * Resultado del botón "Actualizar fotos": revisión forzada (sin ventana de
 * 24 h) de la carpeta de Drive de una propiedad.
 */
export type ForceCheckStatus = 'pending' | 'unchanged' | 'no_link' | 'not_public'

export interface ForceCheckResult {
  status: ForceCheckStatus
  setId?: number
  message?: string
}
