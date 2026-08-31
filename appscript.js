// ============================================================
// SISTEMA DE GESTION TELCOM - APPS SCRIPT (ARCHIVO GENERADO)
// ============================================================
// NO EDITAR A MANO. La fuente es backend/*.gs en el repo.
// Generado: 2026-08-31T07:22:22.437Z con tools/build-backend.mjs
// Deploy: pegar este archivo completo en el editor de Apps Script
// y crear Nueva version. Requiere Script Property TOKEN_SECRET.
// ============================================================
// ============================================================
// NUCLEO — configuracion y helpers compartidos
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// SISTEMA DE GESTION TELCOM - APPS SCRIPT
// ============================================
// Autor: Ingenieria Telcom EIRL
// Version: 2.0
// ============================================

// CONFIGURACION
const SHEET_ID = '15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA';
const DRIVE_FOLDER_ID = '1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV';
const NOTIFICATION_EMAIL = 'energysupervision13@gmail.com';

// SEGURIDAD: el secreto que firma los tokens vive en Script Properties, NUNCA en el codigo
// (este archivo esta en un repo publico de GitHub). Configurar en el editor de Apps Script:
// Configuracion del proyecto > Propiedades del script > TOKEN_SECRET = <valor largo aleatorio>
// Rotar el valor invalida todos los tokens emitidos (fuerza re-login de admins).
function getTokenSecret_() {
  const secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
  if (!secret) {
    throw new Error('TOKEN_SECRET no configurado en Propiedades del Script');
  }
  return secret;
}

// Get or create a subfolder by name inside a parent folder
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

// Variante con cache de IDs de carpeta (CacheService, 6h). En horas punta
// (07:30, 14:00) cada getFoldersByName/createFolder es una llamada a la API
// de Drive y Google aplica rate limit por rafaga ("Service invoked too many
// times") — con los IDs cacheados una subida pasa de ~6 llamadas a ~2.
// getId() sobre un objeto ya obtenido es local (no llama a la API).
function getOrCreateFolderCached_(parentFolder, folderName) {
  const cacheKey = 'fld:' + parentFolder.getId() + '/' + folderName;
  try {
    const cachedId = CacheService.getScriptCache().get(cacheKey);
    if (cachedId) return DriveApp.getFolderById(cachedId);
  } catch (e) { /* cache caido o carpeta borrada: seguir por la via normal */ }
  const folder = getOrCreateFolder(parentFolder, folderName);
  try {
    CacheService.getScriptCache().put(cacheKey, folder.getId(), 21600);
  } catch (e) { /* no critico */ }
  return folder;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================
// ARCHIVOS
// ============================================
function uploadFile(data) {
  return uploadFileFromBase64(data.fileContent, data.mimeType, data.fileName);
}

// Funcion auxiliar para subir archivos desde base64
function uploadFileFromBase64(base64Content, mimeType, fileName) {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const now = new Date();
    const yearMonth = Utilities.formatDate(now, 'America/Lima', 'yyyy-MM');

    // Crear subcarpeta por mes si no existe
    let subFolder;
    const subFolders = folder.getFoldersByName(yearMonth);
    if (subFolders.hasNext()) {
      subFolder = subFolders.next();
    } else {
      subFolder = folder.createFolder(yearMonth);
    }

    // Crear blob desde base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Content),
      mimeType || 'application/pdf',
      fileName || 'archivo_' + new Date().getTime()
    );

    // Crear archivo en Drive
    const file = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      data: {
        fileUrl: file.getUrl(),
        fileId: file.getId(),
        fileName: file.getName()
      }
    };
  } catch (e) {
    console.error('Error en uploadFileFromBase64:', e);
    return {
      success: false,
      error: e.message || 'Error al subir archivo'
    };
  }
}

// ============================================
// UTILIDADES
// ============================================

// Normaliza un valor de celda: los Date de Sheets se serializan como ISO con
// offset America/Lima (-05:00) para que el frontend muestre la hora correcta.
// (Antes cada lector normalizaba por su cuenta — o no lo hacia: bug -12:20.)
function normalizeCellValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'America/Lima', "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return value;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = normalizeCellValue_(row[index]);
  });
  return obj;
}

// Normaliza una celda de fecha a 'yyyy-MM-dd' (Sheets devuelve Date en las
// columnas con formato fecha y string en las de texto). Devuelve '' si esta
// vacia. Las comparaciones de calendario del sistema son lexicograficas sobre
// este formato, asi que todo lector debe pasar por aqui.
function fechaISO_(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'America/Lima', 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

// Fecha de hoy en America/Lima ('yyyy-MM-dd').
function hoyISO_() {
  return Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
}

// Lee la cabecera mas el TRAMO FINAL de una hoja (las ultimas maxFilas de
// datos), en vez de la hoja completa.
//
// Las hojas de bitacora (asistencias_v2, incidencias) se escriben siempre con
// appendRow, asi que lo reciente esta al final. Consultar "lo de hoy" con
// getDataRange() hacia que el coste de CADA marca creciera con el historico
// —y ese barrido ocurria dentro del lock global, con doce personas haciendo
// cola a las 07:30. Ver PLAN.md R1.
//
// Devuelve { headers, rows, completa }. 'completa' indica que el tramo abarca
// TODAS las filas de datos, es decir que no hay nada mas atras que mirar.
function leerTramoFinal_(sheet, maxFilas) {
  var ultimaFila = sheet.getLastRow();
  var ultimaCol = sheet.getLastColumn();
  if (ultimaFila < 1 || ultimaCol < 1) {
    return { headers: [], rows: [], completa: true };
  }
  var headers = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0];
  var totalDatos = ultimaFila - 1; // sin contar la cabecera
  if (totalDatos <= 0) return { headers: headers, rows: [], completa: true };

  var n = Math.min(maxFilas, totalDatos);
  var desde = ultimaFila - n + 1;
  var rows = sheet.getRange(desde, 1, n, ultimaCol).getValues();
  return { headers: headers, rows: rows, completa: (n === totalDatos) };
}

// ============================================
// CONCURRENCIA — LockService en escrituras
// ============================================
// Envuelve una escritura con lock global del script para evitar filas/IDs
// duplicados cuando dos requests escriben a la vez (kiosko + admin).
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(30000); // hasta 30s de espera (maximo permitido)
  if (!acquired) {
    return { success: false, error: 'Sistema ocupado, intenta de nuevo en unos segundos' };
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// VALIDACION DE UPLOADS PUBLICOS (anti-abuso)
// ============================================
var UPLOAD_LIMITS = {
  imagen: { maxBytes: 6 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
  documento: { maxBytes: 10 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] }
};

// Valida tamano y tipo de un archivo base64 subido por un endpoint publico.
// Devuelve null si es valido, o {success:false, error} para responder directo.
function validarArchivoSubido_(base64Content, mimeType, tipo) {
  const limits = UPLOAD_LIMITS[tipo] || UPLOAD_LIMITS.documento;
  if (!base64Content) return { success: false, error: 'Archivo vacio' };
  // Tamano aproximado del binario = 3/4 del base64
  const approxBytes = Math.floor(String(base64Content).length * 0.75);
  if (approxBytes > limits.maxBytes) {
    return { success: false, error: 'Archivo demasiado grande (max ' + Math.round(limits.maxBytes / 1024 / 1024) + ' MB)' };
  }
  if (mimeType && limits.mimes.indexOf(String(mimeType).toLowerCase()) < 0) {
    return { success: false, error: 'Tipo de archivo no permitido: ' + mimeType };
  }
  return null;
}

// Rate limit simple por clave (p.ej. 'apply:<dni>') usando CacheService.
// Devuelve null si esta dentro del limite, o {success:false, error} si lo excede.
function checkRateLimit_(key, maxPorHora) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'rl:' + key;
    const current = parseInt(cache.get(cacheKey), 10) || 0;
    if (current >= maxPorHora) {
      return { success: false, error: 'Demasiadas solicitudes, intenta mas tarde' };
    }
    cache.put(cacheKey, String(current + 1), 3600);
    return null;
  } catch (e) {
    return null; // si el cache falla, no bloquear la operacion
  }
}

// ============================================
// FLAG DE OPERACIONES DESTRUCTIVAS
// ============================================
// Las funciones que borran/recrean hojas o cargan datos de prueba solo corren
// si la Script Property ALLOW_DESTRUCTIVE_OPS = 'true'. En produccion debe
// estar ausente o en 'false'. (Ya hubo perdida real de datos: los PDFs.)
function assertDestructiveAllowed_() {
  const flag = PropertiesService.getScriptProperties().getProperty('ALLOW_DESTRUCTIVE_OPS');
  if (flag !== 'true') {
    throw new Error('Operacion destructiva bloqueada: define ALLOW_DESTRUCTIVE_OPS=true en Script Properties para habilitarla (NO en produccion).');
  }
}

// Genera IDs secuenciales amigables (PO001, CON001, EMP001, etc.)
function generateSequentialId(sheetName, prefix) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  // Buscar el numero mas alto existente
  let maxNum = 0;
  const regex = new RegExp('^' + prefix + '(\\d+)$');

  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]);
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  // Generar siguiente ID con padding de 3 digitos
  const nextNum = maxNum + 1;
  return prefix + String(nextNum).padStart(3, '0');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// MODULO CAPACITACIONES Y EVALUACIONES
// ============================================================

// --- Helpers ---

function seededRandom(seed) {
  var s = (seed >>> 0) || 1;
  return function() {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967295;
  };
}

function normalizar(str) {
  return (str || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchFlexible(respuesta, correcta) {
  return normalizar(respuesta) === normalizar(correcta);
}

function shuffleArray(arr, rng) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ============================================================
// FIN MODULO PLANILLA
// ============================================================

// ============================================================
// FUNCIONES DE PRE-AUTORIZACION (ejecutar desde el editor UNA VEZ)
// Sirven para que Apps Script pida permisos de Drive y MailApp
// antes de que lleguen requests reales del frontend.
// ============================================================

function preAutorizarDrive() {
  // Imagen JPEG 1x1 pixel en base64
  var pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  var resultado = guardarFotoWebcam({
    fileContent: pixel,
    fileName: 'pre_auth_test.jpg',
    mimeType: 'image/jpeg',
    capacitacion_id: 'pre_auth',
    dni: '00000000',
    evaluacion_id: ''
  });
  Logger.log('preAutorizarDrive: ' + JSON.stringify(resultado));
  // Limpiar archivo de prueba si se creo
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var proc = folder.getFoldersByName('Evaluaciones_Proctoring');
    if (proc.hasNext()) {
      var preFolder = proc.next().getFoldersByName('pre_auth');
      if (preFolder.hasNext()) {
        var dniFolder = preFolder.next().getFoldersByName('00000000');
        if (dniFolder.hasNext()) {
          var files = dniFolder.next().getFilesByName('pre_auth_test.jpg');
          if (files.hasNext()) files.next().setTrashed(true);
        }
      }
    }
  } catch(e) { /* ignorar */ }
  return resultado;
}

function preAutorizarMail() {
  // Intenta revisar una evaluacion inexistente; falla con "no encontrada"
  // pero eso es suficiente para que Apps Script pre-autorice MailApp
  var resultado = revisarEvaluacion({
    id: 'EVAL_PREAUTH_TEST',
    nota_final: 0,
    retroalimentacion: '',
    estado: 'aprobado',
    revisado_por: 'Admin'
  });
  Logger.log('preAutorizarMail: ' + JSON.stringify(resultado));
  // Resultado esperado: { success: false, error: 'Evaluacion no encontrada' }
  // Eso esta bien — Drive y MailApp quedan autorizados
  return resultado;
}

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

// ============================================================
// AUTH — login, tokens HMAC y usuarios
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// Verify token and return user data
function verifyTokenAction(token) {
  const userId = parseToken_(token);
  if (!userId) {
    return { success: false, error: 'Token invalido o expirado' };
  }

  try {

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const users = sheet.getDataRange().getValues();
    const headers = users[0];

    // Detectar estructura de la hoja
    const isStructureA = headers[1] === 'email' || headers[1]?.toLowerCase() === 'email';

    for (let i = 1; i < users.length; i++) {
      const row = users[i];
      let id, nombre, email, rol, isActive, employeeId;

      if (isStructureA) {
        // Estructura A (8 cols): id, email, password, name, role, employeeId, active, createdAt
        id = row[0];
        email = row[1];
        nombre = row[3];
        rol = row[4];
        employeeId = row[5] || null;
        isActive = row[6] === true || row[6] === 'true' || row[6] === 'activo' || row[6] === 'TRUE';
      } else {
        // Estructura B (10 cols): id, nombre, email, password, rol, permisos, estado, ...
        id = row[0];
        nombre = row[1];
        email = row[2];
        rol = row[4];
        employeeId = row[9] || null;
        isActive = row[6] === 'activo';
      }

      if (id === userId && isActive) {
        return {
          success: true,
          data: {
            user: {
              id: id,
              name: nombre,
              email: email,
              role: rol,
              employeeId: employeeId
            }
          }
        };
      }
    }

    return { success: false, error: 'Usuario no encontrado' };
  } catch (e) {
    return { success: false, error: 'Error verificando token: ' + e.message };
  }
}

// Create credentials for existing employee.
// El roster real vive hoy en la hoja 'sueldos' y el frontend identifica a
// cada trabajador con id 'SUE-<dni>'. Se mantiene el fallback a la hoja
// legacy 'empleados' por si llega un id EMP0xx antiguo.
function createCredentialsForEmployee(data) {
  return withLock_(function () {
    let employee = null;

    if (typeof data.employeeId === 'string' && data.employeeId.indexOf('SUE-') === 0) {
      const dni = data.employeeId.substring('SUE-'.length);
      const trabajador = leerRosterReal_().filter(function (t) { return t.dni === dni; })[0];
      if (!trabajador) {
        return { success: false, error: 'Empleado no encontrado' };
      }
      if (!trabajador.email) {
        return { success: false, error: 'El trabajador no tiene email registrado en sueldos' };
      }
      employee = {
        id: data.employeeId,
        nombre: trabajador.nombre,
        email: trabajador.email
      };
    } else {
      const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
      const employees = empSheet.getDataRange().getValues();

      for (let i = 1; i < employees.length; i++) {
        if (employees[i][0] === data.employeeId) {
          employee = {
            id: employees[i][0],
            nombre: employees[i][2],
            email: employees[i][3]
          };
          break;
        }
      }

      if (!employee) {
        return { success: false, error: 'Empleado no encontrado' };
      }
    }

    // Check if user already exists
    const userSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const users = userSheet.getDataRange().getValues();

    for (let i = 1; i < users.length; i++) {
      if (users[i][9] === data.employeeId) {
        return { success: false, error: 'El empleado ya tiene credenciales' };
      }
    }

    // Create user (createUser ya hashea la password internamente). Apps Script
    // ejecuta cada request en un unico hilo, asi que volver a pedir el mismo
    // ScriptLock aqui dentro no bloquea: el lock ya lo tiene esta misma ejecucion.
    const result = createUser({
      nombre: employee.nombre,
      email: employee.email,
      rol: 'empleado',
      permisos: ['ver_perfil', 'ver_proyectos'],
      empleadoId: employee.id
    });

    return result;
  });
}

// ============================================
// AUTENTICACION Y USUARIOS
// ============================================
function login(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();
  const headers = users[0];

  // Detectar estructura de la hoja
  // Estructura A (8 cols): id, email, password, name, role, employeeId, active, createdAt
  // Estructura B (10 cols): id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id
  const isStructureA = headers[1] === 'email' || headers[1]?.toLowerCase() === 'email';

  for (let i = 1; i < users.length; i++) {
    const row = users[i];
    let email, password, isActive, userId, nombre, rol, permisos, employeeId;

    if (isStructureA) {
      // Estructura A (8 columnas): [0]=id, [1]=email, [2]=password, [3]=name, [4]=role, [5]=employeeId, [6]=active, [7]=createdAt
      userId = row[0];
      email = row[1];
      password = row[2];
      nombre = row[3];
      rol = row[4];
      employeeId = row[5] || null;
      isActive = row[6] === true || row[6] === 'true' || row[6] === 'activo' || row[6] === 'TRUE';
      permisos = rol === 'admin' ? ['all'] : ['asistencia', 'boletas'];
    } else {
      // Estructura B (10 columnas): [0]=id, [1]=nombre, [2]=email, [3]=password, [4]=rol, [5]=permisos, [6]=estado, [7]=ultimo_acceso, [8]=fecha_creacion, [9]=empleado_id
      userId = row[0];
      nombre = row[1];
      email = row[2];
      password = row[3];
      rol = row[4];
      permisos = row[5] ? row[5].toString().split(',') : [];
      isActive = row[6] === 'activo';
      employeeId = row[9] || null;
    }

    if (email === data.email && isActive && verificarPassword_(userId, data.password, password)) {
      const token = generateToken(userId);

      // Upgrade-on-login: si la contrasena todavia estaba en texto plano,
      // se reemplaza por su hash para ir limpiando la hoja sola.
      if (typeof password !== 'string' || password.indexOf('sha256:') !== 0) {
        const passwordCol = isStructureA ? 3 : 4; // columna 3 (estructura A) o 4 (estructura B), base 1
        sheet.getRange(i + 1, passwordCol).setValue(hashPassword_(userId, data.password));
      }

      // Registrar ultimo acceso
      const accessCol = isStructureA ? 8 : 8; // columna 8 en ambos casos
      sheet.getRange(i + 1, accessCol).setValue(new Date());

      return {
        success: true,
        data: {
          token: token,
          user: {
            id: userId,
            nombre: nombre,
            email: email,
            rol: rol,
            permisos: Array.isArray(permisos) ? permisos : [permisos],
            empleadoId: employeeId
          }
        }
      };
    }
  }

  return { success: false, error: 'Credenciales invalidas' };
}

// Token firmado HMAC-SHA256: base64(userId|timestamp) + '.' + base64(firma).
// El secreto NUNCA viaja dentro del token (el formato anterior base64 lo incluia:
// cualquier admin podia extraerlo de su propio token en localStorage).
function generateToken(userId) {
  const payload = userId + '|' + new Date().getTime();
  const signature = Utilities.computeHmacSha256Signature(payload, getTokenSecret_());
  return Utilities.base64EncodeWebSafe(payload) + '.' + Utilities.base64EncodeWebSafe(signature);
}

// Devuelve el userId si el token es valido (firma correcta y < 24h); null si no.
function parseToken_(token) {
  if (!token) return null;
  try {
    const parts = String(token).split('.');
    if (parts.length !== 2) return null;

    const payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    const expected = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(payload, getTokenSecret_())
    );
    if (expected !== parts[1]) return null;

    const pieces = payload.split('|');
    const timestamp = parseInt(pieces[1], 10);
    if (!timestamp || new Date().getTime() - timestamp > 24 * 60 * 60 * 1000) {
      return null; // expirado (24 horas)
    }
    return pieces[0];
  } catch (e) {
    return null;
  }
}

function validateToken(token) {
  return parseToken_(token) !== null;
}

// ============================================
// ROLES — cache de rol admin por userId (evita leer 'usuarios' en cada request)
// ============================================
// Roles/permisos que el router considera nivel 'admin'.
var ROLES_ADMIN_ = ['admin', 'administrador', 'manager', 'supervisor', 'rrhh'];

function esRolAdmin_(userId) {
  if (!userId) return false;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'rol:' + userId;
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached === '1';
  }

  let esAdmin = false;
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const users = sheet.getDataRange().getValues();
    const headers = users[0];
    const isStructureA = headers[1] === 'email' || headers[1]?.toLowerCase() === 'email';

    for (let i = 1; i < users.length; i++) {
      const row = users[i];
      if (row[0] !== userId) continue;

      let rol, permisos, isActive;
      if (isStructureA) {
        rol = row[4];
        permisos = row[4] === 'admin' ? ['all'] : [];
        isActive = row[6] === true || row[6] === 'true' || row[6] === 'activo' || row[6] === 'TRUE';
      } else {
        rol = row[4];
        permisos = row[5] ? row[5].toString().split(',') : [];
        isActive = row[6] === 'activo';
      }

      if (!isActive) break;

      const rolNorm = String(rol || '').toLowerCase().trim();
      const permisosNorm = permisos.map(function (p) { return String(p || '').toLowerCase().trim(); });
      esAdmin = ROLES_ADMIN_.indexOf(rolNorm) >= 0 || permisosNorm.indexOf('all') >= 0;
      break;
    }
  } catch (e) {
    esAdmin = false;
  }

  cache.put(cacheKey, esAdmin ? '1' : '0', 300);
  return esAdmin;
}

// ============================================
// PASSWORDS — hash SHA-256 con userId como salt por usuario
// ============================================
// Hoy las contrasenas viven en texto plano en la hoja (brecha A7). Se migran
// a hash de forma incremental: cada login/creacion nueva ya queda hasheada.
// NOTA: no se usa TOKEN_SECRET como salt porque rotarlo invalidaria todas
// las contrasenas existentes (el secreto de token se rota para forzar re-login).
function hashPassword_(userId, password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(userId) + ':' + String(password),
    Utilities.Charset.UTF_8
  );
  return 'sha256:' + Utilities.base64Encode(digest);
}

// Compara una contrasena ingresada contra la almacenada. Soporta hash nuevo
// (prefijo 'sha256:') y contrasenas legacy en texto plano.
function verificarPassword_(userId, passwordIngresada, almacenada) {
  if (typeof almacenada === 'string' && almacenada.indexOf('sha256:') === 0) {
    return hashPassword_(userId, passwordIngresada) === almacenada;
  }
  return almacenada === passwordIngresada;
}

function createUser(data) {
  return withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const id = generateSequentialId('usuarios', 'USR');

    // Generar password temporal (se envia en claro por email, se guarda hasheada)
    const tempPassword = generateTempPassword();

    const row = [
      id,
      data.nombre,
      data.email,
      hashPassword_(id, tempPassword),
      data.rol, // admin, supervisor, rrhh, empleado
      data.permisos.join(','), // lista de permisos separados por coma
      'activo',
      '',
      new Date(),
      data.empleadoId || ''
    ];

    sheet.appendRow(row);

    // Enviar credenciales por email
    sendCredentialsEmail(data.email, data.nombre, tempPassword);

    return {
      success: true,
      data: { id: id, tempPassword: tempPassword },
      message: 'Usuario creado. Credenciales enviadas por email.'
    };
  });
}

function changePassword(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();

  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === data.userId && verificarPassword_(data.userId, data.currentPassword, users[i][3])) {
      sheet.getRange(i + 1, 4).setValue(hashPassword_(data.userId, data.newPassword));
      return { success: true, message: 'Contrasena actualizada' };
    }
  }

  return { success: false, error: 'Contrasena actual incorrecta' };
}

function resetPassword(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();

  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === data.userId) {
      const tempPassword = generateTempPassword();
      sheet.getRange(i + 1, 4).setValue(hashPassword_(users[i][0], tempPassword));

      sendCredentialsEmail(users[i][2], users[i][1], tempPassword);

      return { success: true, message: 'Nueva contrasena enviada por email' };
    }
  }

  return { success: false, error: 'Usuario no encontrado' };
}

function getUsers() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const users = data.slice(1).map(row => {
    const user = rowToObject(headers, row);
    delete user.password; // No enviar password
    return user;
  });
  
  return { success: true, data: users };
}

function sendCredentialsEmail(email, nombre, password) {
  const body = `
Hola ${nombre},

Se han creado tus credenciales de acceso al sistema de Ingenieria Telcom EIRL:

Email: ${email}
Contrasena temporal: ${password}

Por favor cambia tu contrasena despues del primer inicio de sesion.

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(email, 'Credenciales de Acceso - Telcom', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function deactivateUserByEmployee(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][9] === employeeId) {
      sheet.getRange(i + 1, 7).setValue('inactivo');
      break;
    }
  }
}

// ============================================
// CREAR/ACTUALIZAR ADMIN POR DEFECTO
// Ejecutar esta funcion manualmente si necesitas crear/recuperar el admin.
// SEGURIDAD: ya no hay contrasena hardcodeada (este repo es publico):
// se genera una temporal, se guarda hasheada y se envia por email al admin.
// ============================================
function createDefaultAdmin() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();

  const adminEmail = 'supervisor1telcom@gmail.com';
  const adminPassword = generateTempPassword();

  // Buscar si ya existe
  for (let i = 1; i < users.length; i++) {
    if (users[i][2] === adminEmail) {
      const existingId = users[i][0];
      // Actualizar password y asegurar que este activo
      sheet.getRange(i + 1, 4).setValue(hashPassword_(existingId, adminPassword)); // password
      sheet.getRange(i + 1, 5).setValue('admin'); // rol
      sheet.getRange(i + 1, 6).setValue('all'); // permisos
      sheet.getRange(i + 1, 7).setValue('activo'); // estado
      sendCredentialsEmail(adminEmail, users[i][1] || 'Supervisor Telcom', adminPassword);
      return 'Usuario admin actualizado: ' + adminEmail + '. Contrasena temporal enviada por email.';
    }
  }

  // Si no existe, crearlo
  const id = generateSequentialId('usuarios', 'USR');
  sheet.appendRow([
    id,
    'Supervisor Telcom',
    adminEmail,
    hashPassword_(id, adminPassword),
    'admin',
    'all',
    'activo',
    '',
    new Date(),
    ''
  ]);

  sendCredentialsEmail(adminEmail, 'Supervisor Telcom', adminPassword);
  return 'Usuario admin creado: ' + adminEmail + ' con ID: ' + id + '. Contrasena temporal enviada por email.';
}

// ============================================================
// EMPLEADOS — roster (hoja sueldos) e historial
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// GESTION DE EMPLEADOS
// ============================================
// Roster real de trabajadores (hoja 'sueldos') — fuente unica de la verdad.
// Reemplaza los datos demo de la hoja 'empleados' en Dashboard/Empleados.
//
// Bajas: la columna 'fecha_fin' marca el ULTIMO DIA LABORADO. Un trabajador
// cesado se conserva en la hoja (su historial de asistencias, incidencias y
// planillas de meses ya cerrados debe seguir siendo auditable) pero queda
// FUERA del roster activo: no aparece en el kiosko, no genera faltas ni
// tardanzas y no cuenta en el dashboard. Pasar incluirCesados=true para
// listarlos igual (panel de planilla, reportes historicos).
function leerRosterReal_(incluirCesados) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var h = rows[0];
  var cDni = h.indexOf('dni'), cNom = h.indexOf('nombre'), cCargo = h.indexOf('cargo'),
      cSede = h.indexOf('sede'), cEmail = h.indexOf('email'),
      cIni = h.indexOf('fecha_inicio'), cFin = h.indexOf('fecha_fin');
  var hoy = hoyISO_();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var dni = rows[i][cDni];
    if (!dni) continue;
    var email = cEmail >= 0 ? String(rows[i][cEmail] || '') : '';
    // Hojas creadas antes de la baja logica no tienen la columna: todos activos.
    var fechaFin = cFin >= 0 ? fechaISO_(rows[i][cFin]) : '';
    var activo = !fechaFin || fechaFin >= hoy; // el dia del cese aun se trabaja
    if (!activo && !incluirCesados) continue;
    out.push({
      dni: String(dni),
      nombre: String(rows[i][cNom] || ''),
      cargo: cCargo >= 0 ? String(rows[i][cCargo] || '') : '',
      sede: cSede >= 0 ? String(rows[i][cSede] || '') : '',
      email: email,
      es_campo: !email,
      fecha_inicio: cIni >= 0 ? fechaISO_(rows[i][cIni]) : '',
      fecha_fin: fechaFin,
      activo: activo
    });
  }
  return out;
}

// Convierte un registro del roster real (hoja 'sueldos') al shape de empleado
// que consume el frontend (interface Employee de src/api/appScriptApi.ts),
// el mismo que arma getEmployees(). Fuente unica para no duplicar el mapeo
// entre getEmployees, getEmployeeById, updateEmployee, transferEmployee y createEmployee.
function trabajadorRosterAEmployee_(t) {
  return {
    id: 'SUE-' + t.dni,
    dni: t.dni,
    nombre_completo: t.nombre,
    email: t.email,
    telefono: '',
    cargo: t.cargo,
    area: t.es_campo ? 'Campo' : 'Oficina',
    ciudad_actual: t.sede || 'Principal',
    estado: t.activo === false ? 'inactivo' : 'activo',
    fecha_fin: t.fecha_fin || '',
    registro_simple: t.es_campo
  };
}

// Lee tambien a los cesados para que un filtro explicito por estado pueda
// mostrarlos; sin filtro, la vista solo lista a los activos.
function getEmployees(filters) {
  var employees = leerRosterReal_(true).map(trabajadorRosterAEmployee_);
  var f = filters ? (typeof filters === 'string' ? JSON.parse(filters) : filters) : {};

  // Sin filtro de estado se listan solo los activos; 'todos' los incluye a ambos.
  var estado = f.estado || 'activo';
  if (estado !== 'todos') {
    employees = employees.filter(function(e){ return e.estado === estado; });
  }
  if (f.ciudad) employees = employees.filter(function(e){ return e.ciudad_actual === f.ciudad; });
  if (f.area) employees = employees.filter(function(e){ return e.area === f.area; });
  if (f.cargo) employees = employees.filter(function(e){ return e.cargo === f.cargo; });

  return { success: true, data: employees };
}

// Extrae el DNI a partir de un id 'SUE-<dni>' o un DNI suelto de 8 digitos.
// Devuelve null si el id no corresponde al formato del roster real.
function dniDesdeIdRoster_(id) {
  const s = String(id || '');
  if (s.indexOf('SUE-') === 0) return s.substring(4);
  if (/^\d{8}$/.test(s)) return s;
  return null;
}

function getEmployeeById(id) {
  const dni = dniDesdeIdRoster_(id);

  if (dni) {
    // Roster real (hoja 'sueldos') — fuente unica de la verdad. Se incluyen los
    // cesados: su ficha e historial deben poder consultarse tras la baja.
    const trabajador = leerRosterReal_(true).filter(function(t) { return t.dni === dni; })[0];
    if (!trabajador) {
      return { success: false, error: 'Empleado no encontrado' };
    }

    const emp = trabajadorRosterAEmployee_(trabajador);

    // Obtener asignaciones actuales e historial (usan el id SUE-<dni>)
    emp.asignaciones = getAssignmentsByEmployee(emp.id).data;
    emp.historial = getEmployeeHistory(emp.id).data;

    return { success: true, data: emp };
  }

  // Fallback legacy: id formato EMP0xx en la hoja 'empleados'.
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const employee = data.slice(1).find(row => row[0] === id);

  if (!employee) {
    return { success: false, error: 'Empleado no encontrado' };
  }

  const emp = rowToObject(headers, employee);

  // Obtener asignaciones actuales
  emp.asignaciones = getAssignmentsByEmployee(id).data;

  // Obtener historial de movimientos
  emp.historial = getEmployeeHistory(id).data;

  return { success: true, data: emp };
}

function getEmployeesByProject(projectId) {
  const assignSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  
  const assignments = assignSheet.getDataRange().getValues();
  const employees = empSheet.getDataRange().getValues();
  const empHeaders = employees[0];
  
  const employeeIds = assignments.slice(1)
    .filter(row => row[1] === projectId && row[5] === 'activa')
    .map(row => row[2]);
  
  const result = employees.slice(1)
    .filter(row => employeeIds.includes(row[0]))
    .map(row => rowToObject(empHeaders, row));
  
  return { success: true, data: result };
}

function getEmployeesByCity(city) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const employees = data.slice(1)
    .filter(row => row[8] === city && row[10] === 'activo')
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: employees };
}

function createEmployee(data) {
  data = data || {};

  // El frontend (EmployeesPage) envia campos en ingles (name, position, city,
  // email, salary...); tambien aceptamos las claves en espanol por si algun
  // otro caller las usa. dni es obligatorio: es la clave del roster real.
  const dni = String(data.dni || '').trim();
  if (!/^\d{8}$/.test(dni)) {
    return { success: false, error: 'DNI requerido (8 digitos)' };
  }

  const nombre = data.name || data.nombre_completo || '';
  const cargo = data.position || data.cargo || '';
  const sede = data.city || data.ciudad_actual || '';
  const email = data.email || '';
  const salario = data.salary != null ? data.salary : (data.salario || 0);

  return withLock_(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
    if (!sheet) {
      return { success: false, error: 'Hoja sueldos no encontrada' };
    }

    // Evitar duplicados: un DNI ya presente en el roster real.
    const yaExiste = leerRosterReal_().some(function(t) { return t.dni === dni; });
    if (yaExiste) {
      return { success: false, error: 'Ya existe un trabajador con ese DNI' };
    }

    const fechaInicio = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');

    const headers = sheet.getDataRange().getValues()[0];
    const fila = headers.map(function(h) {
      switch (h) {
        case 'dni': return dni;
        case 'nombre': return nombre;
        case 'cargo': return cargo;
        case 'sueldo': return salario;
        case 'fecha_inicio': return fechaInicio;
        case 'usa_rmv': return '';
        case 'sede': return sede;
        case 'email': return email;
        default: return '';
      }
    });

    sheet.appendRow(fila);

    const emp = trabajadorRosterAEmployee_({
      dni: dni,
      nombre: nombre,
      cargo: cargo,
      sede: sede,
      email: email,
      es_campo: !email
    });

    // Registrar alta en historial
    addHistoryRecord(emp.id, 'ingreso', null, sede, 'Ingreso a la empresa');

    invalidarCacheTrabajadores_();
    return { success: true, data: emp, message: 'Empleado registrado exitosamente' };
  });
}

function updateEmployee(data) {
  data = data || {};
  const dni = dniDesdeIdRoster_(data.id);

  if (dni) {
    // Roster real (hoja 'sueldos'). Mapeo frontend -> columnas de sueldos:
    // name->nombre, position->cargo, city->sede, email->email, salary->sueldo.
    // Campos que sueldos no tiene (phone, department, status) se ignoran sin error.
    return withLock_(function() {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
      if (!sheet) {
        return { success: false, error: 'Hoja sueldos no encontrada' };
      }

      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const cDni = headers.indexOf('dni');
      const colMap = {
        name: headers.indexOf('nombre'),
        position: headers.indexOf('cargo'),
        city: headers.indexOf('sede'),
        email: headers.indexOf('email'),
        salary: headers.indexOf('sueldo')
      };

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][cDni]) !== dni) continue;

        if (data.name != null && colMap.name >= 0) sheet.getRange(i + 1, colMap.name + 1).setValue(data.name);
        if (data.position != null && colMap.position >= 0) sheet.getRange(i + 1, colMap.position + 1).setValue(data.position);
        if (data.city != null && colMap.city >= 0) sheet.getRange(i + 1, colMap.city + 1).setValue(data.city);
        if (data.email != null && colMap.email >= 0) sheet.getRange(i + 1, colMap.email + 1).setValue(data.email);
        if (data.salary != null && colMap.salary >= 0) sheet.getRange(i + 1, colMap.salary + 1).setValue(data.salary);
        // phone, department, status: la hoja sueldos no los tiene -> se ignoran con gracia.

        const trabajador = leerRosterReal_(true).filter(function(t) { return t.dni === dni; })[0];
        invalidarCacheTrabajadores_();
        return { success: true, data: trabajadorRosterAEmployee_(trabajador), message: 'Empleado actualizado' };
      }

      return { success: false, error: 'Empleado no encontrado' };
    });
  }

  // Fallback legacy: id formato EMP0xx en la hoja 'empleados'.
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();

  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === data.id) {
      // Actualizar campos especificos
      if (data.cargo) sheet.getRange(i + 1, 6).setValue(data.cargo);
      if (data.area) sheet.getRange(i + 1, 7).setValue(data.area);
      if (data.telefono) sheet.getRange(i + 1, 5).setValue(data.telefono);
      if (data.salario) sheet.getRange(i + 1, 13).setValue(data.salario);
      if (data.tipo_contrato) sheet.getRange(i + 1, 12).setValue(data.tipo_contrato);

      return { success: true, message: 'Empleado actualizado' };
    }
  }

  return { success: false, error: 'Empleado no encontrado' };
}

function transferEmployee(data) {
  data = data || {};

  // Acepta ambos contratos: backend legacy (empleadoId/nuevaCiudad) y el que
  // realmente envia el frontend (employeeId/newCity/newDepartment) — brecha M2.
  const empleadoId = data.empleadoId || data.employeeId;
  const nuevaCiudad = data.nuevaCiudad || data.newCity;
  const nuevaArea = data.nuevaArea || data.newDepartment;

  const dni = dniDesdeIdRoster_(empleadoId);

  if (dni) {
    // Roster real (hoja 'sueldos'): solo existe la columna 'sede', no hay area.
    return withLock_(function() {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
      if (!sheet) {
        return { success: false, error: 'Hoja sueldos no encontrada' };
      }

      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const cDni = headers.indexOf('dni');
      const cSede = headers.indexOf('sede');
      const cEmail = headers.indexOf('email');
      const cNombre = headers.indexOf('nombre');

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][cDni]) !== dni) continue;

        const ciudadAnterior = cSede >= 0 ? rows[i][cSede] : '';
        if (cSede >= 0) sheet.getRange(i + 1, cSede + 1).setValue(nuevaCiudad);

        const emp = trabajadorRosterAEmployee_({
          dni: dni,
          nombre: cNombre >= 0 ? String(rows[i][cNombre] || '') : '',
          cargo: '',
          sede: nuevaCiudad,
          email: cEmail >= 0 ? String(rows[i][cEmail] || '') : '',
          es_campo: cEmail >= 0 ? !rows[i][cEmail] : true
        });

        // Registrar en historial
        addHistoryRecord(
          emp.id,
          'transferencia',
          ciudadAnterior,
          nuevaCiudad,
          data.motivo || 'Transferencia de ubicacion'
        );

        // Notificar al empleado si tiene email
        if (emp.email) {
          sendTransferNotification(emp.email, emp.nombre_completo, ciudadAnterior, nuevaCiudad);
        }

        invalidarCacheTrabajadores_();
        return { success: true, data: emp, message: 'Empleado transferido exitosamente' };
      }

      return { success: false, error: 'Empleado no encontrado' };
    });
  }

  // Fallback legacy: id formato EMP0xx en la hoja 'empleados'.
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();

  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === empleadoId) {
      const ciudadAnterior = employees[i][8];

      // Actualizar ciudad
      sheet.getRange(i + 1, 9).setValue(nuevaCiudad);

      // Si cambia de area tambien
      if (nuevaArea) {
        sheet.getRange(i + 1, 7).setValue(nuevaArea);
      }

      // Registrar en historial
      addHistoryRecord(
        empleadoId,
        'transferencia',
        ciudadAnterior,
        nuevaCiudad,
        data.motivo || 'Transferencia de ubicacion'
      );

      // Notificar al empleado
      if (data.notificar) {
        sendTransferNotification(employees[i][3], employees[i][2], ciudadAnterior, nuevaCiudad);
      }

      return { success: true, message: 'Empleado transferido exitosamente' };
    }
  }

  return { success: false, error: 'Empleado no encontrado' };
}

function deactivateEmployee(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();
  
  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === data.empleadoId) {
      sheet.getRange(i + 1, 11).setValue('inactivo');
      
      // Cerrar asignaciones activas
      closeEmployeeAssignments(data.empleadoId);
      
      // Desactivar usuario si existe
      deactivateUserByEmployee(data.empleadoId);
      
      // Registrar en historial
      addHistoryRecord(data.empleadoId, 'baja', null, null, data.motivo || 'Baja de la empresa');
      
      return { success: true, message: 'Empleado dado de baja' };
    }
  }
  
  return { success: false, error: 'Empleado no encontrado' };
}

function getEmployeeHistory(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('historial_empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const history = data.slice(1)
    .filter(row => row[1] === employeeId)
    .map(row => rowToObject(headers, row))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  return { success: true, data: history };
}

function addHistoryRecord(employeeId, tipo, ubicacionAnterior, ubicacionNueva, descripcion) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('historial_empleados');
  const id = generateSequentialId('historial_empleados', 'HIST');

  sheet.appendRow([
    id,
    employeeId,
    tipo,
    ubicacionAnterior || '',
    ubicacionNueva || '',
    descripcion,
    new Date(),
    Session.getActiveUser().getEmail() || 'sistema'
  ]);
}

function sendTransferNotification(email, nombre, ciudadAnterior, nuevaCiudad) {
  const body = `
Hola ${nombre},

Te informamos que has sido transferido:

De: ${ciudadAnterior}
A: ${nuevaCiudad}

Para mas detalles, contacta con Recursos Humanos.

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(email, 'Notificacion de Transferencia', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

// ============================================================
// PROYECTOS — proyectos y asignaciones
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// GESTION DE PROYECTOS
// ============================================
function getProjects() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const projects = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const project = rowToObject(headers, row);
      project.empleados_asignados = countProjectEmployees(project.id);
      return project;
    });
  
  return { success: true, data: projects };
}

function getActiveProjects() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const projects = data.slice(1)
    .filter(row => row[0] !== '' && row[8] === 'activo')
    .map(row => {
      const project = rowToObject(headers, row);
      project.empleados_asignados = countProjectEmployees(project.id);
      return project;
    });
  
  return { success: true, data: projects };
}

function getProjectById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const project = data.slice(1).find(row => row[0] === id);
  
  if (!project) {
    return { success: false, error: 'Proyecto no encontrado' };
  }
  
  const proj = rowToObject(headers, project);
  proj.empleados = getEmployeesByProject(id).data;
  
  return { success: true, data: proj };
}

function createProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const id = generateSequentialId('proyectos', 'PROY');
  
  const row = [
    id,
    data.codigo,
    data.nombre,
    data.cliente,
    data.descripcion,
    data.ciudad,
    data.fecha_inicio,
    data.fecha_fin_estimada || '',
    'activo',
    data.presupuesto || '',
    data.supervisor || '',
    new Date()
  ];
  
  sheet.appendRow(row);
  
  return { success: true, data: { id: id }, message: 'Proyecto creado' };
}

function updateProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const projects = sheet.getDataRange().getValues();
  
  for (let i = 1; i < projects.length; i++) {
    if (projects[i][0] === data.id) {
      if (data.nombre) sheet.getRange(i + 1, 3).setValue(data.nombre);
      if (data.descripcion) sheet.getRange(i + 1, 5).setValue(data.descripcion);
      if (data.ciudad) sheet.getRange(i + 1, 6).setValue(data.ciudad);
      if (data.fecha_fin_estimada) sheet.getRange(i + 1, 8).setValue(data.fecha_fin_estimada);
      if (data.presupuesto) sheet.getRange(i + 1, 10).setValue(data.presupuesto);
      if (data.supervisor) sheet.getRange(i + 1, 11).setValue(data.supervisor);
      
      return { success: true, message: 'Proyecto actualizado' };
    }
  }
  
  return { success: false, error: 'Proyecto no encontrado' };
}

function closeProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const projects = sheet.getDataRange().getValues();
  
  for (let i = 1; i < projects.length; i++) {
    if (projects[i][0] === data.projectId) {
      sheet.getRange(i + 1, 9).setValue('cerrado');
      
      // Cerrar todas las asignaciones del proyecto
      closeProjectAssignments(data.projectId);
      
      return { success: true, message: 'Proyecto cerrado' };
    }
  }
  
  return { success: false, error: 'Proyecto no encontrado' };
}

function countProjectEmployees(projectId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  
  return data.slice(1).filter(row => row[1] === projectId && row[5] === 'activa').length;
}

// ============================================
// GESTION DE ASIGNACIONES
// ============================================
function getAssignments() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const assignments = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: assignments };
}

function getAssignmentsByEmployee(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const assignments = data.slice(1)
    .filter(row => row[2] === employeeId)
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: assignments };
}

function assignEmployeeToProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const id = generateSequentialId('asignaciones', 'ASIG');
  
  // Verificar si ya esta asignado
  const existing = sheet.getDataRange().getValues().slice(1)
    .find(row => row[1] === data.projectId && row[2] === data.employeeId && row[5] === 'activa');
  
  if (existing) {
    return { success: false, error: 'El empleado ya esta asignado a este proyecto' };
  }
  
  const row = [
    id,
    data.projectId,
    data.employeeId,
    data.rol || 'miembro',
    new Date(),
    'activa',
    ''
  ];
  
  sheet.appendRow(row);
  
  // Actualizar ciudad del empleado si el proyecto es en otra ciudad
  if (data.actualizarCiudad) {
    const projectCity = getProjectCity(data.projectId);
    if (projectCity) {
      transferEmployee({
        empleadoId: data.employeeId,
        nuevaCiudad: projectCity,
        motivo: 'Asignacion a proyecto'
      });
    }
  }
  
  return { success: true, data: { id: id }, message: 'Empleado asignado al proyecto' };
}

function removeAssignment(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const assignments = sheet.getDataRange().getValues();
  
  for (let i = 1; i < assignments.length; i++) {
    if (assignments[i][0] === data.assignmentId) {
      sheet.getRange(i + 1, 6).setValue('finalizada');
      sheet.getRange(i + 1, 7).setValue(new Date());
      return { success: true, message: 'Asignacion finalizada' };
    }
  }
  
  return { success: false, error: 'Asignacion no encontrada' };
}

function bulkAssignEmployees(data) {
  const results = [];
  
  for (const employeeId of data.employeeIds) {
    const result = assignEmployeeToProject({
      projectId: data.projectId,
      employeeId: employeeId,
      rol: data.rol,
      actualizarCiudad: data.actualizarCiudad
    });
    results.push({ employeeId, success: result.success });
  }
  
  return { success: true, data: results, message: 'Asignacion masiva completada' };
}

function closeProjectAssignments(projectId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === projectId && data[i][5] === 'activa') {
      sheet.getRange(i + 1, 6).setValue('finalizada');
      sheet.getRange(i + 1, 7).setValue(new Date());
    }
  }
}

function closeEmployeeAssignments(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === employeeId && data[i][5] === 'activa') {
      sheet.getRange(i + 1, 6).setValue('finalizada');
      sheet.getRange(i + 1, 7).setValue(new Date());
    }
  }
}

function getProjectCity(projectId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const project = data.slice(1).find(row => row[0] === projectId);
  return project ? project[5] : null;
}

// ============================================================
// BOLSA DE TRABAJO — convocatorias, postulaciones y contacto
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// Get all jobs (admin)
function getAllJobs() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const jobs = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const job = rowToObject(headers, row);
      if (job.imagen === undefined) job.imagen = '';
      return job;
    });

  return { success: true, data: jobs };
}

// Upload a PDF for a job posting, organized by city
function uploadJobPdf(data) {
  // data: { fileContent (base64), fileName, mimeType, ciudad, convocatoriaId }
  try {
    if (!data.fileContent || !data.fileName) {
      return { success: false, error: 'Archivo requerido' };
    }

    const mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const fichasFolder = getOrCreateFolder(mainFolder, 'Fichas_Postulacion');
    const cityName = (data.ciudad || 'General').replace(/[\\/:*?"<>|]/g, '_');
    const cityFolder = getOrCreateFolder(fichasFolder, cityName);

    // If replacing an old file for this job, delete it
    if (data.convocatoriaId) {
      const oldFiles = cityFolder.getFilesByName(data.fileName);
      while (oldFiles.hasNext()) {
        oldFiles.next().setTrashed(true);
      }
    }

    const decodedBytes = Utilities.base64Decode(data.fileContent);
    const blob = Utilities.newBlob(
      decodedBytes,
      data.mimeType || 'application/pdf',
      data.fileName
    );
    const file = cityFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      data: {
        fileId: file.getId(),
        fileName: file.getName(),
        viewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId()
      }
    };
  } catch (e) {
    return { success: false, error: 'Error subiendo PDF: ' + e.message };
  }
}

// ============================================
// CONVOCATORIAS (BOLSA DE TRABAJO)
// ============================================
function getActiveJobs() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Encontrar indice de columna 'estado' dinamicamente
  const estadoCol = headers.indexOf('estado');

  const jobs = data.slice(1)
    .filter(row => {
      if (row[0] === '') return false;
      // Verificar estado usando el indice correcto
      const estado = estadoCol >= 0 ? row[estadoCol] : row[10];
      return estado === 'activo';
    })
    .map(row => {
      const job = rowToObject(headers, row);
      // Normalizar campos para compatibilidad con frontend
      if (!job.prioridad) {
        job.prioridad = (job.urgente === true || job.urgente === 'TRUE' || job.urgente === 'VERDADERO') ? 'alta' : 'media';
      }
      if (!job.fecha_publicacion) {
        job.fecha_publicacion = job.fecha_inicio || job.createdAt || '';
      }
      if (job.postulantes_count === undefined || job.postulantes_count === '') {
        job.postulantes_count = 0;
      }
      if (job.imagen === undefined) job.imagen = '';
      return job;
    });

  return { success: true, data: jobs };
}

function getJobById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const job = data.slice(1).find(row => row[0] === id);
  
  if (!job) {
    return { success: false, error: 'Convocatoria no encontrada' };
  }

  const jobObj = rowToObject(headers, job);
  // Normalizar campos para compatibilidad con frontend
  if (!jobObj.prioridad) {
    jobObj.prioridad = (jobObj.urgente === true || jobObj.urgente === 'TRUE') ? 'alta' : 'media';
  }
  if (!jobObj.fecha_publicacion) {
    jobObj.fecha_publicacion = jobObj.fecha_inicio || jobObj.createdAt || '';
  }
  if (jobObj.postulantes_count === undefined || jobObj.postulantes_count === '') {
    jobObj.postulantes_count = 0;
  }
  if (jobObj.imagen === undefined) jobObj.imagen = '';
  return { success: true, data: jobObj };
}

function createJob(data) {
  return withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
    const headers = sheet.getDataRange().getValues()[0];
    const id = generateSequentialId('convocatorias', 'JOB');
    const now = new Date();

    // Mapa de valores — soporta tanto la estructura vieja (urgente, vacantes, fecha_inicio)
    // como la nueva (prioridad, postulantes_count, fecha_publicacion)
    const fieldMap = {
      'id': id,
      'titulo': data.titulo,
      'categoria': data.categoria,
      'descripcion': data.descripcion,
      'requisitos': data.requisitos,
      'beneficios': data.beneficios,
      'ubicacion': data.ubicacion,
      'modalidad': data.modalidad,
      'salario_min': data.salario_min || '',
      'salario_max': data.salario_max || '',
      'vacantes': data.vacantes || 1,
      'estado': data.estado || 'activo',
      'urgente': data.urgente !== undefined ? data.urgente : (data.prioridad === 'alta'),
      'prioridad': data.prioridad || (data.urgente ? 'alta' : 'media'),
      'fecha_inicio': data.fecha_inicio || data.fecha_publicacion || now,
      'fecha_publicacion': data.fecha_publicacion || data.fecha_inicio || now,
      'fecha_cierre': data.fecha_cierre || '',
      'postulantes_count': 0,
      'imagen': data.imagen || '',
      'pdf_url': data.pdf_url || '',
      'createdAt': now,
      'updatedAt': now,
    };

    // Construir fila en el orden real de los headers del sheet
    const row = headers.map(header => {
      if (header === '') return '';
      return fieldMap.hasOwnProperty(header) ? fieldMap[header] : '';
    });

    sheet.appendRow(row);

    return { success: true, data: { id: id }, message: 'Convocatoria creada' };
  });
}

function updateJob(data) {
  return withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
    const jobs = sheet.getDataRange().getValues();
    const headers = jobs[0];

    // Funcion helper para obtener indice de columna (1-based para getRange)
    const getColNum = (name) => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? idx + 1 : -1;
    };

    for (let i = 1; i < jobs.length; i++) {
      if (jobs[i][0] === data.id) {
        // Actualizar campos usando nombres de columna
        if (data.titulo !== undefined) sheet.getRange(i + 1, getColNum('titulo')).setValue(data.titulo);
        if (data.categoria !== undefined) sheet.getRange(i + 1, getColNum('categoria')).setValue(data.categoria);
        if (data.descripcion !== undefined) sheet.getRange(i + 1, getColNum('descripcion')).setValue(data.descripcion);
        if (data.requisitos !== undefined) sheet.getRange(i + 1, getColNum('requisitos')).setValue(data.requisitos);
        if (data.beneficios !== undefined) sheet.getRange(i + 1, getColNum('beneficios')).setValue(data.beneficios);
        if (data.ubicacion !== undefined) sheet.getRange(i + 1, getColNum('ubicacion')).setValue(data.ubicacion);
        if (data.modalidad !== undefined) sheet.getRange(i + 1, getColNum('modalidad')).setValue(data.modalidad);
        if (data.salario_min !== undefined) sheet.getRange(i + 1, getColNum('salario_min')).setValue(data.salario_min);
        if (data.salario_max !== undefined) sheet.getRange(i + 1, getColNum('salario_max')).setValue(data.salario_max);
        if (data.vacantes !== undefined) sheet.getRange(i + 1, getColNum('vacantes')).setValue(data.vacantes);
        if (data.fecha_inicio !== undefined) sheet.getRange(i + 1, getColNum('fecha_inicio')).setValue(data.fecha_inicio);
        if (data.fecha_cierre !== undefined) sheet.getRange(i + 1, getColNum('fecha_cierre')).setValue(data.fecha_cierre);
        if (data.estado !== undefined) sheet.getRange(i + 1, getColNum('estado')).setValue(data.estado);
        if (data.urgente !== undefined) sheet.getRange(i + 1, getColNum('urgente')).setValue(data.urgente);
        if (data.imagen !== undefined) sheet.getRange(i + 1, getColNum('imagen')).setValue(data.imagen);
        if (data.pdf_url !== undefined) sheet.getRange(i + 1, getColNum('pdf_url')).setValue(data.pdf_url);

        // Actualizar updatedAt
        const updatedAtCol = getColNum('updatedAt');
        if (updatedAtCol > 0) sheet.getRange(i + 1, updatedAtCol).setValue(new Date());

        return { success: true, message: 'Convocatoria actualizada' };
      }
    }

    return { success: false, error: 'Convocatoria no encontrada' };
  });
}

function updateJobStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const jobs = sheet.getDataRange().getValues();
  const headers = jobs[0];

  // Encontrar indice de columna 'estado' dinamicamente
  const estadoCol = headers.indexOf('estado');
  const colNum = estadoCol >= 0 ? estadoCol + 1 : 14; // +1 porque getRange es 1-based

  for (let i = 1; i < jobs.length; i++) {
    if (jobs[i][0] === data.id) {
      sheet.getRange(i + 1, colNum).setValue(data.estado);
      return { success: true, message: 'Estado actualizado' };
    }
  }

  return { success: false, error: 'Convocatoria no encontrada' };
}

function deleteJob(data) {
  return withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
    const jobs = sheet.getDataRange().getValues();

    for (let i = 1; i < jobs.length; i++) {
      if (jobs[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Convocatoria eliminada' };
      }
    }

    return { success: false, error: 'Convocatoria no encontrada' };
  });
}

// ============================================
// POSTULACIONES
// ============================================
function submitApplication(data) {
  // Validar CV subido (si viene) antes de procesar nada mas
  if (data.cvBase64 && data.cvFileName) {
    const cvError = validarArchivoSubido_(data.cvBase64, data.cvMimeType, 'documento');
    if (cvError) return cvError;
  }

  // Rate limit por DNI para evitar spam de postulaciones
  const rlError = checkRateLimit_('apply:' + data.dni, 5);
  if (rlError) return rlError;

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');

  // Subir CV si viene incluido en base64
  let cvUrl = data.cvUrl || '';
  if (data.cvBase64 && data.cvFileName) {
    try {
      const uploadResult = uploadFileFromBase64(data.cvBase64, data.cvMimeType, data.cvFileName);
      if (uploadResult.success) {
        cvUrl = uploadResult.data.fileUrl;
      }
    } catch (e) {
      console.error('Error subiendo CV:', e);
    }
  }

  // Obtener titulo de la convocatoria
  let jobTitle = data.jobTitle || '';
  if (!jobTitle && data.jobId) {
    try {
      const jobSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
      const jobData = jobSheet.getDataRange().getValues();
      const jobHeaders = jobData[0];
      const tituloCol = jobHeaders.indexOf('titulo');
      for (let i = 1; i < jobData.length; i++) {
        if (jobData[i][0] === data.jobId) {
          jobTitle = tituloCol >= 0 ? jobData[i][tituloCol] : jobData[i][1];
          break;
        }
      }
    } catch (e) {
      console.error('Error obteniendo titulo:', e);
    }
  }

  const now = new Date();

  const result = withLock_(function () {
    const id = generateSequentialId('postulaciones', 'PO');
    const headers = sheet.getDataRange().getValues()[0];

    const fieldMap = {
      'id': id,
      'jobId': data.jobId,
      'convocatoria_id': data.jobId,
      'jobTitle': jobTitle,
      'titulo_convocatoria': jobTitle,
      'fullName': data.fullName || data.nombre_completo || '',
      'nombre_completo': data.fullName || data.nombre_completo || '',
      'dni': data.dni,
      'email': data.email,
      'phone': data.phone || data.telefono || '',
      'telefono': data.phone || data.telefono || '',
      'linkedIn': data.linkedIn || '',
      'linkedin': data.linkedIn || '',
      'coverLetter': data.coverLetter || '',
      'carta_presentacion': data.coverLetter || '',
      'expectedSalary': data.expectedSalary || '',
      'pretension_salarial': data.expectedSalary || '',
      'availability': data.availability || '',
      'disponibilidad': data.availability || '',
      'cvUrl': cvUrl,
      'cv_url': cvUrl,
      'cvFileName': data.cvFileName || '',
      'cv_nombre': data.cvFileName || '',
      'status': 'pendiente',
      'estado': 'pendiente',
      'notes': '',
      'createdAt': now,
      'fecha_postulacion': now,
      'updatedAt': now,
    };
    const row = headers.map(h => fieldMap.hasOwnProperty(h) ? fieldMap[h] : '');
    sheet.appendRow(row);
    incrementApplicationCount(data.jobId);

    return { success: true, data: { id: id, cvUrl: cvUrl }, message: 'Postulacion enviada' };
  });

  // Notificacion por correo fuera del lock (no es parte de la seccion critica)
  if (result.success) {
    data.cvUrl = cvUrl;
    data.jobTitle = jobTitle;
    sendApplicationNotification(data);
  }

  return result;
}

function getApplications(jobId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let applications = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const app = rowToObject(headers, row);
      // El titulo ya viene en la columna jobTitle
      // Para compatibilidad, tambien agregamos titulo_convocatoria
      app.titulo_convocatoria = app.jobTitle || 'Sin titulo';
      return app;
    });

  if (jobId) {
    applications = applications.filter(a => a.jobId === jobId);
  }

  return { success: true, data: applications };
}

function getApplicationById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const app = data.slice(1).find(row => row[0] === id);
  
  if (!app) {
    return { success: false, error: 'Postulacion no encontrada' };
  }
  
  return { success: true, data: rowToObject(headers, app) };
}

function updateApplicationStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const apps = sheet.getDataRange().getValues();
  const headers = apps[0];

  // Encontrar indices dinamicamente
  const statusCol = headers.indexOf('status');
  const updatedAtCol = headers.indexOf('updatedAt');

  for (let i = 1; i < apps.length; i++) {
    if (apps[i][0] === data.id) {
      // Actualizar estado (columna status, default col 13 = indice 12)
      const statusColNum = statusCol >= 0 ? statusCol + 1 : 13;
      sheet.getRange(i + 1, statusColNum).setValue(data.estado);

      // Actualizar updatedAt si existe
      if (updatedAtCol >= 0) {
        sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date());
      }

      if (data.notificar) {
        sendStatusUpdateEmail(apps[i], data.estado);
      }

      return { success: true, message: 'Estado actualizado' };
    }
  }

  return { success: false, error: 'Postulacion no encontrada' };
}

function hireApplicant(data) {
  // Obtener datos del postulante
  const appSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const apps = appSheet.getDataRange().getValues();
  const headers = apps[0];

  // Encontrar indice de columna status dinamicamente
  const statusCol = headers.indexOf('status');
  const statusColNum = statusCol >= 0 ? statusCol + 1 : 13;

  let applicant = null;
  let rowIndex = -1;

  for (let i = 1; i < apps.length; i++) {
    if (apps[i][0] === data.applicationId) {
      applicant = rowToObject(headers, apps[i]);
      rowIndex = i;
      break;
    }
  }

  if (!applicant) {
    return { success: false, error: 'Postulacion no encontrada' };
  }

  // Crear empleado - usar nombres de columna correctos (fullName, phone)
  const employeeResult = createEmployee({
    dni: applicant.dni,
    nombre_completo: applicant.fullName || applicant.nombre_completo,
    email: applicant.email,
    telefono: applicant.phone || applicant.telefono,
    cargo: data.cargo,
    area: data.area,
    ciudad_actual: data.ciudad,
    tipo_contrato: data.tipo_contrato,
    salario: data.salario,
    crearUsuario: data.crearUsuario
  });

  if (employeeResult.success) {
    // Actualizar estado de postulacion
    appSheet.getRange(rowIndex + 1, statusColNum).setValue('contratado');

    // Asignar a proyecto si se especifica
    if (data.projectId) {
      assignEmployeeToProject({
        projectId: data.projectId,
        employeeId: employeeResult.data.id,
        rol: data.rol || 'miembro'
      });
    }

    // Notificar
    const nombre = applicant.fullName || applicant.nombre_completo;
    sendHireNotification(applicant.email, nombre, data.cargo);
  }

  return employeeResult;
}

function incrementApplicationCount(jobId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Buscar columna de conteo (soporta ambos nombres)
  let appCountCol = headers.indexOf('postulantes_count');
  if (appCountCol < 0) appCountCol = headers.indexOf('aplicaciones');
  if (appCountCol < 0) return; // columna no encontrada

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === jobId) {
      const count = parseInt(data[i][appCountCol]) || 0;
      sheet.getRange(i + 1, appCountCol + 1).setValue(count + 1);
      break;
    }
  }
}

// ============================================
// CONTACTO
// ============================================
function submitContact(data) {
  const rlError = checkRateLimit_('contact:' + (data.email || 'anon'), 10);
  if (rlError) return rlError;

  const result = withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
    const id = generateSequentialId('contactos', 'CNT');

    sheet.appendRow([
      id,
      data.name,
      data.email,
      data.phone || '',
      data.subject || 'Consulta',
      data.message,
      new Date(),
      'pendiente'
    ]);

    return { success: true, data: { id: id }, message: 'Mensaje enviado' };
  });

  if (result.success) {
    sendContactNotification(data);
  }

  return result;
}

function getContacts() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const contacts = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => rowToObject(headers, row))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { success: true, data: contacts };
}

function updateContactStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const contacts = sheet.getDataRange().getValues();

  for (let i = 1; i < contacts.length; i++) {
    if (contacts[i][0] === data.id) {
      sheet.getRange(i + 1, 8).setValue(data.estado);
      return { success: true, message: 'Estado actualizado' };
    }
  }

  return { success: false, error: 'Mensaje no encontrado' };
}

function deleteContact(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const contacts = sheet.getDataRange().getValues();

  for (let i = 1; i < contacts.length; i++) {
    if (contacts[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Mensaje eliminado' };
    }
  }

  return { success: false, error: 'Mensaje no encontrado' };
}

// ============================================
// NOTIFICACIONES
// ============================================
function sendApplicationNotification(data) {
  const subject = `Nueva Postulacion - ${data.jobTitle || 'Convocatoria'}`;
  const body = `
Nueva postulacion recibida:

Nombre: ${data.fullName}
DNI: ${data.dni}
Email: ${data.email}
Telefono: ${data.phone}
CV: ${data.cvUrl || 'No adjuntado'}

Fecha: ${new Date().toLocaleString('es-PE')}
  `;
  
  try {
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendContactNotification(data) {
  const subject = `Nuevo Mensaje - ${data.subject || 'Contacto'}`;
  const body = `
Mensaje recibido:

Nombre: ${data.name}
Email: ${data.email}
Telefono: ${data.phone || 'No proporcionado'}

Mensaje:
${data.message}

Fecha: ${new Date().toLocaleString('es-PE')}
  `;
  
  try {
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendStatusUpdateEmail(applicationRow, newStatus) {
  const messages = {
    'revisado': 'Tu postulacion ha sido revisada.',
    'entrevista': 'Has sido seleccionado para entrevista.',
    'rechazado': 'Lamentamos informarte que no has sido seleccionado.',
    'contratado': 'Felicitaciones! Has sido seleccionado.'
  };
  
  const body = `
Hola ${applicationRow[2]},

${messages[newStatus] || 'El estado de tu postulacion ha cambiado.'}

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(applicationRow[4], 'Actualizacion de Postulacion', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendHireNotification(email, nombre, cargo) {
  const body = `
Hola ${nombre},

Felicitaciones! Has sido seleccionado para el puesto de ${cargo} en Ingenieria Telcom EIRL.

Pronto recibiras mas informacion sobre tu incorporacion.

Bienvenido al equipo!

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(email, 'Bienvenido a Telcom!', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

// ============================================
// CONSULTA DE POSTULACION POR DNI
// ============================================

function consultarPostulacion(dni) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI debe tener 8 digitos' };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const applicationsSheet = ss.getSheetByName('postulaciones');

  if (!applicationsSheet) {
    return { success: false, error: 'Hoja de postulaciones no encontrada' };
  }

  const data = applicationsSheet.getDataRange().getValues();
  const headers = data[0];

  // Buscar columnas - soporta estructura nueva y antigua
  const dniCol = headers.indexOf('dni');
  const idCol = headers.indexOf('id');
  // Nueva estructura usa 'jobId', antigua usa 'convocatoria_id'
  let jobIdCol = headers.indexOf('jobId');
  if (jobIdCol < 0) jobIdCol = headers.indexOf('convocatoria_id');
  // Nueva estructura tiene 'jobTitle' directamente
  const jobTitleCol = headers.indexOf('jobTitle');
  // Nueva estructura usa 'fullName', antigua usa 'nombre_completo'
  let fullNameCol = headers.indexOf('fullName');
  if (fullNameCol < 0) fullNameCol = headers.indexOf('nombre_completo');
  const emailCol = headers.indexOf('email');
  // Nueva estructura usa 'phone', antigua usa 'telefono'
  let phoneCol = headers.indexOf('phone');
  if (phoneCol < 0) phoneCol = headers.indexOf('telefono');
  // Nueva estructura usa 'status', antigua usa 'estado'
  let statusCol = headers.indexOf('status');
  if (statusCol < 0) statusCol = headers.indexOf('estado');
  // Nueva estructura usa 'createdAt', antigua usa 'fecha_postulacion'
  let createdAtCol = headers.indexOf('createdAt');
  if (createdAtCol < 0) createdAtCol = headers.indexOf('fecha_postulacion');

  // Buscar la postulacion mas reciente del DNI
  let postulacion = null;
  let puestoNombreDirecto = null;
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][dniCol] === dni || String(data[i][dniCol]) === dni) {
      postulacion = {
        id: data[i][idCol],
        jobId: data[i][jobIdCol],
        dni: data[i][dniCol],
        fullName: data[i][fullNameCol],
        email: data[i][emailCol],
        phone: data[i][phoneCol],
        status: data[i][statusCol] || 'pendiente',
        createdAt: normalizeCellValue_(data[i][createdAtCol])
      };
      // Si tenemos jobTitle en la misma fila, usarlo
      if (jobTitleCol >= 0 && data[i][jobTitleCol]) {
        puestoNombreDirecto = data[i][jobTitleCol];
      }
      break;
    }
  }

  if (!postulacion) {
    return { success: false, error: 'No se encontro postulacion con ese DNI' };
  }

  // Obtener info del puesto (solo si no tenemos jobTitle directo)
  let puestoNombre = puestoNombreDirecto || 'Puesto no encontrado';
  if (!puestoNombreDirecto) {
    const jobsSheet = ss.getSheetByName('convocatorias');
    if (jobsSheet && postulacion.jobId) {
      const jobsData = jobsSheet.getDataRange().getValues();
      const jobHeaders = jobsData[0];
      const jobIdIdx = jobHeaders.indexOf('id');
      const jobTitleIdx = jobHeaders.indexOf('titulo');

      for (let i = 1; i < jobsData.length; i++) {
        if (jobsData[i][jobIdIdx] === postulacion.jobId) {
          puestoNombre = jobsData[i][jobTitleIdx];
          break;
        }
      }
    }
  }

  // Generar cronograma basado en estado
  const cronograma = generarCronograma(postulacion.status, postulacion.createdAt);

  // PII enmascarada: este endpoint es publico y consultable con cualquier DNI,
  // asi que email/telefono nunca se devuelven completos.
  return {
    success: true,
    data: {
      postulante: {
        nombre: postulacion.fullName,
        dni: postulacion.dni,
        email: maskEmail_(postulacion.email),
        telefono: maskPhone_(postulacion.phone)
      },
      postulacion: {
        id: postulacion.id,
        puestoId: postulacion.jobId,
        puestoNombre: puestoNombre,
        estado: postulacion.status,
        fechaPostulacion: postulacion.createdAt
      },
      cronograma: cronograma,
      entrevista: null,
      evaluacion: null
    }
  };
}

function generarCronograma(estado, fechaPostulacion) {
  const etapas = [
    { id: 1, nombre: 'Postulacion Recibida', descripcion: 'Tu postulacion ha sido registrada', estado: 'completada' },
    { id: 2, nombre: 'Revision de CV', descripcion: 'Estamos evaluando tu perfil', estado: 'pendiente' },
    { id: 3, nombre: 'Entrevista', descripcion: 'Entrevista con el equipo', estado: 'pendiente' },
    { id: 4, nombre: 'Evaluacion Tecnica', descripcion: 'Prueba de conocimientos', estado: 'pendiente' },
    { id: 5, nombre: 'Resultado Final', descripcion: 'Comunicacion del resultado', estado: 'pendiente' }
  ];

  const estadoMap = {
    'pendiente': 1,
    'en_revision': 2,
    'entrevista': 3,
    'evaluacion': 4,
    'aprobado': 5,
    'rechazado': 5,
    'contratado': 5
  };

  const etapaActual = estadoMap[estado] || 1;

  return etapas.map((etapa, index) => {
    if (index + 1 < etapaActual) {
      etapa.estado = 'completada';
      etapa.fecha = fechaPostulacion;
    } else if (index + 1 === etapaActual) {
      etapa.estado = 'actual';
    }
    return etapa;
  });
}

// Enmascara PII para respuestas de endpoints publicos (consultables por cualquier DNI)
function maskEmail_(email) {
  const s = String(email || '').trim();
  if (!s) return '';
  const at = s.indexOf('@');
  if (at <= 0) return '***';
  return s.slice(0, Math.min(2, at)) + '***' + s.slice(at);
}

function maskPhone_(phone) {
  const s = String(phone || '').trim();
  if (!s) return '';
  if (s.length <= 3) return '***';
  return '***' + s.slice(-3);
}

function historialPostulaciones(dni) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI debe tener 8 digitos' };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const applicationsSheet = ss.getSheetByName('postulaciones');

  if (!applicationsSheet) {
    return { success: false, error: 'Hoja no encontrada' };
  }

  const data = applicationsSheet.getDataRange().getValues();
  const headers = data[0];

  const dniCol = headers.indexOf('dni');
  const postulaciones = [];

  // WHITELIST de campos: endpoint publico — antes volcaba la fila completa,
  // incluyendo cv_url, email y telefono de cualquier postulante (fuga de PII).
  const col = (names) => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const idCol = col(['id']);
  const jobIdCol = col(['jobId', 'convocatoria_id']);
  const jobTitleCol = col(['jobTitle']);
  const statusCol = col(['status', 'estado']);
  const createdAtCol = col(['createdAt', 'fecha_postulacion']);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][dniCol]) === String(dni)) {
      postulaciones.push({
        id: idCol >= 0 ? data[i][idCol] : '',
        jobId: jobIdCol >= 0 ? data[i][jobIdCol] : '',
        jobTitle: jobTitleCol >= 0 ? data[i][jobTitleCol] : '',
        status: (statusCol >= 0 ? data[i][statusCol] : '') || 'pendiente',
        createdAt: createdAtCol >= 0 ? data[i][createdAtCol] : ''
      });
    }
  }

  return { success: true, data: postulaciones };
}

// ============================================================
// CAPACITACIONES — cursos, banco de preguntas y evaluaciones
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// --- CRUD Capacitaciones ---

function getCapacitaciones() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) { return rowToObject(headers, r); })
    .filter(function(c) { return c.estado === 'activo'; });
  return { success: true, data: rows };
}

function getCapacitacionById(id) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return { success: true, data: rowToObject(headers, data[i]) };
    }
  }
  return { success: false, error: 'Capacitacion no encontrada' };
}

function crearCapacitacion(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var id = 'CAP' + Utilities.getUuid().substring(0, 8).toUpperCase();
  sheet.appendRow([
    id,
    data.titulo || '',
    data.descripcion || '',
    data.material_url || '',
    data.categoria || '',
    data.num_preguntas || 15,
    data.nota_minima || 14,
    data.tiempo_limite_min || 30,
    data.foto_intervalo_seg || 20,
    data.estado || 'borrador',
    new Date().toISOString()
  ]);
  return { success: true, data: { id: id }, message: 'Capacitacion creada' };
}

function actualizarCapacitacion(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      var fieldMap = {
        titulo: data.titulo, descripcion: data.descripcion,
        material_url: data.material_url, categoria: data.categoria,
        num_preguntas: data.num_preguntas, nota_minima: data.nota_minima,
        tiempo_limite_min: data.tiempo_limite_min, foto_intervalo_seg: data.foto_intervalo_seg,
        estado: data.estado
      };
      headers.forEach(function(h, col) {
        if (fieldMap.hasOwnProperty(h) && fieldMap[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(fieldMap[h]);
        }
      });
      return { success: true, message: 'Capacitacion actualizada' };
    }
  }
  return { success: false, error: 'Capacitacion no encontrada' };
}

function eliminarCapacitacion(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Capacitacion eliminada' };
    }
  }
  return { success: false, error: 'Capacitacion no encontrada' };
}

// --- CRUD Banco de Preguntas ---

function getPreguntas(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja banco_preguntas no encontrada' };
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  var headers = rows[0];
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) { return rowToObject(headers, r); });
  if (data && data.capacitacion_id) {
    result = result.filter(function(p) {
      return String(p.capacitacion_id) === String(data.capacitacion_id);
    });
  }
  return { success: true, data: result };
}

function crearPregunta(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja banco_preguntas no encontrada' };
  var id = 'PQ' + Utilities.getUuid().substring(0, 8).toUpperCase();
  sheet.appendRow([
    id,
    data.capacitacion_id || '',
    data.pregunta || '',
    data.tipo || 'multiple',
    data.opcion_a || '',
    data.opcion_b || '',
    data.opcion_c || '',
    data.opcion_d || '',
    data.respuesta_correcta || '',
    data.justificacion || '',
    data.dificultad || 'media',
    data.puntaje || 1,
    data.estado || 'activa'
  ]);
  return { success: true, data: { id: id }, message: 'Pregunta creada' };
}

function actualizarPregunta(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      var fieldMap = {
        pregunta: data.pregunta, tipo: data.tipo,
        opcion_a: data.opcion_a, opcion_b: data.opcion_b,
        opcion_c: data.opcion_c, opcion_d: data.opcion_d,
        respuesta_correcta: data.respuesta_correcta,
        justificacion: data.justificacion, dificultad: data.dificultad,
        puntaje: data.puntaje, estado: data.estado
      };
      headers.forEach(function(h, col) {
        if (fieldMap.hasOwnProperty(h) && fieldMap[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(fieldMap[h]);
        }
      });
      return { success: true, message: 'Pregunta actualizada' };
    }
  }
  return { success: false, error: 'Pregunta no encontrada' };
}

function eliminarPregunta(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Pregunta eliminada' };
    }
  }
  return { success: false, error: 'Pregunta no encontrada' };
}

// --- Evaluaciones ---

function iniciarEvaluacion(data) {
  var capacitacion_id = data.capacitacion_id;
  var dni = String(data.dni || '').trim();
  var nombres = data.nombres || '';
  var email = data.email || '';

  if (!capacitacion_id || !dni || !nombres || !email) {
    return { success: false, error: 'Faltan campos obligatorios: capacitacion_id, dni, nombres, email' };
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);

  var capResult = getCapacitacionById(capacitacion_id);
  if (!capResult.success) return { success: false, error: 'Capacitacion no encontrada' };
  var cap = capResult.data;
  if (cap.estado !== 'activo') return { success: false, error: 'Esta capacitacion no esta disponible' };

  var evalSheet = ss.getSheetByName('evaluaciones');
  if (!evalSheet) return { success: false, error: 'Hoja evaluaciones no encontrada' };

  // Verificacion temprana de intento unico (fuera del lock, solo para
  // fallar rapido sin hacer el trabajo de barajeo si ya existe un intento).
  // La verificacion real que previene la race condition se repite dentro
  // del lock, justo antes de insertar la fila.
  if (existeIntentoEvaluacion_(evalSheet, capacitacion_id, dni)) {
    return { success: false, error: 'Ya existe un intento registrado para esta capacitacion con este DNI' };
  }

  // Cargar preguntas activas
  var bancoSheet = ss.getSheetByName('banco_preguntas');
  if (!bancoSheet) return { success: false, error: 'Banco de preguntas no encontrado' };
  var bancoData = bancoSheet.getDataRange().getValues();
  var bancoHeaders = bancoData[0];
  var bCapCol = bancoHeaders.indexOf('capacitacion_id');
  var bEstCol = bancoHeaders.indexOf('estado');
  var todasPreguntas = [];
  for (var j = 1; j < bancoData.length; j++) {
    if (String(bancoData[j][bCapCol]) === String(capacitacion_id) &&
        bancoData[j][bEstCol] === 'activa') {
      todasPreguntas.push(rowToObject(bancoHeaders, bancoData[j]));
    }
  }
  if (todasPreguntas.length === 0) {
    return { success: false, error: 'No hay preguntas activas para esta capacitacion' };
  }

  var seed = parseInt(dni.replace(/\D/g, ''), 10) || 12345678;
  var rng = seededRandom(seed);
  var numPreguntass = parseInt(cap.num_preguntas, 10) || 15;

  var faciles = todasPreguntas.filter(function(p) { return p.dificultad === 'facil'; });
  var medias  = todasPreguntas.filter(function(p) { return p.dificultad === 'media'; });
  var dificiles = todasPreguntas.filter(function(p) { return p.dificultad === 'dificil'; });
  var seleccionadas = [];

  if (faciles.length > 0 || medias.length > 0 || dificiles.length > 0) {
    var nFacil = Math.round(numPreguntass * 0.30);
    var nDificil = Math.round(numPreguntass * 0.20);
    var nMedia = numPreguntass - nFacil - nDificil;
    seleccionadas = seleccionadas
      .concat(shuffleArray(faciles, rng).slice(0, nFacil))
      .concat(shuffleArray(medias, rng).slice(0, nMedia))
      .concat(shuffleArray(dificiles, rng).slice(0, nDificil));
    if (seleccionadas.length < numPreguntass) {
      var todas = shuffleArray(todasPreguntas, rng);
      var ids = seleccionadas.map(function(p) { return p.id; });
      for (var k = 0; k < todas.length && seleccionadas.length < numPreguntass; k++) {
        if (ids.indexOf(todas[k].id) < 0) seleccionadas.push(todas[k]);
      }
    }
  } else {
    seleccionadas = shuffleArray(todasPreguntas, rng).slice(0, numPreguntass);
  }

  var preguntasParaCliente = seleccionadas.map(function(p, idx) {
    var rngP = seededRandom(seed + idx + 1);
    var opciones = [];
    if (p.opcion_a) opciones.push({ key: 'A', texto: p.opcion_a });
    if (p.opcion_b) opciones.push({ key: 'B', texto: p.opcion_b });
    if (p.opcion_c) opciones.push({ key: 'C', texto: p.opcion_c });
    if (p.opcion_d) opciones.push({ key: 'D', texto: p.opcion_d });
    return {
      id: p.id,
      pregunta: p.pregunta,
      tipo: p.tipo,
      opciones: shuffleArray(opciones, rngP),
      puntaje: p.puntaje
    };
  });

  var evalId = 'EVAL' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var horaInicio = new Date().toISOString();
  var preguntasIds = JSON.stringify(seleccionadas.map(function(p) { return p.id; }));

  // Seccion critica: reverificar intento unico e insertar la fila de forma
  // atomica, para evitar que dos requests concurrentes del mismo DNI pasen
  // ambas la verificacion antes de que exista la fila.
  var lockResult = withLock_(function () {
    if (existeIntentoEvaluacion_(evalSheet, capacitacion_id, dni)) {
      return { success: false, error: 'Ya existe un intento registrado para esta capacitacion con este DNI' };
    }
    evalSheet.appendRow([
      evalId, capacitacion_id, dni, nombres, email,
      preguntasIds, '', '', 0, '',
      horaInicio, '', '', 'en_curso',
      '', '', '', ''
    ]);
    return { success: true };
  });

  if (!lockResult.success) return lockResult;

  return {
    success: true,
    data: {
      evaluacion_id: evalId,
      preguntas: preguntasParaCliente,
      config: {
        tiempo_limite_min: cap.tiempo_limite_min || 30,
        foto_intervalo_seg: cap.foto_intervalo_seg || 20,
        nota_minima: cap.nota_minima || 14,
        titulo: cap.titulo
      }
    }
  };
}

// Verifica si ya existe un intento (no abandonado) para un DNI en una
// capacitacion dada. Lee la sheet fresca (getDataRange) cada vez que se
// llama, por eso es seguro usarla dentro y fuera del lock.
function existeIntentoEvaluacion_(evalSheet, capacitacion_id, dni) {
  var evalData = evalSheet.getDataRange().getValues();
  var evalHeaders = evalData[0];
  var capIdCol = evalHeaders.indexOf('capacitacion_id');
  var dniCol2 = evalHeaders.indexOf('dni');
  var estadoCol = evalHeaders.indexOf('estado');
  for (var i = 1; i < evalData.length; i++) {
    if (String(evalData[i][capIdCol]) === String(capacitacion_id) &&
        String(evalData[i][dniCol2]) === dni &&
        evalData[i][estadoCol] !== 'abandonado') {
      return true;
    }
  }
  return false;
}

function submitEvaluacion(requestData) {
  var evaluacion_id = requestData.evaluacion_id;
  var respuestas = requestData.respuestas;
  var salidas_pestana = requestData.salidas_pestana || 0;
  var fotos_url = requestData.fotos_url || '';
  var duracion_seg = requestData.duracion_seg || 0;

  if (!evaluacion_id) return { success: false, error: 'evaluacion_id requerido' };

  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var evalSheet = ss.getSheetByName('evaluaciones');
    if (!evalSheet) return { success: false, error: 'Hoja evaluaciones no encontrada' };

    var evalData = evalSheet.getDataRange().getValues();
    var evalHeaders = evalData[0];
    var rowIdx = -1;
    var evalRow = null;
    var idCol = evalHeaders.indexOf('id');
    for (var i = 1; i < evalData.length; i++) {
      if (String(evalData[i][idCol]) === String(evaluacion_id)) {
        rowIdx = i + 1;
        evalRow = rowToObject(evalHeaders, evalData[i]);
        break;
      }
    }
    if (!evalRow) return { success: false, error: 'Evaluacion no encontrada' };
    if (evalRow.estado !== 'en_curso') return { success: false, error: 'Esta evaluacion ya fue enviada' };

    var preguntasIds = [];
    try { preguntasIds = JSON.parse(evalRow.preguntas_asignadas || '[]'); } catch(e) {}

    var bancoSheet = ss.getSheetByName('banco_preguntas');
    var bancoPorId = {};
    if (bancoSheet) {
      var bancoData = bancoSheet.getDataRange().getValues();
      var bHeaders = bancoData[0];
      for (var j = 1; j < bancoData.length; j++) {
        var pObj = rowToObject(bHeaders, bancoData[j]);
        bancoPorId[pObj.id] = pObj;
      }
    }

    var puntajeAuto = 0;
    var respObj = typeof respuestas === 'string' ? JSON.parse(respuestas) : (respuestas || {});
    var tieneLlenado = false;
    preguntasIds.forEach(function(pid) {
      var p = bancoPorId[pid];
      if (!p) return;
      var resp = respObj[pid];
      if (p.tipo === 'multiple') {
        if (normalizar(resp) === normalizar(p.respuesta_correcta)) {
          puntajeAuto += Number(p.puntaje) || 1;
        }
      } else {
        tieneLlenado = true;
        if (matchFlexible(resp, p.respuesta_correcta)) {
          puntajeAuto += Number(p.puntaje) || 1;
        }
      }
    });

    var updateMap = {
      respuestas: JSON.stringify(respObj),
      puntaje_auto: puntajeAuto,
      salidas_pestana: salidas_pestana,
      fotos_url: typeof fotos_url === 'string' ? fotos_url : JSON.stringify(fotos_url),
      hora_fin: new Date().toISOString(),
      duracion_seg: duracion_seg,
      estado: 'pendiente_revision'
    };
    evalHeaders.forEach(function(h, col) {
      if (updateMap.hasOwnProperty(h)) {
        evalSheet.getRange(rowIdx, col + 1).setValue(updateMap[h]);
      }
    });

    return {
      success: true,
      data: { puntaje_auto: puntajeAuto, tiene_llenado: tieneLlenado },
      message: 'Evaluacion recibida. Tu resultado llegara a tu correo tras revision.'
    };
  });
}

function getEvaluaciones(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('evaluaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) { return rowToObject(headers, r); });
  if (data && data.estado) result = result.filter(function(e) { return e.estado === data.estado; });
  if (data && data.capacitacion_id) result = result.filter(function(e) { return String(e.capacitacion_id) === String(data.capacitacion_id); });
  result.sort(function(a, b) { return String(b.hora_inicio) > String(a.hora_inicio) ? 1 : -1; });
  return { success: true, data: result };
}

function revisarEvaluacion(data) {
  var id = data.id;
  var nota_final = data.nota_final;
  var retroalimentacion = data.retroalimentacion || '';
  var estado = data.estado;

  if (!id || nota_final === undefined || !estado) return { success: false, error: 'Faltan campos: id, nota_final, estado' };
  if (['aprobado', 'observado'].indexOf(estado) < 0) return { success: false, error: 'Estado debe ser aprobado u observado' };

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('evaluaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var rowIdx = -1;
  var evalRow = null;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIdx = i + 1;
      evalRow = rowToObject(headers, rows[i]);
      break;
    }
  }
  if (!evalRow) return { success: false, error: 'Evaluacion no encontrada' };

  var updateMap = {
    nota_final: nota_final,
    retroalimentacion: retroalimentacion,
    estado: estado,
    revisado_por: data.revisado_por || 'Admin',
    fecha_revision: new Date().toISOString()
  };
  headers.forEach(function(h, col) {
    if (updateMap.hasOwnProperty(h)) sheet.getRange(rowIdx, col + 1).setValue(updateMap[h]);
  });

  var capResult = getCapacitacionById(evalRow.capacitacion_id);
  var tituloCap = capResult.success ? capResult.data.titulo : 'Capacitacion';

  try {
    var emailDest = evalRow.email;
    if (emailDest && emailDest.indexOf('@') > 0) {
      var estadoLabel = estado === 'aprobado' ? 'APROBADO' : 'OBSERVADO';
      var colorEstado = estado === 'aprobado' ? '#16a34a' : '#d97706';
      MailApp.sendEmail({
        to: emailDest,
        subject: 'Resultado Evaluacion: ' + tituloCap + ' - ' + estadoLabel,
        htmlBody: '<p>Estimado/a <strong>' + evalRow.nombres + '</strong>,</p>' +
          '<p>Hemos revisado tu evaluacion de <strong>' + tituloCap + '</strong>.</p>' +
          '<table style="border-collapse:collapse;margin:16px 0"><tr>' +
          '<td style="padding:6px 16px;background:#f1f5f9"><strong>Resultado</strong></td>' +
          '<td style="padding:6px 16px;color:' + colorEstado + '"><strong>' + estadoLabel + '</strong></td></tr>' +
          '<tr><td style="padding:6px 16px;background:#f1f5f9"><strong>Nota</strong></td>' +
          '<td style="padding:6px 16px"><strong>' + nota_final + '</strong></td></tr></table>' +
          (retroalimentacion ? '<p><strong>Retroalimentacion del evaluador:</strong><br>' + retroalimentacion + '</p>' : '') +
          '<p>Att,<br><strong>Ingenieria Telcom EIRL</strong></p>'
      });
    }
  } catch(mailErr) {
    return { success: true, message: 'Revision guardada. Error al enviar correo: ' + mailErr.message };
  }

  return { success: true, message: 'Revision guardada y correo enviado a ' + evalRow.email };
}

function guardarFotoWebcam(data) {
  var fileContent = data.fileContent;
  var fileName = data.fileName || ('foto_' + new Date().getTime() + '.jpg');
  var mimeType = data.mimeType || 'image/jpeg';
  var capacitacion_id = data.capacitacion_id || 'general';
  var dni = data.dni || 'sin_dni';
  var evaluacion_id = data.evaluacion_id || '';

  if (!fileContent) return { success: false, error: 'fileContent requerido' };

  var archivoError = validarArchivoSubido_(fileContent, mimeType, 'imagen');
  if (archivoError) return archivoError;

  var rlError = checkRateLimit_('evalfoto:' + (data.dni || 'anon'), 60);
  if (rlError) return rlError;

  try {
    var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var proctoringFolder = getOrCreateFolderCached_(mainFolder, 'Evaluaciones_Proctoring');
    var capFolder = getOrCreateFolderCached_(proctoringFolder, String(capacitacion_id));
    var dniFolder = getOrCreateFolderCached_(capFolder, String(dni));

    var blob = Utilities.newBlob(Utilities.base64Decode(fileContent), mimeType, fileName);
    var file = dniFolder.createFile(blob);
    // C6: archivo privado — el visor admin lo sirve via getArchivo (nivel auth)
    var fotoUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';

    if (evaluacion_id) {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var fotosSheet = ss.getSheetByName('eval_fotos');
      if (fotosSheet) {
        fotosSheet.appendRow([
          Utilities.getUuid(), evaluacion_id, fotoUrl, new Date().toISOString(), fotosSheet.getLastRow()
        ]);
      }
    }
    return { success: true, data: { foto_url: fotoUrl, foto_id: file.getId() } };
  } catch(e) {
    return { success: false, error: 'Error al guardar foto: ' + e.message };
  }
}

function registrarEventoLog(data) {
  var rlError = checkRateLimit_('evallog:' + (data.dni || 'anon'), 120);
  if (rlError) return rlError;

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('eval_logs');
  if (!sheet) return { success: false, error: 'Hoja eval_logs no encontrada' };
  sheet.appendRow([
    Utilities.getUuid(),
    data.evaluacion_id || '',
    data.tipo_evento || 'desconocido',
    data.detalle || '',
    new Date().toISOString()
  ]);
  return { success: true };
}

// ============================================================
// ASISTENCIA — kiosko V2 (foto+GPS) y legado V1
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// SISTEMA DE ASISTENCIA (KIOSKO)
// ============================================

function verificarEmpleado(dni) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI debe tener 8 digitos' };
  }

  // Roster real (hoja 'sueldos') — fuente unica de la verdad. La hoja legado
  // 'empleados' esta vacia y rechazaba a los 13 trabajadores reales.
  // Se leen tambien los cesados para poder dar un mensaje claro en vez de
  // "DNI no encontrado", que haria pensar en un error del sistema.
  const roster = leerRosterReal_(true);
  const trabajador = roster.find(function (t) { return t.dni === dni; });

  if (!trabajador) {
    return { success: false, error: 'DNI no encontrado en el sistema' };
  }

  if (!trabajador.activo) {
    return { success: false, error: 'Trabajador cesado el ' + trabajador.fecha_fin + '. Comuniquese con administracion.' };
  }

  // Id sintetico igual al usado en getEmployees ('SUE-<dni>') para no romper el shape.
  const id = 'SUE-' + trabajador.dni;

  // Verificar si ya marco hoy
  const asistenciaHoy = obtenerAsistenciaEmpleadoHoy(id);

  return {
    success: true,
    data: {
      id: id,
      dni: dni,
      nombre: trabajador.nombre,
      cargo: trabajador.cargo,
      foto: null,
      asistenciaHoy: asistenciaHoy
    }
  };
}

function obtenerAsistenciaEmpleadoHoy(employeeId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const attendanceSheet = ss.getSheetByName('Asistencias'); // Mayuscula como tu hoja

  if (!attendanceSheet) {
    return null;
  }

  const hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  // Usar nombres de columna de tu estructura existente
  const empIdCol = headers.indexOf('employeeId');
  const dateCol = headers.indexOf('date');
  const checkInCol = headers.indexOf('checkIn');
  const checkOutCol = headers.indexOf('checkOut');

  for (let i = 1; i < data.length; i++) {
    if (data[i][empIdCol] === employeeId && data[i][dateCol] === hoy) {
      return {
        fecha: hoy,
        entrada: data[i][checkInCol] || null,
        salida: data[i][checkOutCol] || null
      };
    }
  }

  return null;
}

function marcarAsistencia(requestData) {
  const { dni, tipo, lat, lng, accuracy } = requestData;
  const location = { lat, lng, accuracy };

  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI invalido' };
  }

  if (!tipo || !['entrada', 'salida'].includes(tipo)) {
    return { success: false, error: 'Tipo debe ser entrada o salida' };
  }

  // Verificar empleado (ya usa el roster real internamente)
  const empleadoResult = verificarEmpleado(dni);
  if (!empleadoResult.success) {
    return empleadoResult;
  }

  const empleado = empleadoResult.data;

  // Escritura protegida con lock para evitar dobles marcas en concurrencia
  return withLock_(function () {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let attendanceSheet = ss.getSheetByName('Asistencias'); // Tu hoja existente con mayuscula

    // Crear hoja si no existe (con tu estructura)
    if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet('Asistencias');
      attendanceSheet.appendRow([
        'id', 'employeeId', 'employeeName', 'employeeDni', 'date',
        'checkIn', 'checkOut', 'checkInLat', 'checkInLng', 'checkInAccuracy',
        'checkOutLat', 'checkOutLng', 'checkOutAccuracy', 'status', 'hoursWorked', 'createdAt'
      ]);
    }

    const ahora = new Date();
    const hoy = Utilities.formatDate(ahora, 'America/Lima', 'yyyy-MM-dd');
    const horaActual = Utilities.formatDate(ahora, 'America/Lima', 'HH:mm:ss');

    const data = attendanceSheet.getDataRange().getValues();
    const headers = data[0];

    // Usar nombres de columna de tu estructura existente
    const empIdCol = headers.indexOf('employeeId');
    const dateCol = headers.indexOf('date');
    const checkInCol = headers.indexOf('checkIn');
    const checkOutCol = headers.indexOf('checkOut');
    const checkInLatCol = headers.indexOf('checkInLat');
    const checkInLngCol = headers.indexOf('checkInLng');
    const checkInAccCol = headers.indexOf('checkInAccuracy');
    const checkOutLatCol = headers.indexOf('checkOutLat');
    const checkOutLngCol = headers.indexOf('checkOutLng');
    const checkOutAccCol = headers.indexOf('checkOutAccuracy');
    const statusCol = headers.indexOf('status');
    const hoursWorkedCol = headers.indexOf('hoursWorked');

    // Buscar registro de hoy
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][empIdCol] === empleado.id && data[i][dateCol] === hoy) {
        rowIndex = i + 1;
        break;
      }
    }

    if (tipo === 'entrada') {
      if (rowIndex > 0) {
        return { success: false, error: 'Ya registraste tu entrada hoy' };
      }

      // Crear nuevo registro con tu estructura de columnas
      const newId = Utilities.getUuid();
      const newRow = [
        newId,                          // id
        empleado.id,                    // employeeId
        empleado.nombre,                // employeeName
        empleado.dni,                   // employeeDni
        hoy,                            // date
        horaActual,                     // checkIn
        '',                             // checkOut
        location.lat || '',             // checkInLat
        location.lng || '',             // checkInLng
        location.accuracy || '',        // checkInAccuracy
        '',                             // checkOutLat
        '',                             // checkOutLng
        '',                             // checkOutAccuracy
        'present',                      // status
        '',                             // hoursWorked
        ahora.toISOString()             // createdAt
      ];
      attendanceSheet.appendRow(newRow);

      return {
        success: true,
        data: {
          tipo: 'entrada',
          hora: horaActual,
          empleado: empleado.nombre,
          mensaje: 'Entrada registrada correctamente'
        }
      };
    } else {
      // Salida
      if (rowIndex < 0) {
        return { success: false, error: 'No has registrado entrada hoy' };
      }

      if (data[rowIndex - 1][checkOutCol]) {
        return { success: false, error: 'Ya registraste tu salida hoy' };
      }

      // Actualizar salida
      attendanceSheet.getRange(rowIndex, checkOutCol + 1).setValue(horaActual);
      if (checkOutLatCol >= 0) attendanceSheet.getRange(rowIndex, checkOutLatCol + 1).setValue(location.lat || '');
      if (checkOutLngCol >= 0) attendanceSheet.getRange(rowIndex, checkOutLngCol + 1).setValue(location.lng || '');
      if (checkOutAccCol >= 0) attendanceSheet.getRange(rowIndex, checkOutAccCol + 1).setValue(location.accuracy || '');

      // Calcular horas trabajadas
      const entrada = data[rowIndex - 1][checkInCol];
      const horasTrabajadas = calcularHorasTrabajadas(entrada, horaActual);
      if (hoursWorkedCol >= 0) {
        attendanceSheet.getRange(rowIndex, hoursWorkedCol + 1).setValue(horasTrabajadas);
      }

      return {
        success: true,
        data: {
          tipo: 'salida',
          hora: horaActual,
          empleado: empleado.nombre,
          horasTrabajadas: horasTrabajadas,
          mensaje: 'Salida registrada correctamente'
        }
      };
    }
  });
}

function calcularHorasTrabajadas(entrada, salida) {
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);

  const minutosEntrada = hE * 60 + mE;
  const minutosSalida = hS * 60 + mS;
  const diff = minutosSalida - minutosEntrada;

  return Math.round(diff / 60 * 100) / 100;
}

function obtenerAsistenciasHoy() {
  var hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');

  // Roster real (hoja 'sueldos') como fuente unica
  var roster = leerRosterReal_();
  var total = roster.length;
  var nombrePorDni = {};
  roster.forEach(function(t){ nombrePorDni[t.dni] = t.nombre; });

  // Registros de HOY desde asistencias_v2, ya normalizados (hora desde timestamp UTC)
  var res = getAsistenciasV2({ desde: hoy, hasta: hoy });
  var regs = (res && res.data) ? res.data : [];

  // Agrupar por DNI: primer ingreso y ultima salida del dia
  var byDni = {};
  regs.forEach(function(r){
    var d = String(r.dni);
    if (!byDni[d]) byDni[d] = { ingresos: [], salidas: [] };
    var ev = String(r.evento || '');
    var hora = String(r.hora || '');
    if (ev.indexOf('ingreso') === 0) byDni[d].ingresos.push(hora);
    else if (ev.indexOf('salida') === 0) byDni[d].salidas.push(hora);
  });

  var registros = [];
  var presentes = 0;
  Object.keys(byDni).forEach(function(d){
    var b = byDni[d];
    b.ingresos.sort(); b.salidas.sort();
    var ultIng = b.ingresos.length ? b.ingresos[b.ingresos.length - 1] : '';
    var ultSal = b.salidas.length ? b.salidas[b.salidas.length - 1] : '';
    registros.push({
      dni: d,
      nombre: nombrePorDni[d] || ('DNI ' + d),
      entrada: b.ingresos.length ? b.ingresos[0].slice(0, 5) : '',
      salida: ultSal ? ultSal.slice(0, 5) : '',
      estado: (ultSal && ultSal >= ultIng) ? 'fuera' : 'dentro'
    });
    if (nombrePorDni[d] !== undefined) presentes++;
  });

  return {
    success: true,
    data: {
      fecha: hoy,
      total: total,
      totalEmpleados: total,
      dentro: presentes,
      presentes: presentes,
      fuera: Math.max(0, total - presentes),
      registros: registros
    }
  };
}

// ============================================
// OBTENER ASISTENCIAS CON FILTROS (ADMIN)
// ============================================
function getAttendances(fecha, employeeId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const attendanceSheet = ss.getSheetByName('Asistencias');

  if (!attendanceSheet) {
    return { success: true, data: [] };
  }

  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  // Obtener indices de columnas
  const idCol = headers.indexOf('id');
  const empIdCol = headers.indexOf('employeeId');
  const empNameCol = headers.indexOf('employeeName');
  const empDniCol = headers.indexOf('employeeDni');
  const dateCol = headers.indexOf('date');
  const checkInCol = headers.indexOf('checkIn');
  const checkOutCol = headers.indexOf('checkOut');
  const checkInLatCol = headers.indexOf('checkInLat');
  const checkInLngCol = headers.indexOf('checkInLng');
  const checkOutLatCol = headers.indexOf('checkOutLat');
  const checkOutLngCol = headers.indexOf('checkOutLng');
  const statusCol = headers.indexOf('status');
  const hoursCol = headers.indexOf('hoursWorked');

  // Usar fecha de hoy si no se proporciona
  const targetDate = fecha || Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');

  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Filtrar por fecha
    if (row[dateCol] !== targetDate) continue;

    // Filtrar por empleado si se especifica
    if (employeeId && row[empIdCol] !== employeeId) continue;

    records.push({
      id: row[idCol],
      employeeId: row[empIdCol],
      employeeName: row[empNameCol],
      employeeDni: row[empDniCol],
      date: row[dateCol],
      checkIn: row[checkInCol] || '',
      checkOut: row[checkOutCol] || '',
      checkInLat: row[checkInLatCol] || null,
      checkInLng: row[checkInLngCol] || null,
      checkOutLat: row[checkOutLatCol] || null,
      checkOutLng: row[checkOutLngCol] || null,
      status: row[statusCol] || 'pending',
      hoursWorked: row[hoursCol] || 0
    });
  }

  return { success: true, data: records };
}

// ============================================================
// FIN MODULO CAPACITACIONES Y EVALUACIONES
// ============================================================

// ============================================================
// MODULO ASISTENCIA V2 — FOTO + GPS + JUSTIFICACIONES
// Hojas: 'asistencias_v2' y 'justificaciones'
// NOTA: getSheetByName es case-insensitive, por eso NO se usa
// 'asistencias' (colisiona con la hoja vieja 'Asistencias')
// Drive: Asistencias/AAAA-MM-DD/<dni>/<evento>_<timestamp>.jpg
//        Justificaciones/AAAA-MM-DD/<dni>/just_<timestamp>.<ext>
// ============================================================

var EVENTOS_ASISTENCIA_V2 = ['ingreso_manana', 'salida_manana', 'ingreso_tarde', 'salida_tarde'];
// Eventos de trabajadores de campo (sin correo): Ingreso/Salida por turnos,
// se permiten varios al dia. Solo bitacora, fuera del modelo de descuentos.
var EVENTOS_CAMPO = ['ingreso_campo', 'salida_campo'];

var HEADERS_ASISTENCIAS_V2 = [
  'id', 'dni', 'nombre', 'cargo', 'evento', 'fecha', 'hora',
  'gps_lat', 'gps_lng', 'gps_accuracy', 'foto_url', 'timestamp'
];

var HEADERS_JUSTIFICACIONES = [
  'id', 'dni', 'nombre', 'cargo', 'motivo', 'descripcion',
  'archivo_url', 'fecha', 'timestamp'
];

// Ejecutar UNA VEZ desde el editor para crear las hojas (no toca hojas existentes)
function setupAsistenciaSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  if (!ss.getSheetByName('asistencias_v2')) {
    var s = ss.insertSheet('asistencias_v2');
    s.appendRow(HEADERS_ASISTENCIAS_V2);
    s.getRange(1, 1, 1, HEADERS_ASISTENCIAS_V2.length).setFontWeight('bold');
  }
  if (!ss.getSheetByName('justificaciones')) {
    var j = ss.insertSheet('justificaciones');
    j.appendRow(HEADERS_JUSTIFICACIONES);
    j.getRange(1, 1, 1, HEADERS_JUSTIFICACIONES.length).setFontWeight('bold');
  }
  Logger.log('Hojas asistencias y justificaciones listas');
}

function getOrCreateAsistenciaSheet_(ss, nombre, headers) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// Busca un DNI en el roster del kiosko. CRITICO: se llama en el camino
// caliente del registro (rafaga de las 07:30), asi que NO puede abrir el
// Spreadsheet en cada marca — reutiliza getTrabajadores(), que responde desde
// CacheService (10 min). Pasar incluirCesados=true para el roster completo.
//
// Devuelve { estado: 'ok' | 'no_encontrado' | 'indisponible', trabajador }.
// 'indisponible' = no se pudo leer el roster; quien llama decide si bloquea.
function buscarEnRosterKiosko_(dni, incluirCesados) {
  try {
    var res = getTrabajadores(incluirCesados ? { incluirCesados: true } : undefined);
    if (!res || !res.success || !res.data) return { estado: 'indisponible' };
    for (var i = 0; i < res.data.length; i++) {
      if (String(res.data[i].dni) === String(dni)) {
        return { estado: 'ok', trabajador: res.data[i] };
      }
    }
    return { estado: 'no_encontrado' };
  } catch (e) {
    return { estado: 'indisponible' };
  }
}

// ── Anti-duplicado de coste constante ───────────────────────
// Antes, cada marca barria TODA la hoja asistencias_v2 dentro del lock. La
// hoja crece ~1,100 filas al mes, asi que el tiempo que cada marca retenia el
// lock crecia con el historico — y a las 07:30 doce personas hacen cola por
// ese mismo lock. Ahora hay dos capas:
//   1) Indice del dia en CacheService: acierto = rechazo sin tocar la hoja.
//   2) Lectura del tramo final de la hoja, que se amplia SOLO si no alcanza a
//      cubrir la fecha buscada (nunca se responde desde un tramo insuficiente).
var CACHE_TTL_DUP_ = 21600;          // 6 h — cubre de sobra una jornada
var FILAS_TRAMO_ASISTENCIA_ = 600;   // ~12 dias de marcas
var FILAS_TRAMO_CARRERA_ = 60;       // ventana para detectar marcas simultaneas

function claveDup_(dni, evento) { return String(dni) + '|' + String(evento); }
function cacheKeyDia_(fecha) { return 'asisdia:' + fecha; }

function leerIndiceDia_(fecha) {
  try {
    var raw = CacheService.getScriptCache().get(cacheKeyDia_(fecha));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function marcarEnIndiceDia_(fecha, dni, evento) {
  try {
    var idx = leerIndiceDia_(fecha) || {};
    idx[claveDup_(dni, evento)] = 1;
    CacheService.getScriptCache().put(cacheKeyDia_(fecha), JSON.stringify(idx), CACHE_TTL_DUP_);
  } catch (e) { /* no critico: la hoja sigue siendo la autoridad */ }
}

// Busca (dni, evento, fecha) leyendo solo el tramo final de la hoja. Si la
// fila mas antigua del tramo sigue siendo >= la fecha buscada, el tramo no
// alcanza a cubrir ese dia y se amplia; asi la respuesta negativa siempre se
// da sobre un rango que SI contiene el dia completo.
// sinAmpliar = mirar SOLO el tramo pedido, sin crecer. Se usa para la ventana
// de carrera dentro del lock: alli basta con lo escrito en los ultimos
// segundos, y ampliar seria justo lo que se quiere evitar (con 48 marcas
// diarias, un tramo corto es todo "de hoy" y dispararia la ampliacion).
function existeMarcaEnHoja_(sheet, dni, evento, fecha, filasIniciales, sinAmpliar) {
  var maxFilas = filasIniciales || FILAS_TRAMO_ASISTENCIA_;
  for (var intento = 0; intento < 4; intento++) {
    var t = leerTramoFinal_(sheet, maxFilas);
    if (!t.rows.length) return false;
    var cDni = t.headers.indexOf('dni');
    var cEvento = t.headers.indexOf('evento');
    var cFecha = t.headers.indexOf('fecha');
    if (cDni < 0 || cEvento < 0 || cFecha < 0) return false;

    var masAntigua = null;
    for (var i = 0; i < t.rows.length; i++) {
      // Sheets auto-convierte 'yyyy-MM-dd' a Date al appendRow: normalizar
      // antes de comparar o el anti-duplicado nunca matchea.
      var f = fechaISO_(t.rows[i][cFecha]);
      if (f && (masAntigua === null || f < masAntigua)) masAntigua = f;
      if (String(t.rows[i][cDni]) === String(dni) &&
          String(t.rows[i][cEvento]) === String(evento) && f === fecha) {
        return true;
      }
    }
    // El tramo abarca toda la hoja, o ya llega mas atras que la fecha buscada.
    if (sinAmpliar || t.completa || (masAntigua && masAntigua < fecha)) return false;
    maxFilas *= 4;
  }
  return false;
}

function registrarAsistenciaFoto(data) {
  var dni = String(data.dni || '');
  var evento = data.evento || '';

  var esCampo = EVENTOS_CAMPO.indexOf(evento) !== -1;
  if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido' };
  if (EVENTOS_ASISTENCIA_V2.indexOf(evento) === -1 && !esCampo) return { success: false, error: 'Evento invalido' };
  if (!data.fileContent) return { success: false, error: 'La foto es obligatoria' };

  // GPS OBLIGATORIO (politica de la empresa, confirmada 31/08/2026): una marca
  // sin ubicacion no es evidencia valida de presencia. Se valida tambien AQUI y
  // no solo en el kiosko porque esta action es publica: una regla que vive solo
  // en el cliente no es una regla — misma leccion que el roster, donde bastaba
  // una pestana abierta desde antes para saltarse el filtro de la pantalla.
  // La valvula de escape cuando el GPS realmente falla es registrarAsistencia-
  // Manual desde el panel, que exige observacion y deja constancia de quien lo
  // autorizo.
  if (data.gps_lat === undefined || data.gps_lat === null || data.gps_lat === '' ||
      data.gps_lng === undefined || data.gps_lng === null || data.gps_lng === '') {
    return { success: false, error: 'Se requiere ubicacion GPS para registrar. Activa la ubicacion e intenta de nuevo.' };
  }

  // Validacion contra el roster ACTIVO. Esta action es publica y hasta ahora
  // aceptaba cualquier dni/nombre/cargo que enviara el cliente: la unica
  // barrera contra una marca de personal cesado era que el kiosko no lo
  // listara, algo puramente visual (una pestana abierta desde antes de la
  // baja seguia marcando). Va ANTES de subir la foto para no gastar la
  // subida a Drive en una marca que se va a rechazar.
  var enRoster = buscarEnRosterKiosko_(dni);
  if (enRoster.estado === 'no_encontrado') {
    return { success: false, error: 'DNI no habilitado para marcar. Comuniquese con administracion.' };
  }
  // Si el roster NO se pudo leer, la marca se acepta igual: perder la
  // asistencia de un trabajador presente es peor que aceptar una marca de mas
  // (queda auditable en la hoja). Nunca convertir una falla de lectura en un
  // bloqueo masivo en plena rafaga de ingreso.
  var nombre = enRoster.trabajador ? String(enRoster.trabajador.nombre || '') : String(data.nombre || '');
  var cargo = enRoster.trabajador ? String(enRoster.trabajador.cargo || '') : String(data.cargo || '');

  // Validar archivo (tamano/tipo) antes de cualquier escritura o subida a Drive
  var errorArchivo = validarArchivoSubido_(data.fileContent, data.mimeType, 'imagen');
  if (errorArchivo) return errorArchivo;

  // Rate limit anti-abuso por DNI
  var errorRate = checkRateLimit_('asisfoto:' + dni, 30);
  if (errorRate) return errorRate;

  var ahora = new Date();
  var fecha = Utilities.formatDate(ahora, 'America/Lima', 'yyyy-MM-dd');
  var hora = Utilities.formatDate(ahora, 'America/Lima', 'HH:mm:ss');

  // PRE-CHEQUEO de duplicado, antes de subir la foto y FUERA del lock.
  // Antes la subida ocurria primero, asi que cada intento repetido dejaba un
  // archivo huerfano en Drive — y el kiosko reintenta hasta 3 veces, o sea 3
  // fotos basura por duplicado, consumiendo cuota en plena rafaga.
  var ssPre = SpreadsheetApp.openById(SHEET_ID);
  var sheetPre = getOrCreateAsistenciaSheet_(ssPre, 'asistencias_v2', HEADERS_ASISTENCIAS_V2);
  if (!esCampo) {
    var idxDia = leerIndiceDia_(fecha);
    var yaMarco = (idxDia && idxDia[claveDup_(dni, evento)])
      ? true
      : existeMarcaEnHoja_(sheetPre, dni, evento, fecha);
    if (yaMarco) {
      marcarEnIndiceDia_(fecha, dni, evento);
      return { success: false, error: 'Ya registraste este evento hoy' };
    }
  }

  // Subir foto a Drive FUERA del lock: la subida tarda varios segundos y
  // mantener el lock global durante la subida hacia esperar (y fallar con
  // "Sistema ocupado") a los demas trabajadores que marcan a la misma hora.
  var fotoUrl = '';
  try {
    var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var asisFolder = getOrCreateFolderCached_(mainFolder, 'Asistencias');
    var fechaFolder = getOrCreateFolderCached_(asisFolder, fecha);
    var dniFolder = getOrCreateFolderCached_(fechaFolder, dni);
    var fileName = evento + '_' + ahora.getTime() + '.jpg';
    var blob = Utilities.newBlob(Utilities.base64Decode(data.fileContent), data.mimeType || 'image/jpeg', fileName);
    var file = dniFolder.createFile(blob);
    // C6: archivo privado — el visor admin lo sirve via getArchivo (nivel auth)
    fotoUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  } catch (e) {
    return { success: false, error: 'Error al guardar la foto: ' + e.message };
  }

  // Lock solo para la ventana de carrera + appendRow (<1s).
  // El pre-chequeo de arriba ya descarto los duplicados reales; aqui solo
  // queda cubrir el caso de dos marcas simultaneas del mismo evento que
  // pasaron ambas ese pre-chequeo. Para eso basta mirar las ultimas filas,
  // no la hoja entera: solo importa lo escrito en los ultimos segundos.
  return withLock_(function () {
    // Se reutiliza el handle abierto en el pre-chequeo: openById tarda ~1 s y
    // este es el camino caliente. Las lecturas van al documento vivo igual.
    var sheet = sheetPre;

    // Evitar doble registro del mismo evento en el mismo dia (SOLO oficina).
    // Los eventos de campo permiten varios turnos por dia.
    if (!esCampo && existeMarcaEnHoja_(sheet, dni, evento, fecha, FILAS_TRAMO_CARRERA_, true)) {
      return { success: false, error: 'Ya registraste este evento hoy' };
    }

    sheet.appendRow([
      Utilities.getUuid(),
      dni,
      nombre,  // del roster, no del cliente
      cargo,   // del roster, no del cliente
      evento,
      fecha,
      hora,
      data.gps_lat !== undefined ? data.gps_lat : '',
      data.gps_lng !== undefined ? data.gps_lng : '',
      data.gps_accuracy !== undefined ? data.gps_accuracy : '',
      fotoUrl,
      ahora.toISOString()
    ]);

    // Sembrar el indice del dia: el proximo intento del mismo evento se
    // rechaza sin leer la hoja ni subir foto.
    if (!esCampo) marcarEnIndiceDia_(fecha, dni, evento);

    return { success: true, data: { evento: evento, fecha: fecha, hora: hora, foto_url: fotoUrl } };
  });
}

function subirJustificacion(data) {
  var dni = String(data.dni || '');
  if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido' };
  if (!data.motivo) return { success: false, error: 'El motivo es obligatorio' };

  // Archivo adjunto opcional (foto o documento) — validar solo si viene
  if (data.fileContent) {
    var errorArchivo = validarArchivoSubido_(data.fileContent, data.mimeType, 'documento');
    if (errorArchivo) return errorArchivo;
  }

  // Rate limit anti-abuso por DNI
  var errorRate = checkRateLimit_('justif:' + dni, 10);
  if (errorRate) return errorRate;

  var ahora = new Date();
  var fecha = Utilities.formatDate(ahora, 'America/Lima', 'yyyy-MM-dd');

  // nombre/cargo desde el roster (cache) y no desde el cliente. NO se bloquea
  // a los cesados: pueden necesitar sustentar una ausencia anterior a su baja.
  var enRosterJust = buscarEnRosterKiosko_(dni, true);
  var nombreJust = enRosterJust.trabajador ? String(enRosterJust.trabajador.nombre || '') : String(data.nombre || '');
  var cargoJust = enRosterJust.trabajador ? String(enRosterJust.trabajador.cargo || '') : String(data.cargo || '');

  // Subir el adjunto a Drive FUERA del lock (mismo motivo que en
  // registrarAsistenciaFoto: la subida tarda y no debe bloquear a otros).
  var archivoUrl = '';
  if (data.fileContent) {
    try {
      var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var justFolder = getOrCreateFolderCached_(mainFolder, 'Justificaciones');
      var fechaFolder = getOrCreateFolderCached_(justFolder, fecha);
      var dniFolder = getOrCreateFolderCached_(fechaFolder, dni);
      var fileName = data.fileName || ('just_' + ahora.getTime() + '.jpg');
      var blob = Utilities.newBlob(Utilities.base64Decode(data.fileContent), data.mimeType || 'image/jpeg', fileName);
      var file = dniFolder.createFile(blob);
      // C6: archivo privado — el visor admin lo sirve via getArchivo (nivel auth)
      archivoUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
    } catch (e) {
      return { success: false, error: 'Error al guardar el archivo: ' + e.message };
    }
  }

  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'justificaciones', HEADERS_JUSTIFICACIONES);

    sheet.appendRow([
      Utilities.getUuid(),
      dni,
      nombreJust,
      cargoJust,
      data.motivo,
      data.descripcion || '',
      archivoUrl,
      fecha,
      ahora.toISOString()
    ]);

    return { success: true, data: { fecha: fecha, archivo_url: archivoUrl } };
  });
}

// ── Admin (requieren token) ─────────────────────────────────

// Registro manual desde el panel: para marcas que el trabajador no pudo hacer
// (error del sistema, olvido justificado, etc.). Sin foto ni GPS; la 'nota'
// (observacion) es OBLIGATORIA para auditoria. En el panel se distingue por
// foto_url vacio -> badge "manual".
function registrarAsistenciaManual(data) {
  var dni = String(data.dni || '');
  var evento = String(data.evento || '');
  var fecha = String(data.fecha || '');
  var hora = String(data.hora || '');
  var nota = String(data.nota || '').trim();

  var esCampo = EVENTOS_CAMPO.indexOf(evento) !== -1;
  if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido' };
  if (EVENTOS_ASISTENCIA_V2.indexOf(evento) === -1 && !esCampo) return { success: false, error: 'Evento invalido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { success: false, error: 'Fecha invalida (yyyy-mm-dd)' };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { success: false, error: 'Hora invalida (HH:mm)' };
  if (!nota) return { success: false, error: 'La observacion es obligatoria (auditoria del registro manual)' };

  // nombre/cargo siempre desde el roster real, nunca desde el cliente.
  // Se incluyen los CESADOS a proposito: el admin tiene que poder registrar
  // la marca que falto en un dia que el trabajador SI laboro, aunque su baja
  // ya este registrada (ese es justo el caso de uso de esta funcion). El
  // control no es "esta activo" sino "la fecha cae dentro del vinculo".
  var roster = leerRosterReal_(true);
  var trab = null;
  for (var k = 0; k < roster.length; k++) { if (roster[k].dni === dni) { trab = roster[k]; break; } }
  if (!trab) return { success: false, error: 'DNI no encontrado en el roster' };
  if (trab.fecha_inicio && fecha < trab.fecha_inicio) {
    return { success: false, error: 'La fecha es anterior al ingreso del trabajador (' + trab.fecha_inicio + ')' };
  }
  if (trab.fecha_fin && fecha > trab.fecha_fin) {
    return { success: false, error: 'La fecha es posterior al cese del trabajador (' + trab.fecha_fin + ')' };
  }

  // timestamp UTC coherente con las marcas del kiosko (hora America/Lima)
  var ts = new Date(fecha + 'T' + hora + ':00-05:00');

  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'asistencias_v2', HEADERS_ASISTENCIAS_V2);

    // Columna 'nota' (13): se agrega al header si la hoja aun no la tiene.
    // Las filas antiguas simplemente la tienen vacia.
    var headerRow = sheet.getRange(1, 1, 1, HEADERS_ASISTENCIAS_V2.length + 1).getValues()[0];
    if (headerRow.indexOf('nota') < 0) {
      sheet.getRange(1, HEADERS_ASISTENCIAS_V2.length + 1).setValue('nota').setFontWeight('bold');
    }

    // Anti-duplicado igual que el kiosko (solo eventos de oficina). Aqui SI se
    // permite ampliar el tramo: el registro manual suele corregir un dia
    // pasado, que puede quedar lejos del final de la hoja.
    if (!esCampo && existeMarcaEnHoja_(sheet, dni, evento, fecha)) {
      return { success: false, error: 'Ese evento ya esta registrado para ese trabajador ese dia' };
    }

    sheet.appendRow([
      Utilities.getUuid(),
      dni,
      trab.nombre,
      trab.cargo,
      evento,
      fecha,
      hora + ':00',
      '', '', '',  // sin GPS
      '',          // sin foto -> el panel lo muestra como registro manual
      ts.toISOString(),
      nota
    ]);

    // Sembrar el indice para que el kiosko no acepte luego el mismo evento.
    if (!esCampo) marcarEnIndiceDia_(fecha, dni, evento);

    return { success: true, data: { evento: evento, fecha: fecha, hora: hora, nombre: trab.nombre } };
  });
}

function filtrarPorRango_(result, data) {
  if (data && data.dni) {
    result = result.filter(function(r) { return String(r.dni) === String(data.dni); });
  }
  if (data && data.desde) {
    result = result.filter(function(r) { return String(r.fecha) >= String(data.desde); });
  }
  if (data && data.hasta) {
    result = result.filter(function(r) { return String(r.fecha) <= String(data.hasta); });
  }
  return result;
}

function getAsistenciasV2(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('asistencias_v2');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };

  var headers = rows[0];
  var tz = ss.getSpreadsheetTimeZone();
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var obj = rowToObject(headers, r);
      // La fecha/hora canonica se deriva del timestamp UTC (ISO), que es un
      // instante exacto e inmune al desfase por hora local media (LMT) que
      // Sheets aplica a los valores de tipo tiempo anclados a 1899-12-30.
      var inst = (obj.timestamp instanceof Date) ? obj.timestamp
               : (obj.timestamp ? new Date(obj.timestamp) : null);
      if (inst && !isNaN(inst.getTime())) {
        obj.fecha = Utilities.formatDate(inst, 'America/Lima', 'yyyy-MM-dd');
        obj.hora = Utilities.formatDate(inst, 'America/Lima', 'HH:mm:ss');
      } else {
        // Filas legadas sin timestamp: formatear en la zona horaria de la
        // propia hoja (round-trip), no en una zona distinta.
        if (obj.fecha instanceof Date) {
          obj.fecha = Utilities.formatDate(obj.fecha, tz, 'yyyy-MM-dd');
        }
        if (obj.hora instanceof Date) {
          obj.hora = Utilities.formatDate(obj.hora, tz, 'HH:mm:ss');
        }
      }
      return obj;
    });

  result = filtrarPorRango_(result, data);
  if (data && data.evento) {
    result = result.filter(function(r) { return r.evento === data.evento; });
  }
  return { success: true, data: result };
}

function getJustificaciones(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('justificaciones');
  if (!sheet) return { success: true, data: [] };

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };

  var headers = rows[0];
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var obj = rowToObject(headers, r);
      if (obj.fecha instanceof Date) {
        obj.fecha = Utilities.formatDate(obj.fecha, 'America/Lima', 'yyyy-MM-dd');
      }
      return obj;
    });

  return { success: true, data: filtrarPorRango_(result, data) };
}

// ============================================================
// PLANILLA — sueldos, incidencias, bolsa de horas
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================================
// FIN MODULO ASISTENCIA V2
// ============================================================

// ============================================================
// MODULO PLANILLA — TARDANZAS, FALTAS Y DESCUENTOS
// Clausula 13a y Anexo 3 del contrato. El sistema solo calcula
// y muestra montos referenciales; no descuenta automaticamente.
// Hojas: config_planilla, sueldos, incidencias, planilla_log
// ============================================================

var CONFIG_PLANILLA_DEFAULT = {
  ingreso_manana: '07:30',
  salida_manana: '13:00',
  ingreso_tarde: '14:00',
  salida_tarde: '18:00',
  tolerancia_manana_min: 10,   // 10 min SOLO sobre el ingreso de 7:30
  tolerancia_tarde_min: 0,     // el ingreso de la tarde NO tiene tolerancia
  tardanza_grave_min: 60,
  jornada_horas: 9.5,
  factor_descanso_semanal: 0.2,
  plazo_sustento_horas: 48,
  divisor_mes: 30,
  rmv: 1130,                   // Remuneracion Minima Vital (los operarios se ajustan solos)
  salida_autorizada: '17:00',  // hora minima de la salida 5pm autorizada
  fecha_operativo: '2026-07-02'
};

var HEADERS_INCIDENCIAS = [
  'id', 'dni', 'nombre', 'fecha', 'tipo', 'evento', 'minutos', 'grave',
  'estado', 'nota', 'sustento_url', 'revisado_por', 'fecha_revision', 'creado_en'
];

var HEADERS_PLANILLA_LOG = [
  'id', 'incidencia_id', 'dni', 'accion', 'estado_anterior', 'estado_nuevo',
  'nota', 'usuario', 'timestamp'
];

// 'fecha_fin' = ultimo dia laborado (vacio = activo). La fila NUNCA se borra:
// el historial de asistencias, incidencias y planillas cerradas debe seguir
// siendo auditable despues del cese. Ver leerRosterReal_ en 03_empleados.gs.
var HEADERS_SUELDOS = ['dni', 'nombre', 'cargo', 'sueldo', 'fecha_inicio', 'usa_rmv', 'sede', 'email', 'fecha_fin'];

var HEADERS_AUTORIZACIONES = ['id', 'dni', 'fecha', 'autorizado_por', 'nota', 'timestamp'];

var HEADERS_BOLSA = ['id', 'dni', 'fecha', 'tipo', 'horas', 'nota', 'usuario', 'timestamp'];

// Lista definitiva de trabajadores (usa_rmv=TRUE gana la RMV con ajuste automatico).
// Correos corporativos: dominio ingenieriatelcom.com (Google Workspace).
// Los operarios (RMV) y los ingresos nuevos arrancan 2026-07-07 para no
// generar faltas retroactivas; el admin ajusta la fecha real desde la hoja.
// Ultima columna = fecha_fin (ultimo dia laborado; vacio = activo).
// Solo se usa al CREAR la hoja desde cero: la hoja viva manda. Las altas y
// bajas reales se hacen desde /admin/planilla (crearTrabajador / darDeBajaTrabajador).
var SUELDOS_INICIALES = [
  ['46809070', 'Araujo Álvarez, Andre Steven', 'Coordinador General', 3500, '2026-07-01', 'FALSE', 'Principal', 'coordinador.general@ingenieriatelcom.com', ''],
  // Cesado 21/08/2026; su correo pasa a Vargas Pinto, que ocupa el puesto.
  ['73316735', 'Marroquín Concha, Diego Mauricio', 'Analista Legal de Reclamos', 3000, '2026-07-01', 'FALSE', 'Principal', '', '2026-08-21'],
  ['74135306', 'Vargas Miranda, Juan Joseph', 'Analista Legal de Reclamos', 1800, '2026-07-01', 'FALSE', 'Principal', 'analista.legal2@ingenieriatelcom.com', ''],
  // Cesado 14/08/2026.
  ['70401672', 'Montufar Diaz, Alvaro Rodrigo', 'Analista Junior de Reclamos', 1800, '2026-07-06', 'FALSE', 'Principal', '', '2026-08-14'],
  ['71227060', 'Vargas Pinto, Marcela Devora', 'Analista Legal de Reclamos', 2200, '2026-08-20', 'FALSE', 'Principal', 'analista.legal1@ingenieriatelcom.com', ''],
  ['74525595', 'León Umeres, Milagros Jhenifer', 'Asistente Administrativo', 1800, '2026-07-01', 'FALSE', 'Principal', 'asistente.admin@ingenieriatelcom.com', ''],
  ['72374021', 'Condori Cáceres, Jocabed Adriana', 'Tramitador / Digitador', 1500, '2026-07-01', 'FALSE', 'Principal', 'tramitador2@ingenieriatelcom.com', ''],
  ['72743443', 'Ramos Serrani, Anais Gasdaly', 'Tramitador / Digitador', 1500, '2026-07-07', 'FALSE', 'Principal', 'tramitador3@ingenieriatelcom.com', ''],
  ['74147961', 'Hurtado Vega, Marilyn', 'Tramitador / Digitador', 1500, '2026-07-01', 'FALSE', 'Principal', 'tramitador1@ingenieriatelcom.com', ''],
  ['45298858', 'Canaza Chique, Darwin', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', '', ''],
  ['80644637', 'Canaza Chique, Jael Fausto', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', '', ''],
  ['42239901', 'Canaza Chique, Willy', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', '', ''],
  ['47815297', 'Marin Callañaupa, George Smith', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', '', ''],
  ['74323866', 'Maceda Econema, Franco Paolo', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', '', '']
];

// Ejecutar UNA VEZ desde el editor (no toca hojas existentes)
function setupPlanillaSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  if (!ss.getSheetByName('config_planilla')) {
    var c = ss.insertSheet('config_planilla');
    c.appendRow(['clave', 'valor']);
    Object.keys(CONFIG_PLANILLA_DEFAULT).forEach(function(k) {
      c.appendRow([k, CONFIG_PLANILLA_DEFAULT[k]]);
    });
    c.getRange(1, 1, 1, 2).setFontWeight('bold');
  }

  if (!ss.getSheetByName('sueldos')) {
    var s = ss.insertSheet('sueldos');
    s.appendRow(HEADERS_SUELDOS);
    SUELDOS_INICIALES.forEach(function(r) { s.appendRow(r); });
    s.getRange(1, 1, 1, HEADERS_SUELDOS.length).setFontWeight('bold');
  }

  if (!ss.getSheetByName('incidencias')) {
    var i = ss.insertSheet('incidencias');
    i.appendRow(HEADERS_INCIDENCIAS);
    i.getRange(1, 1, 1, HEADERS_INCIDENCIAS.length).setFontWeight('bold');
  }

  if (!ss.getSheetByName('planilla_log')) {
    var l = ss.insertSheet('planilla_log');
    l.appendRow(HEADERS_PLANILLA_LOG);
    l.getRange(1, 1, 1, HEADERS_PLANILLA_LOG.length).setFontWeight('bold');
  }

  if (!ss.getSheetByName('autorizaciones_5pm')) {
    var a = ss.insertSheet('autorizaciones_5pm');
    a.appendRow(HEADERS_AUTORIZACIONES);
    a.getRange(1, 1, 1, HEADERS_AUTORIZACIONES.length).setFontWeight('bold');
  }

  if (!ss.getSheetByName('bolsa_horas')) {
    var b = ss.insertSheet('bolsa_horas');
    b.appendRow(HEADERS_BOLSA);
    b.getRange(1, 1, 1, HEADERS_BOLSA.length).setFontWeight('bold');
  }

  Logger.log('Hojas de planilla listas');
  return 'Hojas de planilla creadas/verificadas';
}

// Lee la config combinando defaults + hoja (la hoja manda)
function leerConfigPlanilla_() {
  var cfg = {};
  Object.keys(CONFIG_PLANILLA_DEFAULT).forEach(function(k) { cfg[k] = CONFIG_PLANILLA_DEFAULT[k]; });
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('config_planilla');
  if (!sheet) return cfg;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var clave = String(rows[i][0]).trim();
    if (!clave || !(clave in cfg)) continue;
    var valor = rows[i][1];
    if (valor instanceof Date) {
      // Sheets convierte "07:30" en Date; volver a HH:mm
      valor = Utilities.formatDate(valor, 'America/Lima', 'HH:mm');
    }
    var num = parseFloat(valor);
    cfg[clave] = (typeof CONFIG_PLANILLA_DEFAULT[clave] === 'number' && !isNaN(num)) ? num : String(valor);
  }
  return cfg;
}

function getConfigPlanillaAction() {
  return { success: true, data: leerConfigPlanilla_() };
}

function updateConfigPlanilla(data) {
  return withLock_(function () {
    var valores = data.valores || {};
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('config_planilla');
    if (!sheet) return { success: false, error: 'Ejecuta setupPlanillaSheets() primero' };
    var rows = sheet.getDataRange().getValues();
    Object.keys(valores).forEach(function(k) {
      if (!(k in CONFIG_PLANILLA_DEFAULT)) return;
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === k) {
          sheet.getRange(i + 1, 2).setValue(String(valores[k]));
          found = true;
          break;
        }
      }
      if (!found) sheet.appendRow([k, String(valores[k])]);
    });
    return { success: true, data: leerConfigPlanilla_() };
  });
}

function getSueldos() {
  var cfg = leerConfigPlanilla_();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('sueldos');
  if (!sheet) return { success: false, error: 'Ejecuta setupPlanillaSheets() primero' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var hoy = hoyISO_();
  // Incluye a los cesados: la planilla del mes en curso y los meses ya
  // cerrados deben seguir mostrandolos. 'activo' distingue unos de otros.
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var o = rowToObject(headers, r);
      o.dni = String(o.dni);
      o.usa_rmv = o.usa_rmv === true || o.usa_rmv === 'TRUE' || o.usa_rmv === 'true';
      // RMV con ajuste automatico
      o.sueldo = o.usa_rmv ? Number(cfg.rmv) : (Number(o.sueldo) || 0);
      o.fecha_inicio = fechaISO_(o.fecha_inicio) || String(cfg.fecha_operativo);
      o.fecha_fin = fechaISO_(o.fecha_fin);
      o.activo = !o.fecha_fin || o.fecha_fin >= hoy; // el dia del cese aun se trabaja
      o.email = String(o.email || '');
      return o;
    });
  return { success: true, data: result };
}

// Lista publica para el kiosko de asistencia: SIN sueldos ni correos.
// registro_simple = trabajador de campo (sin correo): flujo Ingreso/Salida simple.
// Solo trabajadores ACTIVOS: un cesado no debe poder marcar ni figurar en la
// pantalla del kiosko (su historial si se conserva en la hoja).
// Cacheada 10 min: a la hora de ingreso muchos trabajadores abren el kiosko a
// la vez; responder desde CacheService evita abrir el Spreadsheet en cada
// request (cada openById tarda ~1s y bajo rafaga alguna peticion falla).
// v2: la lista dejo de incluir cesados — la clave cambia para no servir el
// cache viejo (con los cesados dentro) durante los 10 min posteriores al deploy.
var CACHE_KEY_TRABAJADORES = 'kiosk_trabajadores_v2';
// Roster completo (con cesados) para el panel de asistencias: sin el, un
// cesado desaparece del filtro y del modal de registro manual, y el admin
// no puede corregir marcas de dias que ese trabajador SI laboro.
var CACHE_KEY_TRABAJADORES_TODOS = 'kiosk_trabajadores_todos_v2';
var CACHE_TTL_TRABAJADORES = 600; // 10 min (max practico de CacheService)

function invalidarCacheTrabajadores_() {
  try {
    CacheService.getScriptCache().removeAll([CACHE_KEY_TRABAJADORES, CACHE_KEY_TRABAJADORES_TODOS]);
  } catch (e) { /* si el cache falla, expira solo en 10 min */ }
}

function getTrabajadores(data) {
  var incluirCesados = !!(data && (data.incluirCesados === true || data.incluirCesados === 'true'));
  var cacheKey = incluirCesados ? CACHE_KEY_TRABAJADORES_TODOS : CACHE_KEY_TRABAJADORES;

  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) return { success: true, data: JSON.parse(cached) };
  } catch (e) { /* cache no disponible: seguir contra Sheets */ }

  var res = getSueldos();
  if (!res.success) return res;
  var lista = res.data
    .filter(function(t) { return incluirCesados || t.activo; })
    .map(function(t) {
      return {
        dni: t.dni,
        nombre: t.nombre,
        cargo: t.cargo,
        sede: t.sede || '',
        registro_simple: !t.email,
        activo: t.activo,
        fecha_fin: t.fecha_fin || ''
      };
    });

  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(lista), CACHE_TTL_TRABAJADORES);
  } catch (e) { /* no critico */ }

  return { success: true, data: lista };
}

function updateSueldo(data) {
  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('sueldos');
    if (!sheet) return { success: false, error: 'Hoja sueldos no encontrada' };
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var sueldoCol = headers.indexOf('sueldo');
    var rmvCol = headers.indexOf('usa_rmv');
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.dni)) {
        if (rmvCol >= 0 && (rows[i][rmvCol] === true || rows[i][rmvCol] === 'TRUE')) {
          return { success: false, error: 'Este trabajador gana la RMV: su sueldo se ajusta con el parametro rmv de la configuracion' };
        }
        sheet.getRange(i + 1, sueldoCol + 1).setValue(Number(data.sueldo) || 0);
        invalidarCacheTrabajadores_();
        return { success: true, message: 'Sueldo actualizado' };
      }
    }
    return { success: false, error: 'DNI no encontrado en hoja sueldos' };
  });
}

// Alta de trabajador desde el panel (aparece de inmediato en el kiosko)
function crearTrabajador(data) {
  return withLock_(function () {
    var dni = String(data.dni || '').trim();
    if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido (8 digitos)' };
    if (!data.nombre || !data.cargo) return { success: false, error: 'Nombre y cargo son obligatorios' };

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('sueldos');
    if (!sheet) return { success: false, error: 'Ejecuta setupPlanillaSheets() primero' };
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === dni) return { success: false, error: 'Ya existe un trabajador con ese DNI' };
    }

    var cfg = leerConfigPlanilla_();
    asegurarColumnaFechaFin_(sheet);
    sheet.appendRow([
      dni,
      data.nombre,
      data.cargo,
      data.usa_rmv ? Number(cfg.rmv) : (Number(data.sueldo) || 0),
      String(data.fecha_inicio || hoyISO_()),
      data.usa_rmv ? 'TRUE' : 'FALSE',
      data.sede || 'Principal',
      data.email || '',
      '' // fecha_fin: activo
    ]);
    invalidarCacheTrabajadores_();
    return { success: true, message: 'Trabajador creado: ' + data.nombre };
  });
}

// ── Bajas de personal ───────────────────────────────────────
// La hoja 'sueldos' nacio sin columna de cese. Se agrega al vuelo la primera
// vez que se necesita, igual que se hizo con la columna 'nota' de asistencias_v2.
function asegurarColumnaFechaFin_(sheet) {
  var ancho = Math.max(sheet.getLastColumn(), HEADERS_SUELDOS.length);
  var headers = sheet.getRange(1, 1, 1, ancho).getValues()[0];
  var col = headers.indexOf('fecha_fin');
  if (col >= 0) return col + 1;
  var nueva = sheet.getLastColumn() + 1;
  sheet.getRange(1, nueva).setValue('fecha_fin').setFontWeight('bold');
  return nueva;
}

// Elimina las incidencias PENDIENTES posteriores al cese. Sin esto, los dias
// transcurridos entre la salida real del trabajador y el registro de su baja
// quedan como faltas fantasma (mismo criterio que la limpieza retroactiva de
// feriados). Solo toca 'pendiente': lo ya revisado o descontado no se altera.
function limpiarIncidenciasPosterioresACese_(ss, dni, fechaFin) {
  var incSheet = ss.getSheetByName('incidencias');
  if (!incSheet) return 0;
  var rows = incSheet.getDataRange().getValues();
  var borradas = 0;
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) !== String(dni)) continue;
    if (String(rows[i][8]) !== 'pendiente') continue;
    if (fechaISO_(rows[i][3]) <= fechaFin) continue;
    incSheet.deleteRow(i + 1);
    borradas++;
  }
  return borradas;
}

// Da de baja a un trabajador: registra su ultimo dia laborado y lo saca del
// roster activo SIN borrar la fila (el historial debe seguir siendo auditable).
function darDeBajaTrabajador(data) {
  return withLock_(function () {
    data = data || {};
    var dni = String(data.dni || '').trim();
    var fechaFin = fechaISO_(data.fecha_fin);
    if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido (8 digitos)' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) return { success: false, error: 'Fecha de cese invalida (yyyy-mm-dd)' };

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('sueldos');
    if (!sheet) return { success: false, error: 'Hoja sueldos no encontrada' };

    var colFin = asegurarColumnaFechaFin_(sheet);
    var rows = sheet.getDataRange().getValues();
    var colIni = rows[0].indexOf('fecha_inicio');
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== dni) continue;

      var fechaInicio = colIni >= 0 ? fechaISO_(rows[i][colIni]) : '';
      if (fechaInicio && fechaFin < fechaInicio) {
        return { success: false, error: 'La fecha de cese es anterior a la fecha de ingreso (' + fechaInicio + ')' };
      }

      sheet.getRange(i + 1, colFin).setValue(fechaFin);
      var borradas = limpiarIncidenciasPosterioresACese_(ss, dni, fechaFin);
      invalidarCacheTrabajadores_();

      return {
        success: true,
        message: 'Baja registrada: ' + String(rows[i][1]) + ' — ultimo dia ' + fechaFin +
          (borradas ? ' (' + borradas + ' incidencias pendientes posteriores eliminadas)' : ''),
        data: { dni: dni, fecha_fin: fechaFin, incidencias_eliminadas: borradas }
      };
    }
    return { success: false, error: 'DNI no encontrado en hoja sueldos' };
  });
}

// Revierte una baja (cese registrado por error o recontratacion en el mismo
// puesto). No regenera las incidencias eliminadas: si hacen falta, se vuelve
// a correr sincronizarIncidencias sobre el rango.
function reactivarTrabajador(data) {
  return withLock_(function () {
    var dni = String((data || {}).dni || '').trim();
    if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido (8 digitos)' };

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
    if (!sheet) return { success: false, error: 'Hoja sueldos no encontrada' };

    var colFin = asegurarColumnaFechaFin_(sheet);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== dni) continue;
      sheet.getRange(i + 1, colFin).setValue('');
      invalidarCacheTrabajadores_();
      return { success: true, message: 'Trabajador reactivado: ' + String(rows[i][1]) };
    }
    return { success: false, error: 'DNI no encontrado en hoja sueldos' };
  });
}

// ── Autorizaciones de salida 5pm y bolsa de compensacion ────

function autorizarSalida5pm(data) {
  return withLock_(function () {
    var dni = String(data.dni || '');
    var fecha = String(data.fecha || Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd'));
    if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido' };

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'autorizaciones_5pm', HEADERS_AUTORIZACIONES);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var f = rows[i][2] instanceof Date
        ? Utilities.formatDate(rows[i][2], 'America/Lima', 'yyyy-MM-dd') : String(rows[i][2]);
      if (String(rows[i][1]) === dni && f === fecha) {
        return { success: false, error: 'Ya existe autorizacion para ese DNI y fecha' };
      }
    }
    sheet.appendRow([
      Utilities.getUuid(), dni, fecha,
      data.autorizado_por || 'Coordinador General',
      data.nota || '', new Date().toISOString()
    ]);
    return { success: true, message: 'Salida 5pm autorizada para ' + fecha };
  });
}

function getAutorizaciones5pm(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('autorizaciones_5pm');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  var headers = rows[0];
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var o = rowToObject(headers, r);
      o.dni = String(o.dni);
      if (o.fecha instanceof Date) o.fecha = Utilities.formatDate(o.fecha, 'America/Lima', 'yyyy-MM-dd');
      return o;
    });
  return { success: true, data: filtrarPorRango_(result, data) };
}

// Descarga de bolsa: horas de muestreo trimestral ELSE trabajadas.
// No genera sobretiempo: la descarga se limita al saldo disponible.
function registrarMuestreo(data) {
  return withLock_(function () {
    var dni = String(data.dni || '');
    if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido' };
    var horas = Number(data.horas) || 0;
    if (horas <= 0) return { success: false, error: 'Horas invalidas' };

    var saldoRes = getBolsaHoras({ dni: dni });
    var saldo = (saldoRes.data && saldoRes.data.saldos && saldoRes.data.saldos[dni]) || 0;
    if (saldo <= 0) return { success: false, error: 'Sin horas en bolsa por compensar' };
    var aplicadas = Math.min(horas, saldo);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'bolsa_horas', HEADERS_BOLSA);
    sheet.appendRow([
      Utilities.getUuid(), dni,
      String(data.fecha || Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd')),
      'muestreo', -aplicadas,
      data.nota || 'Muestreo trimestral ELSE',
      data.usuario || 'Admin', new Date().toISOString()
    ]);
    return { success: true, data: { horas_aplicadas: aplicadas, saldo_restante: Math.round((saldo - aplicadas) * 100) / 100 } };
  });
}

function getBolsaHoras(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('bolsa_horas');
  if (!sheet) return { success: true, data: { saldos: {}, movimientos: [] } };
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: { saldos: {}, movimientos: [] } };
  var headers = rows[0];
  var movimientos = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var o = rowToObject(headers, r);
      o.dni = String(o.dni);
      o.horas = Number(o.horas) || 0;
      if (o.fecha instanceof Date) o.fecha = Utilities.formatDate(o.fecha, 'America/Lima', 'yyyy-MM-dd');
      return o;
    });
  if (data && data.dni) movimientos = movimientos.filter(function(m) { return m.dni === String(data.dni); });
  var saldos = {};
  movimientos.forEach(function(m) {
    saldos[m.dni] = Math.round(((saldos[m.dni] || 0) + m.horas) * 100) / 100;
  });
  return { success: true, data: { saldos: saldos, movimientos: movimientos } };
}

function getIncidencias(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('incidencias');
  if (!sheet) return { success: true, data: [] };
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  var headers = rows[0];
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var o = rowToObject(headers, r);
      o.dni = String(o.dni);
      if (o.fecha instanceof Date) {
        o.fecha = Utilities.formatDate(o.fecha, 'America/Lima', 'yyyy-MM-dd');
      }
      o.minutos = o.minutos === '' ? '' : Number(o.minutos);
      o.grave = o.grave === true || o.grave === 'TRUE' || o.grave === 'true';
      return o;
    });
  result = filtrarPorRango_(result, data);
  return { success: true, data: result };
}

// Solo el Administrador de Planilla llega aqui (token validado en doGet).
// Cada cambio queda en planilla_log.
function revisarIncidencia(data) {
  return withLock_(function () {
    if (!data.id || !data.estado) return { success: false, error: 'Faltan campos: id, estado' };
    if (['justificada', 'injustificada', 'pendiente'].indexOf(data.estado) < 0) {
      return { success: false, error: 'Estado invalido' };
    }
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('incidencias');
    if (!sheet) return { success: false, error: 'Hoja incidencias no encontrada' };
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var estadoCol = headers.indexOf('estado');
    var notaCol = headers.indexOf('nota');
    var sustentoCol = headers.indexOf('sustento_url');
    var revisadoCol = headers.indexOf('revisado_por');
    var fechaRevCol = headers.indexOf('fecha_revision');

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        var estadoAnterior = rows[i][estadoCol];
        sheet.getRange(i + 1, estadoCol + 1).setValue(data.estado);
        if (data.nota !== undefined) sheet.getRange(i + 1, notaCol + 1).setValue(data.nota);
        if (data.sustento_url !== undefined) sheet.getRange(i + 1, sustentoCol + 1).setValue(data.sustento_url);
        sheet.getRange(i + 1, revisadoCol + 1).setValue(data.revisado_por || 'Admin');
        sheet.getRange(i + 1, fechaRevCol + 1).setValue(new Date().toISOString());

        registrarLogPlanilla_(data.id, String(rows[i][1]), 'revision', estadoAnterior, data.estado,
          data.nota || '', data.revisado_por || 'Admin');

        return { success: true, message: 'Incidencia actualizada a ' + data.estado };
      }
    }
    return { success: false, error: 'Incidencia no encontrada' };
  });
}

function registrarLogPlanilla_(incidenciaId, dni, accion, estadoAnterior, estadoNuevo, nota, usuario) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('planilla_log');
  if (!sheet) return;
  sheet.appendRow([
    Utilities.getUuid(), incidenciaId, dni, accion,
    estadoAnterior || '', estadoNuevo || '', nota || '',
    usuario || 'sistema', new Date().toISOString()
  ]);
}

function horaAMinutosPlanilla_(hora) {
  var parts = String(hora).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

// ============================================================
// FERIADOS / DIAS NO LABORABLES
// Hoja 'feriados': fecha (yyyy-mm-dd), descripcion
// Esos dias no generan falta ni omision en sincronizarIncidencias
// y el informe de asistencias los muestra como no laborables.
// ============================================================
var HEADERS_FERIADOS = ['fecha', 'descripcion'];

// Feriados oficiales de Peru 2026 (16 feriados nacionales, Decreto
// Legislativo 713 y leyes 31530/31551/31646: incluye 07/06 Batalla de Arica,
// 23/07 Fuerza Aerea, 06/08 Batalla de Junin y 09/12 Batalla de Ayacucho)
var FERIADOS_PERU_2026 = [
  ['2026-01-01', 'Ano Nuevo'],
  ['2026-04-02', 'Jueves Santo'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Dia del Trabajo'],
  ['2026-06-07', 'Batalla de Arica y Dia de la Bandera'],
  ['2026-06-29', 'San Pedro y San Pablo'],
  ['2026-07-23', 'Dia de la Fuerza Aerea del Peru'],
  ['2026-07-28', 'Fiestas Patrias'],
  ['2026-07-29', 'Fiestas Patrias'],
  ['2026-08-06', 'Batalla de Junin'],
  ['2026-08-30', 'Santa Rosa de Lima'],
  ['2026-10-08', 'Combate de Angamos'],
  ['2026-11-01', 'Todos los Santos'],
  ['2026-12-08', 'Inmaculada Concepcion'],
  ['2026-12-09', 'Batalla de Ayacucho'],
  ['2026-12-25', 'Navidad']
];

// Al declarar feriado una fecha, las incidencias de falta/omision PENDIENTES
// de ese dia ya no aplican: se eliminan (las ya revisadas se respetan).
// Devuelve cuantas filas se borraron.
function eliminarIncidenciasDeFeriado_(ss, fecha) {
  var sheet = ss.getSheetByName('incidencias');
  if (!sheet) return 0;
  var rows = sheet.getDataRange().getValues();
  var borradas = 0;
  for (var i = rows.length - 1; i >= 1; i--) {
    var f = rows[i][3] instanceof Date
      ? Utilities.formatDate(rows[i][3], 'America/Lima', 'yyyy-MM-dd')
      : String(rows[i][3]);
    var tipo = String(rows[i][4]);
    var estado = String(rows[i][8] || 'pendiente');
    if (f === fecha && (tipo === 'falta' || tipo === 'omision') && estado === 'pendiente') {
      sheet.deleteRow(i + 1);
      borradas++;
    }
  }
  return borradas;
}

function leerFeriados_() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('feriados');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var f = rows[i][0] instanceof Date
      ? Utilities.formatDate(rows[i][0], 'America/Lima', 'yyyy-MM-dd')
      : String(rows[i][0]);
    out.push({ fecha: f, descripcion: String(rows[i][1] || '') });
  }
  return out;
}

function getFeriados() {
  return { success: true, data: leerFeriados_() };
}

function agregarFeriado(data) {
  var fecha = String(data.fecha || '');
  var descripcion = String(data.descripcion || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { success: false, error: 'Fecha invalida (yyyy-mm-dd)' };
  if (!descripcion) return { success: false, error: 'La descripcion es obligatoria' };

  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'feriados', HEADERS_FERIADOS);
    var existe = leerFeriados_().some(function (f) { return f.fecha === fecha; });
    if (existe) return { success: false, error: 'Esa fecha ya esta registrada como feriado' };
    sheet.appendRow([fecha, descripcion]);
    // Limpiar incidencias pendientes de falta/omision de ese dia (retroactivo)
    var limpiadas = eliminarIncidenciasDeFeriado_(ss, fecha);
    return { success: true, data: leerFeriados_(), message: limpiadas > 0 ? (limpiadas + ' incidencias pendientes de ese dia eliminadas') : undefined };
  });
}

function eliminarFeriado(data) {
  var fecha = String(data.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { success: false, error: 'Fecha invalida' };

  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('feriados');
    if (!sheet) return { success: false, error: 'No hay hoja de feriados' };
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var f = rows[i][0] instanceof Date
        ? Utilities.formatDate(rows[i][0], 'America/Lima', 'yyyy-MM-dd')
        : String(rows[i][0]);
      if (f === fecha) {
        sheet.deleteRow(i + 1);
        return { success: true, data: leerFeriados_() };
      }
    }
    return { success: false, error: 'Feriado no encontrado' };
  });
}

// Precarga los feriados oficiales de Peru 2026 (idempotente: no duplica).
// Tambien limpia incidencias pendientes de falta/omision de TODAS las fechas
// feriadas (incluidas las ya registradas antes), por si la sincronizacion
// genero faltas en un feriado antes de declararlo.
function sembrarFeriadosPeru2026() {
  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'feriados', HEADERS_FERIADOS);
    var existentes = {};
    leerFeriados_().forEach(function (f) { existentes[f.fecha] = true; });
    var agregados = 0;
    var limpiadas = 0;
    FERIADOS_PERU_2026.forEach(function (par) {
      if (!existentes[par[0]]) {
        sheet.appendRow([par[0], par[1]]);
        agregados++;
      }
      limpiadas += eliminarIncidenciasDeFeriado_(ss, par[0]);
    });
    return {
      success: true,
      message: agregados + ' feriados agregados' + (limpiadas > 0 ? ', ' + limpiadas + ' incidencias pendientes de esos dias eliminadas' : ''),
      data: leerFeriados_()
    };
  });
}

// Genera incidencias desde asistencias_v2 para el rango [desde, hasta]
// y auto-expira pendientes cuyo plazo de sustento (48h desde la
// reincorporacion) ya vencio. Idempotente: no duplica.
function sincronizarIncidencias(data) {
  return withLock_(function () {
  var cfg = leerConfigPlanilla_();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var incSheet = ss.getSheetByName('incidencias');
  if (!incSheet) return { success: false, error: 'Ejecuta setupPlanillaSheets() primero' };

  var hoyISO = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
  var desde = String(data.desde || hoyISO);
  var hasta = String(data.hasta || hoyISO);
  if (desde < String(cfg.fecha_operativo)) desde = String(cfg.fecha_operativo);
  // Solo dias completamente transcurridos se evaluan para falta/omision;
  // las tardanzas del dia actual si se detectan.

  // Cargar sueldos (lista oficial de trabajadores)
  var sueldosRes = getSueldos();
  if (!sueldosRes.success) return sueldosRes;
  var trabajadores = sueldosRes.data;

  // Indexar registros: dni -> fecha -> evento -> horaMin
  var regRes = getAsistenciasV2({ desde: desde, hasta: hoyISO });
  var regIdx = {};
  (regRes.data || []).forEach(function(r) {
    var dni = String(r.dni);
    if (!regIdx[dni]) regIdx[dni] = {};
    if (!regIdx[dni][r.fecha]) regIdx[dni][r.fecha] = {};
    regIdx[dni][r.fecha][r.evento] = String(r.hora).slice(0, 5);
  });

  // Indexar incidencias existentes para no duplicar: dni|fecha|tipo|evento
  var incRows = incSheet.getDataRange().getValues();
  var incHeaders = incRows[0];
  var existentes = {};
  for (var i = 1; i < incRows.length; i++) {
    var f = incRows[i][3] instanceof Date
      ? Utilities.formatDate(incRows[i][3], 'America/Lima', 'yyyy-MM-dd')
      : String(incRows[i][3]);
    existentes[String(incRows[i][1]) + '|' + f + '|' + incRows[i][4] + '|' + incRows[i][5]] = true;
  }

  // Autorizaciones 5pm indexadas por dni|fecha
  var autIdx = {};
  (getAutorizaciones5pm({}).data || []).forEach(function(a) {
    autIdx[a.dni + '|' + a.fecha] = true;
  });

  // Feriados / dias no laborables: no generan falta ni omision
  var feriadosIdx = {};
  leerFeriados_().forEach(function(f) { feriadosIdx[f.fecha] = true; });

  // Movimientos de bolsa ya acreditados (idempotencia): dni|fecha con tipo salida_5pm
  var bolsaSheet = getOrCreateAsistenciaSheet_(ss, 'bolsa_horas', HEADERS_BOLSA);
  var bolsaExistente = {};
  var bolsaRows = bolsaSheet.getDataRange().getValues();
  for (var b = 1; b < bolsaRows.length; b++) {
    if (bolsaRows[b][3] !== 'salida_5pm') continue;
    var fb = bolsaRows[b][2] instanceof Date
      ? Utilities.formatDate(bolsaRows[b][2], 'America/Lima', 'yyyy-MM-dd')
      : String(bolsaRows[b][2]);
    bolsaExistente[String(bolsaRows[b][1]) + '|' + fb] = true;
  }

  // Tolerancia asimetrica: 10 min solo en la manana, 0 en la tarde
  var ingresos = [
    { evento: 'ingreso_manana', oficial: cfg.ingreso_manana, tolerancia: Number(cfg.tolerancia_manana_min) || 0 },
    { evento: 'ingreso_tarde', oficial: cfg.ingreso_tarde, tolerancia: Number(cfg.tolerancia_tarde_min) || 0 }
  ];
  var salidas = [
    { evento: 'salida_manana', oficial: cfg.salida_manana },
    { evento: 'salida_tarde', oficial: cfg.salida_tarde }
  ];
  var minSalidaAutorizada = horaAMinutosPlanilla_(cfg.salida_autorizada);

  var creadas = 0;
  // Las filas se acumulan y se escriben de una sola vez al final. Antes era un
  // appendRow por incidencia: sincronizar un mes con varias faltas disparaba
  // decenas de escrituras sueltas, lento y con riesgo de agotar cuota justo en
  // el cierre de planilla. Ver PLAN.md R6.
  var pendientesInc = [];
  var pendientesBolsa = [];
  var nuevaFila = function(dni, nombre, fecha, tipo, evento, minutos, grave) {
    var key = dni + '|' + fecha + '|' + tipo + '|' + (evento || '');
    if (existentes[key]) return;
    existentes[key] = true;
    pendientesInc.push([
      Utilities.getUuid(), dni, nombre, fecha, tipo, evento || '',
      minutos === null ? '' : minutos, grave ? 'TRUE' : 'FALSE',
      'pendiente', '', '', '', '', new Date().toISOString()
    ]);
    creadas++;
  };

  // Recorrer cada dia habil del rango
  var d = new Date(desde + 'T00:00:00');
  var dHasta = new Date(hasta + 'T00:00:00');
  for (; d <= dHasta; d.setDate(d.getDate() + 1)) {
    var fecha = Utilities.formatDate(d, 'America/Lima', 'yyyy-MM-dd');
    var dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // sabado y domingo no laborables
    if (feriadosIdx[fecha]) continue;     // feriado / dia no laborable
    if (fecha > hoyISO) break;
    var diaTerminado = fecha < hoyISO;

    trabajadores.forEach(function(t) {
      // No computar asistencia fuera del vinculo laboral: ni antes del ingreso
      // ni despues del ultimo dia laborado (fecha_fin). Va primero que el filtro
      // de correo para que la baja no dependa de si se libero el buzon.
      if (t.fecha_inicio && fecha < String(t.fecha_inicio)) return;
      if (t.fecha_fin && fecha > String(t.fecha_fin)) return;
      // Trabajadores de campo (sin correo) quedan FUERA del modelo de descuentos:
      // solo dejan bitacora de presencia (Ingreso/Salida) + justificaciones.
      if (!t.email) return;

      var regs = (regIdx[t.dni] || {})[fecha] || {};
      var tieneAlguno = Object.keys(regs).length > 0;

      // FALTA: sin ningun marcado en un dia ya terminado
      if (!tieneAlguno) {
        if (diaTerminado) nuevaFila(t.dni, t.nombre, fecha, 'falta', '', null, false);
        return;
      }

      // TARDANZAS: superada la tolerancia del evento, minutos TOTALES
      // desde la hora oficial (llega 7:50 -> 20 min, no 10)
      ingresos.forEach(function(ing) {
        var hora = regs[ing.evento];
        if (!hora) return;
        var retraso = horaAMinutosPlanilla_(hora) - horaAMinutosPlanilla_(ing.oficial);
        if (retraso > ing.tolerancia) {
          nuevaFila(t.dni, t.nombre, fecha, 'tardanza', ing.evento, retraso, retraso > cfg.tardanza_grave_min);
        }
      });

      // SALIDA MANANA anticipada: siempre grave
      var horaSm = regs['salida_manana'];
      if (horaSm) {
        var faltanteSm = horaAMinutosPlanilla_(cfg.salida_manana) - horaAMinutosPlanilla_(horaSm);
        if (faltanteSm > 0) {
          nuevaFila(t.dni, t.nombre, fecha, 'salida_anticipada', 'salida_manana', faltanteSm, true);
        }
      }

      // SALIDA TARDE: con autorizacion 5pm y hora >= salida_autorizada,
      // NO es incidencia — la hora no laborada va a la bolsa de compensacion.
      // Sin autorizacion: tardanza grave (retiro anticipado).
      var horaSt = regs['salida_tarde'];
      if (horaSt) {
        var minSt = horaAMinutosPlanilla_(horaSt);
        var faltanteSt = horaAMinutosPlanilla_(cfg.salida_tarde) - minSt;
        if (faltanteSt > 0) {
          var autorizado = autIdx[t.dni + '|' + fecha] === true;
          if (autorizado && minSt >= minSalidaAutorizada) {
            var keyBolsa = t.dni + '|' + fecha;
            if (!bolsaExistente[keyBolsa]) {
              bolsaExistente[keyBolsa] = true;
              pendientesBolsa.push([
                Utilities.getUuid(), t.dni, fecha, 'salida_5pm',
                Math.round((faltanteSt / 60) * 100) / 100,
                'Salida autorizada ' + horaSt, 'sistema', new Date().toISOString()
              ]);
            }
          } else {
            nuevaFila(t.dni, t.nombre, fecha, 'salida_anticipada', 'salida_tarde', faltanteSt, true);
          }
        }
      }

      // OMISION: marco algo pero falta algun evento (dia terminado)
      if (diaTerminado) {
        var faltantes = [];
        ingresos.concat(salidas).forEach(function(ev) {
          if (!regs[ev.evento]) faltantes.push(ev.evento);
        });
        if (faltantes.length > 0) {
          nuevaFila(t.dni, t.nombre, fecha, 'omision', faltantes.join(','), null, false);
        }
      }
    });
  }

  // Volcado de los lotes acumulados. Va ANTES de la auto-expiracion, que
  // vuelve a leer la hoja de incidencias y debe ver ya las recien creadas.
  if (pendientesInc.length) {
    incSheet.getRange(incSheet.getLastRow() + 1, 1, pendientesInc.length, HEADERS_INCIDENCIAS.length)
      .setValues(pendientesInc);
  }
  if (pendientesBolsa.length) {
    bolsaSheet.getRange(bolsaSheet.getLastRow() + 1, 1, pendientesBolsa.length, HEADERS_BOLSA.length)
      .setValues(pendientesBolsa);
  }

  // AUTO-EXPIRACION: pendientes cuyo plazo de sustento vencio pasan a
  // injustificada. Reincorporacion = para faltas, el primer dia posterior
  // con algun marcado; para el resto, el mismo dia de la incidencia.
  var expiradas = 0;
  var plazoMs = (Number(cfg.plazo_sustento_horas) || 48) * 3600 * 1000;
  var ahora = new Date().getTime();
  incRows = incSheet.getDataRange().getValues();
  incHeaders = incRows[0];
  var cEstado = incHeaders.indexOf('estado');
  var cTipo = incHeaders.indexOf('tipo');
  var cFecha = incHeaders.indexOf('fecha');
  var cDni = incHeaders.indexOf('dni');

  for (var j = 1; j < incRows.length; j++) {
    if (incRows[j][cEstado] !== 'pendiente') continue;
    var fInc = incRows[j][cFecha] instanceof Date
      ? Utilities.formatDate(incRows[j][cFecha], 'America/Lima', 'yyyy-MM-dd')
      : String(incRows[j][cFecha]);
    var dniInc = String(incRows[j][cDni]);
    var fechaReinc = fInc;

    if (incRows[j][cTipo] === 'falta') {
      // Buscar primer dia posterior con registro
      var fechasDni = Object.keys(regIdx[dniInc] || {}).filter(function(x) { return x > fInc; }).sort();
      if (fechasDni.length === 0) continue; // aun no se reincorpora
      fechaReinc = fechasDni[0];
    }

    var finReinc = new Date(fechaReinc + 'T23:59:59').getTime();
    if (ahora > finReinc + plazoMs) {
      incSheet.getRange(j + 1, cEstado + 1).setValue('injustificada');
      registrarLogPlanilla_(String(incRows[j][0]), dniInc, 'auto_expiracion',
        'pendiente', 'injustificada', 'Plazo de sustento (48h) vencido sin justificacion', 'sistema');
      expiradas++;
    }
  }

  return { success: true, data: { creadas: creadas, expiradas: expiradas } };
  });
}

// ============================================================
// REPORTES — dashboard y reportes agregados
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// REPORTES Y ESTADISTICAS
// ============================================
function getDashboardStats() {
  const projSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const appSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const jobSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');

  // Empleados: roster real desde la hoja 'sueldos' (fuente unica)
  const rosterReal = leerRosterReal_();

  // Obtener datos con headers
  const projData = projSheet.getDataRange().getValues();
  const appData = appSheet.getDataRange().getValues();
  const jobData = jobSheet.getDataRange().getValues();

  const projHeaders = projData[0];
  const appHeaders = appData[0];
  const jobHeaders = jobData[0];

  const projects = projData.slice(1);
  const applications = appData.slice(1);
  const jobs = jobData.slice(1);

  // Encontrar indices de columnas dinamicamente
  const projEstadoCol = projHeaders.indexOf('estado');
  const appEstadoCol = appHeaders.indexOf('status') >= 0 ? appHeaders.indexOf('status') : appHeaders.indexOf('estado');
  const jobEstadoCol = jobHeaders.indexOf('estado');

  // Conteos
  const totalEmpleados = rosterReal.length;

  const totalProyectos = projects.filter(p => {
    const estado = projEstadoCol >= 0 ? p[projEstadoCol] : p[5];
    return estado === 'activo' || estado === 'in_progress';
  }).length;

  const totalPostulaciones = applications.length;

  const postulacionesPendientes = applications.filter(a => {
    const estado = appEstadoCol >= 0 ? a[appEstadoCol] : a[12];
    return estado === 'pendiente' || estado === 'revision';
  }).length;

  const convocatoriasActivas = jobs.filter(j => {
    const estado = jobEstadoCol >= 0 ? j[jobEstadoCol] : j[13];
    return estado === 'activo';
  }).length;

  // Proyectos completados y distribucion por estado
  const proyectosPorEstado = {};
  projects.forEach(p => {
    const estado = String((projEstadoCol >= 0 ? p[projEstadoCol] : p[5]) || 'sin_estado').toLowerCase().trim();
    proyectosPorEstado[estado] = (proyectosPorEstado[estado] || 0) + 1;
  });
  const proyectosCompletados = (proyectosPorEstado['completado'] || 0) +
    (proyectosPorEstado['completed'] || 0) +
    (proyectosPorEstado['finalizado'] || 0);

  // Empleados por sede
  const empleadosPorCiudad = {};
  rosterReal.forEach(t => {
    const ciudad = t.sede || 'Principal';
    empleadosPorCiudad[ciudad] = (empleadosPorCiudad[ciudad] || 0) + 1;
  });

  // Empleados por tipo (Oficina / Campo)
  const empleadosPorArea = {};
  rosterReal.forEach(t => {
    const area = t.es_campo ? 'Campo' : 'Oficina';
    empleadosPorArea[area] = (empleadosPorArea[area] || 0) + 1;
  });

  return {
    success: true,
    data: {
      totalEmpleados,
      totalProyectos,
      totalPostulaciones,
      postulacionesPendientes,
      convocatoriasActivas,
      proyectosCompletados,
      proyectosPorEstado,
      empleadosPorCiudad,
      empleadosPorArea
    }
  };
}

function getEmployeeReport() {
  const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const assignSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const projSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  
  const employees = empSheet.getDataRange().getValues();
  const assignments = assignSheet.getDataRange().getValues();
  const projects = projSheet.getDataRange().getValues();
  
  const empHeaders = employees[0];
  
  const report = employees.slice(1)
    .filter(e => e[10] === 'activo')
    .map(emp => {
      const empObj = rowToObject(empHeaders, emp);
      
      // Buscar proyecto actual
      const activeAssign = assignments.slice(1).find(a => 
        a[2] === emp[0] && a[5] === 'activa'
      );
      
      if (activeAssign) {
        const project = projects.slice(1).find(p => p[0] === activeAssign[1]);
        empObj.proyecto_actual = project ? project[2] : 'Sin proyecto';
        empObj.cliente_actual = project ? project[3] : '';
      } else {
        empObj.proyecto_actual = 'Sin asignar';
        empObj.cliente_actual = '';
      }
      
      return empObj;
    });
  
  return { success: true, data: report };
}

// ============================================================
// ADMIN TOOLS — setup y funciones DESTRUCTIVAS (tras flag)
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ATENCION: las funciones de este archivo que crean/recrean hojas o
// cargan/borran datos de prueba son DESTRUCTIVAS (pueden eliminar
// informacion real, como ya paso una vez con PDFs de produccion).
// Todas ellas llaman a assertDestructiveAllowed_() como primera linea,
// que lanza un error a menos que la Script Property
// ALLOW_DESTRUCTIVE_OPS este seteada exactamente en 'true'.
// En PRODUCCION esa Script Property debe estar AUSENTE (o en cualquier
// valor distinto de 'true'); solo se activa manualmente y de forma
// temporal desde el editor de Apps Script para tareas de mantenimiento
// puntuales, y debe borrarse apenas se termina. Ninguna de estas
// funciones esta expuesta por el router (doGet/doPost): solo se
// ejecutan a mano desde el editor.
// ============================================================
// ============================================
// CONFIGURACION INICIAL - EJECUTAR UNA VEZ
// ============================================
function setupAllSheets() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // USUARIOS
  let usuarios = ss.getSheetByName('usuarios');
  if (!usuarios) {
    usuarios = ss.insertSheet('usuarios');
    usuarios.appendRow([
      'id', 'nombre', 'email', 'password', 'rol', 'permisos', 
      'estado', 'ultimo_acceso', 'fecha_creacion', 'empleado_id'
    ]);
    // Usuario admin por defecto
    usuarios.appendRow([
      'USR001', 'Supervisor Telcom', 'supervisor1telcom@gmail.com', 'DARWINTELCOM2026',
      'admin', 'all', 'activo', '', new Date(), ''
    ]);
  }
  
  // EMPLEADOS
  let empleados = ss.getSheetByName('empleados');
  if (!empleados) {
    empleados = ss.insertSheet('empleados');
    empleados.appendRow([
      'id', 'dni', 'nombre_completo', 'email', 'telefono', 'cargo', 'area',
      'fecha_ingreso', 'ciudad_actual', 'ciudad_origen', 'estado', 
      'tipo_contrato', 'salario', 'cuenta_bancaria', 'contacto_emergencia',
      'telefono_emergencia', 'fecha_registro'
    ]);
  }
  
  // PROYECTOS
  let proyectos = ss.getSheetByName('proyectos');
  if (!proyectos) {
    proyectos = ss.insertSheet('proyectos');
    proyectos.appendRow([
      'id', 'codigo', 'nombre', 'cliente', 'descripcion', 'ciudad',
      'fecha_inicio', 'fecha_fin_estimada', 'estado', 'presupuesto',
      'supervisor', 'fecha_creacion'
    ]);
  }
  
  // ASIGNACIONES
  let asignaciones = ss.getSheetByName('asignaciones');
  if (!asignaciones) {
    asignaciones = ss.insertSheet('asignaciones');
    asignaciones.appendRow([
      'id', 'proyecto_id', 'empleado_id', 'rol', 'fecha_inicio', 
      'estado', 'fecha_fin'
    ]);
  }
  
  // HISTORIAL DE EMPLEADOS
  let historial = ss.getSheetByName('historial_empleados');
  if (!historial) {
    historial = ss.insertSheet('historial_empleados');
    historial.appendRow([
      'id', 'empleado_id', 'tipo', 'ubicacion_anterior', 'ubicacion_nueva',
      'descripcion', 'fecha', 'usuario'
    ]);
  }
  
  // CONVOCATORIAS
  let convocatorias = ss.getSheetByName('convocatorias');
  if (!convocatorias) {
    convocatorias = ss.insertSheet('convocatorias');
    convocatorias.appendRow([
      'id', 'titulo', 'categoria', 'descripcion', 'requisitos', 'beneficios',
      'ubicacion', 'modalidad', 'salario_min', 'salario_max', 'estado',
      'prioridad', 'fecha_publicacion', 'fecha_cierre', 'postulantes_count', 'imagen', 'pdf_url'
    ]);
  }
  
  // POSTULACIONES
  let postulaciones = ss.getSheetByName('postulaciones');
  if (!postulaciones) {
    postulaciones = ss.insertSheet('postulaciones');
    postulaciones.appendRow([
      'id', 'convocatoria_id', 'nombre_completo', 'dni', 'email', 'telefono',
      'linkedin', 'cv_url', 'cv_nombre', 'carta_presentacion',
      'pretension_salarial', 'disponibilidad', 'fecha_postulacion', 'estado'
    ]);
  }
  
  // CONTACTOS
  let contactos = ss.getSheetByName('contactos');
  if (!contactos) {
    contactos = ss.insertSheet('contactos');
    contactos.appendRow([
      'id', 'nombre', 'email', 'telefono', 'asunto', 'mensaje', 'fecha', 'estado'
    ]);
  }

  // ===== HOJAS DE CAPACITACIONES Y EVALUACIONES =====
  let capacitaciones = ss.getSheetByName('capacitaciones');
  if (!capacitaciones) {
    capacitaciones = ss.insertSheet('capacitaciones');
    capacitaciones.appendRow([
      'id', 'titulo', 'descripcion', 'material_url', 'categoria',
      'num_preguntas', 'nota_minima', 'tiempo_limite_min', 'foto_intervalo_seg',
      'estado', 'fecha_creacion'
    ]);
  }

  let banco_preguntas = ss.getSheetByName('banco_preguntas');
  if (!banco_preguntas) {
    banco_preguntas = ss.insertSheet('banco_preguntas');
    banco_preguntas.appendRow([
      'id', 'capacitacion_id', 'pregunta', 'tipo',
      'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
      'respuesta_correcta', 'justificacion', 'dificultad', 'puntaje', 'estado'
    ]);
  }

  let evaluaciones = ss.getSheetByName('evaluaciones');
  if (!evaluaciones) {
    evaluaciones = ss.insertSheet('evaluaciones');
    evaluaciones.appendRow([
      'id', 'capacitacion_id', 'dni', 'nombres', 'email',
      'preguntas_asignadas', 'respuestas', 'puntaje_auto', 'salidas_pestana',
      'fotos_url', 'hora_inicio', 'hora_fin', 'duracion_seg', 'estado',
      'nota_final', 'retroalimentacion', 'revisado_por', 'fecha_revision'
    ]);
  }

  let eval_fotos = ss.getSheetByName('eval_fotos');
  if (!eval_fotos) {
    eval_fotos = ss.insertSheet('eval_fotos');
    eval_fotos.appendRow(['id', 'evaluacion_id', 'foto_url', 'timestamp', 'orden']);
  }

  let eval_logs = ss.getSheetByName('eval_logs');
  if (!eval_logs) {
    eval_logs = ss.insertSheet('eval_logs');
    eval_logs.appendRow(['id', 'evaluacion_id', 'tipo_evento', 'detalle', 'timestamp']);
  }

  return 'Todas las hojas creadas exitosamente. Ejecuta createDefaultAdmin() para crear el usuario administrador.';
}

// ============================================
// DATOS DE PRUEBA - EJECUTAR UNA VEZ
// ============================================
function fillTestData() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Primero asegurarse de que las hojas existen
  setupAllSheets();

  // ========== EMPLEADOS ==========
  const empleados = ss.getSheetByName('empleados');
  const empleadosData = [
    [Utilities.getUuid(), '12345678', 'Juan Carlos Perez Mamani', 'juan.perez@telcom.com', '+51 951 234 567', 'Ingeniero Electricista', 'Operaciones', '2020-03-15', 'Tacna', 'Tacna', 'activo', 'indefinido', 3500, '1234567890123', 'Maria Perez', '+51 999 111 222', new Date()],
    [Utilities.getUuid(), '23456789', 'Maria Elena Garcia Torres', 'maria.garcia@telcom.com', '+51 952 345 678', 'Supervisora de Proyectos', 'Proyectos', '2019-06-01', 'Puno', 'Puno', 'activo', 'indefinido', 4200, '2345678901234', 'Pedro Garcia', '+51 999 222 333', new Date()],
    [Utilities.getUuid(), '34567890', 'Carlos Alberto Quispe Huanca', 'carlos.quispe@telcom.com', '+51 953 456 789', 'Tecnico Electricista', 'Operaciones', '2021-01-10', 'Tacna', 'Juliaca', 'activo', 'plazo_fijo', 2800, '3456789012345', 'Ana Quispe', '+51 999 333 444', new Date()],
    [Utilities.getUuid(), '45678901', 'Ana Lucia Condori Mamani', 'ana.condori@telcom.com', '+51 954 567 890', 'Asistente Administrativa', 'Administracion', '2022-03-01', 'Tacna', 'Tacna', 'activo', 'indefinido', 2200, '4567890123456', 'Jose Condori', '+51 999 444 555', new Date()],
    [Utilities.getUuid(), '56789012', 'Roberto Luis Mamani Choque', 'roberto.mamani@telcom.com', '+51 955 678 901', 'Ingeniero de Telecomunicaciones', 'TI', '2020-08-15', 'Puno', 'Puno', 'activo', 'indefinido', 4000, '5678901234567', 'Rosa Mamani', '+51 999 555 666', new Date()],
    [Utilities.getUuid(), '67890123', 'Patricia Soledad Ramos Apaza', 'patricia.ramos@telcom.com', '+51 956 789 012', 'Contadora', 'Finanzas', '2018-11-20', 'Tacna', 'Tacna', 'activo', 'indefinido', 3800, '6789012345678', 'Luis Ramos', '+51 999 666 777', new Date()],
    [Utilities.getUuid(), '78901234', 'Miguel Angel Torres Vargas', 'miguel.torres@telcom.com', '+51 957 890 123', 'Tecnico de Campo', 'Operaciones', '2023-02-01', 'Juliaca', 'Juliaca', 'activo', 'plazo_fijo', 2500, '7890123456789', 'Carmen Torres', '+51 999 777 888', new Date()],
    [Utilities.getUuid(), '89012345', 'Luisa Fernanda Vargas Nina', 'luisa.vargas@telcom.com', '+51 958 901 234', 'Recursos Humanos', 'RRHH', '2021-07-01', 'Tacna', 'Moquegua', 'activo', 'indefinido', 3200, '8901234567890', 'Jorge Vargas', '+51 999 888 999', new Date()],
  ];
  empleadosData.forEach(row => empleados.appendRow(row));

  // ========== PROYECTOS ==========
  const proyectos = ss.getSheetByName('proyectos');
  const proyectosData = [
    [Utilities.getUuid(), 'PROY-2024-001', 'Instalacion Red Electrica Mina Santa Rosa', 'Minera Santa Rosa SAC', 'Instalacion completa de red electrica de media tension para operaciones mineras', 'Puno', '2024-01-15', '2024-06-30', 'en_progreso', 250000, 'Maria Garcia', new Date()],
    [Utilities.getUuid(), 'PROY-2024-002', 'Mantenimiento Torres Telecomunicaciones', 'Claro Peru', 'Mantenimiento preventivo y correctivo de 15 torres de telecomunicaciones', 'Tacna', '2024-02-01', '2024-04-30', 'en_progreso', 85000, 'Juan Perez', new Date()],
    [Utilities.getUuid(), 'PROY-2024-003', 'Sistema SCADA Planta Procesadora', 'Pesquera del Sur', 'Implementacion de sistema SCADA para monitoreo de planta procesadora', 'Tacna', '2024-03-01', '2024-08-31', 'planificacion', 180000, 'Roberto Mamani', new Date()],
    [Utilities.getUuid(), 'PROY-2023-015', 'Ampliacion Subestacion Electrica', 'Southern Peru', 'Ampliacion de capacidad de subestacion electrica principal', 'Moquegua', '2023-06-01', '2023-12-15', 'completado', 450000, 'Maria Garcia', new Date()],
    [Utilities.getUuid(), 'PROY-2024-004', 'Cableado Estructurado Edificio Corporativo', 'Banco de la Nacion', 'Instalacion de cableado estructurado Cat6A en edificio de 8 pisos', 'Tacna', '2024-04-01', '2024-05-15', 'en_progreso', 45000, 'Carlos Quispe', new Date()],
    [Utilities.getUuid(), 'PROY-2024-005', 'Red Fibra Optica Municipal', 'Municipalidad Provincial Puno', 'Tendido de 25km de fibra optica para red municipal', 'Puno', '2024-05-01', '2024-10-31', 'planificacion', 320000, 'Roberto Mamani', new Date()],
  ];
  proyectosData.forEach(row => proyectos.appendRow(row));

  // ========== CONVOCATORIAS ==========
  const convocatorias = ss.getSheetByName('convocatorias');
  const convocatoriasData = [
    [Utilities.getUuid(), 'Ingeniero Electricista Senior', 'Ingenieria', 'Buscamos ingeniero electricista con experiencia en proyectos de media y alta tension para liderar equipos de trabajo en proyectos mineros.', 'Titulo profesional en Ingenieria Electrica|Colegiatura vigente|5+ anos de experiencia|Conocimiento en normas NEC y CNE|Disponibilidad para viajar', 'Sueldo competitivo|Seguro de salud EPS|Bonos por proyecto|Capacitaciones constantes|Linea de carrera', 'Tacna', 'Presencial', 5000, 7000, 'activo', 'alta', new Date(), '2024-03-31', 0],
    [Utilities.getUuid(), 'Tecnico Electricista', 'Tecnico', 'Se requiere tecnico electricista para trabajos de instalacion y mantenimiento en proyectos de telecomunicaciones.', 'Titulo tecnico en Electricidad|2+ anos de experiencia|Licencia de conducir A1|Conocimiento en instalaciones electricas industriales', 'Sueldo acorde al mercado|Seguro SCTR|Alimentacion incluida|Transporte', 'Puno', 'Presencial', 2500, 3500, 'activo', 'media', new Date(), '2024-02-28', 0],
    [Utilities.getUuid(), 'Desarrollador Full Stack', 'TI', 'Buscamos desarrollador para crear aplicaciones web y moviles para gestion de proyectos internos.', 'Bachiller en Sistemas o afines|Experiencia en React y Node.js|Conocimiento de bases de datos SQL y NoSQL|Ingles intermedio', 'Trabajo remoto parcial|Horario flexible|Laptop de trabajo|Capacitaciones en nuevas tecnologias', 'Tacna', 'Hibrido', 4000, 6000, 'activo', 'alta', new Date(), '2024-04-15', 0],
    [Utilities.getUuid(), 'Asistente de Proyectos', 'Administracion', 'Apoyo en la gestion administrativa de proyectos, seguimiento de cronogramas y coordinacion con clientes.', 'Bachiller en Administracion o Ingenieria|Manejo de MS Project|Excel avanzado|Buena comunicacion', 'Sueldo fijo|Seguro de salud|Oportunidad de crecimiento', 'Tacna', 'Presencial', 2000, 2800, 'activo', 'baja', new Date(), '2024-03-15', 0],
    [Utilities.getUuid(), 'Supervisor de Obra Electrica', 'Ingenieria', 'Supervision de obras electricas en proyectos mineros e industriales en la zona sur del Peru.', 'Ingeniero Electricista o Mecanico Electricista|Colegiatura vigente|3+ anos supervisando obras|Residencia en zona sur', 'Sueldo competitivo|Bonificacion por proyecto|Movilidad asignada|Seguro complementario', 'Moquegua', 'Presencial', 5500, 7500, 'activo', 'alta', new Date(), '2024-04-30', 0],
  ];
  convocatoriasData.forEach(row => convocatorias.appendRow(row));

  // Obtener IDs de convocatorias para las postulaciones
  const convocatoriasRows = convocatorias.getDataRange().getValues();
  const convocatoriaIds = convocatoriasRows.slice(1).map(row => row[0]).filter(id => id);

  // ========== POSTULACIONES ==========
  const postulaciones = ss.getSheetByName('postulaciones');
  const postulacionesData = [
    [Utilities.getUuid(), convocatoriaIds[0] || '', 'Pedro Martinez Gonzales', '11223344', 'pedro.martinez@gmail.com', '+51 961 111 222', 'linkedin.com/in/pedromartinez', '', '', 'Soy ingeniero electricista con 6 anos de experiencia en proyectos mineros.', 6000, 'Inmediata', new Date('2024-01-20'), 'pendiente'],
    [Utilities.getUuid(), convocatoriaIds[0] || '', 'Rosa Fernandez Diaz', '22334455', 'rosa.fernandez@hotmail.com', '+51 962 222 333', '', '', '', 'Cuento con amplia experiencia en supervision de obras electricas.', 6500, '2 semanas', new Date('2024-01-22'), 'en_revision'],
    [Utilities.getUuid(), convocatoriaIds[1] || '', 'Jorge Gutierrez Lopez', '33445566', 'jorge.gutierrez@gmail.com', '+51 963 333 444', '', '', '', 'Tecnico electricista con experiencia en telecomunicaciones.', 3000, 'Inmediata', new Date('2024-01-25'), 'pendiente'],
    [Utilities.getUuid(), convocatoriaIds[2] || '', 'Sandra Rojas Mendoza', '44556677', 'sandra.rojas@gmail.com', '+51 964 444 555', 'linkedin.com/in/sandrarojas', '', '', 'Desarrolladora con 3 anos de experiencia en React y Node.js.', 5000, '1 mes', new Date('2024-01-28'), 'entrevista'],
    [Utilities.getUuid(), convocatoriaIds[2] || '', 'Luis Herrera Castro', '55667788', 'luis.herrera@outlook.com', '+51 965 555 666', 'linkedin.com/in/luisherrera', '', '', 'Full stack developer especializado en MERN stack.', 5500, '2 semanas', new Date('2024-01-30'), 'pendiente'],
    [Utilities.getUuid(), convocatoriaIds[3] || '', 'Carmen Salazar Vega', '66778899', 'carmen.salazar@gmail.com', '+51 966 666 777', '', '', '', 'Bachiller en administracion con experiencia en gestion de proyectos.', 2500, 'Inmediata', new Date('2024-02-01'), 'contratado'],
  ];
  postulacionesData.forEach(row => postulaciones.appendRow(row));

  // Obtener IDs de proyectos y empleados para asignaciones
  const proyectosRows = proyectos.getDataRange().getValues();
  const proyectoIds = proyectosRows.slice(1).map(row => row[0]).filter(id => id);

  const empleadosRows = empleados.getDataRange().getValues();
  const empleadoIds = empleadosRows.slice(1).map(row => row[0]).filter(id => id);

  // ========== ASIGNACIONES ==========
  const asignaciones = ss.getSheetByName('asignaciones');
  const asignacionesData = [
    [Utilities.getUuid(), proyectoIds[0] || '', empleadoIds[1] || '', 'Supervisor Principal', '2024-01-15', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[0] || '', empleadoIds[2] || '', 'Tecnico de Campo', '2024-01-15', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[1] || '', empleadoIds[0] || '', 'Ingeniero Lider', '2024-02-01', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[1] || '', empleadoIds[6] || '', 'Tecnico de Campo', '2024-02-01', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[2] || '', empleadoIds[4] || '', 'Ingeniero de Sistemas', '2024-03-01', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[3] || '', empleadoIds[1] || '', 'Supervisor', '2023-06-01', 'completado', '2023-12-15'],
    [Utilities.getUuid(), proyectoIds[4] || '', empleadoIds[2] || '', 'Tecnico Instalador', '2024-04-01', 'activo', ''],
  ];
  asignacionesData.forEach(row => asignaciones.appendRow(row));

  // ========== CONTACTOS ==========
  const contactos = ss.getSheetByName('contactos');
  const contactosData = [
    [Utilities.getUuid(), 'Carlos Rodriguez Silva', 'carlos.rodriguez@empresa.com', '+51 987 654 321', 'Consulta sobre servicios de software', 'Buenas tardes, estoy interesado en conocer mas sobre sus servicios de desarrollo de software. Tenemos un proyecto de gestion de inventarios que nos gustaria implementar. Podrian enviarme informacion sobre costos y tiempos de desarrollo?', new Date('2024-01-11T10:30:00'), 'pendiente'],
    [Utilities.getUuid(), 'Ana Maria Torres Gutierrez', 'ana.torres@minera.pe', '+51 956 123 456', 'Cotizacion proyecto minero', 'Estimados, somos una empresa minera ubicada en Puno y necesitamos supervision de obras electricas. Quisiera agendar una reunion para discutir los detalles del proyecto. Nuestro presupuesto es de aproximadamente $200,000.', new Date('2024-01-10T15:45:00'), 'respondido'],
    [Utilities.getUuid(), 'Luis Fernando Mendoza', 'lfernandez@gmail.com', '+51 945 789 012', 'Consulta general', 'Hola, vi su pagina web y me gustaria saber si realizan trabajos en la ciudad de Arequipa. Gracias de antemano por su respuesta.', new Date('2024-01-09T09:15:00'), 'pendiente'],
    [Utilities.getUuid(), 'Patricia Huaman Rios', 'patricia.huaman@constructora.com', '+51 978 456 123', 'Alianza estrategica', 'Buenos dias, represento a una constructora y estamos interesados en establecer una alianza para proyectos de electrificacion. Favor contactarme.', new Date('2024-01-08T14:20:00'), 'leido'],
    [Utilities.getUuid(), 'Roberto Sanchez Velasquez', 'r.sanchez@industrial.pe', '', 'Mantenimiento preventivo', 'Necesitamos cotizacion para mantenimiento preventivo de nuestras instalaciones electricas. Somos una planta industrial en Tacna.', new Date('2024-01-07T11:00:00'), 'respondido'],
  ];
  contactosData.forEach(row => contactos.appendRow(row));

  // ========== USUARIOS ADICIONALES ==========
  const usuarios = ss.getSheetByName('usuarios');
  // Agregar usuario manager
  usuarios.appendRow([
    Utilities.getUuid(), 'Maria Garcia', 'maria.garcia@telcom.com', 'manager123',
    'manager', 'ver_empleados,editar_empleados,ver_proyectos,editar_proyectos', 'activo', '', new Date(), empleadoIds[1] || ''
  ]);

  return 'Datos de prueba insertados exitosamente! Se crearon: 8 empleados, 6 proyectos, 5 convocatorias, 6 postulaciones, 7 asignaciones, 5 mensajes de contacto, 1 usuario manager adicional.';
}

// ============================================
// CONFIGURAR HOJA DE ASISTENCIAS
// Ejecutar manualmente para crear la hoja
// ============================================
function configurarHojaAsistencias() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let attendanceSheet = ss.getSheetByName('Asistencias'); // Mayuscula

  if (!attendanceSheet) {
    attendanceSheet = ss.insertSheet('Asistencias');
    // Usar tu estructura existente con columnas en ingles
    attendanceSheet.appendRow([
      'id', 'employeeId', 'employeeName', 'employeeDni', 'date',
      'checkIn', 'checkOut', 'checkInLat', 'checkInLng', 'checkInAccuracy',
      'checkOutLat', 'checkOutLng', 'checkOutAccuracy', 'status', 'hoursWorked', 'createdAt'
    ]);

    // Formatear cabecera
    const headerRange = attendanceSheet.getRange(1, 1, 1, 16);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');

    return 'Hoja Asistencias creada exitosamente';
  } else {
    return 'Hoja Asistencias ya existe';
  }
}

// ============================================
// FUNCIONES DE DATOS DE PRUEBA
// Ejecutar manualmente desde el editor de Apps Script
// ============================================

/**
 * EJECUTAR ESTA FUNCION PARA LLENAR TODOS LOS DATOS DE PRUEBA
 * Menu: Ejecutar > Ejecutar funcion > cargarTodosLosDatosPrueba
 *
 * IMPORTANTE: Esta funcion ELIMINA y RECREA todas las hojas con los encabezados correctos
 */
function cargarTodosLosDatosPrueba() {
  assertDestructiveAllowed_();
  const resultados = [];

  resultados.push('=== CARGANDO DATOS DE PRUEBA ===');
  resultados.push(cargarUsuariosPrueba());
  resultados.push(cargarEmpleadosPrueba());
  resultados.push(cargarProyectosPrueba());
  resultados.push(cargarAsignacionesPrueba());
  resultados.push(cargarConvocatoriasPrueba());
  resultados.push(cargarPostulacionesPrueba());
  resultados.push(cargarAsistenciasPrueba());
  resultados.push(cargarContactosPrueba());
  resultados.push(cargarHistorialEmpleadosPrueba());
  resultados.push('=== DATOS DE PRUEBA CARGADOS ===');

  Logger.log(resultados.join('\n'));
  return resultados.join('\n');
}

/**
 * Funcion auxiliar para recrear una hoja con encabezados correctos
 * ELIMINA la hoja existente y crea una nueva
 */
function recrearHoja(ss, nombreHoja, encabezados) {
  assertDestructiveAllowed_();
  // Eliminar hoja si existe
  const hojaExistente = ss.getSheetByName(nombreHoja);
  if (hojaExistente) {
    ss.deleteSheet(hojaExistente);
  }

  // Crear nueva hoja
  const sheet = ss.insertSheet(nombreHoja);
  sheet.appendRow(encabezados);
  formatearCabecera(sheet, encabezados.length);

  return sheet;
}

/**
 * Cargar empleados de prueba
 * Encabezados: id, dni, nombre_completo, email, telefono, cargo, area, fecha_ingreso,
 *              ciudad_actual, ciudad_origen, estado, tipo_contrato, salario,
 *              cuenta_bancaria, contacto_emergencia, telefono_emergencia, fecha_registro
 */
function cargarEmpleadosPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'dni', 'nombre_completo', 'email', 'telefono', 'cargo',
    'area', 'fecha_ingreso', 'ciudad_actual', 'ciudad_origen', 'estado',
    'tipo_contrato', 'salario', 'cuenta_bancaria', 'contacto_emergencia',
    'telefono_emergencia', 'fecha_registro'
  ];

  const sheet = recrearHoja(ss, 'empleados', encabezados);

  // Datos: id, dni, nombre_completo, email, telefono, cargo, area, fecha_ingreso, ciudad_actual, ciudad_origen, estado, tipo_contrato, salario, cuenta_bancaria, contacto_emergencia, telefono_emergencia, fecha_registro
  const empleados = [
    ['EMP001', '70123456', 'Juan Carlos Perez Mamani', 'juan.perez@telcom.pe', '946728001', 'Desarrollador Senior', 'Software', '2020-03-15', 'Tacna', 'Puno', 'activo', 'Indefinido', 4500, '123-45678901-01', 'Rosa Mamani', '987654001', new Date()],
    ['EMP002', '70234567', 'Maria Elena Garcia Quispe', 'maria.garcia@telcom.pe', '946728002', 'Ingeniero Electrico', 'Ingenieria Electrica', '2019-06-01', 'Puno', 'Juliaca', 'activo', 'Indefinido', 5000, '123-45678902-02', 'Pedro Garcia', '987654002', new Date()],
    ['EMP003', '70345678', 'Carlos Alberto Lopez Condori', 'carlos.lopez@telcom.pe', '946728003', 'Tecnico TIC', 'TIC', '2021-09-10', 'Arequipa', 'Tacna', 'activo', 'Plazo fijo', 3500, '123-45678903-03', 'Ana Lopez', '987654003', new Date()],
    ['EMP004', '70456789', 'Ana Patricia Ramos Flores', 'ana.ramos@telcom.pe', '946728004', 'Supervisora de Proyectos', 'Administracion', '2018-01-20', 'Tacna', 'Tacna', 'activo', 'Indefinido', 5500, '123-45678904-04', 'Luis Ramos', '987654004', new Date()],
    ['EMP005', '70567890', 'Roberto Luis Vargas Ccama', 'roberto.vargas@telcom.pe', '946728005', 'Ingeniero de Redes', 'TIC', '2022-02-01', 'Tacna', 'Arequipa', 'activo', 'Indefinido', 4200, '123-45678905-05', 'Carmen Ccama', '987654005', new Date()],
    ['EMP006', '70678901', 'Lucia Fernanda Huanca Torres', 'lucia.huanca@telcom.pe', '946728006', 'Analista de Sistemas', 'Software', '2021-05-15', 'Tacna', 'Tacna', 'activo', 'Indefinido', 4000, '123-45678906-06', 'Fernando Huanca', '987654006', new Date()],
    ['EMP007', '70789012', 'Diego Fernando Ticona Apaza', 'diego.ticona@telcom.pe', '946728007', 'Tecnico Electricista', 'Ingenieria Electrica', '2020-08-01', 'Puno', 'Puno', 'activo', 'Plazo fijo', 3200, '123-45678907-07', 'Juana Apaza', '987654007', new Date()],
    ['EMP008', '70890123', 'Carmen Rosa Choque Vilca', 'carmen.choque@telcom.pe', '946728008', 'Asistente Administrativa', 'Administracion', '2022-11-01', 'Tacna', 'Moquegua', 'activo', 'Plazo fijo', 2500, '123-45678908-08', 'Mario Vilca', '987654008', new Date()],
    ['EMP009', '70901234', 'Miguel Angel Calizaya Pari', 'miguel.calizaya@telcom.pe', '946728009', 'Jefe de Proyectos', 'Mineria', '2017-04-10', 'Arequipa', 'Arequipa', 'activo', 'Indefinido', 6500, '123-45678909-09', 'Elena Pari', '987654009', new Date()],
    ['EMP010', '71012345', 'Sandra Beatriz Mamani Cruz', 'sandra.mamani@telcom.pe', '946728010', 'Desarrollador Junior', 'Software', '2023-01-15', 'Tacna', 'Ilo', 'activo', 'Plazo fijo', 2800, '123-45678910-10', 'Jorge Cruz', '987654010', new Date()],
    ['EMP011', '71123456', 'Pedro Jose Gutierrez Rios', 'pedro.gutierrez@telcom.pe', '946728011', 'Ingeniero de Campo', 'Ingenieria Electrica', '2019-03-01', 'Juliaca', 'Juliaca', 'activo', 'Indefinido', 4800, '123-45678911-11', 'Teresa Rios', '987654011', new Date()],
    ['EMP012', '71234567', 'Veronica Isabel Castillo Luna', 'veronica.castillo@telcom.pe', '946728012', 'Coordinadora RRHH', 'Administracion', '2018-07-15', 'Tacna', 'Lima', 'activo', 'Indefinido', 4500, '123-45678912-12', 'Ricardo Luna', '987654012', new Date()],
    ['EMP013', '71345678', 'Fernando Raul Quispe Hancco', 'fernando.quispe@telcom.pe', '946728013', 'Tecnico de Soporte', 'TIC', '2021-02-01', 'Puno', 'Puno', 'licencia', 'Indefinido', 3000, '123-45678913-13', 'Gloria Hancco', '987654013', new Date()],
    ['EMP014', '71456789', 'Gabriela Sofia Torres Mendoza', 'gabriela.torres@telcom.pe', '946728014', 'Contadora', 'Administracion', '2020-01-10', 'Tacna', 'Tacna', 'activo', 'Indefinido', 4200, '123-45678914-14', 'Oscar Mendoza', '987654014', new Date()],
    ['EMP015', '71567890', 'Andres Felipe Coaquira Nina', 'andres.coaquira@telcom.pe', '946728015', 'Supervisor Electrico', 'Ingenieria Electrica', '2019-11-01', 'Arequipa', 'Puno', 'activo', 'Indefinido', 5200, '123-45678915-15', 'Silvia Nina', '987654015', new Date()],
  ];

  empleados.forEach(emp => sheet.appendRow(emp));

  return `Empleados: ${empleados.length} registros creados`;
}

/**
 * Cargar proyectos de prueba
 * Encabezados: id, nombre, descripcion, cliente, ciudad, estado, fecha_inicio, fecha_fin, presupuesto, createdAt, updatedAt
 */
function cargarProyectosPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'nombre', 'descripcion', 'cliente', 'ciudad', 'estado',
    'fecha_inicio', 'fecha_fin', 'presupuesto', 'createdAt', 'updatedAt'
  ];

  const sheet = recrearHoja(ss, 'proyectos', encabezados);

  const proyectos = [
    ['PRY001', 'Modernizacion Red Electrica Toquepala', 'Actualizacion del sistema de distribucion electrica para la mina Toquepala', 'Southern Peru', 'Tacna', 'in_progress', '2024-01-15', '2024-12-31', 250000, new Date(), new Date()],
    ['PRY002', 'Sistema de Monitoreo IoT Minera', 'Implementacion de sensores IoT para monitoreo de equipos mineros', 'Minsur', 'Puno', 'in_progress', '2024-03-01', '2024-09-30', 180000, new Date(), new Date()],
    ['PRY003', 'Automatizacion Planta Procesadora', 'Sistema SCADA para control de procesos industriales', 'Cemento Sur', 'Arequipa', 'completed', '2023-06-01', '2024-02-28', 320000, new Date(), new Date()],
    ['PRY004', 'Red de Fibra Optica Municipal', 'Tendido de fibra optica para conectividad municipal', 'Municipalidad de Tacna', 'Tacna', 'in_progress', '2024-02-01', '2024-08-31', 450000, new Date(), new Date()],
    ['PRY005', 'Mantenimiento Subestaciones SEAL', 'Mantenimiento preventivo y correctivo de subestaciones electricas', 'SEAL', 'Arequipa', 'in_progress', '2024-01-01', '2024-12-31', 150000, new Date(), new Date()],
    ['PRY006', 'Software de Gestion de Activos', 'Desarrollo de sistema web para gestion de activos mineros', 'Volcan Mining', 'Lima', 'planning', '2024-06-01', '2025-03-31', 280000, new Date(), new Date()],
    ['PRY007', 'Instalacion Paneles Solares Agroindustria', 'Sistema fotovoltaico para planta agroindustrial', 'Agroindustrial Danper', 'Tacna', 'completed', '2023-09-01', '2024-01-15', 95000, new Date(), new Date()],
    ['PRY008', 'Centro de Datos Regional', 'Implementacion de data center para gobierno regional', 'Gobierno Regional Puno', 'Puno', 'on_hold', '2024-04-01', '2025-06-30', 520000, new Date(), new Date()],
  ];

  proyectos.forEach(pry => sheet.appendRow(pry));

  return `Proyectos: ${proyectos.length} registros creados`;
}

/**
 * Cargar asignaciones de prueba
 * Encabezados: id, employeeId, employeeName, projectId, projectName, role, startDate, endDate, status, createdAt
 */
function cargarAsignacionesPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'employeeId', 'employeeName', 'projectId', 'projectName',
    'role', 'startDate', 'endDate', 'status', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'asignaciones', encabezados);

  const asignaciones = [
    ['ASG001', 'EMP001', 'Juan Carlos Perez Mamani', 'PRY006', 'Software de Gestion de Activos', 'Desarrollador Principal', '2024-06-01', '', 'active', new Date()],
    ['ASG002', 'EMP006', 'Lucia Fernanda Huanca Torres', 'PRY006', 'Software de Gestion de Activos', 'Desarrollador', '2024-06-01', '', 'active', new Date()],
    ['ASG003', 'EMP010', 'Sandra Beatriz Mamani Cruz', 'PRY006', 'Software de Gestion de Activos', 'Desarrollador Junior', '2024-06-15', '', 'active', new Date()],
    ['ASG004', 'EMP002', 'Maria Elena Garcia Quispe', 'PRY001', 'Modernizacion Red Electrica Toquepala', 'Ingeniero Principal', '2024-01-15', '', 'active', new Date()],
    ['ASG005', 'EMP015', 'Andres Felipe Coaquira Nina', 'PRY001', 'Modernizacion Red Electrica Toquepala', 'Supervisor', '2024-01-15', '', 'active', new Date()],
    ['ASG006', 'EMP007', 'Diego Fernando Ticona Apaza', 'PRY001', 'Modernizacion Red Electrica Toquepala', 'Tecnico', '2024-02-01', '', 'active', new Date()],
    ['ASG007', 'EMP005', 'Roberto Luis Vargas Ccama', 'PRY002', 'Sistema de Monitoreo IoT Minera', 'Ingeniero de Redes', '2024-03-01', '', 'active', new Date()],
    ['ASG008', 'EMP003', 'Carlos Alberto Lopez Condori', 'PRY002', 'Sistema de Monitoreo IoT Minera', 'Tecnico TIC', '2024-03-15', '', 'active', new Date()],
    ['ASG009', 'EMP009', 'Miguel Angel Calizaya Pari', 'PRY003', 'Automatizacion Planta Procesadora', 'Jefe de Proyecto', '2023-06-01', '2024-02-28', 'completed', new Date()],
    ['ASG010', 'EMP004', 'Ana Patricia Ramos Flores', 'PRY004', 'Red de Fibra Optica Municipal', 'Supervisora', '2024-02-01', '', 'active', new Date()],
    ['ASG011', 'EMP011', 'Pedro Jose Gutierrez Rios', 'PRY005', 'Mantenimiento Subestaciones SEAL', 'Ingeniero de Campo', '2024-01-01', '', 'active', new Date()],
  ];

  asignaciones.forEach(asg => sheet.appendRow(asg));

  return `Asignaciones: ${asignaciones.length} registros creados`;
}

/**
 * Cargar convocatorias (vacantes) de prueba
 * Encabezados: id, titulo, categoria, descripcion, requisitos, beneficios, ubicacion, modalidad,
 *              salario_min, salario_max, vacantes, fecha_inicio, fecha_cierre, estado, urgente, createdAt, updatedAt
 */
function cargarConvocatoriasPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'titulo', 'categoria', 'descripcion', 'requisitos', 'beneficios',
    'ubicacion', 'modalidad', 'salario_min', 'salario_max', 'vacantes',
    'fecha_inicio', 'fecha_cierre', 'estado', 'urgente', 'pdf_url', 'createdAt', 'updatedAt'
  ];

  const sheet = recrearHoja(ss, 'convocatorias', encabezados);

  const convocatorias = [
    ['JOB001', 'Desarrollador Full Stack Senior', 'Software', 'Buscamos desarrollador con experiencia en React, Node.js y bases de datos. Participara en proyectos de software para el sector minero e industrial.', 'Bachiller en Ingenieria de Sistemas o afines|3+ años de experiencia en desarrollo web|Conocimiento de React, Node.js, TypeScript|Experiencia con bases de datos SQL y NoSQL|Ingles intermedio', 'Sueldo competitivo S/4,500 - S/6,000|Seguro de salud EPS|Capacitaciones constantes|Bono por desempeño|Trabajo hibrido', 'Tacna', 'Hibrido', 4500, 6000, 2, '2024-01-15', '2024-03-15', 'activo', true, new Date(), new Date()],
    ['JOB002', 'Ingeniero Electricista', 'Ingenieria Electrica', 'Se requiere ingeniero electricista colegiado para proyectos de media y alta tension en el sector minero.', 'Titulo profesional en Ingenieria Electrica|Colegiatura habilitada CIP|5+ años de experiencia en proyectos electricos|Conocimiento de normativas electricas peruanas|Licencia de conducir A1', 'Sueldo S/5,000 - S/7,000|Movilidad|Viaticos|Seguro SCTR|Linea de carrera', 'Arequipa', 'Presencial', 5000, 7000, 1, '2024-01-20', '2024-02-28', 'activo', true, new Date(), new Date()],
    ['JOB003', 'Tecnico en Telecomunicaciones', 'TIC', 'Tecnico para instalacion y mantenimiento de redes de comunicacion, fibra optica y sistemas de radiocomunicacion.', 'Tecnico titulado en Telecomunicaciones o Electronica|2+ años de experiencia|Conocimiento en fibra optica y redes LAN/WAN|Disponibilidad para viajar|Licencia de conducir', 'Sueldo S/2,800 - S/3,500|Seguro de salud|Capacitaciones tecnicas|Uniforme y EPP|Bonos por proyecto', 'Tacna', 'Presencial', 2800, 3500, 3, '2024-02-01', '2024-03-30', 'activo', false, new Date(), new Date()],
    ['JOB004', 'Supervisor de Obras Electricas', 'Ingenieria Electrica', 'Supervisar la ejecucion de proyectos electricos en campo, asegurando cumplimiento de calidad y seguridad.', 'Ingeniero o Tecnico Electricista|8+ años de experiencia en supervision|Conocimiento de AutoCAD y MS Project|Experiencia en sector minero|Liderazgo de equipos', 'Sueldo S/6,000 - S/8,000|Vehiculo asignado|Viaticos completos|Seguro de vida|Bono anual', 'Puno', 'Presencial', 6000, 8000, 1, '2024-01-25', '2024-02-25', 'activo', true, new Date(), new Date()],
    ['JOB005', 'Asistente de Sistemas', 'Software', 'Soporte tecnico de primer nivel, mantenimiento de equipos y apoyo en desarrollo de software interno.', 'Estudiante o bachiller en Ingenieria de Sistemas|1+ año de experiencia en soporte tecnico|Conocimiento de Windows, Linux, redes|Proactivo y con ganas de aprender|Disponibilidad inmediata', 'Sueldo S/1,800 - S/2,200|Horario flexible|Capacitaciones|Posibilidad de crecimiento|Buen ambiente laboral', 'Tacna', 'Presencial', 1800, 2200, 1, '2024-02-10', '2024-03-10', 'activo', false, new Date(), new Date()],
    ['JOB006', 'Analista de Datos', 'Software', 'Analista para procesamiento y visualizacion de datos operacionales del sector minero e industrial.', 'Bachiller en Estadistica, Sistemas o afines|2+ años en analisis de datos|Dominio de Python, SQL, Power BI|Conocimiento de machine learning basico|Ingles intermedio', 'Sueldo S/3,500 - S/4,500|Trabajo remoto|Capacitaciones en cloud|Horario flexible|Bono por resultados', 'Remoto', 'Remoto', 3500, 4500, 1, '2024-02-15', '2024-04-15', 'activo', false, new Date(), new Date()],
    ['JOB007', 'Jefe de Proyectos Electricos', 'Administracion', 'Liderar la gestion de proyectos electricos desde la planificacion hasta la entrega final.', 'Ingeniero Electricista o Industrial|10+ años de experiencia|Certificacion PMP deseable|Experiencia en sector minero|Habilidades de negociacion', 'Sueldo S/8,000 - S/12,000|Auto de empresa|Seguro familiar|Bono semestral|Acciones de la empresa', 'Lima', 'Hibrido', 8000, 12000, 1, '2024-01-10', '2024-02-10', 'cerrado', false, new Date(), new Date()],
    ['JOB008', 'Practicante de Ingenieria Electrica', 'Ingenieria Electrica', 'Programa de practicas pre-profesionales para estudiantes de ultimos ciclos de Ingenieria Electrica.', 'Estudiante de 8vo ciclo o superior|Disponibilidad de 6 horas diarias|Conocimiento de AutoCAD|Manejo de Excel avanzado|Interes en sector minero', 'Subvencion S/1,200|Horario flexible|Certificado de practicas|Mentoria|Posibilidad de contratacion', 'Tacna', 'Presencial', 1200, 1200, 2, '2024-02-20', '2024-04-20', 'activo', false, new Date(), new Date()],
  ];

  convocatorias.forEach(conv => sheet.appendRow(conv));

  return `Convocatorias: ${convocatorias.length} registros creados`;
}

/**
 * Cargar postulaciones de prueba
 * Encabezados: id, jobId, jobTitle, fullName, dni, email, phone, linkedIn, coverLetter,
 *              expectedSalary, availability, cvUrl, status, notes, createdAt, updatedAt
 */
function cargarPostulacionesPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'jobId', 'jobTitle', 'fullName', 'dni', 'email', 'phone',
    'linkedIn', 'coverLetter', 'expectedSalary', 'availability',
    'cvUrl', 'status', 'notes', 'createdAt', 'updatedAt'
  ];

  const sheet = recrearHoja(ss, 'postulaciones', encabezados);

  const postulaciones = [
    ['POST001', 'JOB001', 'Desarrollador Full Stack Senior', 'Ricardo Alejandro Flores Mendez', '72345678', 'ricardo.flores@gmail.com', '987654321', 'linkedin.com/in/ricardoflores', 'Soy desarrollador con 4 años de experiencia en React y Node.js. He trabajado en proyectos para el sector financiero y retail.', 5500, 'Inmediata', 'https://drive.google.com/cv1', 'revision', '', new Date(), new Date()],
    ['POST002', 'JOB001', 'Desarrollador Full Stack Senior', 'Mariana Isabel Gutierrez Arias', '72456789', 'mariana.gutierrez@outlook.com', '976543210', 'linkedin.com/in/marianagutierrez', 'Full stack developer con experiencia en startups tecnologicas. Dominio de TypeScript y arquitecturas cloud.', 5000, '15 dias', 'https://drive.google.com/cv2', 'entrevista', 'Perfil muy interesante, agendar entrevista tecnica', new Date(), new Date()],
    ['POST003', 'JOB001', 'Desarrollador Full Stack Senior', 'Jorge Luis Paredes Salazar', '72567890', 'jorge.paredes@gmail.com', '965432109', '', 'Ingeniero de software con background en sistemas distribuidos. Busco nuevos retos profesionales.', 6000, '30 dias', 'https://drive.google.com/cv3', 'pendiente', '', new Date(), new Date()],
    ['POST004', 'JOB002', 'Ingeniero Electricista', 'Alberto Jose Mendoza Ramirez', '72678901', 'alberto.mendoza@gmail.com', '954321098', 'linkedin.com/in/albertomendoza', 'Ingeniero electricista con 6 años en proyectos de alta tension. Experiencia en Southern Peru y Antamina.', 6500, 'Inmediata', 'https://drive.google.com/cv4', 'entrevista', 'Excelente perfil, coordinar con gerencia', new Date(), new Date()],
    ['POST005', 'JOB002', 'Ingeniero Electricista', 'Patricia Carmen Velasquez Cruz', '72789012', 'patricia.velasquez@hotmail.com', '943210987', '', 'Ingeniera electrica colegiada con especializacion en sistemas de potencia.', 5500, '15 dias', 'https://drive.google.com/cv5', 'revision', '', new Date(), new Date()],
    ['POST006', 'JOB003', 'Tecnico en Telecomunicaciones', 'Luis Alberto Condori Mamani', '72890123', 'luis.condori@gmail.com', '932109876', '', 'Tecnico en telecomunicaciones con 3 años de experiencia en instalacion de fibra optica.', 3200, 'Inmediata', 'https://drive.google.com/cv6', 'aceptado', 'Contratado - inicia 01/03', new Date(), new Date()],
    ['POST007', 'JOB003', 'Tecnico en Telecomunicaciones', 'Kevin Fernando Quispe Torres', '72901234', 'kevin.quispe@outlook.com', '921098765', '', 'Experiencia en redes de comunicacion y mantenimiento de equipos de radio.', 3000, 'Inmediata', 'https://drive.google.com/cv7', 'revision', '', new Date(), new Date()],
    ['POST008', 'JOB004', 'Supervisor de Obras Electricas', 'Raul Antonio Apaza Ccama', '73012345', 'raul.apaza@gmail.com', '910987654', 'linkedin.com/in/raulapaza', 'Supervisor con 10 años de experiencia en proyectos mineros. Liderazgo de equipos de hasta 30 personas.', 7500, '30 dias', 'https://drive.google.com/cv8', 'entrevista', 'Segunda entrevista programada', new Date(), new Date()],
    ['POST009', 'JOB005', 'Asistente de Sistemas', 'Daniela Milagros Huanca Ramos', '73123456', 'daniela.huanca@gmail.com', '909876543', '', 'Estudiante de ultimo año de Ingenieria de Sistemas con practicas en soporte tecnico.', 2000, 'Inmediata', 'https://drive.google.com/cv9', 'aceptado', 'Contratada para puesto', new Date(), new Date()],
    ['POST010', 'JOB005', 'Asistente de Sistemas', 'Bryan Eduardo Torres Luna', '73234567', 'bryan.torres@outlook.com', '898765432', '', 'Bachiller en sistemas con conocimiento en desarrollo web y soporte.', 2100, '15 dias', 'https://drive.google.com/cv10', 'rechazado', 'No cumple requisitos minimos', new Date(), new Date()],
    ['POST011', 'JOB006', 'Analista de Datos', 'Claudia Stefany Pari Vilca', '73345678', 'claudia.pari@gmail.com', '887654321', 'linkedin.com/in/claudiapari', 'Analista de datos con experiencia en Python y visualizacion. Certificada en AWS.', 4200, 'Inmediata', 'https://drive.google.com/cv11', 'revision', '', new Date(), new Date()],
    ['POST012', 'JOB008', 'Practicante de Ingenieria Electrica', 'Rodrigo Sebastian Flores Condori', '73456789', 'rodrigo.flores@unsa.edu.pe', '876543210', '', 'Estudiante de 9no ciclo de Ingenieria Electrica UNSA. Disponibilidad completa.', 1200, 'Inmediata', 'https://drive.google.com/cv12', 'entrevista', 'Buen promedio academico', new Date(), new Date()],
  ];

  postulaciones.forEach(post => sheet.appendRow(post));

  return `Postulaciones: ${postulaciones.length} registros creados`;
}

/**
 * Cargar asistencias de prueba (ultimos 7 dias)
 * Encabezados: id, employeeId, employeeName, employeeDni, date, checkIn, checkOut,
 *              checkInLat, checkInLng, checkInAccuracy, checkOutLat, checkOutLng,
 *              checkOutAccuracy, status, hoursWorked, createdAt
 */
function cargarAsistenciasPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'employeeId', 'employeeName', 'employeeDni', 'date',
    'checkIn', 'checkOut', 'checkInLat', 'checkInLng', 'checkInAccuracy',
    'checkOutLat', 'checkOutLng', 'checkOutAccuracy', 'status', 'hoursWorked', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'Asistencias', encabezados);

  const empleados = [
    { id: 'EMP001', name: 'Juan Carlos Perez Mamani', dni: '70123456' },
    { id: 'EMP002', name: 'Maria Elena Garcia Quispe', dni: '70234567' },
    { id: 'EMP003', name: 'Carlos Alberto Lopez Condori', dni: '70345678' },
    { id: 'EMP004', name: 'Ana Patricia Ramos Flores', dni: '70456789' },
    { id: 'EMP005', name: 'Roberto Luis Vargas Ccama', dni: '70567890' },
    { id: 'EMP006', name: 'Lucia Fernanda Huanca Torres', dni: '70678901' },
    { id: 'EMP007', name: 'Diego Fernando Ticona Apaza', dni: '70789012' },
    { id: 'EMP008', name: 'Carmen Rosa Choque Vilca', dni: '70890123' },
    { id: 'EMP009', name: 'Miguel Angel Calizaya Pari', dni: '70901234' },
    { id: 'EMP010', name: 'Sandra Beatriz Mamani Cruz', dni: '71012345' },
  ];

  const hoy = new Date();
  let contador = 0;

  // Generar asistencias para los ultimos 7 dias
  for (let d = 6; d >= 0; d--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - d);
    const fechaStr = Utilities.formatDate(fecha, 'America/Lima', 'yyyy-MM-dd');

    // Saltar fines de semana
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;

    empleados.forEach((emp) => {
      // Simular 80% de asistencia
      if (Math.random() > 0.2) {
        const entradaBase = 8;
        const entradaMin = Math.floor(Math.random() * 30);
        const salidaBase = 17;
        const salidaMin = Math.floor(Math.random() * 45);

        const checkIn = `${String(entradaBase).padStart(2, '0')}:${String(entradaMin).padStart(2, '0')}:00`;
        const checkOut = d === 0 && Math.random() > 0.4 ? '' : `${String(salidaBase).padStart(2, '0')}:${String(salidaMin).padStart(2, '0')}:00`;

        const hoursWorked = checkOut ? ((salidaBase * 60 + salidaMin) - (entradaBase * 60 + entradaMin)) / 60 : 0;

        // Coordenadas aleatorias cerca de Tacna
        const lat = -18.0146 + (Math.random() - 0.5) * 0.01;
        const lng = -70.2536 + (Math.random() - 0.5) * 0.01;

        sheet.appendRow([
          `ATT${String(++contador).padStart(5, '0')}`,
          emp.id,
          emp.name,
          emp.dni,
          fechaStr,
          checkIn,
          checkOut,
          lat.toFixed(6),
          lng.toFixed(6),
          Math.floor(Math.random() * 20) + 5,
          checkOut ? lat.toFixed(6) : '',
          checkOut ? lng.toFixed(6) : '',
          checkOut ? Math.floor(Math.random() * 20) + 5 : '',
          checkOut ? 'completed' : 'in_progress',
          hoursWorked.toFixed(2),
          new Date()
        ]);
      }
    });
  }

  return `Asistencias: ${contador} registros creados`;
}

/**
 * Cargar mensajes de contacto de prueba
 * Encabezados: id, nombre, email, telefono, empresa, asunto, mensaje, estado, createdAt
 */
function cargarContactosPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'nombre', 'email', 'telefono', 'empresa', 'asunto', 'mensaje', 'estado', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'contactos', encabezados);

  const contactos = [
    ['CTT001', 'Fernando Gutierrez', 'fernando.g@minera.com', '999888777', 'Minera del Sur SAC', 'Cotizacion de servicios', 'Buenos dias, estamos interesados en cotizar servicios de mantenimiento electrico para nuestra planta en Moquegua. Por favor contactarnos.', 'nuevo', new Date()],
    ['CTT002', 'Laura Martinez', 'lmartinez@constructora.pe', '988777666', 'Constructora Andina', 'Proyecto de automatizacion', 'Necesitamos implementar un sistema de control automatizado para una nueva linea de produccion. Quisiera agendar una reunion.', 'respondido', new Date()],
    ['CTT003', 'Carlos Rojas', 'crojas@agroexport.com', '977666555', 'AgroExport Peru', 'Instalacion electrica', 'Requerimos instalacion electrica para nuevo almacen de 2000m2. Urgente cotizacion.', 'en_proceso', new Date()],
    ['CTT004', 'Maria Sanchez', 'msanchez@municipalidad.gob.pe', '966555444', 'Municipalidad Provincial', 'Consulta tecnica', 'Solicitamos informacion sobre sus servicios de consultoria en proyectos de alumbrado publico LED.', 'nuevo', new Date()],
    ['CTT005', 'Roberto Diaz', 'rdiaz@industriasperu.com', '955444333', 'Industrias Peru SA', 'Mantenimiento preventivo', 'Interesados en contratar servicio de mantenimiento preventivo mensual para nuestras instalaciones electricas.', 'respondido', new Date()],
  ];

  contactos.forEach(cont => sheet.appendRow(cont));

  return `Contactos: ${contactos.length} registros creados`;
}

/**
 * Cargar usuarios del sistema
 * Encabezados: id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id
 * IMPORTANTE: login() espera: [2]=email, [3]=password, [6]='activo' (string)
 */
function cargarUsuariosPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Estructura de 10 columnas que coincide con lo que espera login()
  const encabezados = [
    'id', 'nombre', 'email', 'password', 'rol', 'permisos', 'estado', 'ultimo_acceso', 'fecha_creacion', 'empleado_id'
  ];

  const sheet = recrearHoja(ss, 'usuarios', encabezados);

  // IMPORTANTE: El admin principal siempre es supervisor1telcom@gmail.com / DARWINTELCOM2026
  // Estructura: [id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id]
  const usuarios = [
    ['USR001', 'Supervisor Telcom', 'supervisor1telcom@gmail.com', 'DARWINTELCOM2026', 'admin', 'all', 'activo', '', new Date(), ''],
    ['USR002', 'Gerente General', 'gerencia@telcom.pe', 'gerencia123', 'manager', 'empleados,proyectos,reportes', 'activo', '', new Date(), ''],
    ['USR003', 'Juan Carlos Perez Mamani', 'juan.perez@telcom.pe', 'emp12345', 'employee', 'asistencia,boletas', 'activo', '', new Date(), 'EMP001'],
    ['USR004', 'Maria Elena Garcia Quispe', 'maria.garcia@telcom.pe', 'emp23456', 'employee', 'asistencia,boletas', 'activo', '', new Date(), 'EMP002'],
    ['USR005', 'Recursos Humanos', 'rrhh@telcom.pe', 'rrhh2024', 'manager', 'empleados,postulaciones,reportes', 'activo', '', new Date(), ''],
  ];

  usuarios.forEach(usr => sheet.appendRow(usr));

  return `Usuarios: ${usuarios.length} registros creados`;
}

/**
 * Formatear cabecera de una hoja
 */
function formatearCabecera(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a365d');
  headerRange.setFontColor('white');
  sheet.setFrozenRows(1);
}

/**
 * Cargar historial de empleados de prueba
 * Encabezados: id, employeeId, tipo, descripcion, fecha, responsable, notas, createdAt
 */
function cargarHistorialEmpleadosPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'employeeId', 'tipo', 'descripcion', 'fecha', 'responsable', 'notas', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'historial_empleados', encabezados);

  const historial = [
    ['HIST001', 'EMP001', 'contratacion', 'Ingreso a la empresa como Desarrollador Junior', '2020-03-15', 'Veronica Castillo', 'Contratacion directa post-pasantia', new Date()],
    ['HIST002', 'EMP001', 'ascenso', 'Promocion a Desarrollador Senior', '2022-06-01', 'Gerencia General', 'Excelente desempeño en proyecto Volcan', new Date()],
    ['HIST003', 'EMP002', 'contratacion', 'Ingreso como Ingeniero Electrico', '2019-06-01', 'Miguel Calizaya', 'Experiencia previa en Southern Peru', new Date()],
    ['HIST004', 'EMP003', 'contratacion', 'Ingreso como Tecnico TIC', '2021-09-10', 'Veronica Castillo', 'Recomendado por cliente Minsur', new Date()],
    ['HIST005', 'EMP004', 'ascenso', 'Promocion a Supervisora de Proyectos', '2020-01-15', 'Gerencia General', 'Liderazgo destacado', new Date()],
    ['HIST006', 'EMP009', 'ascenso', 'Promocion a Jefe de Proyectos', '2019-01-01', 'Gerencia General', '10 años de experiencia', new Date()],
    ['HIST007', 'EMP013', 'licencia', 'Licencia por enfermedad', '2024-01-15', 'RRHH', 'Licencia medica por 30 dias', new Date()],
    ['HIST008', 'EMP010', 'capacitacion', 'Curso React Avanzado completado', '2023-08-20', 'Juan Perez', 'Certificacion obtenida', new Date()],
    ['HIST009', 'EMP007', 'reconocimiento', 'Empleado del mes', '2024-01-31', 'Gerencia General', 'Proyecto Toquepala terminado antes de tiempo', new Date()],
    ['HIST010', 'EMP012', 'capacitacion', 'Curso de Gestion de RRHH', '2023-05-10', 'Externo', 'Certificacion SHRM', new Date()],
  ];

  historial.forEach(h => sheet.appendRow(h));

  return `Historial Empleados: ${historial.length} registros creados`;
}

/**
 * Limpiar todos los datos de prueba (CUIDADO!)
 * Esta funcion elimina TODOS los datos pero mantiene las hojas
 */
function limpiarDatosPrueba() {
  assertDestructiveAllowed_();
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hojas = ['empleados', 'proyectos', 'asignaciones', 'convocatorias', 'postulaciones', 'Asistencias', 'contactos', 'usuarios', 'historial_empleados'];

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }
  });

  return 'Datos de prueba eliminados (se mantuvieron las cabeceras)';
}

// MIGRACION V2 — ejecutar UNA VEZ si ya tenias la version anterior:
// 1) agrega las claves nuevas a config_planilla (tolerancias, rmv, salida_autorizada)
// 2) RECREA la hoja sueldos con la lista definitiva y columnas nuevas
// 3) crea autorizaciones_5pm y bolsa_horas
// NO toca incidencias ni planilla_log.
function migrarPlanillaV2() {
  assertDestructiveAllowed_();
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // 1) Config: agregar claves faltantes
  var c = ss.getSheetByName('config_planilla');
  if (c) {
    var rows = c.getDataRange().getValues();
    var existentes = {};
    for (var i = 1; i < rows.length; i++) existentes[String(rows[i][0]).trim()] = true;
    Object.keys(CONFIG_PLANILLA_DEFAULT).forEach(function(k) {
      if (!existentes[k]) c.appendRow([k, CONFIG_PLANILLA_DEFAULT[k]]);
    });
  }

  // 2) Recrear sueldos con la lista definitiva
  var viejo = ss.getSheetByName('sueldos');
  if (viejo) ss.deleteSheet(viejo);
  var s = ss.insertSheet('sueldos');
  s.appendRow(HEADERS_SUELDOS);
  SUELDOS_INICIALES.forEach(function(r) { s.appendRow(r); });
  s.getRange(1, 1, 1, HEADERS_SUELDOS.length).setFontWeight('bold');

  // 3) Hojas nuevas
  setupPlanillaSheets();

  return 'Migracion V2 completada: config actualizada, sueldos recreada con 8 trabajadores, hojas 5pm/bolsa listas';
}

// ACTUALIZACION DE TRABAJADORES V3 — ejecutar UNA VEZ desde el editor.
// RECREA la hoja 'sueldos' con la lista definitiva de 13 trabajadores +
// columna 'email'. NO toca config_planilla, incidencias, planilla_log,
// autorizaciones_5pm ni bolsa_horas. Si algun DNI ya registro asistencia
// bajo otro DNI (p.ej. Condori), esos registros quedan bajo el DNI viejo.
function actualizarTrabajadoresV3() {
  assertDestructiveAllowed_();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var viejo = ss.getSheetByName('sueldos');
  if (viejo) ss.deleteSheet(viejo);
  var s = ss.insertSheet('sueldos');
  s.appendRow(HEADERS_SUELDOS);
  SUELDOS_INICIALES.forEach(function(r) { s.appendRow(r); });
  s.getRange(1, 1, 1, HEADERS_SUELDOS.length).setFontWeight('bold');
  // Asegurar que las demas hojas de planilla existan (no las toca si ya estan)
  setupPlanillaSheets();
  return 'Lista actualizada: ' + SUELDOS_INICIALES.length + ' trabajadores con correos. config/incidencias/bolsa/autorizaciones intactas.';
}

// ============================================================
// SALUD — test de salud del backend (ejecutar antes de cada deploy)
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
//
// Uso: en el editor de Apps Script, ejecutar `ejecutarTestSalud` y revisar
// el log (Ctrl+Enter). Criterio de deploy: 0 FAIL. Los WARN se evalúan.
// Es 100% de solo lectura: no escribe en ninguna hoja.

var HOJAS_REQUERIDAS = [
  'usuarios', 'sueldos', 'proyectos', 'asignaciones', 'historial_empleados',
  'convocatorias', 'postulaciones', 'contactos',
  'asistencias_v2', 'justificaciones',
  'config_planilla', 'incidencias', 'planilla_log', 'autorizaciones_5pm', 'bolsa_horas',
  'capacitaciones', 'banco_preguntas', 'evaluaciones', 'eval_fotos', 'eval_logs'
];

// Funciones que el router referencia — si falta una, la accion revienta en runtime
var FUNCIONES_REQUERIDAS = [
  'login', 'verifyTokenAction', 'parseToken_', 'esRolAdmin_',
  'getActiveJobs', 'getJobById', 'submitApplication', 'consultarPostulacion', 'historialPostulaciones',
  'getAllJobs', 'createJob', 'updateJob', 'deleteJob', 'uploadJobPdf',
  'getApplications', 'updateApplicationStatus',
  'submitContact', 'getContacts', 'updateContactStatus', 'deleteContact',
  'getEmployees', 'getEmployeeById', 'createEmployee', 'updateEmployee', 'transferEmployee',
  'createCredentialsForEmployee',
  'getProjects', 'getProjectById', 'createProject', 'updateProject',
  'getAssignments', 'assignEmployeeToProject', 'removeAssignment',
  'uploadFile', 'getArchivo', 'getDashboardStats',
  'verificarEmpleado', 'marcarAsistencia', 'getAttendances', 'obtenerAsistenciasHoy',
  'getTrabajadores', 'registrarAsistenciaFoto', 'subirJustificacion', 'getAsistenciasV2', 'getJustificaciones',
  'registrarAsistenciaManual',
  'getConfigPlanillaAction', 'updateConfigPlanilla', 'getSueldos', 'updateSueldo', 'crearTrabajador',
  'darDeBajaTrabajador', 'reactivarTrabajador',
  'getIncidencias', 'revisarIncidencia', 'sincronizarIncidencias',
  'autorizarSalida5pm', 'getAutorizaciones5pm', 'registrarMuestreo', 'getBolsaHoras',
  'getFeriados', 'agregarFeriado', 'eliminarFeriado', 'sembrarFeriadosPeru2026',
  'getCapacitaciones', 'getCapacitacionById', 'iniciarEvaluacion', 'submitEvaluacion',
  'guardarFotoWebcam', 'registrarEventoLog',
  'crearCapacitacion', 'actualizarCapacitacion', 'eliminarCapacitacion',
  'getPreguntas', 'crearPregunta', 'actualizarPregunta', 'eliminarPregunta',
  'getEvaluaciones', 'revisarEvaluacion'
];

function ejecutarTestSalud() {
  var fails = [];
  var warns = [];
  var oks = 0;

  function ok() { oks++; }
  function fail(msg) { fails.push(msg); }
  function warn(msg) { warns.push(msg); }

  // 1. Secreto del token
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
    if (!secret) fail('TOKEN_SECRET no configurado en Script Properties');
    else if (secret.length < 32) warn('TOKEN_SECRET tiene menos de 32 caracteres — usar uno mas largo');
    else ok();
  } catch (e) { fail('No se pudo leer Script Properties: ' + e.message); }

  // 2. Flag de destructivas apagado en produccion
  var flag = PropertiesService.getScriptProperties().getProperty('ALLOW_DESTRUCTIVE_OPS');
  if (flag === 'true') warn('ALLOW_DESTRUCTIVE_OPS=true — APAGARLO en produccion');
  else ok();

  // 3. Round-trip del token HMAC
  try {
    var t = generateToken('TEST_SALUD');
    if (parseToken_(t) === 'TEST_SALUD') ok();
    else fail('Token HMAC no valida su propio round-trip');
    if (parseToken_(t + 'x') !== null) fail('Token adulterado fue aceptado');
    else ok();
  } catch (e) { fail('generateToken/parseToken_ lanzo error: ' + e.message); }

  // 4. Hojas requeridas
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    HOJAS_REQUERIDAS.forEach(function (nombre) {
      if (ss.getSheetByName(nombre)) ok();
      else fail('Falta la hoja: ' + nombre);
    });
    if (!ss.getSheetByName('empleados')) warn('Hoja legacy `empleados` no existe (solo afecta rutas legacy EMP0xx)');
  } catch (e) { fail('No se pudo abrir el Spreadsheet: ' + e.message); }

  // 5. Roster real
  try {
    var roster = leerRosterReal_();
    if (!roster.length) fail('Roster real (hoja sueldos) esta VACIO');
    else {
      ok();
      var sinDni = roster.filter(function (t2) { return !/^\d{8}$/.test(String(t2.dni)); });
      if (sinDni.length) warn(sinDni.length + ' trabajador(es) con DNI invalido en sueldos');
      var sinEmailOficina = roster.filter(function (t3) { return !t3.es_campo && !t3.email; });
      if (sinEmailOficina.length) warn(sinEmailOficina.length + ' trabajador(es) de oficina sin email');

      // Columna de bajas: si falta, se crea sola en la primera baja, pero
      // conviene saberlo antes de intentarla.
      var hSueldos = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos')
        .getRange(1, 1, 1, HEADERS_SUELDOS.length).getValues()[0];
      if (hSueldos.indexOf('fecha_fin') < 0) {
        warn('La hoja sueldos aun no tiene la columna `fecha_fin` (se creara en la primera baja)');
      } else {
        ok();
        var cesados = leerRosterReal_(true).filter(function (t4) { return !t4.activo; });
        if (cesados.length) warn(cesados.length + ' trabajador(es) cesado(s) fuera del roster activo (esperado tras una baja)');
      }
    }
  } catch (e) { fail('leerRosterReal_ lanzo error: ' + e.message); }

  // 6. Al menos una cuenta con rol administrador activa
  try {
    var uSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    var admins = 0;
    if (uSheet) {
      var users = uSheet.getDataRange().getValues();
      var headers = users[0];
      var isA = String(headers[1]).toLowerCase() === 'email';
      for (var i = 1; i < users.length; i++) {
        var rol = String(isA ? users[i][4] : users[i][4] || '').toLowerCase().trim();
        var activo = isA
          ? (users[i][6] === true || users[i][6] === 'true' || users[i][6] === 'activo' || users[i][6] === 'TRUE')
          : users[i][6] === 'activo';
        if (activo && ['admin', 'administrador', 'manager', 'supervisor', 'rrhh'].indexOf(rol) >= 0) admins++;
      }
    }
    if (admins > 0) ok();
    else fail('Ninguna cuenta ACTIVA con rol administrador en `usuarios` — las rutas nivel admin quedarian inaccesibles');
  } catch (e) { fail('No se pudo verificar cuentas admin: ' + e.message); }

  // 7. Funciones referenciadas por el router existen
  FUNCIONES_REQUERIDAS.forEach(function (nombre) {
    try {
      if (typeof globalThis[nombre] === 'function') ok();
      else fail('Funcion referenciada por el router NO existe: ' + nombre);
    } catch (e) { fail('No se pudo verificar ' + nombre + ': ' + e.message); }
  });

  // 8. Carpeta de Drive accesible
  try {
    DriveApp.getFolderById(DRIVE_FOLDER_ID).getName();
    ok();
  } catch (e) { fail('Carpeta Drive inaccesible: ' + e.message); }

  // 9. Anti-duplicado de coste constante (ver PLAN.md R1)
  try {
    var ssA = SpreadsheetApp.openById(SHEET_ID);
    var hojaAsis = ssA.getSheetByName('asistencias_v2');
    if (!hojaAsis) {
      warn('Hoja asistencias_v2 no existe todavia');
    } else {
      var filasAsis = Math.max(0, hojaAsis.getLastRow() - 1);
      // El tramo acotado debe seguir cubriendo con holgura una jornada. Con
      // ~48 marcas diarias, 600 filas son ~12 dias: sobra. Este aviso salta si
      // el volumen diario crecio tanto que conviene revisar el margen.
      if (filasAsis > 0) {
        var t = leerTramoFinal_(hojaAsis, FILAS_TRAMO_ASISTENCIA_);
        var cf = t.headers.indexOf('fecha');
        var masAntiguaTramo = null;
        for (var z = 0; z < t.rows.length; z++) {
          var fz = fechaISO_(t.rows[z][cf]);
          if (fz && (masAntiguaTramo === null || fz < masAntiguaTramo)) masAntiguaTramo = fz;
        }
        if (!t.completa && masAntiguaTramo && masAntiguaTramo >= hoyISO_()) {
          warn('El tramo de ' + FILAS_TRAMO_ASISTENCIA_ + ' filas no cubre un dia completo — subir FILAS_TRAMO_ASISTENCIA_');
        } else {
          ok();
        }
      } else {
        ok();
      }
      // Aviso informativo de volumen: ya no degrada el marcado, pero conviene
      // saber cuando la hoja se vuelve grande para el panel y los informes.
      if (filasAsis > 20000) warn('asistencias_v2 supera 20,000 filas (' + filasAsis + ') — evaluar archivar por ano');
    }
  } catch (e) { fail('Verificacion del anti-duplicado acotado fallo: ' + e.message); }

  // 10. CacheService operativo (via rapida del anti-duplicado)
  try {
    var pruebaKey = 'salud:cache';
    CacheService.getScriptCache().put(pruebaKey, '1', 30);
    if (CacheService.getScriptCache().get(pruebaKey) === '1') ok();
    else warn('CacheService no devuelve lo que guarda — el anti-duplicado caera al tramo acotado (sigue siendo correcto, solo mas lento)');
    CacheService.getScriptCache().remove(pruebaKey);
  } catch (e) {
    warn('CacheService no disponible: ' + e.message + ' — el anti-duplicado seguira funcionando por lectura acotada');
  }

  var resultado = {
    ok: fails.length === 0,
    checksOk: oks,
    fails: fails,
    warns: warns
  };
  Logger.log('===== TEST DE SALUD =====');
  Logger.log(fails.length === 0 ? 'RESULTADO: 0 FAIL — apto para deploy' : 'RESULTADO: ' + fails.length + ' FAIL — NO desplegar');
  fails.forEach(function (f) { Logger.log('FAIL: ' + f); });
  warns.forEach(function (w) { Logger.log('WARN: ' + w); });
  Logger.log('Checks OK: ' + oks);
  return resultado;
}

// ============================================================
// ARCHIVOS — visor seguro de archivos privados de Drive (fotos de
// asistencia con GPS, proctoring, justificaciones)
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// BRECHA C6: las fotos de asistencia/proctoring y las justificaciones se
// subian con setSharing(ANYONE_WITH_LINK) — cualquiera con el enlace las
// veia. Ahora quedan privadas y solo se sirven via getArchivo (nivel auth),
// que descarga el binario en el servidor y lo devuelve en base64 al admin
// autenticado. Las columnas foto_url/archivo_url en las hojas se siguen
// guardando igual (URL de Drive); el visor extrae el fileId de esa URL.

var TAMANO_MAX_VISOR_BYTES = 10 * 1024 * 1024; // 10 MB

// Acepta un fileId directo o una URL de Drive y devuelve el fileId, o null
// si no se pudo reconocer el formato.
// Formatos soportados:
//   - fileId "pelado" (sin barras ni protocolo)
//   - https://drive.google.com/file/d/<ID>/view
//   - https://drive.google.com/uc?export=download&id=<ID>
function extraerDriveFileId_(idOUrl) {
  if (!idOUrl) return null;
  var s = String(idOUrl).trim();
  if (!s) return null;

  // Ya es un fileId "pelado" (no contiene ni '/' ni '?')
  if (s.indexOf('/') === -1 && s.indexOf('?') === -1) {
    return s;
  }

  // https://drive.google.com/file/d/<ID>/view
  var m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];

  // https://drive.google.com/uc?export=download&id=<ID> (o cualquier query con id=)
  var m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];

  return null;
}

// Devuelve el contenido de un archivo de Drive en base64, solo para admins
// autenticados (ruta nivel 'auth'). Limita el tamano para no reventar el
// tiempo de respuesta ni la memoria del cliente.
function getArchivo(data) {
  try {
    var fileId = extraerDriveFileId_(data && data.fileId);
    if (!fileId) return { success: false, error: 'fileId invalido' };

    var file = DriveApp.getFileById(fileId);
    var size = file.getSize();
    if (size > TAMANO_MAX_VISOR_BYTES) {
      return { success: false, error: 'Archivo demasiado grande para visor' };
    }

    var blob = file.getBlob();
    return {
      success: true,
      data: {
        base64: Utilities.base64Encode(blob.getBytes()),
        mimeType: blob.getContentType(),
        fileName: file.getName()
      }
    };
  } catch (e) {
    return { success: false, error: e.message || 'Error al leer el archivo' };
  }
}

// ============================================================
// REMEDIACION C6 — revocar el sharing publico de archivos ya subidos.
// Ejecutar UNA VEZ desde el editor de Apps Script (no es una ruta del
// router). Recorre recursivamente las carpetas sensibles y las deja
// privadas; el visor (getArchivo) sigue funcionando porque usa
// DriveApp.getFileById desde el propio script, que siempre tiene acceso.
// NO toca 'Fichas_Postulacion' (PDFs de convocatorias, publicos a
// proposito) ni las carpetas mensuales de CVs (se decide aparte).
// ============================================================
function revocarComparticionPublica() {
  var CARPETAS_A_REVOCAR = ['Asistencias', 'Justificaciones', 'Evaluaciones_Proctoring'];
  var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var totalArchivos = 0;

  CARPETAS_A_REVOCAR.forEach(function (nombreCarpeta) {
    var folders = mainFolder.getFoldersByName(nombreCarpeta);
    while (folders.hasNext()) {
      var folder = folders.next();
      totalArchivos += revocarComparticionRecursiva_(folder);
    }
  });

  Logger.log('revocarComparticionPublica: ' + totalArchivos + ' archivo(s) puestos en privado');
  return totalArchivos;
}

// Recorre una carpeta y todas sus subcarpetas, poniendo cada archivo en
// privado. Devuelve la cantidad de archivos procesados.
function revocarComparticionRecursiva_(folder) {
  var count = 0;

  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      count++;
    } catch (e) {
      Logger.log('No se pudo revocar sharing de ' + file.getId() + ': ' + e.message);
    }
  }

  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    count += revocarComparticionRecursiva_(subfolders.next());
  }

  return count;
}
