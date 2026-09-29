// ============================================================
// Modo local de Licitaciones (VITE_LIC_LOCAL=1) — ver docs/PLAN_LICITACIONES_ADMIN.md
// § "Modo local".
//
// En vez de llamar a Apps Script, lee los JSON que exporta el vault
// directamente vía el plugin de Vite (`vite.config.ts`, solo en `npm run dev`):
//   GET  /__lic/data/<nombre>.json   → contenido crudo de un JSON del vault
//   GET  /__lic/ediciones            → ediciones hechas desde la web (JSON)
//   POST /__lic/ediciones {completo} → guarda el documento de ediciones entero
//   GET  /__lic/archivo?ruta=...     → sirve un PDF del vault para el visor
//   POST /__lic/foto · /__lic/documento → foto del personal / PDF nuevo
//
// Los datos base (JSON del vault) NUNCA se tocan; las ediciones viven aparte,
// en ediciones_web.json, y se combinan aquí. Es un ESPEJO del motor de
// backend/17_lic_edicion.gs (mismas reglas: validar, historial, archivar,
// deshacer, claves fijas), para poder probar todo en local antes de publicar.
// ============================================================
import type {
  ApiResponse,
  LicAccion,
  LicCambio,
  LicCompetidor,
  LicContrato,
  LicDocumento,
  LicExperiencia,
  LicFactura,
  LicImportPayload,
  LicPersonal,
  LicPostor,
  LicProceso,
  LicPropuesta,
  LicResumen,
  LicServicio,
  OpcionesLecturaLic,
} from './appScriptApi'
import { ESQUEMAS, EntidadLic, todosLosCampos, validarCampo, aTextoCampo, TipoCampo } from '../pages/admin/licitaciones/licEsquemas'

type Fila = Record<string, unknown>

// Documento de ediciones. Las claves de cada entidad son la clave de la ficha
// unida con \u0001 (mismo formato que usaban las versiones anteriores).
interface Ediciones {
  [entidad: string]: unknown
  nuevos: Record<string, Fila[]>
  archivados: Record<string, Record<string, string>>
  historial: LicCambio[]
  documentos_nuevos: Fila[] // formato anterior (se sigue leyendo)
}

const ENTIDADES: EntidadLic[] = ['procesos', 'postores', 'competidores', 'experiencia', 'documentos', 'personal', 'contratos', 'facturas', 'servicios']
const META = ['editado_en', 'editado_por']

const ERROR_SERVIDOR_LOCAL = 'No se pudo conectar con el servidor local de datos (¿está corriendo "npm run dev" con VITE_LIC_LOCAL=1?)'

async function leerJson<T>(nombre: string, porDefecto: T): Promise<T> {
  try {
    const res = await fetch(`/__lic/data/${nombre}.json`)
    if (!res.ok) return porDefecto
    return (await res.json()) as T
  } catch {
    return porDefecto
  }
}

async function leerEdiciones(): Promise<Ediciones> {
  let data: Record<string, unknown> = {}
  try {
    const res = await fetch('/__lic/ediciones')
    if (res.ok) {
      const json = await res.json()
      data = (json && json.data) || json || {}
    }
  } catch { /* vacío */ }
  const e = { ...data } as Ediciones
  ENTIDADES.forEach((k) => { if (!e[k] || typeof e[k] !== 'object') e[k] = {} })
  e.nuevos = e.nuevos || {}
  e.archivados = e.archivados || {}
  e.historial = e.historial || []
  e.documentos_nuevos = e.documentos_nuevos || []
  return e
}

async function guardarEdiciones(e: Ediciones): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/__lic/ediciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completo: e }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json || !json.success) return { success: false, error: (json && json.error) || `No se pudo guardar (HTTP ${res.status})` }
    return { success: true }
  } catch {
    return { success: false, error: ERROR_SERVIDOR_LOCAL }
  }
}

// ── Motor genérico ───────────────────────────────────────────────────────

const camposClave = (entidad: EntidadLic) => (ESQUEMAS[entidad].autoId ? ['id'] : ESQUEMAS[entidad].clave.map((c) => c.k))
const claveTxt = (entidad: EntidadLic, o: Fila) => camposClave(entidad).map((c) => String(o[c] ?? '')).join('\u0001')
const mapaEd = (e: Ediciones, entidad: EntidadLic) => e[entidad] as Record<string, Fila>

// Base del vault + nuevas de la web, con las ediciones aplicadas.
function combinar<T>(entidad: EntidadLic, base: Fila[], e: Ediciones, archivados = false): T[] {
  const nuevos = (e.nuevos[entidad] || []).concat(entidad === 'documentos' ? e.documentos_nuevos : [])
  const cambios = mapaEd(e, entidad)
  const arch = e.archivados[entidad] || {}
  return base.map((f) => ({ ...f, origen: 'vault' }))
    .concat(nuevos.map((f) => ({ ...f, origen: 'web' })))
    .map((f) => {
      const k = claveTxt(entidad, f)
      const ed = cambios[k] || {}
      return { ...f, ...ed, campos_web: Object.keys(ed).filter((c) => !META.includes(c)), archivado: arch[k] || '' }
    })
    .filter((f) => archivados || !f.archivado) as unknown as T[]
}

const BASE_ARCHIVO: Partial<Record<EntidadLic, string>> = {
  procesos: 'procesos', postores: 'postores', competidores: 'competidores', experiencia: 'experiencia',
  documentos: 'documentos', personal: 'personal', contratos: 'contratos', facturas: 'facturas',
}

async function filas<T>(entidad: EntidadLic, e: Ediciones, archivados = false): Promise<T[]> {
  const archivo = BASE_ARCHIVO[entidad]
  const base = archivo ? await leerJson<Fila[]>(archivo, []) : []
  return combinar<T>(entidad, base, e, archivados)
}

function normalizar(tipo: TipoCampo, v: unknown): unknown {
  if (v === null || v === undefined) return ''
  if (tipo === 'n' || tipo === 'm' || tipo === 'p') return v === '' ? '' : Number(v)
  if (tipo === 'b') return v === true || v === 'si' || v === 'true'
  if (tipo === 'personas') return Array.isArray(v) ? v : []
  return tipo === 'l' ? String(v) : String(v).trim()
}

const textoComparable = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))
const idCorto = (prefijo: string) => `${prefijo}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
const clavePublica = (entidad: EntidadLic, o: Fila) => {
  const r: Record<string, string> = {}
  camposClave(entidad).forEach((c) => { r[c] = String(o[c] ?? '') })
  return JSON.stringify(r)
}

export async function licGuardar(data: { entidad: EntidadLic; clave: Record<string, string>; cambios: Record<string, unknown>; crear?: boolean }): Promise<ApiResponse<Fila>> {
  const esq = ESQUEMAS[data.entidad]
  if (!esq) return { success: false, error: 'Tipo de ficha desconocido' }
  const campos = new Map(todosLosCampos(data.entidad).map((c) => [c.k, c]))
  const cambios: Fila = {}
  for (const [k, v] of Object.entries(data.cambios || {})) {
    if (camposClave(data.entidad).includes(k)) continue
    const c = campos.get(k)
    if (!c) return { success: false, error: `El campo "${k}" no se puede editar` }
    const err = validarCampo(c, aTextoCampo(c.tipo, v))
    if (err) return { success: false, error: `${c.etiqueta}: ${err}` }
    if (c.tipo === 'o' && c.opciones && !c.opciones.some((o) => o.v === String(v ?? ''))) return { success: false, error: `${c.etiqueta}: valor no permitido` }
    cambios[k] = normalizar(c.tipo, v)
  }
  const e = await leerEdiciones()
  const actuales = await filas<Fila>(data.entidad, e, true)
  const ahora = new Date().toISOString()

  if (data.crear) {
    const nueva: Fila = {}
    if (esq.autoId) nueva.id = idCorto(data.entidad === 'servicios' ? 'SRV' : 'DOC')
    else {
      for (const c of esq.clave) {
        const v = String(data.clave?.[c.k] ?? '').trim()
        if (!v) return { success: false, error: `Falta "${c.etiqueta}"` }
        const err = validarCampo(c, v)
        if (err) return { success: false, error: `${c.etiqueta}: ${err}` }
        nueva[c.k] = v
      }
    }
    if (actuales.some((f) => claveTxt(data.entidad, f) === claveTxt(data.entidad, nueva))) {
      return { success: false, error: `Ya existe ${esq.articulo} ${esq.nombre} con esos datos. Búscala y edítala en vez de crearla de nuevo.` }
    }
    Object.assign(nueva, cambios)
    const faltan = esq.obligatorios.filter((c) => nueva[c] === undefined || nueva[c] === '')
    if (faltan.length) return { success: false, error: 'Falta completar: ' + faltan.join(', ') }
    e.nuevos[data.entidad] = [...(e.nuevos[data.entidad] || []), { ...nueva, editado_por: 'local', editado_en: ahora }]
    e.historial.push({ id: idCorto('H'), fecha: ahora, usuario: 'local', entidad: data.entidad, clave: clavePublica(data.entidad, nueva), campo: '', antes: '', despues: '', accion: 'crear' })
    const r = await guardarEdiciones(e)
    if (!r.success) return { success: false, error: r.error }
    return { success: true, data: { ...nueva, origen: 'web', campos_web: [] }, message: `Listo: ficha creada (${esq.nombre})` }
  }

  const k = claveTxt(data.entidad, data.clave as Fila)
  const actual = actuales.find((f) => claveTxt(data.entidad, f) === k)
  if (!actual) return { success: false, error: 'No se encontró la ficha. Recarga la página.' }
  const ed = { ...(mapaEd(e, data.entidad)[k] || {}) }
  let n = 0
  for (const [campo, v] of Object.entries(cambios)) {
    const antes = textoComparable(actual[campo])
    if (antes === textoComparable(v)) continue
    ed[campo] = v
    n++
    e.historial.push({ id: idCorto('H'), fecha: ahora, usuario: 'local', entidad: data.entidad, clave: clavePublica(data.entidad, actual), campo, antes, despues: textoComparable(v), accion: 'editar' })
  }
  if (!n) return { success: true, data: actual, message: 'No había cambios que guardar' }
  mapaEd(e, data.entidad)[k] = { ...ed, editado_por: 'local', editado_en: ahora }
  const r = await guardarEdiciones(e)
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: { ...actual, ...ed }, message: n === 1 ? 'Cambio guardado' : `${n} cambios guardados` }
}

export async function licArchivar(data: { entidad: EntidadLic; clave: Record<string, string>; archivar: boolean }): Promise<ApiResponse<null>> {
  const e = await leerEdiciones()
  const actuales = await filas<Fila>(data.entidad, e, true)
  const k = claveTxt(data.entidad, data.clave as Fila)
  const actual = actuales.find((f) => claveTxt(data.entidad, f) === k)
  if (!actual) return { success: false, error: 'No se encontró la ficha. Recarga la página.' }
  const arch = { ...(e.archivados[data.entidad] || {}) }
  const antes = arch[k] || ''
  const ahora = new Date().toISOString()
  if (data.archivar) arch[k] = ahora
  else delete arch[k]
  e.archivados[data.entidad] = arch
  e.historial.push({ id: idCorto('H'), fecha: ahora, usuario: 'local', entidad: data.entidad, clave: clavePublica(data.entidad, actual), campo: 'archivado', antes, despues: data.archivar ? ahora : '', accion: data.archivar ? 'archivar' : 'restaurar' })
  const r = await guardarEdiciones(e)
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: null, message: data.archivar ? 'Archivado. Puedes recuperarlo en "Ver archivados".' : 'Recuperado' }
}

export async function licHistorial(data: { entidad?: EntidadLic; clave?: Record<string, string>; limite?: number } = {}): Promise<ApiResponse<LicCambio[]>> {
  const e = await leerEdiciones()
  const clave = data.clave && data.entidad ? clavePublica(data.entidad, data.clave as Fila) : ''
  const lista = e.historial
    .filter((h) => (!data.entidad || h.entidad === data.entidad) && (!clave || h.clave === clave))
    .slice()
    .reverse()
    .slice(0, data.limite || 50)
  return { success: true, data: lista }
}

export async function licDeshacer(id: string): Promise<ApiResponse<Fila>> {
  const e = await leerEdiciones()
  const h = e.historial.find((x) => x.id === id)
  if (!h) return { success: false, error: 'No se encontró ese cambio en el historial' }
  const entidad = h.entidad as EntidadLic
  const clave = JSON.parse(h.clave) as Record<string, string>
  if (h.accion === 'crear') return licArchivar({ entidad, clave, archivar: true }) as unknown as Promise<ApiResponse<Fila>>
  if (h.accion === 'archivar' || h.accion === 'restaurar') {
    return licArchivar({ entidad, clave, archivar: h.accion === 'restaurar' }) as unknown as Promise<ApiResponse<Fila>>
  }
  const actual = (await filas<Fila>(entidad, e, true)).find((f) => claveTxt(entidad, f) === claveTxt(entidad, clave))
  if (!actual) return { success: false, error: 'La ficha ya no existe' }
  if (textoComparable(actual[h.campo]) !== h.despues) {
    return { success: false, error: 'Ese dato se volvió a cambiar después. Deshaz primero el cambio más reciente.' }
  }
  const c = todosLosCampos(entidad).find((x) => x.k === h.campo)
  const valor = c?.tipo === 'personas' ? JSON.parse(h.antes || '[]') : c?.tipo === 'b' ? h.antes === 'true' : h.antes
  const r = await licGuardar({ entidad, clave, cambios: { [h.campo]: valor } })
  if (r.success) r.message = `Cambio deshecho: "${c?.etiqueta || h.campo}" volvió a su valor anterior`
  return r
}

// ── Lecturas ─────────────────────────────────────────────────────────────

export async function licProcesos(op: OpcionesLecturaLic = {}): Promise<ApiResponse<LicProceso[]>> {
  const e = await leerEdiciones()
  const lista = (await filas<Fila>('procesos', e, op.archivados)).map((p) => ({
    ...p,
    // El vault exporta 'notas_vault' (antes 'notas'); se acepta el nombre viejo
    notas_vault: String(p.notas_vault ?? ''),
    notas: String(p.notas ?? ''),
    estado_seguimiento: String(p.estado_seguimiento ?? ''),
  })) as unknown as LicProceso[]
  return { success: true, data: lista }
}

export async function licProceso(nom: string): Promise<ApiResponse<{ proceso: LicProceso; postores: LicPostor[]; acciones: LicAccion[] }>> {
  const e = await leerEdiciones()
  const [procesos, postoresTodos, accionesBase] = await Promise.all([
    licProcesos({}),
    filas<LicPostor>('postores', e),
    leerJson<LicAccion[]>('acciones', []),
  ])
  const proceso = (procesos.data || []).find((p) => p.nomenclatura === nom)
  if (!proceso) return { success: false, error: 'Proceso no encontrado' }
  const postores = postoresTodos.filter((p) => p.nomenclatura === nom).sort((a, b) => Number(b.pct_vr || 0) - Number(a.pct_vr || 0))
  const acciones = accionesBase.filter((a) => a.nomenclatura === nom).sort((a, b) => Number(a.n) - Number(b.n))
  return { success: true, data: { proceso, postores, acciones } }
}

export async function licActualizarProceso(data: { nomenclatura: string; estado_seguimiento?: string; notas?: string }): Promise<ApiResponse<Partial<LicProceso>>> {
  const { nomenclatura, ...cambios } = data
  return licGuardar({ entidad: 'procesos', clave: { nomenclatura }, cambios }) as Promise<ApiResponse<Partial<LicProceso>>>
}

export async function licResumen(): Promise<ApiResponse<LicResumen>> {
  const e = await leerEdiciones()
  const [procesos, personal, contratos, facturas] = await Promise.all([
    filas<Fila>('procesos', e), filas<Fila>('personal', e), filas<Fila>('contratos', e), filas<Fila>('facturas', e),
  ])
  const presentados = procesos.filter((p) => (p.nuestro_monto !== null && p.nuestro_monto !== undefined && p.nuestro_monto !== '') || p.resultado === 'ganado')
  const ganados = procesos.filter((p) => p.resultado === 'ganado')
  const noPresentados = procesos.filter((p) => String(p.resultado || '').indexOf('no-presentamos') === 0)
  const pctGanados = ganados.map((p) => Number(p.nuestro_pct_vr)).filter((n) => !Number.isNaN(n) && n > 0)
  const contarPor = (campo: string, lista: Fila[]) => {
    const out: Record<string, number> = {}
    lista.forEach((p) => {
      const k = p[campo]
      if (k !== undefined && k !== null && k !== '') out[String(k)] = (out[String(k)] || 0) + 1
    })
    return out
  }
  const facturadoTotal = facturas.reduce((acc, f) => acc + (Number(f.monto) || 0), 0)
  return {
    success: true,
    data: {
      procesos: procesos.length,
      presentados: presentados.length,
      ganados: ganados.length,
      tasa_exito: presentados.length ? Math.round((ganados.length / presentados.length) * 1000) / 10 : null,
      no_presentados: noPresentados.length,
      pct_vr_promedio_ganado: pctGanados.length ? Math.round((pctGanados.reduce((a, b) => a + b, 0) / pctGanados.length) * 10) / 10 : null,
      ganados_por_anio: contarPor('anio', ganados),
      procesos_por_anio: contarPor('anio', procesos),
      ganados_por_linea: contarPor('linea', ganados),
      personas: personal.length,
      contratos_con_sustento: contratos.length,
      facturas: facturas.length,
      facturado_total: Math.round(facturadoTotal * 100) / 100,
    },
  }
}

// Igual que el backend: la ficha sale de competidores y los números se
// calculan de los postores (un postor agregado a mano cuenta al instante).
export async function licCompetidores(op: OpcionesLecturaLic = {}): Promise<ApiResponse<LicCompetidor[]>> {
  const e = await leerEdiciones()
  const [procesos, postores, fichas] = await Promise.all([filas<Fila>('procesos', e), filas<Fila>('postores', e), filas<Fila>('competidores', e, op.archivados)])
  const entidadDe = new Map(procesos.map((p) => [String(p.nomenclatura), String(p.entidad || '')]))
  const stats = new Map<string, { nombre: string; procesos: string[]; entidades: string[]; ofertas: { proceso: string; monto: number; pct_vr: number | null }[]; ganados: number }>()
  postores.forEach((p) => {
    if (p.es_telcom === true || !p.ruc) return
    const ruc = String(p.ruc)
    const s = stats.get(ruc) || { nombre: String(p.razon_social || ''), procesos: [], entidades: [], ofertas: [], ganados: 0 }
    const nom = String(p.nomenclatura)
    if (!s.procesos.includes(nom)) s.procesos.push(nom)
    const ent = entidadDe.get(nom)
    if (ent && !s.entidades.includes(ent)) s.entidades.push(ent)
    if (p.monto !== '' && p.monto !== null && p.monto !== undefined) s.ofertas.push({ proceso: nom, monto: Number(p.monto) || 0, pct_vr: p.pct_vr === '' || p.pct_vr == null ? null : Number(p.pct_vr) })
    if (p.gano === true) s.ganados++
    stats.set(ruc, s)
  })
  const calc = (s: ReturnType<typeof stats.get>, c: Fila) => {
    if (!s) return { procesos: (c.procesos as string[]) || [], entidades: (c.entidades as string[]) || [], ofertas: [], n_procesos: ((c.procesos as string[]) || []).length, ganados: Number(c.ganados) || 0 }
    const pcts = s.ofertas.map((o) => o.pct_vr).filter((x): x is number => x !== null && !Number.isNaN(x))
    return {
      procesos: s.procesos, n_procesos: s.procesos.length, entidades: s.entidades, ofertas: s.ofertas, ganados: s.ganados,
      pct_vr_promedio: pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : null,
    }
  }
  const vistos = new Set<string>()
  const lista: Fila[] = fichas.map((c) => { vistos.add(String(c.ruc)); return { ...c, ...calc(stats.get(String(c.ruc)), c) } })
  stats.forEach((s, ruc) => { if (!vistos.has(ruc)) lista.push({ ruc, nombre: s.nombre, origen: 'postores', campos_web: [], ...calc(s, {}) }) })
  return { success: true, data: lista as unknown as LicCompetidor[] }
}

export async function licExperiencia(op: OpcionesLecturaLic = {}): Promise<ApiResponse<LicExperiencia[]>> {
  return { success: true, data: await filas<LicExperiencia>('experiencia', await leerEdiciones(), op.archivados) }
}

export async function licPropuestas(): Promise<ApiResponse<LicPropuesta[]>> {
  return { success: true, data: await leerJson<LicPropuesta[]>('propuestas', []) }
}

export async function licDocumentos(filtros?: { categoria?: string; dni?: string; archivados?: boolean }): Promise<ApiResponse<LicDocumento[]>> {
  let lista = (await filas<Fila>('documentos', await leerEdiciones(), filtros?.archivados)).map((d) => ({
    notas: '', verificado: '', vence: '', ...d,
  })) as unknown as LicDocumento[]
  if (filtros?.categoria) lista = lista.filter((d) => d.categoria === filtros.categoria)
  if (filtros?.dni) lista = lista.filter((d) => String(d.dni) === String(filtros.dni))
  return { success: true, data: lista }
}

export async function licActualizarDocumento(data: { id: string } & Record<string, unknown>): Promise<ApiResponse<Partial<LicDocumento>>> {
  const { id, ...cambios } = data
  return licGuardar({ entidad: 'documentos', clave: { id }, cambios }) as Promise<ApiResponse<Partial<LicDocumento>>>
}

export async function licCrearDocumento(data: Record<string, unknown>): Promise<ApiResponse<LicDocumento>> {
  const cambios: Fila = {}
  Object.entries(data).forEach(([k, v]) => { if (v !== '' && v !== undefined) cambios[k] = v })
  return licGuardar({ entidad: 'documentos', crear: true, clave: {}, cambios }) as unknown as Promise<ApiResponse<LicDocumento>>
}

export async function licPersonal(op: OpcionesLecturaLic = {}): Promise<ApiResponse<LicPersonal[]>> {
  const lista = (await filas<Fila>('personal', await leerEdiciones(), op.archivados)).map((p) => ({
    empleado_vinculado: '', notas: '', cargos: [], titulos: [], tipos: {}, ...p,
  })) as unknown as LicPersonal[]
  return { success: true, data: lista }
}

export async function licActualizarPersona(data: { dni: string } & Record<string, unknown>): Promise<ApiResponse<Partial<LicPersonal>>> {
  const { dni, ...cambios } = data
  return licGuardar({ entidad: 'personal', clave: { dni }, cambios }) as Promise<ApiResponse<Partial<LicPersonal>>>
}

export async function licContratos(op: OpcionesLecturaLic = {}): Promise<ApiResponse<LicContrato[]>> {
  const e = await leerEdiciones()
  const [contratos, facturas] = await Promise.all([filas<Fila>('contratos', e, op.archivados), filas<LicFactura>('facturas', e, op.archivados)])
  const lista = contratos.map((c) => ({
    estado: '', notas: '', tipos: {}, ...c,
    facturas: facturas.filter((f) => f.contrato === c.contrato).sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || ''))),
  })) as unknown as LicContrato[]
  return { success: true, data: lista }
}

export async function licActualizarContrato(data: { contrato: string } & Record<string, unknown>): Promise<ApiResponse<Partial<LicContrato>>> {
  const { contrato, ...cambios } = data
  return licGuardar({ entidad: 'contratos', clave: { contrato }, cambios }) as Promise<ApiResponse<Partial<LicContrato>>>
}

export async function licActualizarFactura(data: { contrato: string; numero: string } & Record<string, unknown>): Promise<ApiResponse<Partial<LicFactura>>> {
  const { contrato, numero, ...cambios } = data
  return licGuardar({ entidad: 'facturas', clave: { contrato, numero }, cambios }) as Promise<ApiResponse<Partial<LicFactura>>>
}

export async function licServicios(op: OpcionesLecturaLic = {}): Promise<ApiResponse<LicServicio[]>> {
  const e = await leerEdiciones()
  const [servicios, facturas] = await Promise.all([filas<Fila>('servicios', e, op.archivados), filas<Fila>('facturas', e)])
  const lista = servicios.map((s) => {
    const propias = s.contrato ? facturas.filter((f) => String(f.contrato) === String(s.contrato)) : []
    return {
      ...s,
      personal: Array.isArray(s.personal) ? s.personal : [],
      facturado: Math.round(propias.reduce((a, f) => a + (Number(f.monto) || 0), 0) * 100) / 100,
      n_facturas: propias.length,
    }
  }) as unknown as LicServicio[]
  return { success: true, data: lista }
}

// ── Importación / exportación de cambios ─────────────────────────────────
// En modo local los datos YA se leen directo del JSON del vault: no hace
// falta (ni tiene sentido) "importar".
export async function licImportar(_payload: LicImportPayload): Promise<ApiResponse<Record<string, number>>> {
  return {
    success: false,
    error: 'Modo local: los datos ya se leen directo de los JSON del vault (LIC_DATA_DIR). No hace falta importar aquí.',
  }
}

export async function licExportarCambios(desde?: string): Promise<ApiResponse<Record<string, Fila[]>>> {
  const e = await leerEdiciones()
  const out: Record<string, Fila[]> = {}
  ENTIDADES.forEach((ent) => {
    out[ent] = Object.entries(mapaEd(e, ent))
      .filter(([, v]) => !desde || String(v.editado_en || '') > desde)
      .map(([k, v]): Fila => ({ clave: k.split('\u0001'), ...v }))
      .concat((e.nuevos[ent] || []).filter((f) => !desde || String(f.editado_en || '') > desde))
  })
  return { success: true, data: out }
}

// ── Visor de PDF del vault (/__lic/archivo) ──────────────────────────────
// Mismo shape de respuesta que api.getArchivo (Drive) para poder reusar
// FileViewerModal sin tocarlo más que con un prop `source="local"`.
export async function licArchivo(ruta: string): Promise<ApiResponse<{ base64: string; mimeType: string; fileName: string }>> {
  try {
    const res = await fetch(`/__lic/archivo?ruta=${encodeURIComponent(ruta)}`)
    if (!res.ok) {
      const texto = await res.text().catch(() => '')
      return { success: false, error: texto || `No se pudo abrir el archivo (HTTP ${res.status})` }
    }
    const blob = await res.blob()
    const mimeType = blob.type || 'application/pdf'
    const base64 = await blobToBase64(blob)
    const fileName = ruta.split(/[\\/]/).pop() || 'archivo'
    return { success: true, data: { base64, mimeType, fileName } }
  } catch {
    return { success: false, error: ERROR_SERVIDOR_LOCAL }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── PDF individuales y fotos del personal (modo local) ─────────────
// URL para ver (o descargar) un PDF del acervo/propuestas servido por el
// plugin de Vite. `pagina` salta a esa página dentro del visor de Chrome.
export function licUrlArchivo(ruta: string, opciones: { pagina?: number | null; descargar?: boolean; nombre?: string; v?: string | number } = {}): string {
  const q = new URLSearchParams({ ruta })
  if (opciones.descargar) q.set('descargar', '1')
  if (opciones.nombre) q.set('nombre', opciones.nombre)
  if (opciones.v !== undefined) q.set('v', String(opciones.v))
  return `/__lic/archivo?${q.toString()}${opciones.pagina ? `#page=${opciones.pagina}` : ''}`
}

// Sube la foto de una persona a su carpeta del acervo (foto.jpg|png|webp)
export async function licSubirFoto(carpeta: string, archivo: File): Promise<ApiResponse<{ ruta: string }>> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return { success: false, error: 'La foto debe ser JPG, PNG o WEBP' }
  if (archivo.size > 6 * 1024 * 1024) return { success: false, error: 'La foto no debe pasar de 6 MB' }
  const base64 = await blobToBase64(archivo)
  try {
    const res = await fetch('/__lic/foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carpeta, mime: archivo.type, base64 }),
    })
    return (await res.json()) as ApiResponse<{ ruta: string }>
  } catch {
    return { success: false, error: 'No se pudo subir la foto (¿está corriendo npm run dev?)' }
  }
}

// PDF nuevo (documento dado de alta en la web) → 01_GERENCIA/acervo/<categoria>/_web/
export async function licSubirDocumento(data: { categoria: string; nombre: string; mime: string; base64: string }): Promise<ApiResponse<{ archivo_vault: string; id: string }>> {
  try {
    const res = await fetch('/__lic/documento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return (await res.json()) as ApiResponse<{ archivo_vault: string; id: string }>
  } catch {
    return { success: false, error: 'No se pudo subir el PDF (¿está corriendo npm run dev?)' }
  }
}
