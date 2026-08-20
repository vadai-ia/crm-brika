// Carga y recorte de imágenes (solo cliente: usa canvas) para PDFs BRIKA.

// Wordmark BRIKA para membretes (extraído de la plantilla
// public/pdf/pdf-ficha-tecnica.pdf): letras tinta #121212 con la "iK" morada,
// fondo transparente, ya recortado al wordmark (1909×542) — se usa tal cual,
// sin recorte. Es el logo único de fichas y cartas.
export const LOGO_WORDMARK_SRC = '/images/brika-logo-negro-morado.png'
export const LOGO_WORDMARK_RATIO = 1909 / 542

export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const b = await r.blob()
    return new Promise((res) => {
      const rd = new FileReader()
      rd.onloadend = () => res(rd.result as string)
      rd.onerror = () => res(null)
      rd.readAsDataURL(b)
    })
  } catch {
    return null
  }
}

function loadImg(b64: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => res(null)
    i.src = b64
  })
}

// Recorta al centro para cubrir exactamente la proporción destino (object-fit:
// cover) — evita que jsPDF deforme la foto al estirarla al marco.
export async function cropToCover(b64: string, ratio: number): Promise<string | null> {
  const img = await loadImg(b64)
  if (!img) return null
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  let sw = iw
  let sh = iw / ratio
  if (sh > ih) {
    sh = ih
    sw = ih * ratio
  }
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2
  const canvas = document.createElement('canvas')
  const outW = Math.min(1600, Math.round(sw))
  canvas.width = outW
  canvas.height = Math.round(outW / ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] ?? ''
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
