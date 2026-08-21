import {
  createInventarioSchema,
  updateInventarioSchema,
  type CreateInventarioInput,
  type UpdateInventarioInput,
} from '@/lib/validations/inventario'
import * as dal from '@/lib/dal/properties'
import * as webhookService from '@/lib/services/webhook-service'
import { detectPending } from '@/lib/services/photo-sync/sync'

// Fotos: tras guardar, registra la carpeta de Drive del link (si es nueva) y
// mapea la propiedad (solo BD, en segundo plano). La importación de las fotos
// la dispara el cliente al volver a Propiedades (usePhotoSync) o el cron.
function schedulePhotoSync() {
  detectPending().catch((e) => console.error('photo-sync detect:', e))
}

// Traduce el error del constraint unique de inventario_industrial
// (parque, unidad, operacion) a un mensaje entendible para el usuario.
function friendlyDbError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('inventario_industrial_unidad_operacion_unique')) {
    return new Error(
      'Ya existe esa unidad en ese parque para la misma operación'
    )
  }
  return err instanceof Error ? err : new Error(message)
}

export async function createProperty(data: CreateInventarioInput) {
  const validated = createInventarioSchema.parse(data)
  try {
    const property = await dal.insertProperty(validated)
    webhookService.triggerEvent('property.created', property).catch(console.error)
    schedulePhotoSync()
    return property
  } catch (err) {
    throw friendlyDbError(err)
  }
}

export async function updateProperty(id: string, data: UpdateInventarioInput) {
  const validated = updateInventarioSchema.parse(data)
  try {
    const property = await dal.updateProperty(id, validated)
    webhookService.triggerEvent('property.updated', property).catch(console.error)
    schedulePhotoSync()
    return property
  } catch (err) {
    throw friendlyDbError(err)
  }
}

export async function deleteProperty(id: string) {
  await dal.deleteProperty(id)
  webhookService.triggerEvent('property.deleted', { id }).catch(console.error)
}
