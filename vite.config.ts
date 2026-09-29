import zlib from 'node:zlib'
import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { ServerResponse } from 'http'

// ============================================================
// Modo local de Licitaciones (VITE_LIC_LOCAL=1 en .env.local) — solo `npm run
// dev`. Expone 3 rutas que leen/escriben los JSON del vault directamente,
// para poder probar la sección Licitaciones sin tocar Apps Script de
// producción (el .env normal apunta a producción). Ver docs/PLAN_LICITACIONES_ADMIN.md
// § "Modo local" y src/api/licLocal.ts (el cliente que las consume).
//
// `apply: 'serve'` + que `configureServer` es en sí un hook exclusivo del dev
// server: este plugin NUNCA corre en `npm run build` y nada de lo que sirve
// (JSON del vault, PDFs, ediciones) entra al bundle — no se `import`ea nada,
// todo se pide por fetch() en runtime.
// ============================================================

const NOMBRES_JSON_PERMITIDOS = [
  'procesos', 'postores', 'acciones', 'competidores', 'experiencia', 'documentos',
  'personal', 'contratos', 'facturas', 'indicadores', 'propuestas',
]

const VALOR_POR_DEFECTO: Record<string, unknown> = { indicadores: {} }

const EDICIONES_ARCHIVO = 'ediciones_web.json'
const EDICIONES_VACIAS = { procesos: {}, documentos: {}, documentos_nuevos: [], personal: {}, contratos: {}, facturas: {} }

const MIME_POR_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

function leerCuerpo(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let datos = ''
    req.on('data', (chunk) => { datos += chunk })
    req.on('end', () => resolve(datos))
    req.on('error', reject)
  })
}

function enviarJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

// Escritura atómica: se escribe en un .tmp y se renombra, para que una
// petición concurrente nunca vea el archivo a medio escribir.
function escribirAtomico(rutaFinal: string, contenido: string) {
  const tmp = `${rutaFinal}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, contenido, 'utf8')
  fs.renameSync(tmp, rutaFinal)
}

// El vault (raíz del proyecto Obsidian) es 3 niveles arriba de LIC_DATA_DIR
// (.../INGENERIA TELCOM/01_GERENCIA/experiencia/web → .../INGENERIA TELCOM).
function raizVault(dataDir: string): string {
  return path.resolve(dataDir, '..', '..', '..')
}

// Solo se sirven archivos dentro de 01_GERENCIA/acervo/ (acervo documental,
// donde viven los PDF de documentos.json y facturas.json) o, dentro de
// 01_GERENCIA/experiencia/_bruto/, solo la subcarpeta documentos/ o las
// ofertas PROPIAS (ofertas/20602277900*) — nunca ofertas de terceros.
function rutaPermitida(absPath: string, vaultRoot: string): boolean {
  const acervoRoot = path.join(vaultRoot, '01_GERENCIA', 'acervo') + path.sep
  const brutoRoot = path.join(vaultRoot, '01_GERENCIA', 'experiencia', '_bruto') + path.sep
  if (absPath.startsWith(acervoRoot)) return true
  if (absPath.startsWith(brutoRoot)) {
    const resto = absPath.slice(brutoRoot.length)
    const esDocumentos = /(^|[\\/])documentos([\\/]|$)/.test(resto)
    const esOfertaPropia = /(^|[\\/])ofertas[\\/]20602277900/.test(resto)
    return esDocumentos || esOfertaPropia
  }
  return false
}

// ZIP sin compresión (los PDF ya vienen comprimidos): suficiente para
// "Armar propuesta" en modo local, sin dependencias nuevas.
function zipSinCompresion(entradas: { nombre: string; datos: Buffer }[]): Buffer {
  const partes: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const e of entradas) {
    const nombre = Buffer.from(e.nombre, 'utf8')
    const crc = zlib.crc32(e.datos) >>> 0
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6) // UTF-8
    local.writeUInt16LE(0, 8); local.writeUInt32LE(0, 10); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(e.datos.length, 18); local.writeUInt32LE(e.datos.length, 22)
    local.writeUInt16LE(nombre.length, 26); local.writeUInt16LE(0, 28)
    partes.push(local, nombre, e.datos)
    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8)
    cen.writeUInt16LE(0, 10); cen.writeUInt32LE(0, 12); cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(e.datos.length, 20); cen.writeUInt32LE(e.datos.length, 24); cen.writeUInt16LE(nombre.length, 28)
    cen.writeUInt32LE(offset, 42)
    central.push(cen, nombre)
    offset += 30 + nombre.length + e.datos.length
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10)
  fin.writeUInt32LE(tamCentral, 12); fin.writeUInt32LE(offset, 16)
  return Buffer.concat([...partes, ...central, fin])
}

function licLocalPlugin(dataDir: string): Plugin {
  return {
    name: 'lic-local-data',
    apply: 'serve',
    configureServer(server) {
      const edicionesPath = path.join(dataDir, EDICIONES_ARCHIVO)
      const vaultRoot = raizVault(dataDir)

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const pathname = url.pathname

        // GET /__lic/data/<nombre>.json
        if (req.method === 'GET' && pathname.startsWith('/__lic/data/')) {
          const archivo = pathname.slice('/__lic/data/'.length)
          const nombre = archivo.replace(/\.json$/, '')
          if (!/^[a-z_]+$/.test(nombre) || NOMBRES_JSON_PERMITIDOS.indexOf(nombre) < 0) {
            return enviarJson(res, 400, { success: false, error: 'Nombre de archivo no permitido: ' + nombre })
          }
          const ruta = path.join(dataDir, nombre + '.json')
          if (path.dirname(ruta) !== path.resolve(dataDir)) {
            return enviarJson(res, 400, { success: false, error: 'Ruta no permitida' })
          }
          if (!fs.existsSync(ruta)) {
            return enviarJson(res, 200, VALOR_POR_DEFECTO[nombre] ?? [])
          }
          try {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(fs.readFileSync(ruta, 'utf8'))
          } catch (e) {
            enviarJson(res, 500, { success: false, error: 'No se pudo leer ' + nombre + '.json: ' + (e as Error).message })
          }
          return
        }

        // GET/POST /__lic/ediciones
        if (pathname === '/__lic/ediciones') {
          if (req.method === 'GET') {
            if (!fs.existsSync(edicionesPath)) return enviarJson(res, 200, { success: true, data: EDICIONES_VACIAS })
            try {
              const data = JSON.parse(fs.readFileSync(edicionesPath, 'utf8'))
              return enviarJson(res, 200, { success: true, data: { ...EDICIONES_VACIAS, ...data } })
            } catch (e) {
              return enviarJson(res, 500, { success: false, error: 'ediciones_web.json corrupto: ' + (e as Error).message })
            }
          }
          if (req.method === 'POST') {
            try {
              const cuerpo = JSON.parse((await leerCuerpo(req)) || '{}')
              const actuales = fs.existsSync(edicionesPath)
                ? { ...EDICIONES_VACIAS, ...JSON.parse(fs.readFileSync(edicionesPath, 'utf8')) }
                : { ...EDICIONES_VACIAS }

              // Motor genérico de edición (src/api/licLocal.ts): el cliente manda
              // el documento de ediciones COMPLETO ya validado; aquí solo se guarda
              // con una copia de respaldo del anterior (ediciones_web.json.bak).
              if (cuerpo.completo && typeof cuerpo.completo === 'object' && !Array.isArray(cuerpo.completo)) {
                if (fs.existsSync(edicionesPath)) fs.copyFileSync(edicionesPath, edicionesPath + '.bak')
                escribirAtomico(edicionesPath, JSON.stringify(cuerpo.completo, null, 1))
                return enviarJson(res, 200, { success: true })
              }
              if (cuerpo.entidad === 'documentos_nuevos') {
                if (!cuerpo.documento || !cuerpo.documento.id) return enviarJson(res, 400, { success: false, error: 'Falta el documento' })
                actuales.documentos_nuevos = [...actuales.documentos_nuevos, cuerpo.documento]
              } else if (['procesos', 'documentos', 'personal', 'contratos', 'facturas'].indexOf(cuerpo.entidad) >= 0) {
                if (!cuerpo.clave) return enviarJson(res, 400, { success: false, error: 'Falta la clave' })
                const mapa = actuales[cuerpo.entidad as keyof typeof actuales] as Record<string, Record<string, unknown>>
                mapa[cuerpo.clave] = { ...(mapa[cuerpo.clave] || {}), ...(cuerpo.cambios || {}), editado_en: new Date().toISOString() }
              } else {
                return enviarJson(res, 400, { success: false, error: 'Entidad no reconocida: ' + cuerpo.entidad })
              }

              escribirAtomico(edicionesPath, JSON.stringify(actuales, null, 1))
              return enviarJson(res, 200, { success: true, data: actuales })
            } catch (e) {
              return enviarJson(res, 500, { success: false, error: 'No se pudo guardar la edición: ' + (e as Error).message })
            }
          }
          return next()
        }

        // POST /__lic/foto {carpeta, base64, mime} — foto de una persona del
        // personal clave. Solo dentro de 01_GERENCIA/acervo/personal/<persona>/,
        // se guarda como foto.jpg|png|webp (reemplaza la anterior).
        if (req.method === 'POST' && pathname === '/__lic/foto') {
          try {
            const cuerpo = JSON.parse((await leerCuerpo(req)) || '{}')
            const carpeta = String(cuerpo.carpeta || '')
            const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[cuerpo.mime]
            if (!ext) return enviarJson(res, 400, { success: false, error: 'La foto debe ser JPG, PNG o WEBP' })
            const raizPersonal = path.join(vaultRoot, '01_GERENCIA', 'acervo', 'personal') + path.sep
            const dir = path.resolve(vaultRoot, carpeta)
            if (!(dir + path.sep).startsWith(raizPersonal) || path.dirname(dir) + path.sep !== raizPersonal || !fs.existsSync(dir)) {
              return enviarJson(res, 403, { success: false, error: 'Carpeta de persona no válida' })
            }
            const datos = Buffer.from(String(cuerpo.base64 || ''), 'base64')
            if (!datos.length || datos.length > 6 * 1024 * 1024) return enviarJson(res, 400, { success: false, error: 'Foto vacía o mayor a 6 MB' })
            for (const viejo of fs.readdirSync(dir).filter((f) => /^foto\.(jpg|png|webp)$/i.test(f))) fs.unlinkSync(path.join(dir, viejo))
            fs.writeFileSync(path.join(dir, 'foto.' + ext), datos)
            return enviarJson(res, 200, { success: true, data: { ruta: path.relative(vaultRoot, path.join(dir, 'foto.' + ext)).split(path.sep).join('/') } })
          } catch (e) {
            return enviarJson(res, 500, { success: false, error: 'No se pudo guardar la foto: ' + (e as Error).message })
          }
        }

        // POST /__lic/documento {categoria, nombre, base64, mime} — PDF nuevo subido
        // desde el panel: se guarda en 01_GERENCIA/acervo/<categoria>/_web/.
        if (req.method === 'POST' && pathname === '/__lic/documento') {
          try {
            const cuerpo = JSON.parse((await leerCuerpo(req)) || '{}')
            const categoria = String(cuerpo.categoria || '')
            if (!/^(personal|experiencia|equipos|empresa|tecnico|otro)$/.test(categoria)) return enviarJson(res, 400, { success: false, error: 'Elige de qué tipo es el documento' })
            if (cuerpo.mime !== 'application/pdf') return enviarJson(res, 400, { success: false, error: 'El archivo debe ser PDF' })
            const datos = Buffer.from(String(cuerpo.base64 || ''), 'base64')
            if (!datos.length || datos.length > 10 * 1024 * 1024) return enviarJson(res, 400, { success: false, error: 'PDF vacío o mayor a 10 MB' })
            let nombre = String(cuerpo.nombre || 'documento.pdf').replace(/[\\/:*?"<>|#%]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
            if (!/\.pdf$/i.test(nombre)) nombre += '.pdf'
            const sello = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
            const dir = path.join(vaultRoot, '01_GERENCIA', 'acervo', categoria, '_web')
            fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(path.join(dir, `${sello} ${nombre}`), datos)
            return enviarJson(res, 200, { success: true, data: { archivo_vault: `01_GERENCIA/acervo/${categoria}/_web/${sello} ${nombre}`, id: '' } })
          } catch (e) {
            return enviarJson(res, 500, { success: false, error: 'No se pudo guardar el PDF: ' + (e as Error).message })
          }
        }

        // POST /__lic/zip {nombre, archivos:[{ruta, destino}]} → descarga el ZIP
        if (req.method === 'POST' && pathname === '/__lic/zip') {
          try {
            const cuerpo = JSON.parse((await leerCuerpo(req)) || '{}')
            const archivos = Array.isArray(cuerpo.archivos) ? cuerpo.archivos : []
            if (!archivos.length) return enviarJson(res, 400, { success: false, error: 'No elegiste ningún documento' })
            const entradas: { nombre: string; datos: Buffer }[] = []
            const usados = new Set<string>()
            const faltan: string[] = []
            for (const a of archivos) {
              const abs = path.resolve(vaultRoot, String(a.ruta || ''))
              if (!rutaPermitida(abs, vaultRoot) || !fs.existsSync(abs)) { faltan.push(String(a.destino || a.ruta)); continue }
              let destino = String(a.destino || path.basename(abs)).replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\//, '').slice(0, 200)
              if (usados.has(destino)) { let n = 2; while (usados.has(destino.replace(/\.pdf$/i, ` (${n}).pdf`))) n++; destino = destino.replace(/\.pdf$/i, ` (${n}).pdf`) }
              usados.add(destino)
              entradas.push({ nombre: destino, datos: fs.readFileSync(abs) })
            }
            if (!entradas.length) return enviarJson(res, 404, { success: false, error: 'Ninguno de los PDF existe en el vault' })
            const nombre = (String(cuerpo.nombre || 'Propuesta').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Propuesta') + '.zip'
            const zip = zipSinCompresion(entradas)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/zip')
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"; filename*=UTF-8''${encodeURIComponent(nombre)}`)
            res.setHeader('X-Faltan', encodeURIComponent(JSON.stringify(faltan)))
            res.end(zip)
          } catch (e) {
            return enviarJson(res, 500, { success: false, error: 'No se pudo armar el ZIP: ' + (e as Error).message })
          }
          return
        }

        // GET /__lic/archivo?ruta=...
        if (req.method === 'GET' && pathname === '/__lic/archivo') {
          const ruta = url.searchParams.get('ruta') || ''
          if (!ruta) return enviarJson(res, 400, { success: false, error: 'Falta el parámetro ruta' })
          const abs = path.resolve(vaultRoot, ruta)
          if (!rutaPermitida(abs, vaultRoot)) {
            return enviarJson(res, 403, { success: false, error: 'Ruta fuera del acervo permitido' })
          }
          if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
            return enviarJson(res, 404, { success: false, error: 'Archivo no encontrado en el vault: ' + ruta })
          }
          const ext = path.extname(abs).toLowerCase()
          res.statusCode = 200
          res.setHeader('Content-Type', MIME_POR_EXTENSION[ext] || 'application/octet-stream')
          const modo = url.searchParams.get('descargar') === '1' ? 'attachment' : 'inline'
          const nombreDescarga = (url.searchParams.get('nombre') || path.basename(abs)).replace(/["\/]/g, '')
          res.setHeader('Content-Disposition', `${modo}; filename="${encodeURIComponent(nombreDescarga)}"; filename*=UTF-8''${encodeURIComponent(nombreDescarga)}`)
          res.setHeader('Cache-Control', 'no-store')
          fs.createReadStream(abs).pipe(res)
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const licLocal = env.VITE_LIC_LOCAL === '1'
  const dataDir = env.LIC_DATA_DIR ||
    'C:\\Users\\User\\Documents\\CEREBRO DIGITAL\\INGENERIA TELCOM\\01_GERENCIA\\experiencia\\web'

  if (licLocal) {
    // eslint-disable-next-line no-console
    console.log('[lic-local] Modo local de Licitaciones activo — leyendo de: ' + dataDir)
  }

  return {
    plugins: [react(), ...(licLocal ? [licLocalPlugin(dataDir)] : [])],
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
