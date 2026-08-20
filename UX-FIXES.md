# UX/UI Fixes — Kibah Asesores

Anotar aquí todo lo que queremos cambiar visualmente. Se arregla en M7 (Design Polish).
NO arreglar diseño durante milestones funcionales (M2-M6).

---

## Filtros demasiado amontonados
- La barra de filtros se ve amontonada en desktop, demasiados inputs visibles al mismo tiempo
- Necesita más espaciado, mejor organización visual
- Considerar agrupar filtros por categoría, usar accordions, o mostrar solo los filtros más usados con botón "Más filtros"
- En mobile: drawer/bottom sheet, no barra horizontal

## Contraste demasiado alto en tarjetas
- El texto blanco sobre fondo oscuro es incómodo de leer por periodos largos
- Los asesores van a estar horas viendo estas pantallas — debe ser cómodo
- Bajar el contraste: usar grises claros en vez de blanco puro para texto secundario
- Precio y nombre pueden ser más brillantes, el resto más suave

## Jerarquía visual en tarjetas — todo compite
- No es obvio qué ver primero, todo tiene el mismo peso visual
- **Nombre Kibah debe ser lo más prominente** (no el nombre del desarrollador)
- Los asesores NO deben ver el "Desarrollo" (nombre desarrollador), solo el Nombre Kibah — políticas de seguridad y transparencia de Kibah
- Jerarquía propuesta: Nombre Kibah (grande, bold) → Precio → Ubicación (colonia) → Specs (recámaras, baños, m²) → Badges
- Badges de disponibilidad/preventa más sutiles, no tan grandes

## Popup de detalle — características difíciles de digerir
- La sección de características es un bloque de texto plano, difícil de escanear
- Usar iconos para cada característica (cama, ducha, carro, ruler, etc.)
- Dividir en sub-secciones visuales con separadores
- Formato de grid más espaciado
- Incluir decimales en metros (65.5 m², no 65 m²) y en baños (1.5, 2.5)
- Amenidades: si es "Si", mostrar lista real si existe. Si solo dice "Si", mostrar ícono de check

## Nombre Desarrollador — ocultar para asesores
- REGLA DE NEGOCIO: Los asesores NO deben ver el nombre del desarrollador
- Solo el admin puede ver esta columna
- Verificar que `column_visibility` tenga `nombre_desarrollador` como `visible_to_asesores = false`
- En las tarjetas, mostrar Nombre Kibah como título principal

---

## Notas generales de diseño
- La plataforma debe verse premium: glassmorphism, gradientes sutiles, detalles de diseñador gráfico
- No debe parecer creada por AI — evitar layouts genéricos
- Usar los colores de Kibah: navy, naranja, blanco/crema
- Referencia: kibah.com.mx (elegante, oscuro, profesional)

## Modal de PropertyForm — overlay blur se mueve al hacer scroll
- Cuando se hace scroll dentro del formulario de crear/editar propiedad, el blur del overlay se sube en vez de quedarse fijo
- El overlay debe ser `position: fixed` con `inset: 0` y el blur debe cubrir toda la pantalla sin moverse
- El contenido del modal debe hacer scroll interno (overflow-y: auto en el modal, no en el body)

## Configuración de Columnas — layout y UX
- El toggle no funciona visualmente (parece que todos están "on" sin distinción clara)
- El layout requiere scroll innecesario — debe caber todo sin scroll o con scroll mínimo
- Falta jerarquía visual: todas las filas se ven iguales, no es intuitivo qué significa cada cosa
- Propuesta: layout compacto tipo tabla/grid, toggles más claros (on=naranja, off=gris oscuro), agrupar columnas por categoría (Info, Ubicación, Características, etc.)
- El nombre técnico (column_name) no debería ser tan prominente — es solo referencia para el admin

## Popup de detalle — header transparente al hacer scroll
- Al hacer scroll dentro del popup, los campos de abajo se ven por debajo del header (nombre + badges + botones)
- El header del popup debe tener fondo sólido (no transparente) para que el contenido no se vea detrás al hacer scroll
- Aplicar el mismo color de fondo del modal al header, con un borde sutil abajo para separar

## Whaapy iframe — sidebar de iconos cortado (sin resolver)
- La barra de navegación izquierda de Whaapy (iconos de chat, contactos, calendario, etc.) no se muestra dentro del iframe
- Se intentó: transform scale, CSS zoom, dimensiones fijas, zoom 80%/70%/60%/50%, rebuild desde cero — ninguno funcionó
- Otro miembro del equipo logró resolverlo con iframe al 80% zoom sin definir tamaño fijo — pedir su código exacto como referencia
- PENDIENTE: obtener el código exacto del iframe funcional del compañero y replicarlo
- probablemente arreglando el aspect ratio  del iframe se solucione

## PDF — mejorar diseño en iteración futura
- El diseño actual es funcional pero no premium
- Iterar con referencia visual concreta (mockup en Figma o PDF de ejemplo de otra inmobiliaria)
- Considerar usar librería más robusta como @react-pdf/renderer en V2