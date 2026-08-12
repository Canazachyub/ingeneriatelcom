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
  const roster = leerRosterReal_();
  const trabajador = roster.find(function (t) { return t.dni === dni; });

  if (!trabajador) {
    return { success: false, error: 'DNI no encontrado en el sistema' };
  }

  // El roster real no maneja 'estado' (todos activos); id sintetico igual
  // al usado en getEmployees ('SUE-<dni>') para no romper el shape.
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

function registrarAsistenciaFoto(data) {
  var dni = String(data.dni || '');
  var evento = data.evento || '';

  var esCampo = EVENTOS_CAMPO.indexOf(evento) !== -1;
  if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI invalido' };
  if (EVENTOS_ASISTENCIA_V2.indexOf(evento) === -1 && !esCampo) return { success: false, error: 'Evento invalido' };
  if (!data.fileContent) return { success: false, error: 'La foto es obligatoria' };

  // Validar archivo (tamano/tipo) antes de cualquier escritura o subida a Drive
  var errorArchivo = validarArchivoSubido_(data.fileContent, data.mimeType, 'imagen');
  if (errorArchivo) return errorArchivo;

  // Rate limit anti-abuso por DNI
  var errorRate = checkRateLimit_('asisfoto:' + dni, 30);
  if (errorRate) return errorRate;

  var ahora = new Date();
  var fecha = Utilities.formatDate(ahora, 'America/Lima', 'yyyy-MM-dd');
  var hora = Utilities.formatDate(ahora, 'America/Lima', 'HH:mm:ss');

  // Subir foto a Drive FUERA del lock: la subida tarda varios segundos y
  // mantener el lock global durante la subida hacia esperar (y fallar con
  // "Sistema ocupado") a los demas trabajadores que marcan a la misma hora.
  var fotoUrl = '';
  try {
    var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var asisFolder = getOrCreateFolder(mainFolder, 'Asistencias');
    var fechaFolder = getOrCreateFolder(asisFolder, fecha);
    var dniFolder = getOrCreateFolder(fechaFolder, dni);
    var fileName = evento + '_' + ahora.getTime() + '.jpg';
    var blob = Utilities.newBlob(Utilities.base64Decode(data.fileContent), data.mimeType || 'image/jpeg', fileName);
    var file = dniFolder.createFile(blob);
    // C6: archivo privado — el visor admin lo sirve via getArchivo (nivel auth)
    fotoUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  } catch (e) {
    return { success: false, error: 'Error al guardar la foto: ' + e.message };
  }

  // Lock solo para la verificacion anti-duplicado + appendRow (<1s)
  return withLock_(function () {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateAsistenciaSheet_(ss, 'asistencias_v2', HEADERS_ASISTENCIAS_V2);

    // Evitar doble registro del mismo evento en el mismo dia (SOLO oficina).
    // Los eventos de campo permiten varios turnos por dia.
    if (!esCampo) {
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var dniCol = headers.indexOf('dni');
      var eventoCol = headers.indexOf('evento');
      var fechaCol = headers.indexOf('fecha');
      for (var i = 1; i < rows.length; i++) {
        // Sheets auto-convierte 'yyyy-MM-dd' a Date al appendRow: normalizar
        // antes de comparar o el anti-duplicado nunca matchea.
        var celdaFecha = rows[i][fechaCol];
        var fechaFila = (celdaFecha instanceof Date)
          ? Utilities.formatDate(celdaFecha, 'America/Lima', 'yyyy-MM-dd')
          : String(celdaFecha);
        if (String(rows[i][dniCol]) === dni && rows[i][eventoCol] === evento && fechaFila === fecha) {
          return { success: false, error: 'Ya registraste este evento hoy' };
        }
      }
    }

    sheet.appendRow([
      Utilities.getUuid(),
      dni,
      data.nombre || '',
      data.cargo || '',
      evento,
      fecha,
      hora,
      data.gps_lat !== undefined ? data.gps_lat : '',
      data.gps_lng !== undefined ? data.gps_lng : '',
      data.gps_accuracy !== undefined ? data.gps_accuracy : '',
      fotoUrl,
      ahora.toISOString()
    ]);

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

  // Subir el adjunto a Drive FUERA del lock (mismo motivo que en
  // registrarAsistenciaFoto: la subida tarda y no debe bloquear a otros).
  var archivoUrl = '';
  if (data.fileContent) {
    try {
      var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var justFolder = getOrCreateFolder(mainFolder, 'Justificaciones');
      var fechaFolder = getOrCreateFolder(justFolder, fecha);
      var dniFolder = getOrCreateFolder(fechaFolder, dni);
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
      data.nombre || '',
      data.cargo || '',
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

  // nombre/cargo siempre desde el roster real, nunca desde el cliente
  var roster = leerRosterReal_();
  var trab = null;
  for (var k = 0; k < roster.length; k++) { if (roster[k].dni === dni) { trab = roster[k]; break; } }
  if (!trab) return { success: false, error: 'DNI no encontrado en el roster' };

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

    // Anti-duplicado igual que el kiosko (solo eventos de oficina)
    if (!esCampo) {
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var dniCol = headers.indexOf('dni');
      var eventoCol = headers.indexOf('evento');
      var fechaCol = headers.indexOf('fecha');
      for (var i = 1; i < rows.length; i++) {
        var celdaFecha = rows[i][fechaCol];
        var fechaFila = (celdaFecha instanceof Date)
          ? Utilities.formatDate(celdaFecha, 'America/Lima', 'yyyy-MM-dd')
          : String(celdaFecha);
        if (String(rows[i][dniCol]) === dni && rows[i][eventoCol] === evento && fechaFila === fecha) {
          return { success: false, error: 'Ese evento ya esta registrado para ese trabajador ese dia' };
        }
      }
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
