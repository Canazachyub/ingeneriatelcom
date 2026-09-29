// ============================================================
// Esquema de las fichas editables de Licitaciones — UNA sola definición para
// el formulario (FichaEditable), la validación y el modo local.
// Debe coincidir con LIC_ENTIDADES_ en backend/17_lic_edicion.gs (mismos
// campos y tipos): el backend vuelve a validar todo, esto es para avisar antes.
// ============================================================

export type EntidadLic =
  | 'procesos' | 'postores' | 'competidores' | 'experiencia' | 'documentos'
  | 'personal' | 'contratos' | 'facturas' | 'servicios'

// t texto · l texto largo · n número · m dinero · p porcentaje · d fecha · b sí/no
// o opción cerrada · personas lista de DNI del personal clave
// proyecto: proyecto de Gestión > Proyectos (para ver la asistencia del servicio)
export type TipoCampo = 't' | 'l' | 'n' | 'm' | 'p' | 'd' | 'b' | 'o' | 'personas' | 'proyecto'

export interface CampoLic {
  k: string
  etiqueta: string
  tipo: TipoCampo
  ayuda?: string
  opciones?: { v: string; t: string }[]
  /** sugerencias para campos de texto (se puede escribir otra cosa) */
  sugerencias?: string[]
  ancho?: 'completo'
  /** lo llena el sistema: se muestra pero no se edita */
  soloLectura?: boolean
}

export interface EsquemaLic {
  entidad: EntidadLic
  nombre: string // "competidor"
  articulo: 'el' | 'la'
  clave: CampoLic[] // se piden al crear; luego no se editan
  autoId?: boolean
  obligatorios: string[]
  secciones: { titulo: string; campos: CampoLic[] }[]
}

const SIN_DEFINIR = { v: '', t: 'Sin definir' }
const SI_NO = [SIN_DEFINIR, { v: 'si', t: 'Sí' }, { v: 'no', t: 'No' }]
export const ESTADOS_SERVICIO = [
  { v: 'por_iniciar', t: 'Por iniciar' },
  { v: 'en_ejecucion', t: 'En ejecución' },
  { v: 'suspendido', t: 'Suspendido' },
  { v: 'terminado', t: 'Terminado' },
]

export const ESQUEMAS: Record<EntidadLic, EsquemaLic> = {
  procesos: {
    entidad: 'procesos', nombre: 'licitación', articulo: 'la', obligatorios: ['nomenclatura', 'entidad', 'objeto'],
    clave: [{ k: 'nomenclatura', etiqueta: 'Nomenclatura (como en el SEACE)', tipo: 't', ayuda: 'Ej.: CP SER-SM-26-2026-ELSE-1' }],
    secciones: [
      { titulo: 'La licitación', campos: [
        { k: 'entidad', etiqueta: 'Entidad', tipo: 't', sugerencias: ['Electro Sur Este S.A.A.', 'Electro Puno S.A.A.', 'Electrosur S.A.', 'Electro Ucayali S.A.', 'Electro Oriente S.A.'] },
        { k: 'objeto', etiqueta: 'Qué se contrata', tipo: 'l', ancho: 'completo' },
        { k: 'anio', etiqueta: 'Año', tipo: 't' },
        { k: 'codigo_seace', etiqueta: 'Código SEACE', tipo: 't' },
        { k: 'ley', etiqueta: 'Ley', tipo: 't', sugerencias: ['Ley N° 32069', 'Ley N° 30225'] },
        { k: 'vr', etiqueta: 'Valor referencial', tipo: 'm' },
      ] },
      { titulo: 'Resultado', campos: [
        { k: 'resultado', etiqueta: 'Resultado', tipo: 't', sugerencias: ['ganado', 'perdido', 'no-presentamos', 'desierto', 'ABIERTO', 'en curso'] },
        { k: 'nuestro_monto', etiqueta: 'Nuestra oferta', tipo: 'm' },
        { k: 'nuestro_pct_vr', etiqueta: 'Nuestra oferta (% del valor referencial)', tipo: 'p' },
        { k: 'n_postores', etiqueta: 'N.º de postores', tipo: 'n' },
        { k: 'ganador', etiqueta: 'Ganador', tipo: 't' },
        { k: 'ganador_ruc', etiqueta: 'RUC del ganador', tipo: 't' },
      ] },
      { titulo: 'Seguimiento', campos: [
        { k: 'estado_seguimiento', etiqueta: 'Estado del seguimiento', tipo: 'o', opciones: [SIN_DEFINIR,
          { v: 'pendiente', t: 'Pendiente de revisión' }, { v: 'en_seguimiento', t: 'En seguimiento' },
          { v: 'a_la_espera', t: 'A la espera de la entidad' }, { v: 'cerrado', t: 'Cerrado' }] },
        { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
      ] },
    ],
  },
  postores: {
    entidad: 'postores', nombre: 'postor', articulo: 'el', obligatorios: ['nomenclatura', 'ruc', 'razon_social'],
    clave: [
      { k: 'nomenclatura', etiqueta: 'Licitación', tipo: 't' },
      { k: 'ruc', etiqueta: 'RUC del postor', tipo: 't', ayuda: '11 números' },
    ],
    secciones: [{ titulo: 'Su oferta', campos: [
      { k: 'razon_social', etiqueta: 'Razón social', tipo: 't', ancho: 'completo' },
      { k: 'monto', etiqueta: 'Monto ofertado', tipo: 'm' },
      { k: 'pct_vr', etiqueta: '% del valor referencial', tipo: 'p' },
      { k: 'consorcio', etiqueta: '¿Fue en consorcio?', tipo: 't', sugerencias: ['Sí', 'No'] },
      { k: 'mype', etiqueta: '¿Es MYPE?', tipo: 't', sugerencias: ['Sí', 'No'] },
      { k: 'gano', etiqueta: '¿Ganó?', tipo: 'b' },
      { k: 'es_telcom', etiqueta: '¿Somos nosotros?', tipo: 'b' },
    ] }],
  },
  competidores: {
    entidad: 'competidores', nombre: 'competidor', articulo: 'el', obligatorios: ['ruc', 'nombre'],
    clave: [{ k: 'ruc', etiqueta: 'RUC', tipo: 't', ayuda: '11 números' }],
    secciones: [
      { titulo: 'Empresa', campos: [
        { k: 'nombre', etiqueta: 'Razón social', tipo: 't', ancho: 'completo' },
        { k: 'zona', etiqueta: 'Dónde trabaja', tipo: 't', ayuda: 'Ej.: Cusco, Puno' },
        { k: 'amenaza', etiqueta: '¿Qué tan fuerte es?', tipo: 'o', opciones: [SIN_DEFINIR, { v: 'alta', t: 'Muy fuerte' }, { v: 'media', t: 'Normal' }, { v: 'baja', t: 'Débil' }] },
        { k: 'contacto', etiqueta: 'Contacto / representante', tipo: 't' },
        { k: 'telefono', etiqueta: 'Teléfono', tipo: 't' },
      ] },
      { titulo: 'Lo que sabemos', campos: [
        { k: 'fortalezas', etiqueta: 'Cómo compite (precio, personal, experiencia…)', tipo: 'l', ancho: 'completo' },
        { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
      ] },
    ],
  },
  experiencia: {
    entidad: 'experiencia', nombre: 'experiencia', articulo: 'la', obligatorios: ['proceso', 'entidad'],
    clave: [{ k: 'proceso', etiqueta: 'Licitación / contrato', tipo: 't' }],
    secciones: [{ titulo: 'Experiencia', campos: [
      { k: 'entidad', etiqueta: 'Entidad', tipo: 't', ancho: 'completo' },
      { k: 'objeto', etiqueta: 'Qué se hizo', tipo: 'l', ancho: 'completo' },
      { k: 'monto_adjudicado', etiqueta: 'Monto adjudicado', tipo: 'm' },
      { k: 'monto_facturado', etiqueta: 'Monto facturado', tipo: 'm' },
      { k: 'pct_telcom', etiqueta: 'Nuestra participación (%)', tipo: 'p' },
      { k: 'acreditable', etiqueta: 'Monto que podemos acreditar', tipo: 'm' },
      { k: 'estado', etiqueta: 'Estado', tipo: 't', sugerencias: ['en ejecución', 'culminado', 'en liquidación'] },
      { k: 'fecha_contrato', etiqueta: 'Fecha del contrato', tipo: 't', ayuda: 'Como figura en el contrato' },
      { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
    ] }],
  },
  documentos: {
    entidad: 'documentos', nombre: 'documento', articulo: 'el', autoId: true, obligatorios: ['categoria', 'titulo'],
    clave: [],
    secciones: [
      { titulo: 'El documento', campos: [
        { k: 'categoria', etiqueta: '¿De qué es?', tipo: 'o', opciones: [
          { v: 'personal', t: 'Personal clave' }, { v: 'experiencia', t: 'Experiencia (contratos)' },
          { v: 'equipos', t: 'Vehículos y equipos' }, { v: 'empresa', t: 'Empresa' }, { v: 'tecnico', t: 'Técnico' },
          { v: 'anexo', t: 'Anexo de propuesta' }, { v: 'otro', t: 'Otro' }] },
        { k: 'tipo', etiqueta: 'Tipo', tipo: 't', sugerencias: ['certificado-trabajo', 'constancia-trabajo', 'titulo', 'bachiller', 'colegiatura', 'habilidad-cip', 'cv', 'contrato', 'factura', 'conformidad', 'orden-servicio', 'constancia-prestacion', 'vigencia-poder', 'tarjeta-propiedad', 'licencia-conducir'] },
        { k: 'titulo', etiqueta: 'Título', tipo: 't', ancho: 'completo', ayuda: 'Qué es y de quién. Ej.: Certificado de trabajo EDCAES – Willy Canaza' },
        { k: 'entidad', etiqueta: 'Emitido por / contrato', tipo: 't' },
        { k: 'fecha', etiqueta: 'Fecha del documento', tipo: 'd' },
        { k: 'dni', etiqueta: 'DNI de la persona (si es de alguien)', tipo: 't' },
        { k: 'nombre', etiqueta: 'Nombre de la persona', tipo: 't' },
        { k: 'periodo_desde', etiqueta: 'Periodo: desde', tipo: 'd' },
        { k: 'periodo_hasta', etiqueta: 'Periodo: hasta', tipo: 'd' },
        { k: 'monto', etiqueta: 'Monto (si aplica)', tipo: 'm' },
      ] },
      { titulo: 'Revisión', campos: [
        { k: 'verificado', etiqueta: '¿Ya lo revisaste?', tipo: 'o', opciones: [{ v: '', t: 'Todavía no' }, { v: 'si', t: 'Sí, está bien' }, { v: 'no', t: 'Tiene un problema' }] },
        { k: 'vence', etiqueta: '¿Cuándo vence? (si aplica)', tipo: 'd' },
        { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
      ] },
      { titulo: 'Archivo', campos: [
        { k: 'archivo_vault', etiqueta: 'PDF enlazado', tipo: 't', ancho: 'completo', soloLectura: true, ayuda: 'Lo pone el sistema al subir el PDF' },
      ] },
    ],
  },
  personal: {
    entidad: 'personal', nombre: 'persona', articulo: 'la', obligatorios: ['dni', 'nombre'],
    clave: [{ k: 'dni', etiqueta: 'DNI', tipo: 't', ayuda: '8 números' }],
    secciones: [
      { titulo: 'Datos', campos: [
        { k: 'nombre', etiqueta: 'Apellidos y nombres', tipo: 't', ancho: 'completo', ayuda: 'En mayúsculas: APELLIDOS NOMBRES' },
        { k: 'profesion', etiqueta: 'Profesión', tipo: 't', sugerencias: ['Ingeniero Mecánico Electricista', 'Ingeniero Electricista', 'Bachiller en Ingeniería', 'Técnico electricista'] },
        { k: 'colegiatura', etiqueta: 'N.º de colegiatura (CIP)', tipo: 't' },
        { k: 'telefono', etiqueta: 'Teléfono', tipo: 't' },
        { k: 'correo', etiqueta: 'Correo', tipo: 't' },
        { k: 'disponible', etiqueta: '¿Disponible para nuevas propuestas?', tipo: 'o', opciones: SI_NO },
      ] },
      { titulo: 'Notas', campos: [
        { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
        { k: 'empleado_vinculado', etiqueta: 'Empleado vinculado (planilla)', tipo: 't', soloLectura: true, ayuda: 'Se cambia con "Vincular empleado" en la tarjeta' },
      ] },
    ],
  },
  contratos: {
    entidad: 'contratos', nombre: 'contrato', articulo: 'el', obligatorios: ['contrato'],
    clave: [{ k: 'contrato', etiqueta: 'N.º de contrato', tipo: 't', ayuda: 'Ej.: 060-2024-ELSE' }],
    secciones: [{ titulo: 'Contrato', campos: [
      { k: 'proceso', etiqueta: 'Licitación de origen', tipo: 't' },
      { k: 'estado', etiqueta: 'Estado', tipo: 'o', opciones: [SIN_DEFINIR, { v: 'vigente', t: 'Vigente' }, { v: 'culminado', t: 'Culminado' }, { v: 'en_liquidacion', t: 'En liquidación' }] },
      { k: 'monto_contrato', etiqueta: 'Monto del contrato', tipo: 'm' },
      { k: 'monto_adjudicado', etiqueta: 'Monto adjudicado', tipo: 'm' },
      { k: 'pct_telcom', etiqueta: 'Nuestra participación (%)', tipo: 'p' },
      { k: 'fecha_inicio', etiqueta: 'Inicio', tipo: 'd' },
      { k: 'fecha_fin', etiqueta: 'Fin', tipo: 'd' },
      { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
    ] }],
  },
  facturas: {
    entidad: 'facturas', nombre: 'factura', articulo: 'la', obligatorios: ['contrato', 'numero', 'monto'],
    clave: [
      { k: 'contrato', etiqueta: 'Contrato', tipo: 't' },
      { k: 'numero', etiqueta: 'N.º de factura', tipo: 't', ayuda: 'Ej.: E001-80' },
    ],
    secciones: [{ titulo: 'Factura', campos: [
      { k: 'fecha', etiqueta: 'Fecha', tipo: 'd' },
      { k: 'monto', etiqueta: 'Monto', tipo: 'm' },
      { k: 'verificado', etiqueta: '¿Verificada?', tipo: 'o', opciones: [{ v: '', t: 'Pendiente' }, { v: 'si', t: 'Verificada' }, { v: 'no', t: 'No coincide' }] },
      { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
    ] }],
  },
  servicios: {
    entidad: 'servicios', nombre: 'servicio', articulo: 'el', autoId: true, obligatorios: ['nombre', 'estado'],
    clave: [],
    secciones: [
      { titulo: 'El servicio', campos: [
        { k: 'nombre', etiqueta: 'Nombre corto', tipo: 't', ancho: 'completo', ayuda: 'Cómo lo llaman en la oficina. Ej.: Reclamos Cusco' },
        { k: 'estado', etiqueta: 'Estado', tipo: 'o', opciones: ESTADOS_SERVICIO },
        { k: 'zona', etiqueta: 'Zona', tipo: 't', sugerencias: ['Cusco', 'Puerto Maldonado', 'Abancay', 'Puno', 'Tacna', 'Pucallpa'] },
        { k: 'entidad', etiqueta: 'Entidad', tipo: 't' },
        { k: 'proceso', etiqueta: 'Licitación de origen', tipo: 't' },
        { k: 'contrato', etiqueta: 'N.º de contrato', tipo: 't', ayuda: 'Si lo pones, se suma lo facturado de ese contrato' },
        { k: 'monto', etiqueta: 'Monto contratado', tipo: 'm' },
      ] },
      { titulo: 'Plazo', campos: [
        { k: 'fecha_inicio', etiqueta: 'Inicio', tipo: 'd' },
        { k: 'fecha_fin', etiqueta: 'Fin', tipo: 'd' },
        { k: 'proximo_hito', etiqueta: 'Próxima entrega o pendiente', tipo: 't', ayuda: 'Ej.: Informe mensual de octubre' },
        { k: 'fecha_hito', etiqueta: 'Fecha de esa entrega', tipo: 'd' },
      ] },
      { titulo: 'Equipo', campos: [
        { k: 'responsable', etiqueta: 'Responsable', tipo: 't' },
        { k: 'personal', etiqueta: 'Personal clave asignado', tipo: 'personas', ancho: 'completo' },
        { k: 'proyecto_id', etiqueta: 'Proyecto de Gestión (para ver la asistencia)', tipo: 'proyecto', ancho: 'completo', ayuda: 'El proyecto donde asignas a los trabajadores de este servicio' },
        { k: 'notas', etiqueta: 'Notas', tipo: 'l', ancho: 'completo' },
      ] },
    ],
  },
}

export const claveDe = (entidad: EntidadLic, fila: Record<string, unknown>): Record<string, string> => {
  const esq = ESQUEMAS[entidad]
  const campos = esq.autoId ? ['id'] : esq.clave.map((c) => c.k)
  const r: Record<string, string> = {}
  campos.forEach((c) => { r[c] = String(fila[c] ?? '') })
  return r
}

export const todosLosCampos = (entidad: EntidadLic): CampoLic[] =>
  ESQUEMAS[entidad].secciones.flatMap((s) => s.campos)

/** Valor tal como lo muestra/edita el formulario (texto). */
export function aTextoCampo(tipo: TipoCampo, v: unknown): string {
  if (v === null || v === undefined) return ''
  if (tipo === 'b') return v === true || String(v).toUpperCase() === 'TRUE' || v === 'si' ? 'si' : 'no'
  if (tipo === 'd') {
    const s = String(v)
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
    if (iso) return iso[1]
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    return dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : ''
  }
  if (tipo === 'personas') return JSON.stringify(Array.isArray(v) ? v : (() => { try { return JSON.parse(String(v)) } catch { return [] } })())
  return String(v)
}

/** Valida un valor del formulario; devuelve el mensaje de error o ''. */
export function validarCampo(c: CampoLic, texto: string): string {
  const v = texto.trim()
  if (!v) return ''
  if (c.tipo === 'n' || c.tipo === 'm' || c.tipo === 'p') {
    if (Number.isNaN(Number(v.replace(/[,\s]/g, '').replace(/^S\/\.?/i, '')))) return 'Escribe solo números (sin letras)'
    if (c.tipo === 'p' && (Number(v) < 0 || Number(v) > 200)) return 'Un porcentaje entre 0 y 200'
  }
  if (c.tipo === 'd' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Elige una fecha del calendario'
  if (c.k === 'dni' && !/^\d{8}$/.test(v)) return 'El DNI tiene 8 números'
  if ((c.k === 'ruc' || c.k === 'ganador_ruc') && !/^\d{11}$/.test(v)) return 'El RUC tiene 11 números'
  if (c.k === 'correo' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Correo no válido'
  return ''
}

/** Texto del formulario → valor que se envía al backend. */
export function aValorEnvio(tipo: TipoCampo, texto: string): unknown {
  const v = texto.trim()
  if (tipo === 'n' || tipo === 'm' || tipo === 'p') return v === '' ? '' : Number(v.replace(/[,\s]/g, '').replace(/^S\/\.?/i, ''))
  if (tipo === 'b') return v === 'si'
  if (tipo === 'personas') { try { return JSON.parse(v || '[]') } catch { return [] } }
  if (tipo === 'l') return texto
  return v
}
