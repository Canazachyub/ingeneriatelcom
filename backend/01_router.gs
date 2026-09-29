// ============================================================
// ROUTER — doGet/doPost y tabla de rutas
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
//
// Niveles de acceso:
//   'publico' — sin token (kiosko de asistencia, bolsa de trabajo, evaluaciones)
//   'auth'    — requiere token HMAC valido (cualquier usuario logueado)
//   'admin'   — token valido + rol administrador (ver esRolAdmin_ en 02_auth)
//
// Acciones eliminadas en Fase 1 (huerfanas/rotas — el frontend no las llama;
// las funciones internas siguen existiendo para uso desde el editor):
//   updateUser, deactivateUser (ROTAS: ReferenceError), getUsers, createUser,
//   resetPassword, changePassword, hireApplicant, getApplications (alias),
//   getApplication, getDashboardStats (alias), getEmployeeReport,
//   getEmployeesByProject, getEmployeesByCity, deactivateEmployee,
//   getActiveProjects, closeProject, getAssignmentsByEmployee, bulkAssign,
//   updateJobStatus.

// Helper: argumento que puede venir en el payload JSON o como query param
function arg_(ctx, name) {
  return ctx.data[name] !== undefined ? ctx.data[name] : ctx.param[name];
}

var ROUTES = {
  // === AUTENTICACION ===
  login: { nivel: 'publico', handler: function (ctx) { return login(ctx.data); } },
  verifyToken: { nivel: 'auth', handler: function (ctx) { return verifyTokenAction(ctx.token); } },

  // === BOLSA DE TRABAJO ===
  getJobs: { nivel: 'publico', handler: function () { return getActiveJobs(); } },
  getJob: { nivel: 'publico', handler: function (ctx) { return getJobById(arg_(ctx, 'id')); } },
  apply: { nivel: 'publico', handler: function (ctx) { return submitApplication(ctx.data); } },
  consultarPostulacion: { nivel: 'publico', handler: function (ctx) { return consultarPostulacion(arg_(ctx, 'dni')); } },
  historialPostulaciones: { nivel: 'publico', handler: function (ctx) { return historialPostulaciones(arg_(ctx, 'dni')); } },
  getJobsAdmin: { nivel: 'auth', handler: function () { return getAllJobs(); } },
  createJob: { nivel: 'auth', handler: function (ctx) { return createJob(ctx.data); } },
  updateJob: { nivel: 'auth', handler: function (ctx) { return updateJob(ctx.data); } },
  deleteJob: { nivel: 'admin', handler: function (ctx) { return deleteJob(ctx.data); } },
  uploadJobPdf: { nivel: 'auth', handler: function (ctx) { return uploadJobPdf(ctx.data); } },
  getApplicationsAdmin: { nivel: 'auth', handler: function (ctx) { return getApplications(arg_(ctx, 'jobId')); } },
  updateApplicationStatus: { nivel: 'auth', handler: function (ctx) { return updateApplicationStatus(ctx.data); } },

  // === CONTACTO ===
  contact: { nivel: 'publico', handler: function (ctx) { return submitContact(ctx.data); } },
  // Libro de Reclamaciones (14_reclamaciones.gs)
  registrarReclamo: { nivel: 'publico', handler: function (ctx) { return registrarReclamo(ctx.data); } },
  getReclamos: { nivel: 'auth', handler: function () { return getReclamos(); } },
  responderReclamo: { nivel: 'auth', handler: function (ctx) { return responderReclamo(ctx.data, ctx.userId); } },
  // Analítica web GA4 (15_analytics.gs)
  getAnalytics: { nivel: 'auth', handler: function (ctx) { return getAnalytics(ctx.data); } },
  getContacts: { nivel: 'auth', handler: function () { return getContacts(); } },
  updateContactStatus: { nivel: 'auth', handler: function (ctx) { return updateContactStatus(ctx.data); } },
  deleteContact: { nivel: 'admin', handler: function (ctx) { return deleteContact(ctx.data); } },

  // === EMPLEADOS (roster unico: hoja sueldos) ===
  getEmployees: { nivel: 'auth', handler: function (ctx) { return getEmployees(arg_(ctx, 'filters')); } },
  getEmployee: { nivel: 'auth', handler: function (ctx) { return getEmployeeById(arg_(ctx, 'id')); } },
  createEmployee: { nivel: 'auth', handler: function (ctx) { return createEmployee(ctx.data); } },
  updateEmployee: { nivel: 'auth', handler: function (ctx) { return updateEmployee(ctx.data); } },
  transferEmployee: { nivel: 'auth', handler: function (ctx) { return transferEmployee(ctx.data); } },
  // Ficha del trabajador (19_rrhh.gs)
  rrhhFicha: { nivel: 'auth', handler: function (ctx) { return rrhhFicha(ctx.data); } },
  rrhhResumen: { nivel: 'auth', handler: function () { return rrhhResumen(); } },
  rrhhSubirDocumento: { nivel: 'auth', handler: function (ctx) { return rrhhSubirDocumento(ctx.data, ctx.userId); } },
  rrhhArchivarDocumento: { nivel: 'auth', handler: function (ctx) { return rrhhArchivarDocumento(ctx.data, ctx.userId); } },
  rrhhSubirFoto: { nivel: 'auth', handler: function (ctx) { return rrhhSubirFoto(ctx.data, ctx.userId); } },
  rrhhCambiarCargo: { nivel: 'auth', handler: function (ctx) { return rrhhCambiarCargo(ctx.data, ctx.userId); } },
  rrhhCambiarSede: { nivel: 'auth', handler: function (ctx) { return rrhhCambiarSede(ctx.data, ctx.userId); } },
  rrhhCesar: { nivel: 'admin', handler: function (ctx) { return rrhhCesar(ctx.data, ctx.userId); } },
  rrhhReactivar: { nivel: 'admin', handler: function (ctx) { return rrhhReactivar(ctx.data, ctx.userId); } },
  createCredentials: { nivel: 'admin', handler: function (ctx) { return createCredentialsForEmployee(ctx.data); } },

  // === PROYECTOS Y ASIGNACIONES ===
  getProjects: { nivel: 'auth', handler: function () { return getProjects(); } },
  getProject: { nivel: 'auth', handler: function (ctx) { return getProjectById(arg_(ctx, 'id')); } },
  createProject: { nivel: 'auth', handler: function (ctx) { return createProject(ctx.data); } },
  updateProject: { nivel: 'auth', handler: function (ctx) { return updateProject(ctx.data); } },
  deleteProject: { nivel: 'admin', handler: function (ctx) { return deleteProject(ctx.data); } },
  getAssignments: { nivel: 'auth', handler: function (ctx) { return getAssignments(arg_(ctx, 'projectId')); } },
  assignEmployee: { nivel: 'auth', handler: function (ctx) { return assignEmployeeToProject(ctx.data); } },
  removeAssignment: { nivel: 'auth', handler: function (ctx) { return removeAssignment(ctx.data); } },

  // === ARCHIVOS ===
  upload: { nivel: 'auth', handler: function (ctx) { return uploadFile(ctx.data); } },
  getArchivo: { nivel: 'auth', handler: function (ctx) { return getArchivo(ctx.data); } },

  // === DASHBOARD ===
  getDashboard: { nivel: 'auth', handler: function () { return getDashboardStats(); } },

  // === ASISTENCIA V1 (legacy — kiosko antiguo aun definido en cliente) ===
  verificarEmpleado: { nivel: 'publico', handler: function (ctx) { return verificarEmpleado(arg_(ctx, 'dni')); } },
  marcarAsistencia: { nivel: 'publico', handler: function (ctx) { return marcarAsistencia(ctx.data); } },
  getAttendances: { nivel: 'auth', handler: function (ctx) { return getAttendances(arg_(ctx, 'fecha'), arg_(ctx, 'employeeId')); } },
  // Nota: obtenerAsistenciasHoy era PUBLICA y filtraba el roster con horarios;
  // el unico consumidor es el dashboard admin → ahora requiere token.
  obtenerAsistenciasHoy: { nivel: 'auth', handler: function () { return obtenerAsistenciasHoy(); } },

  // === ASISTENCIA V2 (kiosko con foto + GPS) ===
  getTrabajadores: { nivel: 'publico', handler: function (ctx) { return getTrabajadores(ctx.data); } },
  registrarAsistenciaFoto: { nivel: 'publico', handler: function (ctx) { return registrarAsistenciaFoto(ctx.data); } },
  subirJustificacion: { nivel: 'publico', handler: function (ctx) { return subirJustificacion(ctx.data); } },
  getAsistenciasV2: { nivel: 'auth', handler: function (ctx) { return getAsistenciasV2(ctx.data); } },
  getJustificaciones: { nivel: 'auth', handler: function (ctx) { return getJustificaciones(ctx.data); } },
  registrarAsistenciaManual: { nivel: 'auth', handler: function (ctx) { return registrarAsistenciaManual(ctx.data); } },
  anularMarcaManual: { nivel: 'auth', handler: function (ctx) { return anularMarcaManual(ctx.data, ctx.userId); } },

  // === PLANILLA (datos sensibles: sueldos → nivel admin) ===
  getConfigPlanilla: { nivel: 'admin', handler: function () { return getConfigPlanillaAction(); } },
  updateConfigPlanilla: { nivel: 'admin', handler: function (ctx) { return updateConfigPlanilla(ctx.data); } },
  getSueldos: { nivel: 'admin', handler: function () { return getSueldos(); } },
  updateSueldo: { nivel: 'admin', handler: function (ctx) { return updateSueldo(ctx.data); } },
  crearTrabajador: { nivel: 'admin', handler: function (ctx) { return crearTrabajador(ctx.data); } },
  darDeBajaTrabajador: { nivel: 'admin', handler: function (ctx) { return darDeBajaTrabajador(ctx.data); } },
  reactivarTrabajador: { nivel: 'admin', handler: function (ctx) { return reactivarTrabajador(ctx.data); } },
  getIncidencias: { nivel: 'admin', handler: function (ctx) { return getIncidencias(ctx.data); } },
  revisarIncidencia: { nivel: 'admin', handler: function (ctx) { return revisarIncidencia(ctx.data); } },
  sincronizarIncidencias: { nivel: 'admin', handler: function (ctx) { return sincronizarIncidencias(ctx.data); } },
  getEstadoPlanilla: { nivel: 'admin', handler: function () { return getEstadoPlanilla(); } },
  // Usuarios y auditoria (13_usuarios.gs)
  listarUsuarios: { nivel: 'admin', handler: function () { return listarUsuarios(); } },
  crearUsuario: { nivel: 'admin', handler: function (ctx) { return crearUsuario(ctx.data, ctx); } },
  actualizarUsuario: { nivel: 'admin', handler: function (ctx) { return actualizarUsuario(ctx.data, ctx); } },
  restablecerContrasena: { nivel: 'admin', handler: function (ctx) { return restablecerContrasena(ctx.data); } },
  getAuditoria: { nivel: 'admin', handler: function (ctx) { return getAuditoria(ctx.data); } },
  autorizarSalida5pm: { nivel: 'admin', handler: function (ctx) { return autorizarSalida5pm(ctx.data); } },
  getAutorizaciones5pm: { nivel: 'admin', handler: function (ctx) { return getAutorizaciones5pm(ctx.data); } },
  registrarMuestreo: { nivel: 'admin', handler: function (ctx) { return registrarMuestreo(ctx.data); } },
  getBolsaHoras: { nivel: 'admin', handler: function (ctx) { return getBolsaHoras(ctx.data); } },
  // Feriados: lectura para cualquier usuario logueado (informe de asistencias),
  // escritura solo admin (afecta planilla/descuentos)
  getFeriados: { nivel: 'auth', handler: function () { return getFeriados(); } },
  agregarFeriado: { nivel: 'admin', handler: function (ctx) { return agregarFeriado(ctx.data); } },
  eliminarFeriado: { nivel: 'admin', handler: function (ctx) { return eliminarFeriado(ctx.data); } },
  sembrarFeriadosPeru2026: { nivel: 'admin', handler: function () { return sembrarFeriadosPeru2026(); } },

  // === CAPACITACIONES Y EVALUACIONES ===
  getCapacitaciones: { nivel: 'publico', handler: function () { return getCapacitaciones(); } },
  getCapacitacionById: { nivel: 'publico', handler: function (ctx) { return getCapacitacionById(arg_(ctx, 'id')); } },
  iniciarEvaluacion: { nivel: 'publico', handler: function (ctx) { return iniciarEvaluacion(ctx.data); } },
  submitEvaluacion: { nivel: 'publico', handler: function (ctx) { return submitEvaluacion(ctx.data); } },
  guardarFotoWebcam: { nivel: 'publico', handler: function (ctx) { return guardarFotoWebcam(ctx.data); } },
  registrarEventoLog: { nivel: 'publico', handler: function (ctx) { return registrarEventoLog(ctx.data); } },
  crearCapacitacion: { nivel: 'auth', handler: function (ctx) { return crearCapacitacion(ctx.data); } },
  actualizarCapacitacion: { nivel: 'auth', handler: function (ctx) { return actualizarCapacitacion(ctx.data); } },
  eliminarCapacitacion: { nivel: 'admin', handler: function (ctx) { return eliminarCapacitacion(ctx.data); } },
  getPreguntas: { nivel: 'auth', handler: function (ctx) { return getPreguntas(ctx.data); } },
  crearPregunta: { nivel: 'auth', handler: function (ctx) { return crearPregunta(ctx.data); } },
  actualizarPregunta: { nivel: 'auth', handler: function (ctx) { return actualizarPregunta(ctx.data); } },
  eliminarPregunta: { nivel: 'auth', handler: function (ctx) { return eliminarPregunta(ctx.data); } },
  getEvaluaciones: { nivel: 'auth', handler: function (ctx) { return getEvaluaciones(ctx.data); } },
  revisarEvaluacion: { nivel: 'auth', handler: function (ctx) { return revisarEvaluacion(ctx.data); } },
  // Capacitaciones a prueba de errores: archivar en vez de borrar, reabrir intento
  getCapacitacionesAdmin: { nivel: 'auth', handler: function (ctx) { return getCapacitacionesAdmin(ctx.data); } },
  archivarCapacitacion: { nivel: 'auth', handler: function (ctx) { return archivarCapacitacion(ctx.data); } },
  archivarPregunta: { nivel: 'auth', handler: function (ctx) { return archivarPregunta(ctx.data); } },
  anularEvaluacion: { nivel: 'auth', handler: function (ctx) { return anularEvaluacion(ctx.data); } },

  // === LICITACIONES (16_licitaciones.gs) — hoy solo admin (ver docs/PLAN_LICITACIONES_ADMIN.md) ===
  licImportar: { nivel: 'admin', handler: function (ctx) { return licImportar(ctx.data); } },
  licResumen: { nivel: 'admin', handler: function () { return licResumen(); } },
  licProcesos: { nivel: 'admin', handler: function (ctx) { return licProcesos(ctx.data); } },
  licProceso: { nivel: 'admin', handler: function (ctx) { return licProceso(arg_(ctx, 'nom')); } },
  licCompetidores: { nivel: 'admin', handler: function (ctx) { return licCompetidores(ctx.data); } },
  licExperiencia: { nivel: 'admin', handler: function (ctx) { return licExperiencia(ctx.data); } },
  licDocumentos: { nivel: 'admin', handler: function (ctx) { return licDocumentos(ctx.data); } },
  licActualizarDocumento: { nivel: 'admin', handler: function (ctx) { return licActualizarDocumento(ctx.data, ctx.userId); } },
  licCrearDocumento: { nivel: 'admin', handler: function (ctx) { return licCrearDocumento(ctx.data, ctx.userId); } },
  licActualizarProceso: { nivel: 'admin', handler: function (ctx) { return licActualizarProceso(ctx.data, ctx.userId); } },
  licExportarCambios: { nivel: 'admin', handler: function (ctx) { return licExportarCambios(ctx.data); } },
  licPersonal: { nivel: 'admin', handler: function (ctx) { return licPersonal(ctx.data); } },
  licContratos: { nivel: 'admin', handler: function (ctx) { return licContratos(ctx.data); } },
  licActualizarPersona: { nivel: 'admin', handler: function (ctx) { return licActualizarPersona(ctx.data, ctx.userId); } },
  licActualizarContrato: { nivel: 'admin', handler: function (ctx) { return licActualizarContrato(ctx.data, ctx.userId); } },
  licActualizarFactura: { nivel: 'admin', handler: function (ctx) { return licActualizarFactura(ctx.data, ctx.userId); } },
  licPropuestas: { nivel: 'admin', handler: function () { return licPropuestas(); } },
  licCarpetaDrive: { nivel: 'admin', handler: function () { return licCarpetaDrive(); } },
  licIndexarDrive: { nivel: 'admin', handler: function () { return licIndexarDrive(); } },
  licArchivosDrive: { nivel: 'admin', handler: function () { return licArchivosDrive(); } },
  licSubirFoto: { nivel: 'admin', handler: function (ctx) { return licSubirFoto(ctx.data); } },
  licSubirDocumento: { nivel: 'admin', handler: function (ctx) { return licSubirDocumento(ctx.data); } },
  // Edición genérica de fichas (17_lic_edicion.gs)
  licGuardar: { nivel: 'admin', handler: function (ctx) { return licGuardar(ctx.data, ctx.userId); } },
  licArchivar: { nivel: 'admin', handler: function (ctx) { return licArchivar(ctx.data, ctx.userId); } },
  licHistorial: { nivel: 'admin', handler: function (ctx) { return licHistorial(ctx.data); } },
  licDeshacer: { nivel: 'admin', handler: function (ctx) { return licDeshacer(ctx.data, ctx.userId); } },
  licServicios: { nivel: 'admin', handler: function (ctx) { return licServicios(ctx.data); } },
  // Servicio ↔ proyecto y armar propuesta (18_lic_propuesta.gs)
  licAsistenciaServicio: { nivel: 'admin', handler: function (ctx) { return licAsistenciaServicio(ctx.data); } },
  licArmarZip: { nivel: 'admin', handler: function (ctx) { return licArmarZip(ctx.data); } }
};

// Modulo del panel que exige cada accion de nivel 'auth' (escalon 2).
// Rol de administracion o permiso 'all' = todos los modulos (como antes).
// Otros usuarios necesitan el permiso del modulo (columna `permisos`).
// Una lista = basta con cualquiera de esos permisos. Sin entrada = cualquier
// sesion valida (verifyToken, getDashboard con conteos, getFeriados).
var MODULO_POR_ACCION_ = {
  getJobsAdmin: 'bolsa', createJob: 'bolsa', updateJob: 'bolsa', uploadJobPdf: 'bolsa',
  getApplicationsAdmin: 'bolsa', updateApplicationStatus: 'bolsa', upload: 'bolsa',
  getContacts: 'mensajes', updateContactStatus: 'mensajes',
  getReclamos: 'mensajes', responderReclamo: 'mensajes',
  getAnalytics: 'reportes',
  getEmployees: 'personal', getEmployee: 'personal', createEmployee: 'personal',
  updateEmployee: 'personal', transferEmployee: 'personal',
  rrhhFicha: 'personal', rrhhResumen: 'personal', rrhhSubirDocumento: 'personal', rrhhArchivarDocumento: 'personal',
  rrhhSubirFoto: 'personal', rrhhCambiarCargo: 'personal', rrhhCambiarSede: 'personal',
  getProjects: 'proyectos', getProject: 'proyectos', createProject: 'proyectos', updateProject: 'proyectos', deleteProject: 'proyectos',
  getAssignments: 'proyectos', assignEmployee: 'proyectos', removeAssignment: 'proyectos',
  getAttendances: 'asistencias', obtenerAsistenciasHoy: 'asistencias', getAsistenciasV2: ['asistencias', 'reportes'],
  getJustificaciones: 'asistencias', registrarAsistenciaManual: 'asistencias', anularMarcaManual: 'asistencias',
  getArchivo: ['asistencias', 'bolsa', 'capacitaciones'],
  crearCapacitacion: 'capacitaciones', actualizarCapacitacion: 'capacitaciones',
  getPreguntas: 'capacitaciones', crearPregunta: 'capacitaciones', actualizarPregunta: 'capacitaciones',
  eliminarPregunta: 'capacitaciones', getEvaluaciones: 'capacitaciones', revisarEvaluacion: 'capacitaciones',
  getCapacitacionesAdmin: 'capacitaciones', archivarCapacitacion: 'capacitaciones', archivarPregunta: 'capacitaciones',
  anularEvaluacion: 'capacitaciones'
};

function handleRequest_(e) {
  const param = (e && e.parameter) || {};
  const action = param.action || '';

  // Payload: body JSON (POST) o query param 'payload' (GET, evita preflight CORS)
  let data = {};
  if (e && e.postData && e.postData.contents) {
    try { data = JSON.parse(e.postData.contents) || {}; } catch (err) { data = {}; }
  } else if (param.payload) {
    try { data = JSON.parse(param.payload) || {}; } catch (err) { data = {}; }
  }

  const route = ROUTES[action];
  if (!route) {
    return jsonResponse({ success: false, error: 'Accion no valida: ' + action });
  }

  const token = data.token || param.token;
  let userId = null;
  if (route.nivel !== 'publico') {
    // Si no se puede leer el secreto (Google sobrecargado), NO responder
    // "No autorizado": el cliente lo tomaria como sesion invalida.
    try {
      getTokenSecret_();
    } catch (errSecreto) {
      return jsonResponse({ success: false, error: 'Servidor ocupado, intenta de nuevo en unos segundos' });
    }
    try {
      userId = parseToken_(token);
    } catch (errToken) {
      // Fallo de Google al validar, no un token malo: el cliente reintenta
      return jsonResponse({ success: false, error: 'Servidor ocupado, intenta de nuevo en unos segundos' });
    }
    if (!userId) {
      return jsonResponse({ success: false, error: 'No autorizado' });
    }
    // Perfil (rol, permisos, activo). Un fallo al leerlo es transitorio, no
    // un rechazo: el cliente reintenta en vez de cerrar la sesion.
    var perfil;
    try {
      perfil = perfilUsuario_(userId);
    } catch (errPerfil) {
      return jsonResponse({ success: false, error: 'Servidor ocupado, intenta de nuevo en unos segundos' });
    }
    // Cuenta desactivada: antes su token seguia sirviendo hasta expirar.
    if (!perfil || !perfil.activo) {
      return jsonResponse({ success: false, error: 'No autorizado' });
    }
    if (route.nivel === 'admin' && !perfil.esAdmin) {
      return jsonResponse({ success: false, error: 'Permisos insuficientes para esta accion' });
    }
    var moduloRequerido = MODULO_POR_ACCION_[action];
    if (route.nivel === 'auth' && moduloRequerido && !puedeModulo_(perfil, moduloRequerido)) {
      return jsonResponse({ success: false, error: 'Permisos insuficientes para esta accion (modulo ' + [].concat(moduloRequerido).join(' / ') + ')' });
    }
  }

  const ctx = { data: data, param: param, token: token, userId: userId };
  try {
    var resultado = LECTURAS_CACHEABLES_.indexOf(action) >= 0
      ? leerConCache_(action, function () { return route.handler(ctx); })
      : route.handler(ctx);
    if (!esAccionDeLectura_(action)) {
      // Cualquier escritura exitosa invalida las lecturas cacheadas
      if (resultado && resultado.success) invalidarLecturas_();
      // Auditoria de escrituras del panel (no de acciones publicas)
      if (route.nivel !== 'publico') registrarAuditoria_(ctx, action, resultado);
    }
    return jsonResponse(resultado);
  } catch (error) {
    console.error('Error en accion ' + action + ':', error);
    // Un fallo transitorio de Google dentro de la accion (p. ej. al re-validar
    // el token en verifyToken) no debe llegar al cliente como un error que
    // parezca rechazo de sesion: el panel lo trata como "ocupado" y reintenta.
    if (String(error && error.message).indexOf('TOKEN_TRANSITORIO') !== -1) {
      return jsonResponse({ success: false, error: 'Servidor ocupado, intenta de nuevo en unos segundos' });
    }
    // Al usuario, un mensaje en palabras simples; el detalle técnico queda en
    // los registros de ejecución con un código para ubicarlo.
    var codigo = 'ERR-' + Date.now().toString(36).toUpperCase();
    console.error(codigo + ' en ' + action + ': ' + (error && error.stack || error));
    return jsonResponse({ success: false, error: 'No se pudo completar la acción. Intenta de nuevo; si se repite, avisa al administrador (código ' + codigo + ').' });
  }
}

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}
