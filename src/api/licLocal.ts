// ============================================================
// Modo local de Licitaciones (VITE_LIC_LOCAL=1) — ver docs/PLAN_LICITACIONES_ADMIN.md
// § "Modo local".
//
// En vez de llamar a Apps Script, lee los JSON que exporta el vault
// directamente vía el plugin de Vite (`vite.config.ts`, solo en `npm run dev`):
//   GET  /__lic/data/<nombre>.json   → contenido crudo de un JSON del vault
//   GET  /__lic/ediciones            → ediciones hechas desde la web (JSON)
//   POST /__lic/ediciones            → guarda una edición (merge server-side)
//   GET  /__lic/archivo?ruta=...     → sirve un PDF del vault para el visor
//
// Los datos base (JSON del vault) NUNCA se tocan; las ediciones viven aparte,
// en ediciones_web.json, y se combinan en el cliente (las ediciones ganan).
// appScriptApi.ts delega aquí cuando LIC_LOCAL está activo — ningún método de
// este archivo llama a Apps Script.
// ============================================================
import type { LicPropuesta,
  ApiResponse,
  LicAccion,
  LicCompetidor,
  LicContrato,
  LicDocumento,
  LicExperiencia,
  LicFactura,
  LicImportPayload,
  LicPersonal,
  LicPostor,
  LicProceso,
  LicResumen,
} from './appScriptApi'

interface Ediciones {
  procesos: Record<string, Record<string, unknown>>
  documentos: Record<string, Record<string, unknown>>
  documentos_nuevos: LicDocumento[]
  personal: Record<string, Record<string, unknown>>
  contratos: Record<string, Record<string, unknown>>
  facturas: Record<string, Record<string, unknown>>
}

const EDICIONES_VACIAS: Ediciones = { procesos: {}, documentos: {}, documentos_nuevos: [], personal: {}, contratos: {}, facturas: {} }

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
  try {
    const res = await fetch('/__lic/ediciones')
    if (!res.ok) return EDICIONES_VACIAS
    const json = await res.json()
    const data = (json && json.data) || json
    return { ...EDICIONES_VACIAS, ...data }
  } catch {
    return EDICIONES_VACIAS
  }
}

async function guardarEdicion(patch: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/__lic/ediciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json || !json.success) return { success: false, error: (json && json.error) || `No se pudo guardar (HTTP ${res.status})` }
    return { success: true }
  } catch {
    return { success: false, error: ERROR_SERVIDOR_LOCAL }
  }
}

function idLocal(prefijo: string): string {
  return `${prefijo}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

// ── Procesos ─────────────────────────────────────────────────────────────

function aplicarEdicionProceso(p: Record<string, unknown>, ediciones: Ediciones): LicProceso {
  const nom = String(p.nomenclatura || '')
  const ed = ediciones.procesos[nom] || {}
  return {
    ...p,
    // El vault exporta 'notas_vault' (antes 'notas'); se acepta el nombre viejo
    // por si el JSON en disco no se regeneró todavía.
    notas_vault: String(p.notas_vault ?? p.notas ?? ''),
    notas: '',
    estado_seguimiento: '',
    actualizado: '',
    ...ed,
  } as unknown as LicProceso
}

export async function licProcesos(): Promise<ApiResponse<LicProceso[]>> {
  const [base, ediciones] = await Promise.all([leerJson<Record<string, unknown>[]>('procesos', []), leerEdiciones()])
  return { success: true, data: base.map((p) => aplicarEdicionProceso(p, ediciones)) }
}

export async function licProceso(nom: string): Promise<ApiResponse<{ proceso: LicProceso; postores: LicPostor[]; acciones: LicAccion[] }>> {
  const [base, ediciones, postoresBase, accionesBase] = await Promise.all([
    leerJson<Record<string, unknown>[]>('procesos', []),
    leerEdiciones(),
    leerJson<LicPostor[]>('postores', []),
    leerJson<LicAccion[]>('acciones', []),
  ])
  const crudo = base.find((p) => p.nomenclatura === nom)
  if (!crudo) return { success: false, error: 'Proceso no encontrado' }
  const proceso = aplicarEdicionProceso(crudo, ediciones)
  const postores = postoresBase.filter((p) => p.nomenclatura === nom).sort((a, b) => Number(b.pct_vr || 0) - Number(a.pct_vr || 0))
  const acciones = accionesBase.filter((a) => a.nomenclatura === nom).sort((a, b) => Number(a.n) - Number(b.n))
  return { success: true, data: { proceso, postores, acciones } }
}

export async function licActualizarProceso(data: { nomenclatura: string; estado_seguimiento?: string; notas?: string }): Promise<ApiResponse<Partial<LicProceso>>> {
  const { nomenclatura, ...cambios } = data
  const r = await guardarEdicion({ entidad: 'procesos', clave: nomenclatura, cambios })
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: { nomenclatura, ...cambios } }
}

// ── Resumen, competidores, experiencia ──────────────────────────────────

export async function licResumen(): Promise<ApiResponse<LicResumen>> {
  const [procesos, personal, contratos, facturas] = await Promise.all([
    leerJson<Record<string, unknown>[]>('procesos', []),
    leerJson<Record<string, unknown>[]>('personal', []),
    leerJson<Record<string, unknown>[]>('contratos', []),
    leerJson<Record<string, unknown>[]>('facturas', []),
  ])
  const presentados = procesos.filter((p) => (p.nuestro_monto !== null && p.nuestro_monto !== undefined && p.nuestro_monto !== '') || p.resultado === 'ganado')
  const ganados = procesos.filter((p) => p.resultado === 'ganado')
  const noPresentados = procesos.filter((p) => String(p.resultado || '').indexOf('no-presentamos') === 0)
  const pctGanados = ganados.map((p) => Number(p.nuestro_pct_vr)).filter((n) => !Number.isNaN(n) && n > 0)
  const contarPor = (campo: string, lista: Record<string, unknown>[]) => {
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

export async function licCompetidores(): Promise<ApiResponse<LicCompetidor[]>> {
  return { success: true, data: await leerJson<LicCompetidor[]>('competidores', []) }
}

export async function licExperiencia(): Promise<ApiResponse<LicExperiencia[]>> {
  return { success: true, data: await leerJson<LicExperiencia[]>('experiencia', []) }
}

// ── Documentos ───────────────────────────────────────────────────────────

export async function licPropuestas(): Promise<ApiResponse<LicPropuesta[]>> {
  return { success: true, data: await leerJson<LicPropuesta[]>('propuestas', []) }
}

export async function licDocumentos(filtros?: { categoria?: string; dni?: string }): Promise<ApiResponse<LicDocumento[]>> {
  const [base, ediciones] = await Promise.all([leerJson<LicDocumento[]>('documentos', []), leerEdiciones()])
  let lista = base
    .map((d) => ({ ...d, notas: '', verificado: '', vence: '', ...(ediciones.documentos[d.id] || {}) }))
    .concat(ediciones.documentos_nuevos.map((d) => ({ ...d, ...(ediciones.documentos[d.id] || {}) })))
  if (filtros?.categoria) lista = lista.filter((d) => d.categoria === filtros.categoria)
  if (filtros?.dni) lista = lista.filter((d) => String(d.dni) === String(filtros.dni))
  return { success: true, data: lista }
}

export async function licActualizarDocumento(data: {
  id: string
  verificado?: string
  vence?: string
  notas?: string
  titulo?: string
  fecha?: string
  monto?: number
}): Promise<ApiResponse<Partial<LicDocumento>>> {
  const { id, ...cambios } = data
  const r = await guardarEdicion({ entidad: 'documentos', clave: id, cambios })
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: { id, ...cambios } }
}

export async function licCrearDocumento(data: {
  categoria: string
  tipo?: string
  titulo: string
  entidad?: string
  dni?: string
  nombre?: string
  fecha?: string
  periodo_desde?: string
  periodo_hasta?: string
  monto?: number
  archivo_vault?: string
  verificado?: string
  vence?: string
  notas?: string
}): Promise<ApiResponse<LicDocumento>> {
  const ahora = new Date().toISOString()
  const documento: LicDocumento = {
    id: idLocal('DOC'),
    categoria: data.categoria,
    tipo: data.tipo || '',
    titulo: data.titulo,
    entidad: data.entidad || '',
    dni: data.dni || '',
    nombre: data.nombre || '',
    fecha: data.fecha || '',
    periodo_desde: data.periodo_desde || '',
    periodo_hasta: data.periodo_hasta || '',
    monto: data.monto ?? '',
    archivo_vault: data.archivo_vault || '',
    usos: 0,
    verificado: data.verificado || '',
    vence: data.vence || '',
    notas: data.notas || '',
    editado_por: 'local',
    editado_en: ahora,
  }
  const r = await guardarEdicion({ entidad: 'documentos_nuevos', documento })
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: documento, message: 'Documento creado (local)' }
}

// ── Personal ─────────────────────────────────────────────────────────────

export async function licPersonal(): Promise<ApiResponse<LicPersonal[]>> {
  const [base, ediciones] = await Promise.all([leerJson<Record<string, unknown>[]>('personal', []), leerEdiciones()])
  const lista = base.map((p) => ({
    ...p,
    empleado_vinculado: '',
    notas: '',
    ...(ediciones.personal[String(p.dni)] || {}),
  })) as unknown as LicPersonal[]
  return { success: true, data: lista }
}

export async function licActualizarPersona(data: { dni: string; empleado_vinculado?: string; notas?: string }): Promise<ApiResponse<Partial<LicPersonal>>> {
  const { dni, ...cambios } = data
  const r = await guardarEdicion({ entidad: 'personal', clave: dni, cambios })
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: { dni, ...cambios } }
}

// ── Contratos y facturas ─────────────────────────────────────────────────

const claveFactura = (contrato: string, numero: string) => `${contrato}\u0001${numero}`

export async function licContratos(): Promise<ApiResponse<LicContrato[]>> {
  const [baseContratos, baseFacturas, ediciones] = await Promise.all([
    leerJson<Record<string, unknown>[]>('contratos', []),
    leerJson<Record<string, unknown>[]>('facturas', []),
    leerEdiciones(),
  ])
  const porContrato: Record<string, Record<string, unknown>[]> = {}
  baseFacturas.forEach((f) => {
    const contrato = String(f.contrato || '')
    if (!contrato) return
    const ed = ediciones.facturas[claveFactura(contrato, String(f.numero || ''))] || {}
    const arr = porContrato[contrato] || (porContrato[contrato] = [])
    arr.push({ ...f, verificado: '', notas: '', ...ed })
  })
  const lista = baseContratos.map((c) => {
    const contrato = String(c.contrato || '')
    const facturas = (porContrato[contrato] || []).slice().sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))
    return {
      ...c,
      estado: '',
      notas: '',
      ...(ediciones.contratos[contrato] || {}),
      facturas,
    }
  }) as unknown as LicContrato[]
  return { success: true, data: lista }
}

export async function licActualizarContrato(data: { contrato: string; estado?: string; notas?: string }): Promise<ApiResponse<Partial<LicContrato>>> {
  const { contrato, ...cambios } = data
  const r = await guardarEdicion({ entidad: 'contratos', clave: contrato, cambios })
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: { contrato, ...cambios } }
}

export async function licActualizarFactura(data: { contrato: string; numero: string; verificado?: string; notas?: string }): Promise<ApiResponse<Partial<LicFactura>>> {
  const { contrato, numero, ...cambios } = data
  const r = await guardarEdicion({ entidad: 'facturas', clave: claveFactura(contrato, numero), cambios })
  if (!r.success) return { success: false, error: r.error }
  return { success: true, data: { contrato, numero, ...cambios } }
}

// ── Importación / exportación de cambios ─────────────────────────────────
// En modo local los datos YA se leen directo del JSON del vault: no hace
// falta (ni tiene sentido) "importar". Se deja el método por simetría con la
// interfaz de la API, pero avisa en vez de fingir que hizo algo.
export async function licImportar(_payload: LicImportPayload): Promise<ApiResponse<Record<string, number>>> {
  return {
    success: false,
    error: 'Modo local: los datos ya se leen directo de los JSON del vault (LIC_DATA_DIR). No hace falta importar aquí.',
  }
}

export async function licExportarCambios(desde?: string): Promise<ApiResponse<{ procesos: Partial<LicProceso>[]; documentos: Partial<LicDocumento>[] }>> {
  const ediciones = await leerEdiciones()
  const pasaFecha = (v: Record<string, unknown>) => {
    const t = v.editado_en
    return !desde || (typeof t === 'string' && t > desde)
  }
  const procesos = Object.entries(ediciones.procesos)
    .filter(([, v]) => pasaFecha(v))
    .map(([nomenclatura, v]) => ({ nomenclatura, ...v }))
  const documentos = Object.entries(ediciones.documentos)
    .filter(([, v]) => pasaFecha(v))
    .map(([id, v]) => ({ id, ...v }))
  return { success: true, data: { procesos, documentos } as { procesos: Partial<LicProceso>[]; documentos: Partial<LicDocumento>[] } }
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
