// ============================================================
// RR.HH. — ficha del trabajador: documentos (CV, contrato, DNI…), foto,
// cambio de cargo/sede, cese y reactivación, todo con historial.
// Fuente modular del backend GAS. NO editar appscript.js a mano.
//
// Documentos en Drive (mismo DRIVE_FOLDER_ID del backend, ya autorizado):
//   <DRIVE_FOLDER_ID>/Personal/<DNI - APELLIDOS NOMBRES>/<tipo>/<archivo>
//   <DRIVE_FOLDER_ID>/Personal/<DNI - …>/foto.jpg
// Nada se borra: "Quitar" mueve el archivo a <persona>/_archivados/.
// ============================================================

var RRHH_TIPOS_ = { cv: 'CV', contrato: 'Contrato', dni: 'DNI', certificados: 'Certificados', otros: 'Otros' };

function rrhhCarpetaRaiz_() {
  var base = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var it = base.getFoldersByName('Personal');
  return it.hasNext() ? it.next() : base.createFolder('Personal');
}

function rrhhTrabajador_(dni) {
  return leerRosterReal_(true).filter(function (t) { return t.dni === String(dni); })[0] || null;
}

// Carpeta de la persona: se busca por DNI al inicio del nombre (el nombre
// puede corregirse después sin perder los archivos).
function rrhhCarpetaPersona_(dni, crear) {
  var raiz = rrhhCarpetaRaiz_();
  var it = raiz.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf(String(dni)) === 0) return f;
  }
  if (!crear) return null;
  var t = rrhhTrabajador_(dni);
  var nombre = t ? String(t.nombre).replace(/,/g, '').toUpperCase() : '';
  return raiz.createFolder(dni + (nombre ? ' - ' + nombre : ''));
}

function rrhhSubcarpeta_(carpeta, nombre, crear) {
  var it = carpeta.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return crear ? carpeta.createFolder(nombre) : null;
}

// Historial por nombre de columna (hoja historial_empleados)
function rrhhHistorial_(dni, tipo, antes, despues, descripcion, userId) {
  var t = tablaPorCabecera_('historial_empleados');
  var valores = {
    id: generateSequentialId('historial_empleados', 'HIST'),
    empleado_id: 'SUE-' + dni, tipo: tipo,
    ubicacion_anterior: antes || '', ubicacion_nueva: despues || '',
    descripcion: descripcion || '', fecha: new Date(),
    usuario: userId ? licNombreUsuario_(userId) : 'sistema'
  };
  t.hoja.appendRow(t.datos[0].map(function (c) { return valores[c] !== undefined ? valores[c] : ''; }));
}

function rrhhInvalidar_() {
  try { CacheService.getScriptCache().remove('rrhh:resumen'); } catch (e) {}
}

function rrhhListarDocs_(carpeta) {
  var docs = [];
  var foto = null;
  var fs = carpeta.getFiles();
  while (fs.hasNext()) {
    var f = fs.next();
    if (/^foto\.(jpg|png|webp)$/i.test(f.getName())) foto = f.getId();
  }
  Object.keys(RRHH_TIPOS_).forEach(function (tipo) {
    var sub = rrhhSubcarpeta_(carpeta, tipo, false);
    if (!sub) return;
    var it = sub.getFiles();
    while (it.hasNext()) {
      var a = it.next();
      docs.push({ id: a.getId(), nombre: a.getName(), tipo: tipo, tamano: a.getSize(), fecha: Utilities.formatDate(a.getDateCreated(), 'America/Lima', 'yyyy-MM-dd') });
    }
  });
  return { docs: docs, foto: foto };
}

// Ficha completa: datos del roster + proyectos + historial + documentos
function rrhhFicha(data) {
  var dni = String((data || {}).dni || '');
  if (!/^\d{8}$/.test(dni)) return { success: false, error: 'DNI inválido' };
  var emp = getEmployeeById('SUE-' + dni);
  if (!emp.success) return emp;
  var carpeta = rrhhCarpetaPersona_(dni, false);
  var l = carpeta ? rrhhListarDocs_(carpeta) : { docs: [], foto: null };
  var t = rrhhTrabajador_(dni) || {};
  return {
    success: true,
    data: Object.assign({}, emp.data, {
      fecha_inicio: t.fecha_inicio || '', fecha_fin: t.fecha_fin || '',
      documentos: l.docs, foto: l.foto, carpeta_url: carpeta ? carpeta.getUrl() : ''
    })
  };
}

// Resumen para la grilla: { dni: { cv, contrato, dni, certificados, otros, foto } }
function rrhhResumen() {
  var cache = CacheService.getScriptCache();
  try { var c = cache.get('rrhh:resumen'); if (c) return { success: true, data: JSON.parse(c) }; } catch (e) {}
  var out = {};
  var it = rrhhCarpetaRaiz_().getFolders();
  while (it.hasNext()) {
    var f = it.next();
    var dni = (f.getName().match(/^(\d{8})/) || [])[1];
    if (!dni) continue;
    var l = rrhhListarDocs_(f);
    var r = { foto: l.foto };
    Object.keys(RRHH_TIPOS_).forEach(function (tp) { r[tp] = 0; });
    l.docs.forEach(function (d) { r[d.tipo]++; });
    out[dni] = r;
  }
  try { cache.put('rrhh:resumen', JSON.stringify(out), 600); } catch (e) {}
  return { success: true, data: out };
}

// data = { dni, tipo, nombre, base64, mime }
function rrhhSubirDocumento(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  if (!/^\d{8}$/.test(dni) || !rrhhTrabajador_(dni)) return { success: false, error: 'Trabajador no encontrado' };
  if (!RRHH_TIPOS_[data.tipo]) return { success: false, error: 'Elige qué documento es (CV, contrato, DNI…)' };
  if (['application/pdf', 'image/jpeg', 'image/png'].indexOf(data.mime) < 0) return { success: false, error: 'El archivo debe ser PDF, JPG o PNG' };
  var err = validarArchivoSubido_(data.base64, data.mime, 'documento');
  if (err) return err;
  var nombre = String(data.nombre || RRHH_TIPOS_[data.tipo]).replace(/[\\\/:*?"<>|#%]/g, '').trim().slice(0, 120) || RRHH_TIPOS_[data.tipo];
  var carpeta = rrhhSubcarpeta_(rrhhCarpetaPersona_(dni, true), data.tipo, true);
  var archivo = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(data.base64), data.mime, nombre));
  rrhhHistorial_(dni, 'documento', '', RRHH_TIPOS_[data.tipo], 'Subió ' + nombre, userId);
  rrhhInvalidar_();
  return { success: true, data: { id: archivo.getId(), nombre: nombre }, message: RRHH_TIPOS_[data.tipo] + ' guardado' };
}

// data = { dni, id } → mueve el archivo a _archivados (no se borra)
function rrhhArchivarDocumento(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  var carpeta = rrhhCarpetaPersona_(dni, false);
  if (!carpeta) return { success: false, error: 'El trabajador no tiene carpeta' };
  var archivo;
  try { archivo = DriveApp.getFileById(String(data.id)); } catch (e) { return { success: false, error: 'Archivo no encontrado' }; }
  var padres = archivo.getParents();
  var dentro = false;
  while (padres.hasNext()) {
    var p = padres.next();
    var pp = p.getParents();
    if (pp.hasNext() && pp.next().getId() === carpeta.getId()) dentro = true;
  }
  if (!dentro) return { success: false, error: 'Ese archivo no es de este trabajador' };
  archivo.moveTo(rrhhSubcarpeta_(carpeta, '_archivados', true));
  rrhhHistorial_(dni, 'documento', archivo.getName(), '', 'Quitó (archivado) ' + archivo.getName(), userId);
  rrhhInvalidar_();
  return { success: true, message: 'Documento quitado. Queda guardado en la carpeta _archivados del trabajador.' };
}

// data = { dni, base64, mime }
function rrhhSubirFoto(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  if (!/^\d{8}$/.test(dni) || !rrhhTrabajador_(dni)) return { success: false, error: 'Trabajador no encontrado' };
  var err = validarArchivoSubido_(data.base64, data.mime, 'imagen');
  if (err) return err;
  var carpeta = rrhhCarpetaPersona_(dni, true);
  var it = carpeta.getFiles();
  while (it.hasNext()) { var f = it.next(); if (/^foto\./i.test(f.getName())) f.setTrashed(true); }
  var ext = data.mime === 'image/png' ? 'png' : data.mime === 'image/webp' ? 'webp' : 'jpg';
  var foto = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(data.base64), data.mime, 'foto.' + ext));
  rrhhInvalidar_();
  return { success: true, data: { id: foto.getId() }, message: 'Foto actualizada' };
}

// data = { dni, cargo, motivo } — cambio de cargo con historial
function rrhhCambiarCargo(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  var cargo = String(data.cargo || '').trim();
  var t = rrhhTrabajador_(dni);
  if (!t) return { success: false, error: 'Trabajador no encontrado' };
  if (!cargo) return { success: false, error: 'Escribe el nuevo cargo' };
  if (cargo === t.cargo) return { success: false, error: 'Ya tiene ese cargo' };
  var r = updateEmployee({ id: 'SUE-' + dni, position: cargo });
  if (!r.success) return r;
  rrhhHistorial_(dni, 'cargo', t.cargo, cargo, data.motivo || 'Cambio de cargo', userId);
  return { success: true, message: 'Cargo cambiado: ' + t.cargo + ' → ' + cargo };
}

// data = { dni, sede, motivo }
function rrhhCambiarSede(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  var sede = String(data.sede || '').trim();
  var t = rrhhTrabajador_(dni);
  if (!t) return { success: false, error: 'Trabajador no encontrado' };
  if (!sede) return { success: false, error: 'Elige la nueva sede' };
  if (sede === t.sede) return { success: false, error: 'Ya está en esa sede' };
  var r = updateEmployee({ id: 'SUE-' + dni, city: sede });
  if (!r.success) return r;
  rrhhHistorial_(dni, 'sede', t.sede, sede, data.motivo || 'Cambio de sede', userId);
  return { success: true, message: 'Sede cambiada: ' + (t.sede || '—') + ' → ' + sede };
}

// data = { dni, fecha_fin, motivo } — cese: sale del kiosko y de sus proyectos
function rrhhCesar(data, userId) {
  data = data || {};
  var dni = String(data.dni || '');
  if (!String(data.motivo || '').trim()) return { success: false, error: 'Escribe el motivo del cese' };
  var r = darDeBajaTrabajador({ dni: dni, fecha_fin: data.fecha_fin });
  if (!r.success) return r;
  closeEmployeeAssignments('SUE-' + dni);
  rrhhHistorial_(dni, 'cese', '', r.data.fecha_fin, data.motivo, userId);
  return r;
}

function rrhhReactivar(data, userId) {
  data = data || {};
  var r = reactivarTrabajador({ dni: data.dni });
  if (!r.success) return r;
  rrhhHistorial_(String(data.dni), 'reactivacion', '', '', data.motivo || 'Reactivado', userId);
  return r;
}
