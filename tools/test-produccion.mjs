// Pruebas de humo contra el backend REAL (Apps Script de producción).
// Uso: npm run test:prod   (ejecutar después de cada "Nueva versión" del .gs)
//
// 100% seguro para los datos: solo hace lecturas públicas y peticiones que el
// backend RECHAZA antes de escribir (DNI inválido, sin foto, sin GPS, DNI fuera
// del roster, acción admin sin token). Nunca registra una marca, ni sube fotos,
// ni envía postulaciones.
//
// Criterio: 0 FALLA. Los AVISO (p. ej. respuesta lenta) se evalúan.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = readFileSync(join(root, '.env'), 'utf8')
const URL_API = (env.match(/^VITE_APPS_SCRIPT_URL=(.+)$/m) || [])[1]?.trim()
if (!URL_API) {
  console.error('No encontré VITE_APPS_SCRIPT_URL en .env')
  process.exit(1)
}

const LENTO_MS = 20000
let fallas = 0
let avisos = 0

// Mismo protocolo que src/api/appScriptApi.ts: GET con ?payload, POST text/plain
async function llamar(action, method = 'GET', data) {
  const url = new URL(URL_API)
  url.searchParams.set('action', action)
  const t0 = Date.now()
  let res
  if (method === 'POST') {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data || {}), redirect: 'follow' })
  } else {
    if (data) url.searchParams.set('payload', JSON.stringify(data))
    res = await fetch(url, { redirect: 'follow' })
  }
  const texto = await res.text()
  const ms = Date.now() - t0
  try {
    return { json: JSON.parse(texto), ms }
  } catch {
    return { json: null, ms, crudo: texto.slice(0, 200) }
  }
}

async function prueba(nombre, fn) {
  try {
    const { ok, detalle, ms } = await fn()
    const lento = ms > LENTO_MS
    if (!ok) fallas++
    else if (lento) avisos++
    const marca = !ok ? 'FALLA ' : lento ? 'AVISO ' : 'OK    '
    console.log(`${marca} ${nombre} (${(ms / 1000).toFixed(1)} s)${detalle ? ' — ' + detalle : ''}${lento && ok ? ' — respuesta lenta' : ''}`)
  } catch (e) {
    fallas++
    console.log(`FALLA  ${nombre} — excepción: ${e.message}`)
  }
}

// Rechazo esperado: success:false y el mensaje contiene el patrón
const rechaza = (patron) => ({ json, ms, crudo }) => ({
  ok: !!json && json.success === false && patron.test(String(json.error || '')),
  detalle: json ? `"${json.error}"` : `respuesta no JSON: ${crudo}`,
  ms,
})

const FOTO_FALSA = Buffer.from('prueba').toString('base64')
const GPS = { gps_lat: -13.5, gps_lng: -71.9, gps_accuracy: 30 }

console.log(`Backend: ${URL_API.slice(0, 60)}…\n`)

// ── Lecturas públicas ────────────────────────────────────────
let roster = []
await prueba('getTrabajadores: roster del kiosko', async () => {
  const r = await llamar('getTrabajadores')
  roster = r.json?.data || []
  const campos = roster.every((t) => /^\d{8}$/.test(String(t.dni)) && t.nombre)
  const filtraSueldo = roster.every((t) => !('sueldo' in t) && !('email' in t))
  return {
    ok: r.json?.success === true && roster.length > 0 && campos && filtraSueldo,
    detalle: `${roster.length} trabajadores${filtraSueldo ? '' : ' — ¡EXPONE sueldo/email!'}`,
    ms: r.ms,
  }
})

await prueba('getJobs: ofertas publicadas', async () => {
  const r = await llamar('getJobs')
  return { ok: r.json?.success === true && Array.isArray(r.json.data), detalle: `${r.json?.data?.length ?? '?'} ofertas`, ms: r.ms }
})

await prueba('getCapacitaciones: cursos', async () => {
  const r = await llamar('getCapacitaciones')
  return { ok: r.json?.success === true && Array.isArray(r.json.data), detalle: `${r.json?.data?.length ?? '?'} cursos`, ms: r.ms }
})

// ── Kiosko: validaciones que cortan ANTES de escribir ────────
await prueba('registrarAsistenciaFoto rechaza DNI inválido', async () =>
  rechaza(/DNI invalido/i)(await llamar('registrarAsistenciaFoto', 'POST', { dni: '123', evento: 'ingreso_manana' })))

await prueba('registrarAsistenciaFoto rechaza evento inválido', async () =>
  rechaza(/Evento invalido/i)(await llamar('registrarAsistenciaFoto', 'POST', { dni: '12345678', evento: 'hackeo' })))

await prueba('registrarAsistenciaFoto exige foto', async () =>
  rechaza(/foto es obligatoria/i)(await llamar('registrarAsistenciaFoto', 'POST', { dni: '12345678', evento: 'ingreso_manana' })))

await prueba('registrarAsistenciaFoto exige GPS (regla del servidor)', async () =>
  rechaza(/GPS/i)(await llamar('registrarAsistenciaFoto', 'POST', { dni: '12345678', evento: 'ingreso_manana', fileContent: FOTO_FALSA })))

// DNI que no está en el roster: el servidor lo rechaza antes de subir la foto
const dniAjeno = ['00000000', '99999999', '11111111'].find((d) => !roster.some((t) => String(t.dni) === d))
await prueba(`registrarAsistenciaFoto rechaza DNI fuera del roster (${dniAjeno})`, async () =>
  rechaza(/no habilitado/i)(await llamar('registrarAsistenciaFoto', 'POST', {
    dni: dniAjeno, evento: 'ingreso_manana', fileContent: FOTO_FALSA, mimeType: 'image/jpeg', ...GPS,
  })))

// ── Seguridad: acciones admin sin token ──────────────────────
for (const accion of ['getSueldos', 'getAsistenciasV2', 'getApplicationsAdmin', 'getContacts', 'getJustificaciones']) {
  await prueba(`${accion} sin token es rechazada`, async () => {
    const r = await llamar(accion, 'POST', {})
    return {
      // Debe ser rechazo de AUTORIZACIÓN, no "acción no válida" (eso significaría
      // que el nombre de la acción cambió y la prueba ya no protege nada).
      ok: !!r.json && r.json.success === false && /autoriz/i.test(String(r.json.error || '')),
      detalle: r.json ? `"${r.json.error}"` : `respuesta no JSON: ${r.crudo}`,
      ms: r.ms,
    }
  })
}

console.log(`\n${fallas === 0 ? '✔ SIN FALLAS' : `✘ ${fallas} FALLA(S)`} · ${avisos} aviso(s)`)
process.exit(fallas ? 1 : 0)
