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

var HEADERS_SUELDOS = ['dni', 'nombre', 'cargo', 'sueldo', 'fecha_inicio', 'usa_rmv', 'sede', 'email'];

var HEADERS_AUTORIZACIONES = ['id', 'dni', 'fecha', 'autorizado_por', 'nota', 'timestamp'];

var HEADERS_BOLSA = ['id', 'dni', 'fecha', 'tipo', 'horas', 'nota', 'usuario', 'timestamp'];

// Lista definitiva de trabajadores (usa_rmv=TRUE gana la RMV con ajuste automatico).
// Correos corporativos: dominio ingenieriatelcom.com (Google Workspace).
// Los operarios (RMV) y los ingresos nuevos arrancan 2026-07-07 para no
// generar faltas retroactivas; el admin ajusta la fecha real desde la hoja.
var SUELDOS_INICIALES = [
  ['46809070', 'Araujo Álvarez, Andre Steven', 'Coordinador General', 3500, '2026-07-01', 'FALSE', 'Principal', 'coordinador.general@ingenieriatelcom.com'],
  ['73316735', 'Marroquín Concha, Diego Mauricio', 'Analista Legal de Reclamos', 3000, '2026-07-01', 'FALSE', 'Principal', 'analista.legal1@ingenieriatelcom.com'],
  ['74135306', 'Vargas Miranda, Juan Joseph', 'Analista Legal de Reclamos', 1800, '2026-07-01', 'FALSE', 'Principal', 'analista.legal2@ingenieriatelcom.com'],
  ['70401672', 'Montufar Diaz, Alvaro Rodrigo', 'Analista Junior de Reclamos', 1800, '2026-07-06', 'FALSE', 'Principal', 'analista.junior@ingenieriatelcom.com'],
  ['74525595', 'León Umeres, Milagros Jhenifer', 'Asistente Administrativo', 1800, '2026-07-01', 'FALSE', 'Principal', 'asistente.admin@ingenieriatelcom.com'],
  ['72374021', 'Condori Cáceres, Jocabed Adriana', 'Tramitador / Digitador', 1500, '2026-07-01', 'FALSE', 'Principal', 'tramitador2@ingenieriatelcom.com'],
  ['72743443', 'Ramos Serrani, Anais Gasdaly', 'Tramitador / Digitador', 1500, '2026-07-07', 'FALSE', 'Principal', 'tramitador3@ingenieriatelcom.com'],
  ['74147961', 'Hurtado Vega, Marilyn', 'Tramitador / Digitador', 1500, '2026-07-01', 'FALSE', 'Principal', 'tramitador1@ingenieriatelcom.com'],
  ['45298858', 'Canaza Chique, Darwin', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', ''],
  ['80644637', 'Canaza Chique, Jael Fausto', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', ''],
  ['42239901', 'Canaza Chique, Willy', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', ''],
  ['47815297', 'Marin Callañaupa, George Smith', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', ''],
  ['74323866', 'Maceda Econema, Franco Paolo', 'Operario', 1130, '2026-07-07', 'TRUE', 'Principal', '']
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
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      var o = rowToObject(headers, r);
      o.dni = String(o.dni);
      o.usa_rmv = o.usa_rmv === true || o.usa_rmv === 'TRUE' || o.usa_rmv === 'true';
      // RMV con ajuste automatico
      o.sueldo = o.usa_rmv ? Number(cfg.rmv) : (Number(o.sueldo) || 0);
      if (o.fecha_inicio instanceof Date) {
        o.fecha_inicio = Utilities.formatDate(o.fecha_inicio, 'America/Lima', 'yyyy-MM-dd');
      }
      o.fecha_inicio = String(o.fecha_inicio || cfg.fecha_operativo);
      o.email = String(o.email || '');
      return o;
    });
  return { success: true, data: result };
}

// Lista publica para el kiosko de asistencia: SIN sueldos ni correos.
// registro_simple = trabajador de campo (sin correo): flujo Ingreso/Salida simple.
// Cacheada 10 min: a la hora de ingreso muchos trabajadores abren el kiosko a
// la vez; responder desde CacheService evita abrir el Spreadsheet en cada
// request (cada openById tarda ~1s y bajo rafaga alguna peticion falla).
var CACHE_KEY_TRABAJADORES = 'kiosk_trabajadores_v1';
var CACHE_TTL_TRABAJADORES = 600; // 10 min (max practico de CacheService)

function invalidarCacheTrabajadores_() {
  try {
    CacheService.getScriptCache().remove(CACHE_KEY_TRABAJADORES);
  } catch (e) { /* si el cache falla, expira solo en 10 min */ }
}

function getTrabajadores() {
  try {
    var cached = CacheService.getScriptCache().get(CACHE_KEY_TRABAJADORES);
    if (cached) return { success: true, data: JSON.parse(cached) };
  } catch (e) { /* cache no disponible: seguir contra Sheets */ }

  var res = getSueldos();
  if (!res.success) return res;
  var lista = res.data.map(function(t) {
    return { dni: t.dni, nombre: t.nombre, cargo: t.cargo, sede: t.sede || '', registro_simple: !t.email };
  });

  try {
    CacheService.getScriptCache().put(CACHE_KEY_TRABAJADORES, JSON.stringify(lista), CACHE_TTL_TRABAJADORES);
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
    sheet.appendRow([
      dni,
      data.nombre,
      data.cargo,
      data.usa_rmv ? Number(cfg.rmv) : (Number(data.sueldo) || 0),
      String(data.fecha_inicio || Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd')),
      data.usa_rmv ? 'TRUE' : 'FALSE',
      data.sede || 'Principal',
      data.email || ''
    ]);
    invalidarCacheTrabajadores_();
    return { success: true, message: 'Trabajador creado: ' + data.nombre };
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
  var nuevaFila = function(dni, nombre, fecha, tipo, evento, minutos, grave) {
    var key = dni + '|' + fecha + '|' + tipo + '|' + (evento || '');
    if (existentes[key]) return;
    existentes[key] = true;
    incSheet.appendRow([
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
      // Trabajadores de campo (sin correo) quedan FUERA del modelo de descuentos:
      // solo dejan bitacora de presencia (Ingreso/Salida) + justificaciones.
      if (!t.email) return;
      // No computar asistencia antes de la fecha de inicio del trabajador
      if (t.fecha_inicio && fecha < String(t.fecha_inicio)) return;

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
              bolsaSheet.appendRow([
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
