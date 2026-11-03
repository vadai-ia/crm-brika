import { ContactosDirectory } from '@/components/contactos/ContactosDirectory'

export default function ContactosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="brika-page-title">Contactos</h1>
        <p className="brika-page-desc mt-1">
          Desarrolladores y propietarios del inventario, por parque
        </p>
      </div>

      <ContactosDirectory />
    </div>
  )
}
