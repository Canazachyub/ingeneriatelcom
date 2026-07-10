// Concatena backend/*.gs (en orden de nombre) → appscript.js, el artefacto
// de deploy que se pega en el editor de Google Apps Script como un solo archivo.
// Uso: npm run build:backend

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = join(root, 'backend')

const files = readdirSync(backendDir).filter(f => f.endsWith('.gs')).sort()
if (!files.length) {
  console.error('backend/ vacio — nada que construir')
  process.exit(1)
}

const now = new Date().toISOString()
const banner = [
  '// ============================================================',
  '// SISTEMA DE GESTION TELCOM - APPS SCRIPT (ARCHIVO GENERADO)',
  '// ============================================================',
  '// NO EDITAR A MANO. La fuente es backend/*.gs en el repo.',
  `// Generado: ${now} con tools/build-backend.mjs`,
  '// Deploy: pegar este archivo completo en el editor de Apps Script',
  '// y crear Nueva version. Requiere Script Property TOKEN_SECRET.',
  '// ============================================================',
  '',
].join('\n')

const parts = files.map(f => readFileSync(join(backendDir, f), 'utf8').replace(/\r\n/g, '\n').trimEnd())
const output = banner + parts.join('\n\n') + '\n'
writeFileSync(join(root, 'appscript.js'), output, 'utf8')

// Verificación básica de sanidad: sin funciones duplicadas
const names = [...output.matchAll(/^function\s+([A-Za-z0-9_$]+)/gm)].map(m => m[1])
const dup = names.filter((n, i) => names.indexOf(n) !== i)
if (dup.length) {
  console.error('FUNCIONES DUPLICADAS:', [...new Set(dup)].join(', '))
  process.exit(1)
}
console.log(`appscript.js generado: ${files.length} modulos, ${names.length} funciones, ${output.split('\n').length} lineas`)
