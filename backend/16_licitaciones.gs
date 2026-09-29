// ============================================================
// LICITACIONES — historial SEACE, competidores, experiencia y acervo documental
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
//
// Origen de los datos: el vault INGENIERIA TELCOM exporta JSON sin datos
// personales sensibles (01_GERENCIA/experiencia/web/*.json, ver
// exportar_web.py) y los sube con licImportar. El panel NO descarga ni
// analiza SEACE: solo muestra, filtra y deja anotar seguimiento/acervo.
// Diseño aprobado: docs/PLAN_LICITACIONES_ADMIN.md.
//
// Estrategia de importación (licImportar):
//   - lic_postores, lic_acciones, lic_competidores, lic_experiencia se
//     REEMPLAZAN enteras en cada import (son 100% derivadas del vault, sin
//     estado propio del panel).
//   - lic_procesos y lic_documentos se hacen MERGE por clave (nomenclatura /
//     id): se actualizan los campos que vienen del vault, pero los campos
//     editables desde la web (ver LIC_PROCESOS_SOLO_WEB_/PROTEGIDOS_ y
//     LIC_DOC_SOLO_WEB_/PROTEGIDOS_ abajo) nunca se pisan, y las filas nuevas
//     que solo existen en el panel (documentos dados de alta a mano) se
//     conservan aunque no vengan en el JSON.
// ============================================================

// ── Esquema de las hojas lic_* (columnas = campos del JSON del vault) ──────
var LIC_HOJAS_ = {
  procesos: [
    'nomenclatura', 'codigo_seace', 'anio', 'entidad', 'linea', 'objeto', 'ley', 'vr',
    'resultado', 'estado_cola', 'nuestro_monto', 'nuestro_pct_vr', 'n_postores',
    'ganador_ruc', 'ganador', 'carpeta_vault', 'notas_vault', 'notas',
    // Solo-web (nunca vienen del JSON del vault, ver LIC_PROCESOS_SOLO_WEB_):
    'estado_seguimiento', 'actualizado'
  ],
  postores: ['nomenclatura', 'ruc', 'razon_social', 'consorcio', 'mype', 'monto', 'pct_vr', 'es_telcom', 'gano'],
  acciones: ['nomenclatura', 'n', 'accion', 'fecha', 'motivo'],
  // procesos/entidades/ofertas viajan como arreglos: se guardan como JSON.stringify
  // en la celda (mismo patron que 'respuestas'/'fotos_url' en 06_capacitaciones.gs).
  competidores: ['ruc', 'nombre', 'procesos', 'n_procesos', 'entidades', 'ofertas', 'pct_vr_promedio', 'ganados'],
  experiencia: ['proceso', 'entidad', 'objeto', 'monto_adjudicado', 'monto_facturado', 'pct_telcom', 'acreditable', 'estado', 'fecha_contrato'],
  documentos: [
    'id', 'categoria', 'tipo', 'titulo', 'entidad', 'dni', 'nombre', 'fecha',
    'periodo_desde', 'periodo_hasta', 'monto', 'archivo_vault', 'usos', 'verificado', 'vence',
    // Editables desde el panel (ver LIC_DOC_PROTEGIDOS_/SOLO_WEB_):
    'notas', 'editado_por', 'editado_en',
    // [{proceso, archivo, desde, hasta}] (JSON): propuesta completa y páginas de donde se extrajo
    'apariciones'
  ],
  // tipos/cargos/titulos viajan como objeto/arreglo: JSON.stringify en la celda.
  personal: [
    'dni', 'nombre', 'documentos', 'tipos', 'cargos', 'titulos', 'meses_experiencia', 'anios_experiencia',
    // Solo-web (ver LIC_PERSONAL_SOLO_WEB_):
    'empleado_vinculado', 'notas'
  ],
  contratos: [
    'contrato', 'documentos', 'tipos', 'monto_contrato', 'proceso', 'monto_adjudicado', 'pct_telcom',
    'n_facturas', 'facturado', 'en_seace_telcom',
    // Solo-web (ver LIC_CONTRATOS_SOLO_WEB_):
    'estado', 'notas'
  ],
  facturas: [
    'contrato', 'numero', 'fecha', 'monto', 'documento_id', 'archivo_vault',
    // Solo-web (ver LIC_FACTURAS_SOLO_WEB_):
    'verificado', 'notas'
  ],
  // Nuestras propuestas completas con su índice (secciones: JSON)
  propuestas: ['nomenclatura', 'anio', 'archivo', 'tamano_mb', 'secciones'],
  // Índice de Drive: ruta relativa dentro de la carpeta "Licitaciones" → id del archivo
  archivos: ['ruta', 'id', 'nombre', 'tamano', 'actualizado']
};

function hojaLic_(clave) {
  var headers = LIC_HOJAS_[clave];
  if (!headers) throw new Error('Hoja lic_ desconocida: ' + clave);
  var nombre = 'lic_' + clave;
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
    hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  } else if (hoja.getLastColumn() < headers.length) {
    var actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0];
    var faltan = headers.slice(actuales.length);
    hoja.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
  }
  return hoja;
}

function licParseArray_(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try {
    var p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch (e) {
    return [];
  }
}

function licParseObjeto_(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (!v) return {};
  try {
    var p = JSON.parse(v);
    return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
  } catch (e) {
    return {};
  }
}

function licValorCelda_(v) {
  if (Array.isArray(v)) return JSON.stringify(v);
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v === undefined || v === null ? '' : v;
}

// Lee una hoja lic_* completa como lista de objetos (por cabecera, no por posición).
function leerFilasLic_(clave) {
  var hoja = hojaLic_(clave);
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return [];
  var headers = datos[0];
  return datos.slice(1)
    .filter(function (f) { return f[0] !== ''; })
    .map(function (f) { return rowToObject(headers, f); });
}

// ============================================================
// IMPORTACION (admin, POST) — reemplaza/mergea las 6 hojas de una vez
// ============================================================

function licReemplazarHoja_(clave, lista) {
  var hoja = hojaLic_(clave);
  var headers = LIC_HOJAS_[clave];
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila > 1) hoja.getRange(2, 1, ultimaFila - 1, hoja.getLastColumn()).clearContent();
  if (!lista || !lista.length) return 0;
  var filas = lista.map(function (o) {
    return headers.map(function (h) { return licValorCelda_(o[h]); });
  });
  hoja.getRange(2, 1, filas.length, headers.length).setValues(filas);
  return filas.length;
}

// Campos que SOLO se escriben desde el panel (el JSON del vault nunca los trae):
// se preservan siempre que la fila ya exista.
var LIC_PROCESOS_SOLO_WEB_ = ['estado_seguimiento', 'actualizado'];
// Campos que SI vienen en el JSON pero, una vez cargados/editados, ya no se
// pisan en imports posteriores (evita que un reimport borre el seguimiento).
var LIC_PROCESOS_PROTEGIDOS_ = ['notas'];

function licMergeProcesos_(lista) {
  var hoja = hojaLic_('procesos');
  var headers = LIC_HOJAS_.procesos;
  var datos = hoja.getDataRange().getValues();
  var indice = {};
  for (var i = 1; i < datos.length; i++) {
    var nom = String(datos[i][0] || '');
    if (nom) indice[nom] = i;
  }
  var nuevos = 0, actualizados = 0;
  (lista || []).forEach(function (o) {
    var nom = String(o.nomenclatura || '');
    if (!nom) return;
    var fila = headers.map(function (h) {
      if (LIC_PROCESOS_SOLO_WEB_.indexOf(h) >= 0) return '';
      return licValorCelda_(o[h]);
    });
    if (indice[nom] !== undefined) {
      var i2 = indice[nom];
      var existente = datos[i2];
      headers.forEach(function (h, c) {
        if (LIC_PROCESOS_SOLO_WEB_.indexOf(h) >= 0) { fila[c] = existente[c]; return; }
        if (LIC_PROCESOS_PROTEGIDOS_.indexOf(h) >= 0 && existente[c] !== '' && existente[c] !== undefined && existente[c] !== null) {
          fila[c] = existente[c];
        }
      });
      hoja.getRange(i2 + 1, 1, 1, headers.length).setValues([fila]);
      actualizados++;
    } else {
      hoja.appendRow(fila);
      nuevos++;
    }
  });
  return { nuevos: nuevos, actualizados: actualizados };
}

var LIC_DOC_SOLO_WEB_ = ['editado_por', 'editado_en'];
var LIC_DOC_PROTEGIDOS_ = ['verificado', 'vence', 'notas'];

function licMergeDocumentos_(lista) {
  var hoja = hojaLic_('documentos');
  var headers = LIC_HOJAS_.documentos;
  var datos = hoja.getDataRange().getValues();
  var indice = {};
  for (var i = 1; i < datos.length; i++) {
    var id = String(datos[i][0] || '');
    if (id) indice[id] = i;
  }
  var nuevos = 0, actualizados = 0;
  (lista || []).forEach(function (o) {
    var id = String(o.id || '');
    if (!id) return;
    var fila = headers.map(function (h) {
      if (LIC_DOC_SOLO_WEB_.indexOf(h) >= 0) return '';
      return licValorCelda_(o[h]);
    });
    if (indice[id] !== undefined) {
      var i2 = indice[id];
      var existente = datos[i2];
      headers.forEach(function (h, c) {
        if (LIC_DOC_SOLO_WEB_.indexOf(h) >= 0) { fila[c] = existente[c]; return; }
        if (LIC_DOC_PROTEGIDOS_.indexOf(h) >= 0 && existente[c] !== '' && existente[c] !== undefined && existente[c] !== null) {
          fila[c] = existente[c];
        }
      });
      hoja.getRange(i2 + 1, 1, 1, headers.length).setValues([fila]);
      actualizados++;
    } else {
      // Documento nuevo del vault. Si no existia, respeta los campos editables
      // que pudiera traer el propio JSON (normalmente vacios la primera vez).
      hoja.appendRow(fila);
      nuevos++;
    }
  });
  return { nuevos: nuevos, actualizados: actualizados };
}

// Merge generico por clave simple o compuesta (p.ej. ['contrato','numero']),
// para hojas cuyos campos solo-web nunca vienen del JSON del vault (a
// diferencia de procesos/documentos, no hace falta lista de "protegidos").
function licClaveFila_(fila, headers, camposClave) {
  return camposClave.map(function (c) {
    var i = headers.indexOf(c);
    return i >= 0 ? String(fila[i]) : '';
  }).join('\u0001');
}

function licClaveObjeto_(o, camposClave) {
  return camposClave.map(function (c) { return o[c] !== undefined && o[c] !== null ? String(o[c]) : ''; }).join('\u0001');
}

function licMergeGenerico_(clave, lista, camposClave, soloWeb) {
  var hoja = hojaLic_(clave);
  var headers = LIC_HOJAS_[clave];
  var datos = hoja.getDataRange().getValues();
  var indice = {};
  for (var i = 1; i < datos.length; i++) {
    var k = licClaveFila_(datos[i], headers, camposClave);
    if (k.replace(/\u0001/g, '')) indice[k] = i;
  }
  var nuevos = 0, actualizados = 0;
  (lista || []).forEach(function (o) {
    var k = licClaveObjeto_(o, camposClave);
    if (!k.replace(/\u0001/g, '')) return;
    var fila = headers.map(function (h) {
      if (soloWeb.indexOf(h) >= 0) return '';
      return licValorCelda_(o[h]);
    });
    if (indice[k] !== undefined) {
      var i2 = indice[k];
      var existente = datos[i2];
      headers.forEach(function (h, c) {
        if (soloWeb.indexOf(h) >= 0) fila[c] = existente[c];
      });
      hoja.getRange(i2 + 1, 1, 1, headers.length).setValues([fila]);
      actualizados++;
    } else {
      hoja.appendRow(fila);
      nuevos++;
    }
  });
  return { nuevos: nuevos, actualizados: actualizados };
}

var LIC_PERSONAL_SOLO_WEB_ = ['empleado_vinculado', 'notas'];
var LIC_CONTRATOS_SOLO_WEB_ = ['estado', 'notas'];
var LIC_FACTURAS_SOLO_WEB_ = ['verificado', 'notas'];

// data = { procesos, postores, acciones, competidores, experiencia, documentos,
//          personal, contratos, facturas, propuestas? }
function licImportar(data) {
  data = data || {};
  return withLock_(function () {
    var resumen = {
      postores: licReemplazarHoja_('postores', data.postores),
      acciones: licReemplazarHoja_('acciones', data.acciones),
      competidores: licReemplazarHoja_('competidores', data.competidores),
      experiencia: licReemplazarHoja_('experiencia', data.experiencia),
      procesos: licMergeProcesos_(data.procesos),
      documentos: licMergeDocumentos_(data.documentos),
      personal: licMergeGenerico_('personal', data.personal, ['dni'], LIC_PERSONAL_SOLO_WEB_),
      contratos: licMergeGenerico_('contratos', data.contratos, ['contrato'], LIC_CONTRATOS_SOLO_WEB_),
      facturas: licMergeGenerico_('facturas', data.facturas, ['contrato', 'numero'], LIC_FACTURAS_SOLO_WEB_)
    };
    // Solo si viene: un import sin propuestas.json no debe vaciar la hoja
    if (data.propuestas) resumen.propuestas = licReemplazarHoja_('propuestas', data.propuestas);
    return { success: true, data: resumen, message: 'Importación de licitaciones completada' };
  });
}

// ============================================================
// LECTURAS (admin)
// ============================================================

function licResumen() {
  var procesos = leerFilasLic_('procesos');
  var presentados = procesos.filter(function (p) {
    return (p.nuestro_monto !== '' && p.nuestro_monto !== undefined && p.nuestro_monto !== null) || p.resultado === 'ganado';
  });
  var ganados = procesos.filter(function (p) { return p.resultado === 'ganado'; });
  var noPresentados = procesos.filter(function (p) { return String(p.resultado || '').indexOf('no-presentamos') === 0; });
  var pctGanados = ganados
    .map(function (p) { return Number(p.nuestro_pct_vr); })
    .filter(function (n) { return !isNaN(n) && n > 0; });

  var contarPor = function (campo, lista) {
    var out = {};
    lista.forEach(function (p) {
      var k = p[campo];
      if (k !== undefined && k !== null && k !== '') out[k] = (out[k] || 0) + 1;
    });
    return out;
  };

  var facturas = leerFilasLic_('facturas');
  var facturadoTotal = facturas.reduce(function (acc, f) { return acc + (Number(f.monto) || 0); }, 0);

  return {
    success: true,
    data: {
      procesos: procesos.length,
      presentados: presentados.length,
      ganados: ganados.length,
      tasa_exito: presentados.length ? Math.round((ganados.length / presentados.length) * 1000) / 10 : null,
      no_presentados: noPresentados.length,
      pct_vr_promedio_ganado: pctGanados.length
        ? Math.round((pctGanados.reduce(function (a, b) { return a + b; }, 0) / pctGanados.length) * 10) / 10
        : null,
      ganados_por_anio: contarPor('anio', ganados),
      procesos_por_anio: contarPor('anio', procesos),
      ganados_por_linea: contarPor('linea', ganados),
      // Personal/contratos/facturas (ver LIC_HOJAS_.personal/contratos/facturas)
      personas: leerFilasLic_('personal').length,
      contratos_con_sustento: leerFilasLic_('contratos').length,
      facturas: facturas.length,
      facturado_total: Math.round(facturadoTotal * 100) / 100
    }
  };
}

function licProcesos() {
  return { success: true, data: leerFilasLic_('procesos') };
}

function licProceso(nom) {
  nom = String(nom || '');
  if (!nom) return { success: false, error: 'Falta la nomenclatura del proceso' };
  var proceso = leerFilasLic_('procesos').filter(function (p) { return p.nomenclatura === nom; })[0];
  if (!proceso) return { success: false, error: 'Proceso no encontrado' };
  var postores = leerFilasLic_('postores')
    .filter(function (p) { return p.nomenclatura === nom; })
    .sort(function (a, b) { return Number(b.pct_vr || 0) - Number(a.pct_vr || 0); });
  var acciones = leerFilasLic_('acciones')
    .filter(function (a) { return a.nomenclatura === nom; })
    .sort(function (a, b) { return Number(a.n) - Number(b.n) || String(a.n).localeCompare(String(b.n)); });
  return { success: true, data: { proceso: proceso, postores: postores, acciones: acciones } };
}

function licCompetidores() {
  var lista = leerFilasLic_('competidores').map(function (c) {
    return Object.assign({}, c, {
      procesos: licParseArray_(c.procesos),
      entidades: licParseArray_(c.entidades),
      ofertas: licParseArray_(c.ofertas)
    });
  });
  return { success: true, data: lista };
}

function licExperiencia() {
  return { success: true, data: leerFilasLic_('experiencia') };
}

// Filtros opcionales: categoria, dni
function licDocumentos(data) {
  data = data || {};
  var lista = leerFilasLic_('documentos');
  if (data.categoria) lista = lista.filter(function (d) { return d.categoria === data.categoria; });
  if (data.dni) lista = lista.filter(function (d) { return String(d.dni) === String(data.dni); });
  lista = lista.map(function (d) { return Object.assign({}, d, { apariciones: licParseArray_(d.apariciones) }); });
  return { success: true, data: lista };
}

function licPropuestas() {
  var lista = leerFilasLic_('propuestas').map(function (p) {
    return Object.assign({}, p, { secciones: licParseArray_(p.secciones) });
  });
  return { success: true, data: lista };
}

function licPersonal() {
  var lista = leerFilasLic_('personal').map(function (p) {
    return Object.assign({}, p, {
      tipos: licParseObjeto_(p.tipos),
      cargos: licParseArray_(p.cargos),
      titulos: licParseArray_(p.titulos)
    });
  });
  return { success: true, data: lista };
}

// Cada contrato trae sus facturas anidadas (ordenadas por fecha).
function licContratos() {
  var facturas = leerFilasLic_('facturas');
  var porContrato = {};
  facturas.forEach(function (f) {
    var k = f.contrato;
    if (!k) return;
    (porContrato[k] || (porContrato[k] = [])).push(f);
  });
  var lista = leerFilasLic_('contratos').map(function (c) {
    var propias = (porContrato[c.contrato] || []).slice().sort(function (a, b) {
      return String(a.fecha || '').localeCompare(String(b.fecha || ''));
    });
    return Object.assign({}, c, { tipos: licParseObjeto_(c.tipos), facturas: propias });
  });
  return { success: true, data: lista };
}

// ============================================================
// ESCRITURAS EDITABLES (admin, con lock + auditoria automatica del router)
// ============================================================

var LIC_CAMPOS_DOC_EDITABLES_ = ['verificado', 'vence', 'notas', 'titulo', 'fecha', 'monto'];

function licActualizarDocumento(data, userId) {
  data = data || {};
  var id = String(data.id || '');
  if (!id) return { success: false, error: 'Falta el id del documento' };
  return withLock_(function () {
    var hoja = hojaLic_('documentos');
    var datos = hoja.getDataRange().getValues();
    var headers = datos[0];
    var fila = -1;
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][0]) === id) { fila = i; break; }
    }
    if (fila < 0) return { success: false, error: 'Documento no encontrado' };

    var cambios = {};
    LIC_CAMPOS_DOC_EDITABLES_.forEach(function (campo) {
      if (data[campo] !== undefined) cambios[campo] = data[campo];
    });
    if (!Object.keys(cambios).length) return { success: false, error: 'Nada que actualizar' };
    cambios.editado_por = userId || '';
    cambios.editado_en = new Date().toISOString();

    Object.keys(cambios).forEach(function (campo) {
      var c = headers.indexOf(campo);
      if (c >= 0) hoja.getRange(fila + 1, c + 1).setValue(cambios[campo]);
    });
    return { success: true, data: Object.assign({ id: id }, cambios), message: 'Documento actualizado' };
  });
}

// Alta manual de un documento desde el panel (no viene del vault).
function licCrearDocumento(data, userId) {
  data = data || {};
  var categoria = String(data.categoria || '').trim();
  var titulo = String(data.titulo || '').trim();
  if (!categoria) return { success: false, error: 'Falta la categoría del documento' };
  if (!titulo && !data.tipo) return { success: false, error: 'Falta el título o el tipo del documento' };

  return withLock_(function () {
    var hoja = hojaLic_('documentos');
    var headers = LIC_HOJAS_.documentos;
    var id = 'DOC-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    var ahora = new Date().toISOString();
    var valores = {
      id: id,
      categoria: categoria,
      tipo: String(data.tipo || ''),
      titulo: titulo,
      entidad: String(data.entidad || ''),
      dni: String(data.dni || ''),
      nombre: String(data.nombre || ''),
      fecha: String(data.fecha || ''),
      periodo_desde: String(data.periodo_desde || ''),
      periodo_hasta: String(data.periodo_hasta || ''),
      monto: data.monto === undefined || data.monto === null || data.monto === '' ? '' : Number(data.monto),
      archivo_vault: String(data.archivo_vault || ''),
      usos: 0,
      verificado: data.verificado || '',
      vence: data.vence || '',
      notas: String(data.notas || ''),
      editado_por: userId || '',
      editado_en: ahora
    };
    var fila = headers.map(function (h) { return valores[h] !== undefined ? valores[h] : ''; });
    hoja.appendRow(fila);
    return { success: true, data: valores, message: 'Documento creado' };
  });
}

var LIC_CAMPOS_PROCESO_EDITABLES_ = ['estado_seguimiento', 'notas'];

function licActualizarProceso(data, userId) {
  data = data || {};
  var nom = String(data.nomenclatura || '');
  if (!nom) return { success: false, error: 'Falta la nomenclatura del proceso' };
  return withLock_(function () {
    var hoja = hojaLic_('procesos');
    var datos = hoja.getDataRange().getValues();
    var headers = datos[0];
    var fila = -1;
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][0]) === nom) { fila = i; break; }
    }
    if (fila < 0) return { success: false, error: 'Proceso no encontrado' };

    var cambios = {};
    LIC_CAMPOS_PROCESO_EDITABLES_.forEach(function (campo) {
      if (data[campo] !== undefined) cambios[campo] = data[campo];
    });
    if (!Object.keys(cambios).length) return { success: false, error: 'Nada que actualizar' };
    cambios.actualizado = new Date().toISOString();

    Object.keys(cambios).forEach(function (campo) {
      var c = headers.indexOf(campo);
      if (c >= 0) hoja.getRange(fila + 1, c + 1).setValue(cambios[campo]);
    });
    // registrado_por no es columna propia: se guarda en el detalle de auditoria (ctx.data)
    return { success: true, data: Object.assign({ nomenclatura: nom, editado_por: userId || '' }, cambios), message: 'Proceso actualizado' };
  });
}

// Helper comun a licActualizarPersona/Contrato/Factura: encuentra la fila por
// una clave simple o compuesta y aplica solo los campos editables permitidos.
function licActualizarFilaLic_(clave, camposClave, valoresClave, campoEditables, data, userId, extraCampos) {
  return withLock_(function () {
    var hoja = hojaLic_(clave);
    var datos = hoja.getDataRange().getValues();
    var headers = datos[0];
    var claveIdx = camposClave.map(function (c) { return headers.indexOf(c); });
    var fila = -1;
    for (var i = 1; i < datos.length; i++) {
      var coincide = claveIdx.every(function (idx, j) { return idx >= 0 && String(datos[i][idx]) === String(valoresClave[j]); });
      if (coincide) { fila = i; break; }
    }
    if (fila < 0) return { success: false, error: 'No se encontró la fila (' + camposClave.join('+') + ')' };

    var cambios = {};
    campoEditables.forEach(function (campo) {
      if (data[campo] !== undefined) cambios[campo] = data[campo];
    });
    if (!Object.keys(cambios).length) return { success: false, error: 'Nada que actualizar' };
    Object.assign(cambios, extraCampos || {});

    Object.keys(cambios).forEach(function (campo) {
      var c = headers.indexOf(campo);
      if (c >= 0) hoja.getRange(fila + 1, c + 1).setValue(cambios[campo]);
    });
    var base = {};
    camposClave.forEach(function (c, j) { base[c] = valoresClave[j]; });
    return { success: true, data: Object.assign(base, cambios), message: 'Actualizado' };
  });
}

function licActualizarPersona(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  if (!dni) return { success: false, error: 'Falta el DNI' };
  return licActualizarFilaLic_('personal', ['dni'], [dni], LIC_PERSONAL_SOLO_WEB_, data, userId);
}

function licActualizarContrato(data, userId) {
  data = data || {};
  var contrato = String(data.contrato || '');
  if (!contrato) return { success: false, error: 'Falta el contrato' };
  return licActualizarFilaLic_('contratos', ['contrato'], [contrato], LIC_CONTRATOS_SOLO_WEB_, data, userId);
}

function licActualizarFactura(data, userId) {
  data = data || {};
  var contrato = String(data.contrato || '');
  var numero = String(data.numero || '');
  if (!contrato || !numero) return { success: false, error: 'Falta el contrato o el número de factura' };
  return licActualizarFilaLic_('facturas', ['contrato', 'numero'], [contrato, numero], LIC_FACTURAS_SOLO_WEB_, data, userId);
}

// Filas editadas desde el panel despues de 'desde' (ISO), para que el vault
// pueda traer de vuelta el seguimiento y el acervo verificado.
function licExportarCambios(data) {
  data = data || {};
  var desde = String(data.desde || '');
  var procesos = leerFilasLic_('procesos')
    .filter(function (p) { return p.actualizado && (!desde || String(p.actualizado) > desde); })
    .map(function (p) {
      return { nomenclatura: p.nomenclatura, estado_seguimiento: p.estado_seguimiento, notas: p.notas, actualizado: p.actualizado };
    });
  var documentos = leerFilasLic_('documentos')
    .filter(function (d) { return d.editado_en && (!desde || String(d.editado_en) > desde); })
    .map(function (d) {
      return {
        id: d.id, verificado: d.verificado, vence: d.vence, notas: d.notas,
        titulo: d.titulo, fecha: d.fecha, monto: d.monto,
        editado_por: d.editado_por, editado_en: d.editado_en
      };
    });
  return { success: true, data: { procesos: procesos, documentos: documentos } };
}

// ============================================================
// DRIVE: PDF individuales, propuestas completas y fotos del personal
//
// Se sube UNA vez desde el vault (docs/PLAN_LICITACIONES_ADMIN.md §10):
//   <DRIVE_FOLDER_ID>/Licitaciones/acervo/...              (= 01_GERENCIA/acervo/...)
//   <DRIVE_FOLDER_ID>/Licitaciones/propuestas/<proceso>/<archivo>.pdf
// licIndexarDrive() recorre la carpeta y guarda ruta→id en lic_archivos; el
// panel traduce la ruta del vault a esa ruta (rutaDrive en licArchivos.ts).
// DriveApp ya estaba autorizado en el backend: no pide permisos nuevos.
// ============================================================

function licCarpetaRaiz_() {
  var base = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var it = base.getFoldersByName('Licitaciones');
  return it.hasNext() ? it.next() : base.createFolder('Licitaciones');
}

function licCarpetaDrive() {
  var raiz = licCarpetaRaiz_();
  return { success: true, data: { id: raiz.getId(), url: raiz.getUrl() } };
}

// Recorre Licitaciones/ completo y reemplaza el índice lic_archivos.
function licIndexarDrive() {
  var raiz = licCarpetaRaiz_();
  var filas = [];
  var ahora = new Date();
  var recorrer = function (carpeta, prefijo) {
    var fs = carpeta.getFiles();
    while (fs.hasNext()) {
      var f = fs.next();
      filas.push({ ruta: prefijo + f.getName(), id: f.getId(), nombre: f.getName(), tamano: f.getSize(), actualizado: ahora });
    }
    var cs = carpeta.getFolders();
    while (cs.hasNext()) {
      var c = cs.next();
      recorrer(c, prefijo + c.getName() + '/');
    }
  };
  recorrer(raiz, '');
  var r = withLock_(function () { return { success: true, n: licReemplazarHoja_('archivos', filas) }; });
  if (!r.success) return r;
  return { success: true, data: { archivos: r.n, carpeta: raiz.getUrl() }, message: 'Índice de Drive actualizado: ' + r.n + ' archivos' };
}

// { ruta: id } del índice, para que el panel arme los enlaces
function licArchivosDrive() {
  var mapa = {};
  leerFilasLic_('archivos').forEach(function (a) { if (a.ruta && a.id) mapa[a.ruta] = String(a.id); });
  return { success: true, data: mapa };
}

// Foto del personal clave. data = { carpeta: 'acervo/personal/<DNI - NOMBRE>', base64, mime }
function licSubirFoto(data) {
  data = data || {};
  var carpetaRel = String(data.carpeta || '');
  if (!/^acervo\/personal\/[^\/]+$/.test(carpetaRel)) return { success: false, error: 'Carpeta de persona no válida' };
  var err = validarArchivoSubido_(data.base64, data.mime, 'imagen');
  if (err) return err;
  var carpeta = licCarpetaRaiz_();
  var partes = carpetaRel.split('/');
  for (var i = 0; i < partes.length; i++) {
    var it = carpeta.getFoldersByName(partes[i]);
    if (!it.hasNext()) return { success: false, error: 'Falta en Drive la carpeta ' + carpetaRel + '. Sube primero el acervo y pulsa "Actualizar índice".' };
    carpeta = it.next();
  }
  var ext = data.mime === 'image/png' ? 'png' : data.mime === 'image/webp' ? 'webp' : 'jpg';
  var ruta = carpetaRel + '/foto.' + ext;
  return withLock_(function () {
    ['foto.jpg', 'foto.png', 'foto.webp'].forEach(function (n) {
      var viejos = carpeta.getFilesByName(n);
      while (viejos.hasNext()) viejos.next().setTrashed(true);
    });
    var archivo = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(data.base64), data.mime, 'foto.' + ext));
    // Actualiza solo esta entrada del índice (sin recorrer todo Drive)
    var hoja = hojaLic_('archivos');
    var datos = hoja.getDataRange().getValues();
    for (var r = datos.length - 1; r >= 1; r--) {
      var ruta0 = String(datos[r][0]);
      if (ruta0.indexOf(carpetaRel + '/foto.') === 0) hoja.deleteRow(r + 1);
    }
    hoja.appendRow([ruta, archivo.getId(), archivo.getName(), archivo.getSize(), new Date()]);
    return { success: true, data: { ruta: ruta, id: archivo.getId() } };
  });
}
