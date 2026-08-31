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
