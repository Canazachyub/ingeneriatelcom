// ============================================================
// LICITACIONES — servicio ↔ proyecto (asistencia) y "Armar propuesta" (ZIP)
// Fuente modular del backend GAS. NO editar appscript.js a mano.
// ============================================================

// Asistencia del personal de un servicio, leída del proyecto enlazado
// (Gestión > Proyectos: asignaciones activas + marcas de asistencias_v2).
// data = { proyecto_id } → { proyecto, hoy, trabajadores: [{dni, nombre, cargo,
//   entrada_hoy, salida_hoy, dias_mes, ultima}] }
function licAsistenciaServicio(data) {
  data = data || {};
  var id = String(data.proyecto_id || '');
  if (!id) return { success: false, error: 'El servicio no tiene proyecto enlazado' };
  var pr = getProjectById(id);
  if (!pr || !pr.success || !pr.data) return { success: false, error: 'No se encontró el proyecto ' + id + ' en Gestión > Proyectos' };

  var tA = tablaPorCabecera_('asignaciones');
  var asig = tA.datos.slice(1)
    .filter(function (r) { return String(r[tA.h.projectId]) === id && asignacionActiva_(tA, r); });
  var roster = {};
  leerRosterReal_(true).forEach(function (t) { roster[String(t.dni)] = t; });
  var dnis = [];
  asig.forEach(function (r) {
    var dni = dniDesdeIdRoster_(r[tA.h.employeeId]);
    if (dni && dnis.indexOf(dni) < 0) dnis.push(dni);
  });

  var hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
  var desde = hoy.slice(0, 8) + '01';
  var marcas = dnis.length ? (getAsistenciasV2({ desde: desde }).data || []).filter(function (m) { return dnis.indexOf(String(m.dni)) >= 0; }) : [];
  var trabajadores = dnis.map(function (dni) {
    var propias = marcas.filter(function (m) { return String(m.dni) === dni; });
    var dias = {};
    propias.forEach(function (m) { if (m.evento === 'entrada') dias[m.fecha] = true; });
    var deHoy = propias.filter(function (m) { return m.fecha === hoy; });
    var entrada = deHoy.filter(function (m) { return m.evento === 'entrada'; })[0];
    var salida = deHoy.filter(function (m) { return m.evento === 'salida'; }).slice(-1)[0];
    var ultima = propias.slice().sort(function (a, b) { return String(a.fecha + a.hora).localeCompare(String(b.fecha + b.hora)); }).slice(-1)[0];
    var t = roster[dni] || {};
    return {
      dni: dni, nombre: t.nombre || dni, cargo: t.cargo || '', activo: t.activo !== false,
      entrada_hoy: entrada ? String(entrada.hora).slice(0, 5) : '',
      salida_hoy: salida ? String(salida.hora).slice(0, 5) : '',
      dias_mes: Object.keys(dias).length,
      ultima: ultima ? ultima.fecha + ' ' + String(ultima.hora).slice(0, 5) + ' (' + ultima.evento + ')' : ''
    };
  });
  var p = pr.data;
  return {
    success: true,
    data: { proyecto: { id: id, nombre: p.nombre || p.name || id, ciudad: p.ciudad || '' }, hoy: hoy, desde: desde, trabajadores: trabajadores }
  };
}

// ── Armar propuesta: ZIP con los PDF elegidos, en carpetas ────────────
// data = { nombre: 'CP SER-SM-21-2026-ELSE-1', archivos: [{ ruta, destino }] }
//   ruta    = archivo_vault del documento ('01_GERENCIA/acervo/...')
//   destino = ruta dentro del ZIP ('3 Personal clave/CANAZA WILLY/CV.pdf')
// Se guarda en Licitaciones/_zips/ (se limpian los de más de 7 días) y se
// devuelve el enlace de descarga.
var LIC_ZIP_MAX_BYTES_ = 45 * 1024 * 1024; // Apps Script no maneja blobs de más de ~50 MB

function licRutaDrive_(ruta) {
  var r = String(ruta || '').replace(/\\/g, '/');
  var m = r.match(/^01_GERENCIA\/acervo\/(.+)$/);
  if (m) return 'acervo/' + m[1];
  m = r.match(/^01_GERENCIA\/experiencia\/_bruto\/([^\/]+)\/ofertas\/[^\/]+\/([^\/]+)$/);
  if (m) return 'propuestas/' + m[1] + '/' + m[2];
  return r;
}

function licArmarZip(data) {
  data = data || {};
  var archivos = data.archivos || [];
  if (!archivos.length) return { success: false, error: 'No elegiste ningún documento' };
  if (archivos.length > 300) return { success: false, error: 'Son demasiados documentos para un solo ZIP (máx. 300)' };
  var indice = licArchivosDrive().data;
  var blobs = [], faltan = [], total = 0, usados = {};
  for (var i = 0; i < archivos.length; i++) {
    var a = archivos[i];
    var id = indice[licRutaDrive_(a.ruta)];
    if (!id) { faltan.push(a.destino || a.ruta); continue; }
    var destino = String(a.destino || '').replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\//, '').slice(0, 200) || ('documento-' + i + '.pdf');
    if (usados[destino]) { var n = 2; while (usados[destino.replace(/\.pdf$/i, ' (' + n + ').pdf')]) n++; destino = destino.replace(/\.pdf$/i, ' (' + n + ').pdf'); }
    usados[destino] = true;
    var archivo = DriveApp.getFileById(id);
    total += archivo.getSize();
    if (total > LIC_ZIP_MAX_BYTES_) return { success: false, error: 'Los documentos elegidos pasan de 45 MB. Quita algunos o arma la propuesta en dos partes.' };
    blobs.push(archivo.getBlob().setName(destino));
  }
  if (!blobs.length) return { success: false, error: 'Ninguno de los documentos elegidos está en Drive todavía. Pulsa "Actualizar" en Documentos.' };

  var raiz = licCarpetaRaiz_();
  var it = raiz.getFoldersByName('_zips');
  var carpeta = it.hasNext() ? it.next() : raiz.createFolder('_zips');
  var limite = Date.now() - 7 * 86400000;
  var viejos = carpeta.getFiles();
  while (viejos.hasNext()) { var v = viejos.next(); if (v.getDateCreated().getTime() < limite) v.setTrashed(true); }

  var nombre = String(data.nombre || 'Propuesta').replace(/[\\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Propuesta';
  nombre += ' - ' + Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd HHmm') + '.zip';
  var zip = carpeta.createFile(Utilities.zip(blobs, nombre));
  return {
    success: true,
    data: { url: 'https://drive.google.com/uc?export=download&id=' + zip.getId(), nombre: nombre, documentos: blobs.length, faltan: faltan, mb: Math.round(total / 1048576 * 10) / 10 },
    message: 'ZIP listo con ' + blobs.length + ' documentos'
  };
}
