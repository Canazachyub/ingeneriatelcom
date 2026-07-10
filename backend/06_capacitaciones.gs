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
    var proctoringFolder = getOrCreateFolder(mainFolder, 'Evaluaciones_Proctoring');
    var capFolder = getOrCreateFolder(proctoringFolder, String(capacitacion_id));
    var dniFolder = getOrCreateFolder(capFolder, String(dni));

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
