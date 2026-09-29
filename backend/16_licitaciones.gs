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
//   - lic_acciones y lic_propuestas se REEMPLAZAN (derivadas del vault, no se editan).
//   - Todas las demás se hacen MERGE por su clave (ver LIC_ENTIDADES_ en
//     17_lic_edicion.gs): el vault actualiza sus campos, EXCEPTO los que se
//     editaron en la web (columna campos_web) y los que el JSON no trae.
//     Nada se borra: las fichas creadas en la web se conservan siempre.
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
  // Servicios en ejecución (solo web: el vault no los trae)
  servicios: [
    'id', 'nombre', 'proceso', 'entidad', 'zona', 'contrato', 'fecha_inicio', 'fecha_fin', 'monto', 'estado',
    'responsable', 'personal', 'proyecto_id', 'proximo_hito', 'fecha_hito', 'notas'
  ],
  // Quién cambió qué (ver licGuardar/licDeshacer)
  historial: ['id', 'fecha', 'usuario', 'entidad', 'clave', 'campo', 'antes', 'despues', 'accion'],
  // Nuestras propuestas completas con su índice (secciones: JSON)
  propuestas: ['nomenclatura', 'anio', 'archivo', 'tamano_mb', 'secciones'],
  // Índice de Drive: ruta relativa dentro de la carpeta "Licitaciones" → id del archivo
  archivos: ['ruta', 'id', 'nombre', 'tamano', 'actualizado']
};

// Campos solo-web agregados después (van AL FINAL: las hojas ya creadas
// reciben la cabecera nueva sin mover columnas) + columnas comunes de edición.
(function () {
  var extra = {
    competidores: ['zona', 'contacto', 'telefono', 'fortalezas', 'amenaza', 'notas'],
    experiencia: ['notas'],
    personal: ['profesion', 'colegiatura', 'telefono', 'correo', 'disponible'],
    contratos: ['fecha_inicio', 'fecha_fin']
  };
  var editables = ['procesos', 'postores', 'competidores', 'experiencia', 'documentos', 'personal', 'contratos', 'facturas', 'servicios'];
  editables.forEach(function (k) {
    (extra[k] || []).concat(['origen', 'campos_web', 'archivado', 'editado_por', 'editado_en']).forEach(function (c) {
      if (LIC_HOJAS_[k].indexOf(c) < 0) LIC_HOJAS_[k].push(c);
    });
  });
})();

function hojaLic_(clave) {
  var headers = LIC_HOJAS_[clave];
  if (!headers) throw new Error('Hoja lic_ desconocida: ' + clave);
  var nombre = 'lic_' + clave;
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    // Texto plano: los DNI/RUC no pierden ceros y las fechas no se corren de día.
    // Los números se siguen guardando como número (se escriben ya convertidos).
    hoja.getRange(1, 1, hoja.getMaxRows(), Math.max(headers.length, hoja.getMaxColumns())).setNumberFormat('@');
    hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
    hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  } else if (hoja.getLastColumn() < headers.length) {
    // Hoja creada con una versión anterior: se agregan las columnas nuevas AL
    // FINAL, solo si las que ya tiene coinciden en orden (si no, se detiene
    // para no escribir datos en la columna equivocada).
    var actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0];
    var enOrden = actuales.every(function (c, i) { return c === headers[i] || (i === 0 && c === '' && actuales.length === 1); });
    if (!enOrden) throw new Error('La hoja ' + nombre + ' tiene columnas en otro orden que el esperado. Revísala antes de seguir.');
    var desde = actuales.length === 1 && actuales[0] === '' ? 0 : actuales.length;
    var faltan = headers.slice(desde);
    hoja.getRange(1, 1, hoja.getMaxRows(), Math.max(headers.length, hoja.getMaxColumns())).setNumberFormat('@');
    hoja.getRange(1, desde + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
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

// Fecha sin hora → 'AAAA-MM-DD' (lo que usa el panel); con hora → ISO.
function licTextoCeldaLectura_(v) {
  if (v instanceof Date) {
    var hm = Utilities.formatDate(v, 'America/Lima', 'HH:mm:ss');
    return Utilities.formatDate(v, 'America/Lima', hm === '00:00:00' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return v;
}

// Lee una hoja lic_* completa como lista de objetos (por cabecera, no por posición).
// Las fichas archivadas no se devuelven salvo conArchivados.
function leerFilasLic_(clave, conArchivados) {
  var hoja = hojaLic_(clave);
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return [];
  var headers = datos[0];
  var iArch = headers.indexOf('archivado');
  return datos.slice(1)
    .filter(function (f) { return f[0] !== '' && (conArchivados || iArch < 0 || !f[iArch]); })
    .map(function (f) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = licTextoCeldaLectura_(f[i]); });
      if (o.campos_web !== undefined) o.campos_web = licParseArray_(o.campos_web);
      return o;
    });
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
  hoja.getRange(2, 1, filas.length, headers.length).setNumberFormat('@').setValues(filas);
  return filas.length;
}

// Merge de una hoja editable con lo que exporta el vault. Por cada fila del JSON:
//   · si ya existe (misma clave): se actualizan los campos que trae el JSON,
//     salvo los editados en la web (campos_web) y las columnas de edición;
//   · si no existe: se agrega con origen 'vault'.
// Las filas que no vienen en el JSON (p. ej. creadas en la web) se conservan.
var LIC_COLS_EDICION_ = ['origen', 'campos_web', 'archivado', 'editado_por', 'editado_en', 'actualizado'];

function licMergeEntidad_(entidad, lista) {
  if (!lista) return { nuevos: 0, actualizados: 0, protegidos: 0 };
  var esq = LIC_ENTIDADES_[entidad];
  var hoja = hojaLic_(entidad);
  var headers = LIC_HOJAS_[entidad];
  var datos = hoja.getDataRange().getValues();
  var idxClave = esq.clave.map(function (c) { return headers.indexOf(c); });
  var claveDe = function (valores) { return valores.join('\u0001'); };
  var indice = {};
  for (var i = 1; i < datos.length; i++) {
    indice[claveDe(idxClave.map(function (ix) { return licTextoCelda_(datos[i][ix]); }))] = i;
  }
  var iCamposWeb = headers.indexOf('campos_web');
  var nuevas = [];
  var nuevos = 0, actualizados = 0, protegidos = 0;
  lista.forEach(function (o) {
    var valoresClave = esq.clave.map(function (c) { return o[c] === undefined || o[c] === null ? '' : String(o[c]); });
    if (!valoresClave.join('')) return;
    var k = claveDe(valoresClave);
    if (indice[k] !== undefined) {
      if (indice[k] < 0) return; // repetida dentro del mismo JSON
      var fila = datos[indice[k]].slice();
      while (fila.length < headers.length) fila.push('');
      var web = licParseArray_(fila[iCamposWeb]);
      headers.forEach(function (h, c) {
        if (o[h] === undefined || LIC_COLS_EDICION_.indexOf(h) >= 0) return;
        if (web.indexOf(h) >= 0) { protegidos++; return; }
        fila[c] = licValorCelda_(o[h]);
      });
      datos[indice[k]] = fila;
      actualizados++;
    } else {
      nuevas.push(headers.map(function (h) { return h === 'origen' ? 'vault' : licValorCelda_(o[h]); }));
      indice[k] = -1;
      nuevos++;
    }
  });
  // Una sola escritura por bloque (más rápido y sin estados a medias)
  if (datos.length > 1) {
    var cuerpo = datos.slice(1).map(function (f) {
      var r = f.slice(0, headers.length);
      while (r.length < headers.length) r.push('');
      return r;
    });
    hoja.getRange(2, 1, cuerpo.length, headers.length).setNumberFormat('@').setValues(cuerpo);
  }
  if (nuevas.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, headers.length).setNumberFormat('@').setValues(nuevas);
  }
  return { nuevos: nuevos, actualizados: actualizados, protegidos: protegidos };
}

// data = { procesos, postores, acciones, competidores, experiencia, documentos,
//          personal, contratos, facturas, propuestas? } — cada lista es opcional:
// la que no viene no se toca.
function licImportar(data) {
  data = data || {};
  return withLock_(function () {
    var resumen = {};
    ['procesos', 'postores', 'competidores', 'experiencia', 'documentos', 'personal', 'contratos', 'facturas'].forEach(function (e) {
      if (data[e]) resumen[e] = licMergeEntidad_(e, data[e]);
    });
    if (data.acciones) resumen.acciones = licReemplazarHoja_('acciones', data.acciones);
    if (data.propuestas) resumen.propuestas = licReemplazarHoja_('propuestas', data.propuestas);
    return { success: true, data: resumen, message: 'Importación completada: lo corregido en la web se respetó' };
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

function licProcesos(data) {
  return { success: true, data: leerFilasLic_('procesos', (data || {}).archivados) };
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

// La ficha del competidor (datos + notas) sale de lic_competidores; sus números
// (procesos, ofertas, ganados, % promedio) se CALCULAN de lic_postores, así un
// postor agregado a mano en una licitación cuenta al instante.
function licCompetidores(data) {
  data = data || {};
  var procesos = {};
  leerFilasLic_('procesos').forEach(function (p) { procesos[p.nomenclatura] = p; });
  var stats = {};
  leerFilasLic_('postores').forEach(function (p) {
    if (licEsVerdadero_(p.es_telcom) || !p.ruc) return;
    var ruc = String(p.ruc);
    var s = stats[ruc] || (stats[ruc] = { nombre: p.razon_social, procesos: [], entidades: [], ofertas: [], ganados: 0 });
    if (s.procesos.indexOf(p.nomenclatura) < 0) s.procesos.push(p.nomenclatura);
    var ent = procesos[p.nomenclatura] && procesos[p.nomenclatura].entidad;
    if (ent && s.entidades.indexOf(ent) < 0) s.entidades.push(ent);
    if (p.monto !== '' && p.monto !== null) {
      s.ofertas.push({ proceso: p.nomenclatura, monto: Number(p.monto) || 0, pct_vr: p.pct_vr === '' || p.pct_vr === null ? null : Number(p.pct_vr) });
    }
    if (licEsVerdadero_(p.gano)) s.ganados++;
  });
  var vistos = {};
  var lista = leerFilasLic_('competidores', data.archivados).map(function (c) {
    vistos[String(c.ruc)] = true;
    return Object.assign({}, c, licStatsCompetidor_(stats[String(c.ruc)], c));
  });
  // Postores que aún no tienen ficha propia: aparecen igual (se les crea al editarlos)
  Object.keys(stats).forEach(function (ruc) {
    if (vistos[ruc]) return;
    lista.push(Object.assign({ ruc: ruc, nombre: stats[ruc].nombre, origen: 'postores', campos_web: [] }, licStatsCompetidor_(stats[ruc], {})));
  });
  return { success: true, data: lista };
}

function licEsVerdadero_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function licStatsCompetidor_(s, c) {
  if (!s) {
    return {
      procesos: licParseArray_(c.procesos), entidades: licParseArray_(c.entidades), ofertas: licParseArray_(c.ofertas),
      n_procesos: licParseArray_(c.procesos).length, ganados: Number(c.ganados) || 0
    };
  }
  var pcts = s.ofertas.map(function (o) { return o.pct_vr; }).filter(function (x) { return x !== null && !isNaN(x); });
  return {
    procesos: s.procesos, n_procesos: s.procesos.length, entidades: s.entidades, ofertas: s.ofertas, ganados: s.ganados,
    pct_vr_promedio: pcts.length ? Math.round(pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length * 10) / 10 : null
  };
}

function licExperiencia(data) {
  return { success: true, data: leerFilasLic_('experiencia', (data || {}).archivados) };
}

// Filtros opcionales: categoria, dni
function licDocumentos(data) {
  data = data || {};
  var lista = leerFilasLic_('documentos', data.archivados);
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

function licPersonal(data) {
  var lista = leerFilasLic_('personal', (data || {}).archivados).map(function (p) {
    return Object.assign({}, p, {
      tipos: licParseObjeto_(p.tipos),
      cargos: licParseArray_(p.cargos),
      titulos: licParseArray_(p.titulos)
    });
  });
  return { success: true, data: lista };
}

// Cada contrato trae sus facturas anidadas (ordenadas por fecha).
function licContratos(data) {
  data = data || {};
  var facturas = leerFilasLic_('facturas', data.archivados);
  var porContrato = {};
  facturas.forEach(function (f) {
    var k = f.contrato;
    if (!k) return;
    (porContrato[k] || (porContrato[k] = [])).push(f);
  });
  var lista = leerFilasLic_('contratos', data.archivados).map(function (c) {
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

// Atajos compatibles con las pantallas anteriores: todos pasan por licGuardar
// (misma validación, historial y protección frente al import).
function licAtajo_(entidad, data, userId) {
  data = data || {};
  var esq = LIC_ENTIDADES_[entidad];
  var clave = {};
  esq.clave.forEach(function (c) { clave[c] = data[c]; });
  var cambios = {};
  Object.keys(esq.campos).forEach(function (c) { if (data[c] !== undefined) cambios[c] = data[c]; });
  return licGuardar({ entidad: entidad, clave: clave, cambios: cambios }, userId);
}
function licActualizarDocumento(data, userId) { return licAtajo_('documentos', data, userId); }
function licActualizarProceso(data, userId) { return licAtajo_('procesos', data, userId); }
function licActualizarPersona(data, userId) { return licAtajo_('personal', data, userId); }
function licActualizarContrato(data, userId) { return licAtajo_('contratos', data, userId); }
function licActualizarFactura(data, userId) { return licAtajo_('facturas', data, userId); }
function licCrearDocumento(data, userId) {
  data = data || {};
  var cambios = {};
  Object.keys(LIC_ENTIDADES_.documentos.campos).forEach(function (c) { if (data[c] !== undefined && data[c] !== '') cambios[c] = data[c]; });
  return licGuardar({ entidad: 'documentos', crear: true, clave: {}, cambios: cambios }, userId);
}

// Todo lo editado en la web después de 'desde' (ISO), para llevarlo de vuelta
// al vault: por ficha, solo los campos que se cambiaron en la web.
function licExportarCambios(data) {
  data = data || {};
  var desde = String(data.desde || '');
  var out = {};
  Object.keys(LIC_ENTIDADES_).forEach(function (e) {
    var esq = LIC_ENTIDADES_[e];
    out[e] = leerFilasLic_(e, true)
      .filter(function (f) { return f.editado_en && (!desde || String(f.editado_en) > desde); })
      .map(function (f) {
        var r = {};
        esq.clave.forEach(function (c) { r[c] = f[c]; });
        (f.origen === 'web' ? Object.keys(esq.campos) : (f.campos_web || [])).forEach(function (c) { r[c] = f[c]; });
        r.origen = f.origen; r.archivado = f.archivado; r.editado_por = f.editado_por; r.editado_en = f.editado_en;
        return r;
      });
  });
  return { success: true, data: out };
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

// PDF nuevo subido desde el panel (documento que no vino del vault).
// data = { categoria, nombre, base64, mime } → queda en
// Licitaciones/acervo/<categoria>/_web/<nombre> y se agrega al índice.
// Devuelve archivo_vault con la MISMA forma que usa el vault
// ('01_GERENCIA/acervo/...'), para que el panel lo abra igual que los demás.
function licSubirDocumento(data) {
  data = data || {};
  var categoria = String(data.categoria || '');
  if (!/^(personal|experiencia|equipos|empresa|tecnico|otro)$/.test(categoria)) return { success: false, error: 'Elige de qué tipo es el documento' };
  if (data.mime !== 'application/pdf') return { success: false, error: 'El archivo debe ser PDF' };
  var err = validarArchivoSubido_(data.base64, data.mime, 'documento');
  if (err) return err;
  var nombre = String(data.nombre || 'documento.pdf').replace(/[\\\/:*?"<>|#%]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!/\.pdf$/i.test(nombre)) nombre += '.pdf';
  nombre = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd-HHmmss') + ' ' + nombre;
  var carpeta = licCarpetaRaiz_();
  ['acervo', categoria, '_web'].forEach(function (parte) {
    var it = carpeta.getFoldersByName(parte);
    carpeta = it.hasNext() ? it.next() : carpeta.createFolder(parte);
  });
  var archivo = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(data.base64), 'application/pdf', nombre));
  var ruta = 'acervo/' + categoria + '/_web/' + nombre;
  withLock_(function () {
    hojaLic_('archivos').appendRow([ruta, archivo.getId(), nombre, archivo.getSize(), new Date()]);
    return { success: true };
  });
  return { success: true, data: { archivo_vault: '01_GERENCIA/' + ruta, id: archivo.getId() } };
}

// Ejecutar desde el editor (una vez, tras publicar una versión que agrega
// columnas o hojas lic_*): crea las hojas que falten y completa cabeceras.
// Es seguro repetirlo: no toca datos.
function licPrepararHojas() {
  var hechas = Object.keys(LIC_HOJAS_).map(function (k) { hojaLic_(k); return 'lic_' + k; });
  Logger.log('Hojas de Licitaciones listas: ' + hechas.join(', '));
  return hechas;
}
