// ============================================================
// LICITACIONES — EDICIÓN DESDE EL PANEL ("fácil de usar, difícil de malograr")
//
// Un solo motor para todas las fichas (procesos, postores, competidores,
// experiencia, documentos, personal, contratos, facturas, servicios):
//   licGuardar   → edita campos o crea una ficha nueva (validando tipos)
//   licArchivar  → archiva / restaura (NUNCA se borra nada)
//   licHistorial → quién cambió qué, con el valor anterior
//   licDeshacer  → vuelve un cambio del historial a su valor anterior
//
// Reglas de convivencia con el vault (licImportar, 16_licitaciones.gs):
//   · Cada campo editado en la web queda en `campos_web` y un import posterior
//     ya no lo pisa: lo que se corrige en la web gana.
//   · Las fichas creadas en la web tienen origen 'web' y un import nunca las borra.
//   · Las claves (DNI, RUC, nomenclatura, n.º de contrato…) no se editan una vez
//     creadas: otras hojas las usan para enlazarse.
// El esquema del panel (src/pages/admin/licitaciones/licEsquemas.ts) debe
// mantener los mismos campos que LIC_ENTIDADES_.
// ============================================================

var LIC_COMUNES_ = ['origen', 'campos_web', 'archivado', 'editado_por', 'editado_en'];

// Tipos: t texto · l texto largo · n número · d fecha (AAAA-MM-DD) · b sí/no
//        j lista (JSON) · o:a|b|c opción cerrada (la primera vacía = "sin definir")
var LIC_ENTIDADES_ = {
  procesos: {
    clave: ['nomenclatura'], obligatorios: ['nomenclatura', 'entidad', 'objeto'],
    campos: {
      codigo_seace: 't', anio: 't', entidad: 't', linea: 't', objeto: 'l', ley: 't', vr: 'n', resultado: 't',
      nuestro_monto: 'n', nuestro_pct_vr: 'n', n_postores: 'n', ganador_ruc: 't', ganador: 't', notas: 'l',
      estado_seguimiento: 'o:|pendiente|en_seguimiento|a_la_espera|cerrado'
    }
  },
  postores: {
    clave: ['nomenclatura', 'ruc'], obligatorios: ['nomenclatura', 'ruc', 'razon_social'],
    campos: { razon_social: 't', consorcio: 't', mype: 't', monto: 'n', pct_vr: 'n', es_telcom: 'b', gano: 'b' }
  },
  competidores: {
    clave: ['ruc'], obligatorios: ['ruc', 'nombre'],
    campos: { nombre: 't', zona: 't', contacto: 't', telefono: 't', fortalezas: 'l', amenaza: 'o:|alta|media|baja', notas: 'l' }
  },
  experiencia: {
    clave: ['proceso'], obligatorios: ['proceso', 'entidad'],
    campos: {
      entidad: 't', objeto: 'l', monto_adjudicado: 'n', monto_facturado: 'n', pct_telcom: 'n', acreditable: 'n',
      estado: 't', fecha_contrato: 't', notas: 'l'
    }
  },
  documentos: {
    clave: ['id'], autoId: 'DOC', obligatorios: ['categoria', 'titulo'],
    campos: {
      categoria: 'o:personal|experiencia|equipos|empresa|tecnico|anexo|otro', tipo: 't', titulo: 't', entidad: 't',
      dni: 't', nombre: 't', fecha: 'd', periodo_desde: 'd', periodo_hasta: 'd', monto: 'n', archivo_vault: 't',
      verificado: 'o:|si|no', vence: 'd', notas: 'l'
    }
  },
  personal: {
    clave: ['dni'], obligatorios: ['dni', 'nombre'],
    campos: {
      nombre: 't', profesion: 't', colegiatura: 't', telefono: 't', correo: 't', disponible: 'o:|si|no',
      empleado_vinculado: 't', notas: 'l'
    }
  },
  contratos: {
    clave: ['contrato'], obligatorios: ['contrato'],
    campos: {
      proceso: 't', monto_contrato: 'n', monto_adjudicado: 'n', pct_telcom: 'n', fecha_inicio: 'd', fecha_fin: 'd',
      estado: 'o:|vigente|culminado|en_liquidacion', notas: 'l'
    }
  },
  facturas: {
    clave: ['contrato', 'numero'], obligatorios: ['contrato', 'numero', 'monto'],
    campos: { fecha: 'd', monto: 'n', verificado: 'o:|si|no', notas: 'l' }
  },
  servicios: {
    clave: ['id'], autoId: 'SRV', obligatorios: ['nombre', 'estado'],
    campos: {
      nombre: 't', proceso: 't', entidad: 't', zona: 't', contrato: 't', fecha_inicio: 'd', fecha_fin: 'd', monto: 'n',
      estado: 'o:por_iniciar|en_ejecucion|suspendido|terminado', responsable: 't', personal: 'j', proyecto_id: 't',
      proximo_hito: 't', fecha_hito: 'd', notas: 'l'
    }
  }
};

// Formatos de clave que se validan al CREAR (no se tocan las que vienen del vault)
var LIC_FORMATO_CLAVE_ = {
  dni: { re: /^\d{8}$/, error: 'El DNI debe tener 8 números' },
  ruc: { re: /^\d{11}$/, error: 'El RUC debe tener 11 números' }
};

var LIC_ETIQUETA_ENTIDAD_ = {
  procesos: 'licitación', postores: 'postor', competidores: 'competidor', experiencia: 'experiencia',
  documentos: 'documento', personal: 'persona', contratos: 'contrato', facturas: 'factura', servicios: 'servicio'
};

function licNombreUsuario_(userId) {
  try {
    var p = perfilUsuario_(userId);
    return (p && (p.nombre || p.email)) || String(userId || '');
  } catch (e) {
    return String(userId || '');
  }
}

function licClaveTexto_(entidad, o) {
  return LIC_ENTIDADES_[entidad].clave.map(function (c) { return String(o[c] === undefined || o[c] === null ? '' : o[c]); }).join(' · ');
}

// Convierte el valor recibido al tipo del campo. Lanza Error con un mensaje
// para personas (se muestra tal cual en el panel).
function licNormalizarValor_(tipo, v, etiqueta) {
  if (v === undefined || v === null) v = '';
  if (tipo === 'n') {
    if (v === '') return '';
    var n = Number(String(v).replace(/[,\s]/g, '').replace(/^S\/\.?/i, ''));
    if (isNaN(n)) throw new Error('"' + etiqueta + '" debe ser un número');
    return n;
  }
  if (tipo === 'd') {
    v = String(v).trim();
    if (v === '') return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('"' + etiqueta + '" debe ser una fecha válida');
    return v;
  }
  if (tipo === 'b') return v === true || v === 'true' || v === 'si' || v === 'Sí' || v === 1 ? true : false;
  if (tipo === 'j') {
    if (Array.isArray(v)) return JSON.stringify(v);
    if (v === '') return '[]';
    try { JSON.parse(v); return String(v); } catch (e) { throw new Error('"' + etiqueta + '" no es una lista válida'); }
  }
  if (tipo.indexOf('o:') === 0) {
    var opciones = tipo.slice(2).split('|');
    v = String(v);
    if (opciones.indexOf(v) < 0) throw new Error('"' + etiqueta + '" no admite el valor ' + v);
    return v;
  }
  v = String(v);
  if (v.length > 5000) throw new Error('"' + etiqueta + '" es demasiado largo');
  return tipo === 'l' ? v : v.trim();
}

// Valor de celda comparable (lo que se guarda en el historial)
function licTextoCelda_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Lima', 'yyyy-MM-dd');
  if (v === undefined || v === null) return '';
  return String(v);
}

function licBuscarFila_(datos, headers, camposClave, valores) {
  var idx = camposClave.map(function (c) { return headers.indexOf(c); });
  for (var i = 1; i < datos.length; i++) {
    var ok = idx.every(function (ix, j) { return ix >= 0 && licTextoCelda_(datos[i][ix]) === String(valores[j]); });
    if (ok) return i;
  }
  return -1;
}

function licRegistrarHistorial_(entradas) {
  if (!entradas.length) return;
  var hoja = hojaLic_('historial');
  var filas = entradas.map(function (e) {
    return LIC_HOJAS_.historial.map(function (h) { return e[h] === undefined ? '' : e[h]; });
  });
  hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, LIC_HOJAS_.historial.length).setValues(filas);
}

function licFilaAObjeto_(headers, fila) {
  var o = {};
  headers.forEach(function (h, i) { o[h] = licTextoCeldaLectura_(fila[i]); });
  o.campos_web = licParseArray_(o.campos_web);
  return o;
}

// data = { entidad, clave: {campo: valor}, cambios: {campo: valor}, crear?: true }
function licGuardar(data, userId) {
  data = data || {};
  var entidad = String(data.entidad || '');
  var esq = LIC_ENTIDADES_[entidad];
  if (!esq) return { success: false, error: 'Tipo de ficha desconocido: ' + entidad };
  var cambiosIn = data.cambios || {};
  var claveIn = data.clave || {};
  var crear = data.crear === true;

  // 1) Validar y normalizar ANTES de tocar la hoja
  var cambios = {};
  try {
    Object.keys(cambiosIn).forEach(function (campo) {
      if (esq.clave.indexOf(campo) >= 0) return; // la clave va aparte
      var tipo = esq.campos[campo];
      if (!tipo) throw new Error('El campo "' + campo + '" no se puede editar');
      cambios[campo] = licNormalizarValor_(tipo, cambiosIn[campo], campo);
    });
  } catch (e) {
    return { success: false, error: e.message };
  }

  return withLock_(function () {
    var hoja = hojaLic_(entidad);
    var headers = LIC_HOJAS_[entidad];
    var datos = hoja.getDataRange().getValues();
    var usuario = licNombreUsuario_(userId);
    var ahora = new Date().toISOString();
    var claveValores;

    if (crear) {
      var nueva = {};
      if (esq.autoId) {
        nueva.id = esq.autoId + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
      } else {
        for (var k = 0; k < esq.clave.length; k++) {
          var c = esq.clave[k];
          var val = String(claveIn[c] === undefined ? '' : claveIn[c]).trim();
          if (!val) return { success: false, error: 'Falta "' + c + '"' };
          if (LIC_FORMATO_CLAVE_[c] && !LIC_FORMATO_CLAVE_[c].re.test(val)) return { success: false, error: LIC_FORMATO_CLAVE_[c].error };
          nueva[c] = val;
        }
      }
      claveValores = esq.clave.map(function (c) { return nueva[c]; });
      if (licBuscarFila_(datos, headers, esq.clave, claveValores) > 0) {
        return { success: false, error: 'Ya existe una ficha con ' + esq.clave.join(' + ') + ' = ' + claveValores.join(' · ') + '. Búscala y edítala en vez de crearla de nuevo.' };
      }
      Object.keys(cambios).forEach(function (c) { nueva[c] = cambios[c]; });
      var faltan = esq.obligatorios.filter(function (c) { return nueva[c] === undefined || nueva[c] === ''; });
      if (faltan.length) return { success: false, error: 'Falta completar: ' + faltan.join(', ') };
      nueva.origen = 'web';
      nueva.campos_web = JSON.stringify(Object.keys(cambios));
      nueva.editado_por = usuario;
      nueva.editado_en = ahora;
      var fila = headers.map(function (h) { return nueva[h] === undefined ? '' : nueva[h]; });
      hoja.getRange(hoja.getLastRow() + 1, 1, 1, headers.length).setNumberFormat('@').setValues([fila]);
      licRegistrarHistorial_([{
        id: 'H-' + Utilities.getUuid().slice(0, 8), fecha: ahora, usuario: usuario, entidad: entidad,
        clave: JSON.stringify(licObjetoClave_(esq, nueva)), campo: '', antes: '', despues: '', accion: 'crear'
      }]);
      return { success: true, data: licFilaAObjeto_(headers, fila), message: 'Listo: ficha creada (' + LIC_ETIQUETA_ENTIDAD_[entidad] + ')' };
    }

    claveValores = esq.clave.map(function (c) { return String(claveIn[c] === undefined ? '' : claveIn[c]); });
    var i = licBuscarFila_(datos, headers, esq.clave, claveValores);
    if (i < 0) return { success: false, error: 'No se encontró la ficha (' + claveValores.join(' · ') + '). Recarga la página.' };
    var filaAct = datos[i].slice();
    while (filaAct.length < headers.length) filaAct.push('');
    var historial = [];
    var camposWeb = licParseArray_(filaAct[headers.indexOf('campos_web')]);
    Object.keys(cambios).forEach(function (campo) {
      var col = headers.indexOf(campo);
      var antes = licTextoCelda_(filaAct[col]);
      var despues = licTextoCelda_(cambios[campo]);
      if (antes === despues) return;
      filaAct[col] = cambios[campo];
      if (camposWeb.indexOf(campo) < 0) camposWeb.push(campo);
      historial.push({
        id: 'H-' + Utilities.getUuid().slice(0, 8), fecha: ahora, usuario: usuario, entidad: entidad,
        clave: JSON.stringify(licObjetoClave_(esq, claveIn)), campo: campo, antes: antes, despues: despues, accion: 'editar'
      });
    });
    if (!historial.length) return { success: true, data: licFilaAObjeto_(headers, filaAct), message: 'No había cambios que guardar' };
    filaAct[headers.indexOf('campos_web')] = JSON.stringify(camposWeb);
    filaAct[headers.indexOf('editado_por')] = usuario;
    filaAct[headers.indexOf('editado_en')] = ahora;
    if (entidad === 'procesos') filaAct[headers.indexOf('actualizado')] = ahora;
    hoja.getRange(i + 1, 1, 1, headers.length).setNumberFormat('@').setValues([filaAct]);
    licRegistrarHistorial_(historial);
    return { success: true, data: licFilaAObjeto_(headers, filaAct), message: historial.length === 1 ? 'Cambio guardado' : historial.length + ' cambios guardados' };
  });
}

function licObjetoClave_(esq, o) {
  var r = {};
  esq.clave.forEach(function (c) { r[c] = String(o[c] === undefined ? '' : o[c]); });
  return r;
}

// data = { entidad, clave, archivar: true|false }
function licArchivar(data, userId) {
  data = data || {};
  var entidad = String(data.entidad || '');
  var esq = LIC_ENTIDADES_[entidad];
  if (!esq) return { success: false, error: 'Tipo de ficha desconocido: ' + entidad };
  var archivar = data.archivar !== false;
  return withLock_(function () {
    var hoja = hojaLic_(entidad);
    var headers = LIC_HOJAS_[entidad];
    var datos = hoja.getDataRange().getValues();
    var valores = esq.clave.map(function (c) { return String((data.clave || {})[c] || ''); });
    var i = licBuscarFila_(datos, headers, esq.clave, valores);
    if (i < 0) return { success: false, error: 'No se encontró la ficha. Recarga la página.' };
    var col = headers.indexOf('archivado');
    var antes = licTextoCelda_(datos[i][col]);
    var ahora = new Date().toISOString();
    var nuevo = archivar ? ahora : '';
    hoja.getRange(i + 1, col + 1).setValue(nuevo);
    licRegistrarHistorial_([{
      id: 'H-' + Utilities.getUuid().slice(0, 8), fecha: ahora, usuario: licNombreUsuario_(userId), entidad: entidad,
      clave: JSON.stringify(licObjetoClave_(esq, data.clave || {})), campo: 'archivado', antes: antes, despues: nuevo,
      accion: archivar ? 'archivar' : 'restaurar'
    }]);
    return { success: true, message: archivar ? 'Archivado. Puedes recuperarlo en "Ver archivados".' : 'Recuperado' };
  });
}

// data = { entidad?, clave?: {..}, limite? } → últimos cambios (más recientes primero)
function licHistorial(data) {
  data = data || {};
  var claveTxt = data.clave ? JSON.stringify(licObjetoClave_(LIC_ENTIDADES_[data.entidad] || { clave: [] }, data.clave)) : '';
  var lista = leerFilasLic_('historial', true).filter(function (h) {
    if (data.entidad && h.entidad !== data.entidad) return false;
    if (claveTxt && h.clave !== claveTxt) return false;
    return true;
  });
  lista.reverse();
  var limite = Math.min(Number(data.limite) || 50, 300);
  return { success: true, data: lista.slice(0, limite) };
}

// data = { id } — vuelve un cambio a su valor anterior, solo si nadie lo tocó después
function licDeshacer(data, userId) {
  data = data || {};
  var h = leerFilasLic_('historial', true).filter(function (x) { return x.id === data.id; })[0];
  if (!h) return { success: false, error: 'No se encontró ese cambio en el historial' };
  var clave = licParseObjeto_(h.clave);
  if (h.accion === 'crear') return licArchivar({ entidad: h.entidad, clave: clave, archivar: true }, userId);
  if (h.accion === 'archivar' || h.accion === 'restaurar') {
    return licArchivar({ entidad: h.entidad, clave: clave, archivar: h.accion === 'restaurar' }, userId);
  }
  var esq = LIC_ENTIDADES_[h.entidad];
  if (!esq) return { success: false, error: 'Tipo de ficha desconocido' };
  var hoja = hojaLic_(h.entidad);
  var headers = LIC_HOJAS_[h.entidad];
  var datos = hoja.getDataRange().getValues();
  var i = licBuscarFila_(datos, headers, esq.clave, esq.clave.map(function (c) { return clave[c]; }));
  if (i < 0) return { success: false, error: 'La ficha ya no existe' };
  var actual = licTextoCelda_(datos[i][headers.indexOf(h.campo)]);
  if (actual !== String(h.despues)) {
    return { success: false, error: 'Ese dato se volvió a cambiar después. Deshaz primero el cambio más reciente.' };
  }
  var cambios = {};
  cambios[h.campo] = h.antes;
  var r = licGuardar({ entidad: h.entidad, clave: clave, cambios: cambios }, userId);
  if (r.success) r.message = 'Cambio deshecho: "' + h.campo + '" volvió a su valor anterior';
  return r;
}

// ── Servicios en ejecución: con lo facturado de su contrato ─────────
function licServicios(data) {
  data = data || {};
  var facturas = leerFilasLic_('facturas');
  var lista = leerFilasLic_('servicios', data.archivados).map(function (s) {
    var propias = s.contrato ? facturas.filter(function (f) { return String(f.contrato) === String(s.contrato); }) : [];
    return Object.assign({}, s, {
      personal: licParseArray_(s.personal),
      facturado: Math.round(propias.reduce(function (a, f) { return a + (Number(f.monto) || 0); }, 0) * 100) / 100,
      n_facturas: propias.length
    });
  });
  return { success: true, data: lista };
}
