// ============================================================
// PROYECTOS — proyectos y asignaciones
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
//
// Todas las lecturas/escrituras van POR NOMBRE DE COLUMNA (cabecera de la
// hoja), no por posición: la versión anterior asumía otro orden de columnas
// y escribía los datos corridos (nombre en descripción, estado en ciudad…).
// Columnas reales:
//   proyectos:    id, nombre, descripcion, cliente, ciudad, estado, fecha_inicio,
//                 fecha_fin, presupuesto, createdAt, updatedAt
//   asignaciones: id, employeeId, employeeName, projectId, projectName, role,
//                 startDate, endDate, status (active|completed), createdAt
// ============================================================

var ESTADOS_PROYECTO_ = {
  planning: 'planning', planificacion: 'planning',
  in_progress: 'in_progress', activo: 'in_progress', en_progreso: 'in_progress',
  on_hold: 'on_hold', en_espera: 'on_hold', pausado: 'on_hold',
  completed: 'completed', cerrado: 'completed', completado: 'completed', finalizado: 'completed'
};

// { hoja, datos, h: {columna: índice} } — h acepta alias (fecha_fin_estimada → fecha_fin)
function tablaPorCabecera_(nombreHoja) {
  var hoja = SpreadsheetApp.openById(SHEET_ID).getSheetByName(nombreHoja);
  var datos = hoja.getDataRange().getValues();
  var h = {};
  (datos[0] || []).forEach(function (c, i) { if (c !== '' && h[c] === undefined) h[c] = i; });
  return { hoja: hoja, datos: datos, h: h };
}

function asignacionActiva_(t, fila) {
  var s = String(fila[t.h.status] || '').toLowerCase();
  return s === 'active' || s === 'activa';
}

// ============================================
// GESTION DE PROYECTOS
// ============================================
function getProjects() {
  var t = tablaPorCabecera_('proyectos');
  var headers = t.datos[0];
  var conteo = conteoAsignacionesActivas_();
  var projects = t.datos.slice(1)
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) {
      var project = rowToObject(headers, row);
      project.empleados_asignados = conteo[project.id] || 0;
      return project;
    });
  return { success: true, data: projects };
}

function getActiveProjects() {
  var todos = getProjects().data;
  return { success: true, data: todos.filter(function (p) { return ESTADOS_PROYECTO_[String(p.estado || '').toLowerCase()] === 'in_progress'; }) };
}

function getProjectById(id) {
  var t = tablaPorCabecera_('proyectos');
  var row = t.datos.slice(1).filter(function (r) { return String(r[0]) === String(id); })[0];
  if (!row) return { success: false, error: 'Proyecto no encontrado' };
  var proj = rowToObject(t.datos[0], row);
  proj.empleados = getEmployeesByProject(id).data;
  return { success: true, data: proj };
}

// data: nombre, descripcion, cliente, ciudad, fecha_inicio, fecha_fin(_estimada), presupuesto, estado?
function createProject(data) {
  data = data || {};
  if (!String(data.nombre || '').trim()) return { success: false, error: 'Falta el nombre del proyecto' };
  return withLock_(function () {
    var t = tablaPorCabecera_('proyectos');
    var id = generateSequentialId('proyectos', 'PROY');
    var ahora = new Date();
    var valores = {
      id: id,
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      cliente: data.cliente || '',
      ciudad: data.ciudad || '',
      estado: ESTADOS_PROYECTO_[String(data.estado || '').toLowerCase()] || 'in_progress',
      fecha_inicio: data.fecha_inicio || '',
      fecha_fin: data.fecha_fin || data.fecha_fin_estimada || '',
      presupuesto: data.presupuesto || '',
      createdAt: ahora,
      updatedAt: ahora
    };
    var fila = t.datos[0].map(function (c) { return valores[c] !== undefined ? valores[c] : ''; });
    t.hoja.appendRow(fila);
    return { success: true, data: { id: id }, message: 'Proyecto creado' };
  });
}

function updateProject(data) {
  data = data || {};
  return withLock_(function () {
    var t = tablaPorCabecera_('proyectos');
    for (var i = 1; i < t.datos.length; i++) {
      if (String(t.datos[i][0]) !== String(data.id)) continue;
      var cambios = {
        nombre: data.nombre, descripcion: data.descripcion, cliente: data.cliente, ciudad: data.ciudad,
        fecha_inicio: data.fecha_inicio, fecha_fin: data.fecha_fin || data.fecha_fin_estimada, presupuesto: data.presupuesto
      };
      if (data.estado) {
        var est = ESTADOS_PROYECTO_[String(data.estado).toLowerCase()];
        if (!est) return { success: false, error: 'Estado no válido: ' + data.estado };
        cambios.estado = est;
      }
      Object.keys(cambios).forEach(function (c) {
        if (cambios[c] === undefined || cambios[c] === null || cambios[c] === '') return;
        if (t.h[c] !== undefined) t.hoja.getRange(i + 1, t.h[c] + 1).setValue(cambios[c]);
      });
      if (t.h.updatedAt !== undefined) t.hoja.getRange(i + 1, t.h.updatedAt + 1).setValue(new Date());
      return { success: true, message: 'Proyecto actualizado' };
    }
    return { success: false, error: 'Proyecto no encontrado' };
  });
}

// Borra un proyecto y sus asignaciones. Se niega si tiene trabajadores REALES
// (roster de sueldos: SUE-<dni>) con asignación activa, para no perder la
// asistencia por proyecto de nadie: en ese caso, marcarlo como Completado.
function deleteProject(data) {
  data = data || {};
  var id = String(data.id || '');
  if (!id) return { success: false, error: 'Falta el proyecto' };
  return withLock_(function () {
    var a = tablaPorCabecera_('asignaciones');
    var reales = a.datos.slice(1).filter(function (r) {
      return String(r[a.h.projectId]) === id && asignacionActiva_(a, r) && dniDesdeIdRoster_(r[a.h.employeeId]);
    });
    if (reales.length) {
      return { success: false, error: 'Este proyecto tiene ' + reales.length + ' trabajador(es) asignados. Quítalos del equipo o márcalo como Completado en vez de borrarlo.' };
    }
    var p = tablaPorCabecera_('proyectos');
    var fila = -1;
    for (var i = 1; i < p.datos.length; i++) { if (String(p.datos[i][0]) === id) { fila = i; break; } }
    if (fila < 0) return { success: false, error: 'Proyecto no encontrado' };
    var borradas = 0;
    for (var j = a.datos.length - 1; j >= 1; j--) {
      if (String(a.datos[j][a.h.projectId]) === id) { a.hoja.deleteRow(j + 1); borradas++; }
    }
    p.hoja.deleteRow(fila + 1);
    return { success: true, message: 'Proyecto eliminado' + (borradas ? ' (con ' + borradas + ' asignaciones de ejemplo)' : '') };
  });
}

function closeProject(data) {
  var r = updateProject({ id: data.projectId || data.id, estado: 'completed' });
  if (r.success) closeProjectAssignments(data.projectId || data.id);
  return r.success ? { success: true, message: 'Proyecto cerrado' } : r;
}

function conteoAsignacionesActivas_() {
  var a = tablaPorCabecera_('asignaciones');
  var c = {};
  a.datos.slice(1).forEach(function (r) {
    if (asignacionActiva_(a, r)) c[r[a.h.projectId]] = (c[r[a.h.projectId]] || 0) + 1;
  });
  return c;
}

function countProjectEmployees(projectId) {
  return conteoAsignacionesActivas_()[projectId] || 0;
}

// ============================================
// GESTION DE ASIGNACIONES
// ============================================
function getAssignments() {
  var a = tablaPorCabecera_('asignaciones');
  var assignments = a.datos.slice(1)
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) { return rowToObject(a.datos[0], row); });
  return { success: true, data: assignments };
}

function getAssignmentsByEmployee(employeeId) {
  var a = tablaPorCabecera_('asignaciones');
  var assignments = a.datos.slice(1)
    .filter(function (row) { return String(row[a.h.employeeId]) === String(employeeId); })
    .map(function (row) { return rowToObject(a.datos[0], row); });
  return { success: true, data: assignments };
}

// data: projectId, employeeId (SUE-<dni>), role|rol
function assignEmployeeToProject(data) {
  data = data || {};
  if (!data.projectId || !data.employeeId) return { success: false, error: 'Falta el proyecto o el empleado' };
  return withLock_(function () {
    var a = tablaPorCabecera_('asignaciones');
    var existe = a.datos.slice(1).some(function (r) {
      return String(r[a.h.projectId]) === String(data.projectId) && String(r[a.h.employeeId]) === String(data.employeeId) && asignacionActiva_(a, r);
    });
    if (existe) return { success: false, error: 'El empleado ya esta asignado a este proyecto' };

    var proyecto = getProjectById(data.projectId);
    if (!proyecto.success) return proyecto;
    var dni = dniDesdeIdRoster_(data.employeeId);
    var trabajador = dni ? leerRosterReal_(true).filter(function (t) { return t.dni === dni; })[0] : null;
    var id = generateSequentialId('asignaciones', 'ASIG');
    var ahora = new Date();
    var valores = {
      id: id,
      employeeId: data.employeeId,
      employeeName: trabajador ? trabajador.nombre : (data.employeeName || ''),
      projectId: data.projectId,
      projectName: proyecto.data.nombre || '',
      role: data.role || data.rol || 'miembro',
      startDate: data.startDate || Utilities.formatDate(ahora, 'America/Lima', 'yyyy-MM-dd'),
      endDate: '',
      status: 'active',
      createdAt: ahora
    };
    a.hoja.appendRow(a.datos[0].map(function (c) { return valores[c] !== undefined ? valores[c] : ''; }));

    if (data.actualizarCiudad && proyecto.data.ciudad) {
      transferEmployee({ empleadoId: data.employeeId, nuevaCiudad: proyecto.data.ciudad, motivo: 'Asignacion a proyecto' });
    }
    return { success: true, data: { id: id }, message: 'Empleado asignado al proyecto' };
  });
}

function finalizarAsignacionesDonde_(condicion) {
  var a = tablaPorCabecera_('asignaciones');
  var hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
  var n = 0;
  for (var i = 1; i < a.datos.length; i++) {
    if (!condicion(a, a.datos[i])) continue;
    a.hoja.getRange(i + 1, a.h.status + 1).setValue('completed');
    if (a.h.endDate !== undefined) a.hoja.getRange(i + 1, a.h.endDate + 1).setValue(hoy);
    n++;
  }
  return n;
}

function removeAssignment(data) {
  var n = finalizarAsignacionesDonde_(function (a, r) { return String(r[0]) === String(data.assignmentId) && asignacionActiva_(a, r); });
  return n ? { success: true, message: 'Asignacion finalizada' } : { success: false, error: 'Asignacion no encontrada' };
}

function bulkAssignEmployees(data) {
  var results = (data.employeeIds || []).map(function (employeeId) {
    var result = assignEmployeeToProject({ projectId: data.projectId, employeeId: employeeId, role: data.role || data.rol, actualizarCiudad: data.actualizarCiudad });
    return { employeeId: employeeId, success: result.success };
  });
  return { success: true, data: results, message: 'Asignacion masiva completada' };
}

function closeProjectAssignments(projectId) {
  finalizarAsignacionesDonde_(function (a, r) { return String(r[a.h.projectId]) === String(projectId) && asignacionActiva_(a, r); });
}

function closeEmployeeAssignments(employeeId) {
  finalizarAsignacionesDonde_(function (a, r) { return String(r[a.h.employeeId]) === String(employeeId) && asignacionActiva_(a, r); });
}

function getProjectCity(projectId) {
  var p = getProjectById(projectId);
  return p.success ? (p.data.ciudad || null) : null;
}
