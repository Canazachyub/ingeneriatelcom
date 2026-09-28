// ============================================================
// LIBRO DE RECLAMACIONES VIRTUAL
// Código de Protección y Defensa del Consumidor (Ley N.° 29571, art. 150) y
// su Reglamento del Libro de Reclamaciones (D.S. N.° 011-2011-PCM, texto
// vigente según D.S. N.° 101-2022-PCM).
//
// Qué exige la norma y dónde se cumple:
//   · Hoja de reclamación con número correlativo ........ generarCorrelativoReclamo_
//   · Datos del proveedor (razón social, RUC, domicilio) . DATOS_PROVEEDOR_
//   · Constancia al consumidor en el acto (correo) ....... enviarConstanciaReclamo_
//   · Respuesta en máx. 15 días hábiles, improrrogable ... fechaLimite (sumarDiasHabiles_)
//   · Conservar las hojas por 2 años como mínimo ......... hoja 'reclamaciones' (no se borra)
// Hoja: 'reclamaciones' (se crea sola con sus cabeceras la primera vez).
// Documentación: docs/LIBRO_RECLAMACIONES.md
// ============================================================

var HOJA_RECLAMOS_ = 'reclamaciones';

var CABECERAS_RECLAMOS_ = [
  'id', 'fecha', 'estado', 'tipo', 'nombre', 'tipoDocumento', 'numeroDocumento', 'domicilio',
  'telefono', 'email', 'menorEdad', 'apoderado', 'bien', 'descripcionBien', 'monto',
  'detalle', 'pedido', 'fechaLimite', 'respuesta', 'fechaRespuesta', 'respondidoPor',
  'constanciaEnviada', 'createdAt'
];

var DATOS_PROVEEDOR_ = {
  razonSocial: 'INGENIERIA TELCOM E.I.R.L.',
  ruc: '20602277900',
  domicilio: 'Mz. 550 Lote 05, A. V. Paseo de los Héroes, Crnl. Gregorio Albarracín Lanchipa, Tacna, Perú'
};

function hojaReclamos_() {
  var libro = SpreadsheetApp.openById(SHEET_ID);
  var hoja = libro.getSheetByName(HOJA_RECLAMOS_);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA_RECLAMOS_);
    hoja.getRange(1, 1, 1, CABECERAS_RECLAMOS_.length).setValues([CABECERAS_RECLAMOS_]);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// "LR-2026-00001": correlativo que se reinicia cada año
function generarCorrelativoReclamo_(hoja, anio) {
  var prefijo = 'LR-' + anio + '-';
  var ids = hoja.getLastRow() > 1 ? hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues() : [];
  var max = 0;
  ids.forEach(function (fila) {
    var id = String(fila[0]);
    if (id.indexOf(prefijo) === 0) {
      var n = parseInt(id.slice(prefijo.length), 10);
      if (n > max) max = n;
    }
  });
  return prefijo + String(max + 1).padStart(5, '0');
}

// Suma días hábiles (lunes a viernes). Los feriados nacionales, si están en la
// hoja 'feriados' (columna fecha), también se saltan.
function sumarDiasHabiles_(desde, dias) {
  var feriados = {};
  try {
    var hf = SpreadsheetApp.openById(SHEET_ID).getSheetByName('feriados');
    if (hf && hf.getLastRow() > 1) {
      hf.getRange(2, 1, hf.getLastRow() - 1, 1).getValues().forEach(function (f) {
        if (f[0] instanceof Date) feriados[Utilities.formatDate(f[0], 'America/Lima', 'yyyy-MM-dd')] = true;
      });
    }
  } catch (e) { /* sin hoja de feriados: solo fines de semana */ }
  var d = new Date(desde.getTime());
  var sumados = 0;
  while (sumados < dias) {
    d.setDate(d.getDate() + 1);
    var dia = d.getDay();
    var clave = Utilities.formatDate(d, 'America/Lima', 'yyyy-MM-dd');
    if (dia !== 0 && dia !== 6 && !feriados[clave]) sumados++;
  }
  return d;
}

function texto_(v, max) {
  return String(v === undefined || v === null ? '' : v).trim().slice(0, max || 500);
}

function registrarReclamo(data) {
  data = data || {};
  var r = {
    tipo: texto_(data.tipo, 10).toLowerCase(),
    nombre: texto_(data.nombre, 150),
    tipoDocumento: texto_(data.tipoDocumento, 20) || 'DNI',
    numeroDocumento: texto_(data.numeroDocumento, 20),
    domicilio: texto_(data.domicilio, 250),
    telefono: texto_(data.telefono, 30),
    email: texto_(data.email, 150).toLowerCase(),
    menorEdad: data.menorEdad ? 'si' : 'no',
    apoderado: texto_(data.apoderado, 150),
    bien: texto_(data.bien, 10).toLowerCase() === 'producto' ? 'producto' : 'servicio',
    descripcionBien: texto_(data.descripcionBien, 500),
    monto: texto_(data.monto, 30),
    detalle: texto_(data.detalle, 3000),
    pedido: texto_(data.pedido, 1500)
  };

  // Validaciones mínimas exigidas por el formato de la hoja de reclamación
  if (r.tipo !== 'reclamo' && r.tipo !== 'queja') return { success: false, error: 'Indica si es un reclamo o una queja' };
  if (!r.nombre || !r.numeroDocumento || !r.domicilio) return { success: false, error: 'Completa tu nombre, documento y domicilio' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) return { success: false, error: 'Correo electrónico no válido' };
  if (!r.descripcionBien || !r.detalle || !r.pedido) return { success: false, error: 'Completa el detalle y tu pedido' };
  if (r.menorEdad === 'si' && !r.apoderado) return { success: false, error: 'Indica el nombre del padre, madre o apoderado' };
  if (!data.aceptaTerminos) return { success: false, error: 'Debes confirmar que los datos son correctos' };

  var rl = checkRateLimit_('reclamo:' + r.numeroDocumento, 5);
  if (rl) return rl;

  var ahora = new Date();
  var resultado = withLock_(function () {
    var hoja = hojaReclamos_();
    var anio = Utilities.formatDate(ahora, 'America/Lima', 'yyyy');
    var id = generarCorrelativoReclamo_(hoja, anio);
    var limite = sumarDiasHabiles_(ahora, 15);
    var cab = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    var valores = Object.assign({}, r, {
      id: id,
      fecha: ahora,
      estado: 'pendiente',
      fechaLimite: limite,
      respuesta: '', fechaRespuesta: '', respondidoPor: '',
      constanciaEnviada: 'no',
      createdAt: ahora
    });
    hoja.appendRow(cab.map(function (c) { return valores[c] !== undefined ? valores[c] : ''; }));
    return { success: true, data: { id: id, fecha: ahora.toISOString(), fechaLimite: limite.toISOString() } };
  });

  if (resultado.success) {
    var enviada = enviarConstanciaReclamo_(Object.assign({}, r, {
      id: resultado.data.id, fecha: ahora, fechaLimite: new Date(resultado.data.fechaLimite)
    }));
    resultado.data.constanciaEnviada = enviada;
    if (enviada) marcarReclamo_(resultado.data.id, { constanciaEnviada: 'si' });
  }
  return resultado;
}

function fechaLima_(d) {
  return Utilities.formatDate(d, 'America/Lima', 'dd/MM/yyyy HH:mm');
}

function escHtml_(t) {
  return String(t || '').replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// Constancia (copia de la hoja de reclamación) al consumidor + copia a la empresa
function enviarConstanciaReclamo_(r) {
  var filas = [
    ['N.° de hoja', r.id],
    ['Fecha', fechaLima_(r.fecha)],
    ['Proveedor', DATOS_PROVEEDOR_.razonSocial + ' — RUC ' + DATOS_PROVEEDOR_.ruc],
    ['Domicilio del proveedor', DATOS_PROVEEDOR_.domicilio],
    ['Consumidor', r.nombre],
    ['Documento', r.tipoDocumento + ' ' + r.numeroDocumento],
    ['Domicilio', r.domicilio],
    ['Teléfono / correo', (r.telefono || '—') + ' / ' + r.email],
    r.menorEdad === 'si' ? ['Padre, madre o apoderado', r.apoderado] : null,
    ['Bien contratado', (r.bien === 'producto' ? 'Producto' : 'Servicio') + ': ' + r.descripcionBien],
    ['Monto reclamado', r.monto || '—'],
    ['Tipo', r.tipo === 'queja' ? 'QUEJA' : 'RECLAMO'],
    ['Detalle', r.detalle],
    ['Pedido del consumidor', r.pedido],
    ['Plazo máximo de respuesta', Utilities.formatDate(r.fechaLimite, 'America/Lima', 'dd/MM/yyyy') + ' (15 días hábiles)']
  ].filter(Boolean);

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:640px;color:#111">' +
    '<h2 style="margin:0 0 4px">Libro de Reclamaciones — Hoja ' + escHtml_(r.id) + '</h2>' +
    '<p style="margin:0 0 16px;color:#555">Constancia de tu ' + (r.tipo === 'queja' ? 'queja' : 'reclamo') + ' registrado en Ingeniería Telcom EIRL.</p>' +
    '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
    filas.map(function (f) {
      return '<tr><td style="border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;width:34%;vertical-align:top"><b>' +
        escHtml_(f[0]) + '</b></td><td style="border:1px solid #ccc;padding:6px 8px;white-space:pre-wrap">' + escHtml_(f[1]) + '</td></tr>';
    }).join('') +
    '</table>' +
    '<p style="font-size:12px;color:#555;margin-top:16px">La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI. ' +
    'El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles improrrogables.</p>' +
    '<p style="font-size:12px;color:#555">Reclamo: disconformidad relacionada a los productos o servicios. Queja: disconformidad no relacionada a los productos o servicios, o malestar o descontento respecto a la atención al público.</p>' +
    '</div>';

  var asunto = 'Libro de Reclamaciones — Hoja ' + r.id + ' — Ingeniería Telcom EIRL';
  try {
    MailApp.sendEmail({
      to: r.email,
      bcc: NOTIFICATION_EMAIL,
      replyTo: NOTIFICATION_EMAIL,
      name: 'Ingeniería Telcom EIRL',
      subject: asunto,
      htmlBody: html
    });
    return true;
  } catch (e) {
    console.error('Constancia de reclamo no enviada:', e);
    // Aviso interno para que se reenvíe a mano
    try { MailApp.sendEmail(NOTIFICATION_EMAIL, '[PENDIENTE ENVIAR] ' + asunto, 'No se pudo enviar la constancia a ' + r.email + '. Reenviar desde el panel.'); } catch (e2) {}
    return false;
  }
}

function marcarReclamo_(id, cambios) {
  var hoja = hojaReclamos_();
  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(id)) {
      Object.keys(cambios).forEach(function (k) {
        var c = cab.indexOf(k);
        if (c >= 0) hoja.getRange(i + 1, c + 1).setValue(cambios[k]);
      });
      return true;
    }
  }
  return false;
}

// Panel (módulo "mensajes"): lista de reclamos y quejas, los más recientes primero
function getReclamos() {
  var hoja = hojaReclamos_();
  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  var lista = datos.slice(1)
    .filter(function (f) { return f[0] !== ''; })
    .map(function (f) {
      var o = rowToObject(cab, f);
      ['fecha', 'fechaLimite', 'fechaRespuesta', 'createdAt'].forEach(function (k) {
        if (o[k] instanceof Date) o[k] = o[k].toISOString();
      });
      return o;
    })
    .sort(function (a, b) { return new Date(b.fecha || 0) - new Date(a.fecha || 0); });
  return { success: true, data: lista };
}

// Registra la respuesta del proveedor y se la envía al consumidor por correo
function responderReclamo(data, userId) {
  data = data || {};
  var id = texto_(data.id, 30);
  var respuesta = texto_(data.respuesta, 4000);
  if (!id || respuesta.length < 10) return { success: false, error: 'Escribe la respuesta al consumidor' };

  var hoja = hojaReclamos_();
  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  var fila = -1;
  for (var i = 1; i < datos.length; i++) if (String(datos[i][0]) === id) { fila = i; break; }
  if (fila < 0) return { success: false, error: 'Hoja de reclamación no encontrada' };
  var r = rowToObject(cab, datos[fila]);

  var ahora = new Date();
  marcarReclamo_(id, { respuesta: respuesta, fechaRespuesta: ahora, estado: 'respondido', respondidoPor: userId || '' });

  var enviado = false;
  try {
    MailApp.sendEmail({
      to: r.email,
      bcc: NOTIFICATION_EMAIL,
      replyTo: NOTIFICATION_EMAIL,
      name: 'Ingeniería Telcom EIRL',
      subject: 'Respuesta a tu ' + (r.tipo === 'queja' ? 'queja' : 'reclamo') + ' — Hoja ' + id,
      htmlBody:
        '<div style="font-family:Arial,sans-serif;max-width:640px;color:#111">' +
        '<h2 style="margin:0 0 8px">Respuesta — Hoja de reclamación ' + escHtml_(id) + '</h2>' +
        '<p>Estimado(a) ' + escHtml_(r.nombre) + ':</p>' +
        '<p style="white-space:pre-wrap">' + escHtml_(respuesta) + '</p>' +
        '<p style="font-size:12px;color:#555;margin-top:16px">' + DATOS_PROVEEDOR_.razonSocial + ' — RUC ' + DATOS_PROVEEDOR_.ruc + '<br>' + DATOS_PROVEEDOR_.domicilio + '</p>' +
        '</div>'
    });
    enviado = true;
  } catch (e) {
    console.error('Respuesta de reclamo no enviada:', e);
  }
  return {
    success: true,
    data: { id: id, correoEnviado: enviado },
    message: enviado ? 'Respuesta registrada y enviada al consumidor' : 'Respuesta registrada, pero el correo no se pudo enviar: comunícate con el consumidor'
  };
}
