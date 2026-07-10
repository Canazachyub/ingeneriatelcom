// Split determinístico de appscript.js (monolito) → backend/*.gs (módulos por dominio).
// Se usa UNA sola vez para la migración de Fase 1; luego la fuente de verdad es backend/
// y appscript.js se regenera con tools/build-backend.mjs.
//
// Garantías:
//  - Cada declaración top-level (function/const/var/let) se asigna explícitamente a un módulo.
//  - Si aparece una declaración no mapeada, el script FALLA (nada se pierde en silencio).
//  - Los comentarios que preceden a una declaración viajan con ella.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'appscript.js'), 'utf8')
const lines = source.split(/\r?\n/)

// ---------------------------------------------------------------------------
// Mapeo declaración → módulo
// ---------------------------------------------------------------------------
const MAP = {
  // 00 — Núcleo: config, helpers compartidos, IO
  SHEET_ID: '00_nucleo', DRIVE_FOLDER_ID: '00_nucleo', NOTIFICATION_EMAIL: '00_nucleo',
  getTokenSecret_: '00_nucleo', getOrCreateFolder: '00_nucleo', generateTempPassword: '00_nucleo',
  rowToObject: '00_nucleo', generateSequentialId: '00_nucleo', jsonResponse: '00_nucleo',
  uploadFile: '00_nucleo', uploadFileFromBase64: '00_nucleo',
  seededRandom: '00_nucleo', normalizar: '00_nucleo', matchFlexible: '00_nucleo', shuffleArray: '00_nucleo',
  preAutorizarDrive: '00_nucleo', preAutorizarMail: '00_nucleo',

  // 01 — Router (doGet/doPost se reescriben después con ROUTES)
  doGet: '01_router', doPost: '01_router',

  // 02 — Auth y usuarios
  verifyTokenAction: '02_auth', login: '02_auth', generateToken: '02_auth',
  parseToken_: '02_auth', validateToken: '02_auth', createUser: '02_auth',
  changePassword: '02_auth', resetPassword: '02_auth', getUsers: '02_auth',
  createDefaultAdmin: '02_auth', createCredentialsForEmployee: '02_auth',
  deactivateUserByEmployee: '02_auth', sendCredentialsEmail: '02_auth',

  // 03 — Empleados / roster
  leerRosterReal_: '03_empleados', getEmployees: '03_empleados', getEmployeeById: '03_empleados',
  getEmployeesByProject: '03_empleados', getEmployeesByCity: '03_empleados',
  createEmployee: '03_empleados', updateEmployee: '03_empleados', transferEmployee: '03_empleados',
  deactivateEmployee: '03_empleados', getEmployeeHistory: '03_empleados', addHistoryRecord: '03_empleados',
  sendTransferNotification: '03_empleados',

  // 04 — Proyectos y asignaciones
  getProjects: '04_proyectos', getActiveProjects: '04_proyectos', getProjectById: '04_proyectos',
  createProject: '04_proyectos', updateProject: '04_proyectos', closeProject: '04_proyectos',
  countProjectEmployees: '04_proyectos', getAssignments: '04_proyectos',
  getAssignmentsByEmployee: '04_proyectos', assignEmployeeToProject: '04_proyectos',
  removeAssignment: '04_proyectos', bulkAssignEmployees: '04_proyectos',
  closeProjectAssignments: '04_proyectos', closeEmployeeAssignments: '04_proyectos',
  getProjectCity: '04_proyectos',

  // 05 — Bolsa de trabajo, postulaciones y contacto
  getAllJobs: '05_bolsa', uploadJobPdf: '05_bolsa', getActiveJobs: '05_bolsa', getJobById: '05_bolsa',
  createJob: '05_bolsa', updateJob: '05_bolsa', updateJobStatus: '05_bolsa', deleteJob: '05_bolsa',
  submitApplication: '05_bolsa', getApplications: '05_bolsa', getApplicationById: '05_bolsa',
  updateApplicationStatus: '05_bolsa', hireApplicant: '05_bolsa', incrementApplicationCount: '05_bolsa',
  consultarPostulacion: '05_bolsa', generarCronograma: '05_bolsa',
  maskEmail_: '05_bolsa', maskPhone_: '05_bolsa', historialPostulaciones: '05_bolsa',
  sendApplicationNotification: '05_bolsa', sendStatusUpdateEmail: '05_bolsa', sendHireNotification: '05_bolsa',
  submitContact: '05_bolsa', getContacts: '05_bolsa', updateContactStatus: '05_bolsa',
  deleteContact: '05_bolsa', sendContactNotification: '05_bolsa',

  // 06 — Capacitaciones y evaluaciones
  getCapacitaciones: '06_capacitaciones', getCapacitacionById: '06_capacitaciones',
  crearCapacitacion: '06_capacitaciones', actualizarCapacitacion: '06_capacitaciones',
  eliminarCapacitacion: '06_capacitaciones', getPreguntas: '06_capacitaciones',
  crearPregunta: '06_capacitaciones', actualizarPregunta: '06_capacitaciones',
  eliminarPregunta: '06_capacitaciones', iniciarEvaluacion: '06_capacitaciones',
  submitEvaluacion: '06_capacitaciones', getEvaluaciones: '06_capacitaciones',
  revisarEvaluacion: '06_capacitaciones', guardarFotoWebcam: '06_capacitaciones',
  registrarEventoLog: '06_capacitaciones',

  // 07 — Asistencia (V1 legacy + V2)
  verificarEmpleado: '07_asistencia', obtenerAsistenciaEmpleadoHoy: '07_asistencia',
  marcarAsistencia: '07_asistencia', calcularHorasTrabajadas: '07_asistencia',
  obtenerAsistenciasHoy: '07_asistencia', getAttendances: '07_asistencia',
  EVENTOS_ASISTENCIA_V2: '07_asistencia', EVENTOS_CAMPO: '07_asistencia',
  HEADERS_ASISTENCIAS_V2: '07_asistencia', HEADERS_JUSTIFICACIONES: '07_asistencia',
  setupAsistenciaSheets: '07_asistencia', getOrCreateAsistenciaSheet_: '07_asistencia',
  registrarAsistenciaFoto: '07_asistencia', subirJustificacion: '07_asistencia',
  filtrarPorRango_: '07_asistencia', getAsistenciasV2: '07_asistencia', getJustificaciones: '07_asistencia',

  // 08 — Planilla
  CONFIG_PLANILLA_DEFAULT: '08_planilla', HEADERS_INCIDENCIAS: '08_planilla',
  HEADERS_PLANILLA_LOG: '08_planilla', HEADERS_SUELDOS: '08_planilla',
  HEADERS_AUTORIZACIONES: '08_planilla', HEADERS_BOLSA: '08_planilla', SUELDOS_INICIALES: '08_planilla',
  setupPlanillaSheets: '08_planilla', leerConfigPlanilla_: '08_planilla',
  getConfigPlanillaAction: '08_planilla', updateConfigPlanilla: '08_planilla',
  getSueldos: '08_planilla', getTrabajadores: '08_planilla', updateSueldo: '08_planilla',
  crearTrabajador: '08_planilla', autorizarSalida5pm: '08_planilla', getAutorizaciones5pm: '08_planilla',
  registrarMuestreo: '08_planilla', getBolsaHoras: '08_planilla', getIncidencias: '08_planilla',
  revisarIncidencia: '08_planilla', registrarLogPlanilla_: '08_planilla',
  horaAMinutosPlanilla_: '08_planilla', sincronizarIncidencias: '08_planilla',

  // 09 — Reportes / dashboard
  getDashboardStats: '09_reportes', getEmployeeReport: '09_reportes',

  // 10 — Herramientas admin (setup + DESTRUCTIVAS: quedarán tras flag)
  setupAllSheets: '10_admin_tools', fillTestData: '10_admin_tools',
  configurarHojaAsistencias: '10_admin_tools', cargarTodosLosDatosPrueba: '10_admin_tools',
  recrearHoja: '10_admin_tools', cargarEmpleadosPrueba: '10_admin_tools',
  cargarProyectosPrueba: '10_admin_tools', cargarAsignacionesPrueba: '10_admin_tools',
  cargarConvocatoriasPrueba: '10_admin_tools', cargarPostulacionesPrueba: '10_admin_tools',
  cargarAsistenciasPrueba: '10_admin_tools', cargarContactosPrueba: '10_admin_tools',
  cargarUsuariosPrueba: '10_admin_tools', formatearCabecera: '10_admin_tools',
  cargarHistorialEmpleadosPrueba: '10_admin_tools', limpiarDatosPrueba: '10_admin_tools',
  migrarPlanillaV2: '10_admin_tools', actualizarTrabajadoresV3: '10_admin_tools',
}

const MODULE_TITLES = {
  '00_nucleo': 'NUCLEO — configuracion y helpers compartidos',
  '01_router': 'ROUTER — doGet/doPost y tabla de rutas',
  '02_auth': 'AUTH — login, tokens HMAC y usuarios',
  '03_empleados': 'EMPLEADOS — roster (hoja sueldos) e historial',
  '04_proyectos': 'PROYECTOS — proyectos y asignaciones',
  '05_bolsa': 'BOLSA DE TRABAJO — convocatorias, postulaciones y contacto',
  '06_capacitaciones': 'CAPACITACIONES — cursos, banco de preguntas y evaluaciones',
  '07_asistencia': 'ASISTENCIA — kiosko V2 (foto+GPS) y legado V1',
  '08_planilla': 'PLANILLA — sueldos, incidencias, bolsa de horas',
  '09_reportes': 'REPORTES — dashboard y reportes agregados',
  '10_admin_tools': 'ADMIN TOOLS — setup y funciones DESTRUCTIVAS (tras flag)',
}

// ---------------------------------------------------------------------------
// Detectar bloques top-level
// ---------------------------------------------------------------------------
const declRe = /^(?:function\s+([A-Za-z0-9_$]+)|(?:const|var|let)\s+([A-Za-z0-9_$]+))/
const anchors = []
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(declRe)
  if (m) anchors.push({ line: i, name: m[1] || m[2] })
}

// Adjuntar comentarios/blancos precedentes a cada bloque
function blockStart(anchorLine, prevBlockEnd) {
  let s = anchorLine
  while (s - 1 > prevBlockEnd && (/^\s*\/\//.test(lines[s - 1]) || /^\s*$/.test(lines[s - 1]) || /^\s*\/?\*/.test(lines[s - 1]))) {
    s--
  }
  return s
}

const blocks = []
let prevEnd = -1
for (let i = 0; i < anchors.length; i++) {
  const nextAnchorLine = i + 1 < anchors.length ? anchors[i + 1].line : lines.length
  // fin del bloque = inicio (con comentarios) del siguiente - 1
  const nextStart = i + 1 < anchors.length ? blockStart(anchors[i + 1].line, anchors[i].line) : lines.length
  const start = i === 0 ? 0 : blockStart(anchors[i].line, prevEnd)
  blocks.push({ name: anchors[i].name, start, end: nextStart - 1 })
  prevEnd = nextStart - 1
  void nextAnchorLine
}

// Validación: todo mapeado, nada duplicado, cobertura completa de líneas
const unmapped = blocks.filter(b => !MAP[b.name])
if (unmapped.length) {
  console.error('DECLARACIONES SIN MAPEAR:', unmapped.map(b => `${b.name}@${b.start + 1}`).join(', '))
  process.exit(1)
}
let covered = 0
blocks.forEach(b => { covered += b.end - b.start + 1 })
if (covered !== lines.length) {
  console.error(`Cobertura incompleta: ${covered}/${lines.length} lineas`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Emitir módulos
// ---------------------------------------------------------------------------
const byModule = new Map()
for (const b of blocks) {
  const mod = MAP[b.name]
  if (!byModule.has(mod)) byModule.set(mod, [])
  byModule.get(mod).push(lines.slice(b.start, b.end + 1).join('\n'))
}

mkdirSync(join(root, 'backend'), { recursive: true })
for (const [mod, chunks] of [...byModule.entries()].sort()) {
  const header = [
    '// ============================================================',
    `// ${MODULE_TITLES[mod] || mod}`,
    '// Fuente modular del backend GAS. NO editar appscript.js a mano:',
    '// se regenera con `npm run build:backend`.',
    '// ============================================================',
    '',
  ].join('\n')
  writeFileSync(join(root, 'backend', `${mod}.gs`), header + chunks.join('\n').trimStart() + '\n', 'utf8')
  console.log(`backend/${mod}.gs  (${chunks.length} bloques)`)
}
console.log(`OK: ${blocks.length} bloques, ${covered} lineas cubiertas.`)
