// Convierte los PNG de `public/assets/images/fotos generadas/` (originales de IA,
// ~2 MB c/u, NO se commitean) a WebP optimizado en `public/assets/images/operaciones/`.
// Uso: npm run optimize:images

import { readdirSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'public', 'assets', 'images', 'fotos generadas')
const outDir = join(root, 'public', 'assets', 'images', 'operaciones')

// Ancho máximo por tipo de imagen (según dónde se usa en el sitio)
const WIDTHS = {
  HERO: 2560, // hero landing (pantalla completa)
  H: 1100,    // tarjetas de la galería helicoidal
  S: 1400,    // tarjetas de servicios
  Q: 1400,    // quiénes somos
  B: 1400,    // bolsa de trabajo
  C: 1400,    // capacitaciones
}
const QUALITY = 78

function widthFor(name) {
  const m = name.match(/^([A-Z]+)/)
  return (m && WIDTHS[m[1]]) || 1400
}

mkdirSync(outDir, { recursive: true })
const files = readdirSync(srcDir).filter(f => /\.(png|jpe?g)$/i.test(f))
if (!files.length) {
  console.error('No hay imágenes en', srcDir)
  process.exit(1)
}

let totalIn = 0
let totalOut = 0
for (const file of files) {
  const name = parse(file).name
  const inPath = join(srcDir, file)
  const outPath = join(outDir, `${name}.webp`)
  const maxWidth = widthFor(name)

  await sharp(inPath)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath)

  const inKB = Math.round(statSync(inPath).size / 1024)
  const outKB = Math.round(statSync(outPath).size / 1024)
  totalIn += inKB
  totalOut += outKB
  console.log(`${name}.webp  ${inKB} KB -> ${outKB} KB  (max ${maxWidth}px)`)
}
console.log(`\nTOTAL: ${Math.round(totalIn / 1024)} MB -> ${Math.round(totalOut / 102.4) / 10} MB`)
