// ============================================================
// CAPACITACIONES — cursos, banco de preguntas y evaluaciones
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// --- CRUD Capacitaciones ---
// Nada se borra: "eliminar" archiva (estado 'archivado' en cursos, 'inactiva'
// en preguntas) y se puede recuperar. Todas las escrituras van por nombre de
// columna (tablaPorCabecera_, 04_proyectos.gs) y bajo withLock_.

var CAP_ESTADOS_ = ['borrador', 'activo', 'cerrado', 'archivado'];

// Agrega una fila escribiendo cada valor en la columna de su mismo nombre
function capAgregarFila_(nombreHoja, valores) {
  var t = tablaPorCabecera_(nombreHoja);
  t.hoja.appendRow(t.datos[0].map(function (c) { return valores[c] !== undefined ? valores[c] : ''; }));
}

// Preguntas activas de un curso (para no activar un curso sin preguntas suficientes)
function capPreguntasActivas_(capacitacion_id) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('banco_preguntas');
  if (!sheet) return 0;
  var rows = sheet.getDataRange().getValues();
  var h = rows[0];
  var cCap = h.indexOf('capacitacion_id'), cEst = h.indexOf('estado');
  var n = 0;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][cCap]) === String(capacitacion_id) && rows[i][cEst] === 'activa') n++;
  }
  return n;
}

// Valida los campos de un curso. `parcial` = solo los que vienen (edición).
function capValidar_(data, parcial) {
  var num = function (v) { return v === undefined || v === null || v === '' ? null : Number(v); };
  if (!parcial || data.titulo !== undefined) {
    if (!String(data.titulo || '').trim()) return 'El título es obligatorio';
  }
  var np = num(data.num_preguntas), nm = num(data.nota_minima), tl = num(data.tiempo_limite_min), fi = num(data.foto_intervalo_seg);
  if (np !== null && (isNaN(np) || np < 1 || np > 100 || Math.floor(np) !== np)) return 'El número de preguntas debe ser un entero entre 1 y 100';
  if (nm !== null && (isNaN(nm) || nm < 0 || nm > 20)) return 'La nota mínima debe estar entre 0 y 20';
  if (tl !== null && (isNaN(tl) || tl <= 0 || tl > 600)) return 'El tiempo límite debe ser mayor que 0 minutos';
  if (fi !== null && (isNaN(fi) || fi < 5 || fi > 600)) return 'El intervalo de fotos debe estar entre 5 y 600 segundos';
  if (data.estado !== undefined && CAP_ESTADOS_.indexOf(data.estado) < 0) return 'Estado no válido: ' + data.estado;
  return '';
}

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

// Panel: todos los cursos (borrador, activo, cerrado); archivados solo si se piden.
// Incluye cuántas preguntas activas tiene cada uno.
function getCapacitacionesAdmin(data) {
  data = data || {};
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var activasPorCap = {};
  var banco = SpreadsheetApp.openById(SHEET_ID).getSheetByName('banco_preguntas');
  if (banco) {
    var b = banco.getDataRange().getValues();
    var cCap = b[0].indexOf('capacitacion_id'), cEst = b[0].indexOf('estado');
    for (var j = 1; j < b.length; j++) {
      if (b[j][cEst] === 'activa') activasPorCap[b[j][cCap]] = (activasPorCap[b[j][cCap]] || 0) + 1;
    }
  }
  var lista = rows.slice(1)
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      var o = rowToObject(headers, r);
      o.preguntas_activas = activasPorCap[o.id] || 0;
      return o;
    })
    .filter(function (c) { return data.archivados ? true : c.estado !== 'archivado'; });
  return { success: true, data: lista };
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
  data = data || {};
  var err = capValidar_(data, false);
  if (err) return { success: false, error: err };
  var estado = data.estado || 'borrador';
  if (estado === 'archivado') estado = 'borrador';
  var numPreg = Number(data.num_preguntas) || 15;
  // Un curso nuevo aún no tiene preguntas: no se puede publicar ("activo") todavía
  if (estado === 'activo') {
    return { success: false, error: 'Un curso nuevo no tiene preguntas todavía. Créalo como borrador, agrega al menos ' + numPreg + ' preguntas activas y luego actívalo.' };
  }
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  return withLock_(function () {
    var id = 'CAP' + Utilities.getUuid().substring(0, 8).toUpperCase();
    capAgregarFila_('capacitaciones', {
      id: id,
      titulo: String(data.titulo).trim(),
      descripcion: data.descripcion || '',
      material_url: data.material_url || '',
      categoria: data.categoria || '',
      num_preguntas: numPreg,
      nota_minima: data.nota_minima === undefined || data.nota_minima === '' ? 14 : Number(data.nota_minima),
      tiempo_limite_min: Number(data.tiempo_limite_min) || 30,
      foto_intervalo_seg: Number(data.foto_intervalo_seg) || 20,
      estado: estado,
      fecha_creacion: new Date().toISOString()
    });
    return { success: true, data: { id: id }, message: 'Capacitacion creada' };
  });
}

function actualizarCapacitacion(data) {
  data = data || {};
  var err = capValidar_(data, true);
  if (err) return { success: false, error: err };
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  return withLock_(function () {
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== String(data.id)) continue;
      var actual = rowToObject(headers, rows[i]);
      // Activar exige preguntas activas suficientes para armar el examen
      var estadoFinal = data.estado !== undefined ? data.estado : actual.estado;
      var numFinal = data.num_preguntas !== undefined && data.num_preguntas !== '' ? Number(data.num_preguntas) : Number(actual.num_preguntas) || 15;
      if (estadoFinal === 'activo') {
        var activas = capPreguntasActivas_(data.id);
        if (activas < numFinal) {
          return { success: false, error: 'No se puede activar: el examen pide ' + numFinal + ' preguntas y el banco tiene ' + activas + ' activas. Agrega preguntas o baja el número de preguntas.' };
        }
      }
      var fieldMap = {
        titulo: data.titulo !== undefined ? String(data.titulo).trim() : undefined, descripcion: data.descripcion,
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
    return { success: false, error: 'Capacitacion no encontrada' };
  });
}

// data = { id, archivar: true|false } — archivar oculta el curso (no se puede
// rendir); recuperar lo devuelve como borrador para revisarlo antes de activarlo.
function archivarCapacitacion(data) {
  data = data || {};
  var archivar = data.archivar !== false;
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  return withLock_(function () {
    var rows = sheet.getDataRange().getValues();
    var cEst = rows[0].indexOf('estado');
    if (cEst < 0) return { success: false, error: 'La hoja capacitaciones no tiene columna estado' };
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== String(data.id)) continue;
      sheet.getRange(i + 1, cEst + 1).setValue(archivar ? 'archivado' : 'borrador');
      return { success: true, message: archivar ? 'Capacitación archivada. Puedes recuperarla en "Ver archivadas".' : 'Capacitación recuperada como borrador' };
    }
    return { success: false, error: 'Capacitacion no encontrada' };
  });
}

// Compatibilidad: la ruta antigua de borrado ahora ARCHIVA (no borra la fila)
function eliminarCapacitacion(data) {
  return archivarCapacitacion({ id: (data || {}).id, archivar: true });
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

// Valida una pregunta completa (se usa con los valores finales, tras mezclar la edición)
function capValidarPregunta_(p) {
  if (!String(p.capacitacion_id || '').trim()) return 'Elige la capacitación de la pregunta';
  if (!String(p.pregunta || '').trim()) return 'Escribe el texto de la pregunta';
  var tipo = p.tipo || 'multiple';
  if (['multiple', 'llenado'].indexOf(tipo) < 0) return 'Tipo de pregunta no válido';
  var puntaje = Number(p.puntaje);
  if (p.puntaje !== undefined && p.puntaje !== '' && (isNaN(puntaje) || puntaje < 1 || puntaje > 10)) return 'El puntaje debe estar entre 1 y 10';
  if (p.dificultad !== undefined && p.dificultad !== '' && ['facil', 'media', 'dificil'].indexOf(p.dificultad) < 0) return 'Dificultad no válida';
  if (tipo === 'multiple') {
    var opciones = ['a', 'b', 'c', 'd'].filter(function (l) { return String(p['opcion_' + l] || '').trim(); });
    if (opciones.length < 2) return 'Una pregunta de opción múltiple necesita al menos 2 opciones';
    var r = String(p.respuesta_correcta || '').trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].indexOf(r) < 0) return 'Elige cuál es la respuesta correcta (A, B, C o D)';
    if (!String(p['opcion_' + r.toLowerCase()] || '').trim()) return 'La respuesta correcta (' + r + ') está vacía: escribe esa opción o elige otra';
  } else if (!String(p.respuesta_correcta || '').trim()) {
    return 'Escribe la respuesta de referencia';
  }
  return '';
}

function crearPregunta(data) {
  data = data || {};
  var err = capValidarPregunta_(data);
  if (err) return { success: false, error: err };
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja banco_preguntas no encontrada' };
  return withLock_(function () {
    var id = 'PQ' + Utilities.getUuid().substring(0, 8).toUpperCase();
    capAgregarFila_('banco_preguntas', {
      id: id,
      capacitacion_id: data.capacitacion_id || '',
      pregunta: String(data.pregunta).trim(),
      tipo: data.tipo || 'multiple',
      opcion_a: data.opcion_a || '',
      opcion_b: data.opcion_b || '',
      opcion_c: data.opcion_c || '',
      opcion_d: data.opcion_d || '',
      respuesta_correcta: (data.tipo || 'multiple') === 'multiple' ? String(data.respuesta_correcta || '').trim().toUpperCase() : (data.respuesta_correcta || ''),
      justificacion: data.justificacion || '',
      dificultad: data.dificultad || 'media',
      puntaje: Number(data.puntaje) || 1,
      estado: data.estado === 'inactiva' ? 'inactiva' : 'activa'
    });
    return { success: true, data: { id: id }, message: 'Pregunta creada' };
  });
}

function actualizarPregunta(data) {
  data = data || {};
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  return withLock_(function () {
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== String(data.id)) continue;
      var fieldMap = {
        pregunta: data.pregunta, tipo: data.tipo,
        opcion_a: data.opcion_a, opcion_b: data.opcion_b,
        opcion_c: data.opcion_c, opcion_d: data.opcion_d,
        respuesta_correcta: data.respuesta_correcta,
        justificacion: data.justificacion, dificultad: data.dificultad,
        puntaje: data.puntaje, estado: data.estado
      };
      // Valida la pregunta tal como quedaría después del cambio
      var final = rowToObject(headers, rows[i]);
      Object.keys(fieldMap).forEach(function (k) { if (fieldMap[k] !== undefined) final[k] = fieldMap[k]; });
      var err = capValidarPregunta_(final);
      if (err) return { success: false, error: err };
      if (data.estado !== undefined && ['activa', 'inactiva'].indexOf(data.estado) < 0) return { success: false, error: 'Estado de pregunta no válido' };
      if ((final.tipo || 'multiple') === 'multiple' && fieldMap.respuesta_correcta !== undefined) {
        fieldMap.respuesta_correcta = String(fieldMap.respuesta_correcta).trim().toUpperCase();
      }
      headers.forEach(function(h, col) {
        if (fieldMap.hasOwnProperty(h) && fieldMap[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(fieldMap[h]);
        }
      });
      return { success: true, message: 'Pregunta actualizada' };
    }
    return { success: false, error: 'Pregunta no encontrada' };
  });
}

// data = { id, archivar: true|false } → estado 'inactiva' / 'activa'
function archivarPregunta(data) {
  data = data || {};
  var archivar = data.archivar !== false;
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  return withLock_(function () {
    var rows = sheet.getDataRange().getValues();
    var cEst = rows[0].indexOf('estado');
    if (cEst < 0) return { success: false, error: 'La hoja banco_preguntas no tiene columna estado' };
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) !== String(data.id)) continue;
      sheet.getRange(i + 1, cEst + 1).setValue(archivar ? 'inactiva' : 'activa');
      return { success: true, message: archivar ? 'Pregunta archivada (ya no sale en los exámenes)' : 'Pregunta recuperada' };
    }
    return { success: false, error: 'Pregunta no encontrada' };
  });
}

// Compatibilidad: la ruta antigua de borrado ahora ARCHIVA la pregunta
function eliminarPregunta(data) {
  return archivarPregunta({ id: (data || {}).id, archivar: true });
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
    capAgregarFila_('evaluaciones', {
      id: evalId, capacitacion_id: capacitacion_id, dni: dni, nombres: nombres, email: email,
      preguntas_asignadas: preguntasIds, respuestas: '', puntaje_auto: '', salidas_pestana: 0, fotos_url: '',
      hora_inicio: horaInicio, hora_fin: '', duracion_seg: '', estado: 'en_curso',
      nota_final: '', retroalimentacion: '', revisado_por: '', fecha_revision: ''
    });
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

// Verifica si ya existe un intento (no abandonado ni anulado) para un DNI en una
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
        evalData[i][estadoCol] !== 'abandonado' &&
        evalData[i][estadoCol] !== 'anulado') {
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

// data = { id, nota_final (0-20), retroalimentacion, estado: aprobado|observado,
//          revisado_por, recalificar?: true }
// Una evaluación ya calificada solo se vuelve a calificar con recalificar: true
// (el panel lo pide con confirmación). La respuesta dice si el correo salió.
function revisarEvaluacion(data) {
  data = data || {};
  var id = data.id;
  var retroalimentacion = data.retroalimentacion || '';
  var estado = data.estado;

  if (!id || data.nota_final === undefined || data.nota_final === null || data.nota_final === '' || !estado) {
    return { success: false, error: 'Faltan campos: id, nota_final, estado' };
  }
  var nota_final = Number(data.nota_final);
  if (isNaN(nota_final) || nota_final < 0 || nota_final > 20) return { success: false, error: 'La nota debe estar entre 0 y 20' };
  if (['aprobado', 'observado'].indexOf(estado) < 0) return { success: false, error: 'Estado debe ser aprobado u observado' };

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('evaluaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };

  var guardado = withLock_(function () {
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var cId = headers.indexOf('id');
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][cId >= 0 ? cId : 0]) !== String(id)) continue;
      var evalRow = rowToObject(headers, rows[i]);
      if (evalRow.estado === 'anulado') return { success: false, error: 'Este intento fue anulado: no se puede calificar' };
      if ((evalRow.estado === 'aprobado' || evalRow.estado === 'observado') && data.recalificar !== true) {
        return { success: false, error: 'Esta evaluación ya fue calificada. Confirma que quieres recalificarla.' };
      }
      var updateMap = {
        nota_final: nota_final,
        retroalimentacion: retroalimentacion,
        estado: estado,
        revisado_por: data.revisado_por || 'Admin',
        fecha_revision: new Date().toISOString()
      };
      headers.forEach(function(h, col) {
        if (updateMap.hasOwnProperty(h)) sheet.getRange(i + 1, col + 1).setValue(updateMap[h]);
      });
      return { success: true, evalRow: evalRow };
    }
    return { success: false, error: 'Evaluacion no encontrada' };
  });
  if (!guardado.success) return guardado;
  var evalRow = guardado.evalRow;

  var capResult = getCapacitacionById(evalRow.capacitacion_id);
  var tituloCap = capResult.success ? capResult.data.titulo : 'Capacitacion';

  var emailDest = String(evalRow.email || '');
  if (!emailDest || emailDest.indexOf('@') <= 0) {
    return { success: true, data: { correo_enviado: false, correo_error: 'La evaluación no tiene un correo válido' }, message: 'Revisión guardada. No se envió correo: la evaluación no tiene un correo válido.' };
  }
  try {
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
  } catch(mailErr) {
    return { success: true, data: { correo_enviado: false, correo_error: mailErr.message }, message: 'Revisión guardada, pero el correo no se pudo enviar: ' + mailErr.message };
  }
  return { success: true, data: { correo_enviado: true }, message: 'Revision guardada y correo enviado a ' + emailDest };
}

// "Reabrir intento": anula un intento en curso o sin calificar (p. ej. se cortó
// el internet) para que la persona pueda volver a rendir. No se borra: queda
// como 'anulado' con el motivo, y existeIntentoEvaluacion_ ya no lo cuenta.
// data = { id, motivo, revisado_por }
function anularEvaluacion(data) {
  data = data || {};
  var motivo = String(data.motivo || '').trim();
  if (!data.id) return { success: false, error: 'Falta la evaluación' };
  if (motivo.length < 3) return { success: false, error: 'Escribe el motivo para reabrir el intento' };
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('evaluaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  return withLock_(function () {
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var cId = headers.indexOf('id');
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][cId >= 0 ? cId : 0]) !== String(data.id)) continue;
      var ev = rowToObject(headers, rows[i]);
      if (['en_curso', 'pendiente_revision', 'abandonado'].indexOf(ev.estado) < 0) {
        return { success: false, error: 'Solo se puede reabrir un intento en curso o sin calificar (este está "' + ev.estado + '")' };
      }
      var updateMap = {
        estado: 'anulado',
        retroalimentacion: 'ANULADO para volver a rendir: ' + motivo,
        revisado_por: data.revisado_por || 'Admin',
        fecha_revision: new Date().toISOString()
      };
      headers.forEach(function (h, col) {
        if (updateMap.hasOwnProperty(h)) sheet.getRange(i + 1, col + 1).setValue(updateMap[h]);
      });
      return { success: true, message: 'Intento anulado. ' + (ev.nombres || 'La persona') + ' ya puede volver a rendir la evaluación.' };
    }
    return { success: false, error: 'Evaluacion no encontrada' };
  });
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
        capAgregarFila_('eval_fotos', {
          id: Utilities.getUuid(), evaluacion_id: evaluacion_id, foto_url: fotoUrl,
          timestamp: new Date().toISOString(), orden: fotosSheet.getLastRow()
        });
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
  capAgregarFila_('eval_logs', {
    id: Utilities.getUuid(),
    evaluacion_id: data.evaluacion_id || '',
    tipo_evento: data.tipo_evento || 'desconocido',
    detalle: data.detalle || '',
    timestamp: new Date().toISOString()
  });
  return { success: true };
}
