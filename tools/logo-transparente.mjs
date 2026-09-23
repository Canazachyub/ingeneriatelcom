// Quita el fondo blanco del logo FUERA del óvalo y conserva el blanco de dentro.
// El anillo azul del logo está abierto en dos tramos, así que un relleno desde
// los bordes se colaría al interior: se usa una elipse que sigue el borde
// interno del anillo. Dentro de ella todo queda opaco; fuera, cada píxel
// conserva opacidad según cuánto se aleja del blanco (las puntas azules del
// anillo se mantienen, el fondo blanco desaparece con borde suave).
// Uso: node tools/logo-transparente.mjs
import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const origen = join(root, 'public/assets/images/logo/logo-horizontal.png')
const destino = join(root, 'public/assets/images/logo/logo-horizontal-transparente.webp')

// Elipse interna del anillo, en píxeles del original (2944x1440)
const CX = 1470, CY = 712, RX = 1262, RY = 590
const PLUMA = 6 // px de transición suave en el borde de la elipse

const { data, info } = await sharp(origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels
    const r = data[i], g = data[i + 1], b = data[i + 2]
    // Distancia normalizada al borde de la elipse (0 = centro, 1 = borde)
    const e = Math.sqrt(((x - CX) / RX) ** 2 + ((y - CY) / RY) ** 2)
    const dentro = Math.min(1, Math.max(0, (1 - e) * RX / PLUMA + 0.5))
    // Opacidad por "no blancura": blanco puro → 0, color → 255
    const noBlanco = Math.max(255 - r, 255 - g, 255 - b)
    const porColor = Math.min(255, noBlanco * 5)
    const a = Math.max(dentro * 255, porColor)
    data[i + 3] = Math.round(a)
    // Des-premultiplicar el halo blanco de los bordes antialias fuera del óvalo
    if (dentro < 1 && a > 0 && a < 255) {
      const k = 255 / a
      data[i] = Math.max(0, Math.min(255, Math.round(255 - (255 - r) * k)))
      data[i + 1] = Math.max(0, Math.min(255, Math.round(255 - (255 - g) * k)))
      data[i + 2] = Math.max(0, Math.min(255, Math.round(255 - (255 - b) * k)))
    }
  }
}

await sharp(data, { raw: { width, height, channels } })
  .trim({ threshold: 0 })
  .resize({ width: 800 })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(destino)
console.log('OK', destino)
