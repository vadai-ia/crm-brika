// Directorio de contactos (desarrollador / propietario) del inventario.
// Una fila = un contacto dentro de un parque, con las unidades que atiende.

export interface ContactoUnidad {
  id: string
  unidad: string | null
  producto: string | null
  operacion: string | null
  estatus: string | null
}

export interface ContactoParque {
  /** Clave estable: parque + contacto + celular + correo */
  key: string
  parque: string | null
  estado: string | null
  municipio: string | null
  zona_corredor: string | null
  contacto: string | null
  celular: string | null
  correo: string | null
  /** Comisiones distintas registradas en sus unidades (texto original) */
  comisiones: string[]
  unidades: ContactoUnidad[]
}
