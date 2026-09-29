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
  'capacitaciones', 'banco_preguntas', 'evaluaciones', 'eval_fotos', 'eval_logs',
  'lic_procesos', 'lic_postores', 'lic_acciones', 'lic_competidores', 'lic_experiencia', 'lic_documentos',
  'lic_personal', 'lic_contratos', 'lic_facturas'
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
  'getIncidencias', 'revisarIncidencia', 'sincronizarIncidencias', 'getEstadoPlanilla', 'sincronizarIncidenciasProgramada',
  'listarUsuarios', 'crearUsuario', 'actualizarUsuario', 'restablecerContrasena', 'getAuditoria',
  'perfilUsuario_', 'puedeModulo_', 'registrarAuditoria_', 'leerConCache_', 'leerFilasAsistenciaDesde_',
  'autorizarSalida5pm', 'getAutorizaciones5pm', 'registrarMuestreo', 'getBolsaHoras',
  'getFeriados', 'agregarFeriado', 'eliminarFeriado', 'sembrarFeriadosPeru2026',
  'getCapacitaciones', 'getCapacitacionById', 'iniciarEvaluacion', 'submitEvaluacion',
  'guardarFotoWebcam', 'registrarEventoLog',
  'crearCapacitacion', 'actualizarCapacitacion', 'eliminarCapacitacion',
  'getPreguntas', 'crearPregunta', 'actualizarPregunta', 'eliminarPregunta',
  'getEvaluaciones', 'revisarEvaluacion',
  'licImportar', 'licResumen', 'licProcesos', 'licProceso', 'licCompetidores', 'licExperiencia',
  'licDocumentos', 'licActualizarDocumento', 'licCrearDocumento', 'licActualizarProceso', 'licExportarCambios',
  'licPersonal', 'licContratos', 'licActualizarPersona', 'licActualizarContrato', 'licActualizarFactura'
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
      // Las hojas lic_* (Licitaciones) las crea hojaLic_() en la primera
      // importación o lectura: que falten al inicio no es una falla.
      else if (nombre.indexOf('lic_') === 0) warn('Hoja ' + nombre + ' aún no existe (se crea sola al importar Licitaciones)');
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

  // 9b. "Ya registrado" devuelve la hora de la marca original (kiosko, sept
  // 2026). Solo lectura: toma la ultima marca de oficina de la hoja y
  // comprueba que el anti-duplicado la encuentra y responde su hora. Si esto
  // falla, el kiosko vuelve a mostrar "ya registrado" sin hora (no rompe nada,
  // pero indica que se desplego un backend viejo o cambio el formato).
  try {
    var hojaDup = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asistencias_v2');
    if (hojaDup && hojaDup.getLastRow() > 1) {
      var td = leerTramoFinal_(hojaDup, 50);
      var cD = td.headers.indexOf('dni'), cE = td.headers.indexOf('evento'),
          cF = td.headers.indexOf('fecha'), cT = td.headers.indexOf('timestamp');
      var muestra = null;
      for (var q = td.rows.length - 1; q >= 0 && !muestra; q--) {
        if (EVENTOS_ASISTENCIA_V2.indexOf(String(td.rows[q][cE])) !== -1 && td.rows[q][cT]) muestra = td.rows[q];
      }
      if (!muestra) {
        warn('Sin marcas de oficina recientes para probar la respuesta "ya registrado"');
      } else {
        var fechaM = fechaISO_(muestra[cF]);
        var hallada = existeMarcaEnHoja_(hojaDup, String(muestra[cD]), String(muestra[cE]), fechaM, 50, true);
        var esperada = horaDeMarca_(muestra[cT]);
        var resp = respuestaYaRegistrado_(String(muestra[cE]), fechaM, hallada);
        if (!hallada) fail('El anti-duplicado NO encontro una marca que si existe (' + muestra[cE] + ' ' + fechaM + ')');
        else if (hallada !== esperada) warn('Anti-duplicado encontro la marca pero la hora no coincide (' + hallada + ' vs ' + esperada + ')');
        else if (resp.codigo !== 'YA_REGISTRADO' || resp.data.hora !== esperada) fail('respuestaYaRegistrado_ no devuelve codigo/hora');
        else ok();
      }
    } else {
      ok();
    }
  } catch (e) { fail('Verificacion de "ya registrado con hora" fallo: ' + e.message); }

  // 9c. Bolsa: no se puede postular a convocatorias cerradas o inexistentes
  // (solo lectura: evalua la regla, no envia ninguna postulacion).
  try {
    if (validarConvocatoriaAbierta_('NO-EXISTE-' + Date.now()) === null) {
      fail('Se acepta postular a una convocatoria inexistente');
    } else {
      var hojaConv = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
      var filasConv = hojaConv ? hojaConv.getDataRange().getValues() : [];
      var cEst = filasConv.length ? filasConv[0].indexOf('estado') : -1;
      var inactiva = null;
      for (var v = 1; v < filasConv.length && !inactiva; v++) {
        if (cEst >= 0 && String(filasConv[v][cEst]).toLowerCase() === 'inactivo') inactiva = filasConv[v][0];
      }
      if (inactiva && validarConvocatoriaAbierta_(inactiva) === null) fail('Se acepta postular a una convocatoria INACTIVA (' + inactiva + ')');
      else ok();
    }
  } catch (e) { fail('Verificacion de convocatorias abiertas fallo: ' + e.message); }

  // 9d. Escalon 1: la lectura por rango devuelve EXACTAMENTE lo mismo que la
  // lectura completa filtrada (solo lectura). Si esto falla, NO desplegar.
  try {
    var desdeEq = Utilities.formatDate(new Date(Date.now() - 45 * 86400000), 'America/Lima', 'yyyy-MM-dd');
    var clave = function (r) { return String(r.id); };
    var completoA = (getAsistenciasV2({}).data || []).filter(function (r) { return String(r.fecha) >= desdeEq; }).map(clave).sort();
    var rangoA = (getAsistenciasV2({ desde: desdeEq }).data || []).map(clave).sort();
    if (completoA.join('|') !== rangoA.join('|')) {
      fail('Lectura por rango de asistencias difiere de la completa (' + rangoA.length + ' vs ' + completoA.length + ')');
    } else ok();
    var completoJ = (getJustificaciones({}).data || []).filter(function (r) { return String(r.fecha) >= desdeEq; }).map(clave).sort();
    var rangoJ = (getJustificaciones({ desde: desdeEq }).data || []).map(clave).sort();
    if (completoJ.join('|') !== rangoJ.join('|')) {
      fail('Lectura por rango de justificaciones difiere de la completa (' + rangoJ.length + ' vs ' + completoJ.length + ')');
    } else ok();
  } catch (e) { fail('Verificacion de lectura por rango fallo: ' + e.message); }

  // 9e. Escalon 2: quien pierde acceso con los permisos por modulo. Los
  // usuarios activos SIN rol de administracion ni permisos de modulo solo
  // veran el Centro de actividades. Revisar ANTES de publicar la version.
  try {
    var filasU = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios').getDataRange().getValues();
    var colsU = columnasUsuarios_(filasU[0]);
    var admins = 0, sinModulos = [];
    for (var u = 1; u < filasU.length; u++) {
      if (!filasU[u][colsU.id]) continue;
      var pu = filaAUsuario_(filasU[u], colsU);
      if (!pu.activo) continue;
      if (pu.esAdmin) { admins++; continue; }
      var conModulo = pu.permisos.some(function (p) { return MODULOS_PANEL_[p] && !MODULOS_PANEL_[p].soloAdmin; });
      if (!conModulo) sinModulos.push((pu.email || pu.id) + ' (rol ' + (pu.rol || '—') + ')');
    }
    if (admins === 0) fail('No hay ningun administrador activo en usuarios');
    else ok();
    if (sinModulos.length) {
      warn(sinModulos.length + ' usuario(s) activo(s) sin rol admin ni permisos de modulo — solo veran el Centro de actividades: ' + sinModulos.join(', '));
    }
  } catch (e) { fail('Verificacion de permisos de usuarios fallo: ' + e.message); }

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

  // 11. Roster del kiosko precalentado (ver obtenerRosterKiosko_ en 08_planilla).
  // Solo lectura: se inspecciona la instantanea, no se regenera.
  try {
    var snapK = leerSnapshotRosterKiosko_();
    if (!snapK) {
      warn('No hay instantanea del roster del kiosko: ejecutar precalentarRosterKiosko y configurar su activador diario (6 a 7 a.m.)');
    } else {
      var edadMin = Math.round((new Date().getTime() - snapK.generado) / 60000);
      // Con el activador diario la instantanea nunca pasa de ~25 h (Google
      // elige el minuto dentro de la hora configurada).
      if (edadMin > 25 * 60) {
        warn('Instantanea del roster del kiosko con ' + Math.round(edadMin / 60) + ' h: el activador diario precalentarRosterKiosko no parece estar corriendo — la rafaga de las 07:30 puede encontrar la cache fria');
      } else {
        ok();
      }
      var enHoja = leerRosterReal_(true).length;
      if (snapK.lista.length !== enHoja) {
        warn('La instantanea del kiosko tiene ' + snapK.lista.length + ' trabajadores y la hoja ' + enHoja + ' — ejecutar precalentarRosterKiosko (¿se edito la hoja sueldos a mano?)');
      } else {
        ok();
      }
    }
  } catch (e) { fail('Verificacion del roster del kiosko fallo: ' + e.message); }

  // 12. Modulo Licitaciones: las hojas lic_* tienen todas las columnas de LIC_HOJAS_
  // (detecta drift si se agrega un campo al JSON del vault y se olvida la hoja).
  try {
    var ssLic = SpreadsheetApp.openById(SHEET_ID);
    Object.keys(LIC_HOJAS_).forEach(function (clave) {
      var hLic = ssLic.getSheetByName('lic_' + clave);
      if (!hLic) return; // ya reportado arriba, en el check de HOJAS_REQUERIDAS
      var cab = hLic.getRange(1, 1, 1, Math.max(1, hLic.getLastColumn())).getValues()[0];
      var faltan = LIC_HOJAS_[clave].filter(function (c) { return cab.indexOf(c) < 0; });
      if (faltan.length) fail('lic_' + clave + ' no tiene las columnas: ' + faltan.join(', '));
      else ok();
    });
  } catch (e) { fail('Verificacion de cabeceras lic_* fallo: ' + e.message); }

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
