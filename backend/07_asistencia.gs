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
