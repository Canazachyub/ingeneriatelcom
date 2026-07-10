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
  getContacts: { nivel: 'auth', handler: function () { return getContacts(); } },
  updateContactStatus: { nivel: 'auth', handler: function (ctx) { return updateContactStatus(ctx.data); } },
  deleteContact: { nivel: 'admin', handler: function (ctx) { return deleteContact(ctx.data); } },

  // === EMPLEADOS (roster unico: hoja sueldos) ===
  getEmployees: { nivel: 'auth', handler: function (ctx) { return getEmployees(arg_(ctx, 'filters')); } },
  getEmployee: { nivel: 'auth', handler: function (ctx) { return getEmployeeById(arg_(ctx, 'id')); } },
  createEmployee: { nivel: 'auth', handler: function (ctx) { return createEmployee(ctx.data); } },
  updateEmployee: { nivel: 'auth', handler: function (ctx) { return updateEmployee(ctx.data); } },
  transferEmployee: { nivel: 'auth', handler: function (ctx) { return transferEmployee(ctx.data); } },
  createCredentials: { nivel: 'admin', handler: function (ctx) { return createCredentialsForEmployee(ctx.data); } },

  // === PROYECTOS Y ASIGNACIONES ===
  getProjects: { nivel: 'auth', handler: function () { return getProjects(); } },
  getProject: { nivel: 'auth', handler: function (ctx) { return getProjectById(arg_(ctx, 'id')); } },
  createProject: { nivel: 'auth', handler: function (ctx) { return createProject(ctx.data); } },
  updateProject: { nivel: 'auth', handler: function (ctx) { return updateProject(ctx.data); } },
  getAssignments: { nivel: 'auth', handler: function (ctx) { return getAssignments(arg_(ctx, 'projectId')); } },
  assignEmployee: { nivel: 'auth', handler: function (ctx) { return assignEmployeeToProject(ctx.data); } },
  removeAssignment: { nivel: 'auth', handler: function (ctx) { return removeAssignment(ctx.data); } },

  // === ARCHIVOS ===
  upload: { nivel: 'auth', handler: function (ctx) { return uploadFile(ctx.data); } },

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
  getTrabajadores: { nivel: 'publico', handler: function () { return getTrabajadores(); } },
  registrarAsistenciaFoto: { nivel: 'publico', handler: function (ctx) { return registrarAsistenciaFoto(ctx.data); } },
  subirJustificacion: { nivel: 'publico', handler: function (ctx) { return subirJustificacion(ctx.data); } },
  getAsistenciasV2: { nivel: 'auth', handler: function (ctx) { return getAsistenciasV2(ctx.data); } },
  getJustificaciones: { nivel: 'auth', handler: function (ctx) { return getJustificaciones(ctx.data); } },

  // === PLANILLA (datos sensibles: sueldos → nivel admin) ===
  getConfigPlanilla: { nivel: 'admin', handler: function () { return getConfigPlanillaAction(); } },
  updateConfigPlanilla: { nivel: 'admin', handler: function (ctx) { return updateConfigPlanilla(ctx.data); } },
  getSueldos: { nivel: 'admin', handler: function () { return getSueldos(); } },
  updateSueldo: { nivel: 'admin', handler: function (ctx) { return updateSueldo(ctx.data); } },
  crearTrabajador: { nivel: 'admin', handler: function (ctx) { return crearTrabajador(ctx.data); } },
  getIncidencias: { nivel: 'admin', handler: function (ctx) { return getIncidencias(ctx.data); } },
  revisarIncidencia: { nivel: 'admin', handler: function (ctx) { return revisarIncidencia(ctx.data); } },
  sincronizarIncidencias: { nivel: 'admin', handler: function (ctx) { return sincronizarIncidencias(ctx.data); } },
  autorizarSalida5pm: { nivel: 'admin', handler: function (ctx) { return autorizarSalida5pm(ctx.data); } },
  getAutorizaciones5pm: { nivel: 'admin', handler: function (ctx) { return getAutorizaciones5pm(ctx.data); } },
  registrarMuestreo: { nivel: 'admin', handler: function (ctx) { return registrarMuestreo(ctx.data); } },
  getBolsaHoras: { nivel: 'admin', handler: function (ctx) { return getBolsaHoras(ctx.data); } },

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
  revisarEvaluacion: { nivel: 'auth', handler: function (ctx) { return revisarEvaluacion(ctx.data); } }
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
    userId = parseToken_(token);
    if (!userId) {
      return jsonResponse({ success: false, error: 'No autorizado' });
    }
    if (route.nivel === 'admin' && !esRolAdmin_(userId)) {
      return jsonResponse({ success: false, error: 'Permisos insuficientes para esta accion' });
    }
  }

  const ctx = { data: data, param: param, token: token, userId: userId };
  try {
    return jsonResponse(route.handler(ctx));
  } catch (error) {
    console.error('Error en accion ' + action + ':', error);
    return jsonResponse({ success: false, error: error.message });
  }
}

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}
