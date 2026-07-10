// ============================================================
// PROYECTOS — proyectos y asignaciones
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// GESTION DE PROYECTOS
// ============================================
function getProjects() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const projects = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const project = rowToObject(headers, row);
      project.empleados_asignados = countProjectEmployees(project.id);
      return project;
    });
  
  return { success: true, data: projects };
}

function getActiveProjects() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const projects = data.slice(1)
    .filter(row => row[0] !== '' && row[8] === 'activo')
    .map(row => {
      const project = rowToObject(headers, row);
      project.empleados_asignados = countProjectEmployees(project.id);
      return project;
    });
  
  return { success: true, data: projects };
}

function getProjectById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const project = data.slice(1).find(row => row[0] === id);
  
  if (!project) {
    return { success: false, error: 'Proyecto no encontrado' };
  }
  
  const proj = rowToObject(headers, project);
  proj.empleados = getEmployeesByProject(id).data;
  
  return { success: true, data: proj };
}

function createProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const id = generateSequentialId('proyectos', 'PROY');
  
  const row = [
    id,
    data.codigo,
    data.nombre,
    data.cliente,
    data.descripcion,
    data.ciudad,
    data.fecha_inicio,
    data.fecha_fin_estimada || '',
    'activo',
    data.presupuesto || '',
    data.supervisor || '',
    new Date()
  ];
  
  sheet.appendRow(row);
  
  return { success: true, data: { id: id }, message: 'Proyecto creado' };
}

function updateProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const projects = sheet.getDataRange().getValues();
  
  for (let i = 1; i < projects.length; i++) {
    if (projects[i][0] === data.id) {
      if (data.nombre) sheet.getRange(i + 1, 3).setValue(data.nombre);
      if (data.descripcion) sheet.getRange(i + 1, 5).setValue(data.descripcion);
      if (data.ciudad) sheet.getRange(i + 1, 6).setValue(data.ciudad);
      if (data.fecha_fin_estimada) sheet.getRange(i + 1, 8).setValue(data.fecha_fin_estimada);
      if (data.presupuesto) sheet.getRange(i + 1, 10).setValue(data.presupuesto);
      if (data.supervisor) sheet.getRange(i + 1, 11).setValue(data.supervisor);
      
      return { success: true, message: 'Proyecto actualizado' };
    }
  }
  
  return { success: false, error: 'Proyecto no encontrado' };
}

function closeProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const projects = sheet.getDataRange().getValues();
  
  for (let i = 1; i < projects.length; i++) {
    if (projects[i][0] === data.projectId) {
      sheet.getRange(i + 1, 9).setValue('cerrado');
      
      // Cerrar todas las asignaciones del proyecto
      closeProjectAssignments(data.projectId);
      
      return { success: true, message: 'Proyecto cerrado' };
    }
  }
  
  return { success: false, error: 'Proyecto no encontrado' };
}

function countProjectEmployees(projectId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  
  return data.slice(1).filter(row => row[1] === projectId && row[5] === 'activa').length;
}

// ============================================
// GESTION DE ASIGNACIONES
// ============================================
function getAssignments() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const assignments = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: assignments };
}

function getAssignmentsByEmployee(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const assignments = data.slice(1)
    .filter(row => row[2] === employeeId)
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: assignments };
}

function assignEmployeeToProject(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const id = generateSequentialId('asignaciones', 'ASIG');
  
  // Verificar si ya esta asignado
  const existing = sheet.getDataRange().getValues().slice(1)
    .find(row => row[1] === data.projectId && row[2] === data.employeeId && row[5] === 'activa');
  
  if (existing) {
    return { success: false, error: 'El empleado ya esta asignado a este proyecto' };
  }
  
  const row = [
    id,
    data.projectId,
    data.employeeId,
    data.rol || 'miembro',
    new Date(),
    'activa',
    ''
  ];
  
  sheet.appendRow(row);
  
  // Actualizar ciudad del empleado si el proyecto es en otra ciudad
  if (data.actualizarCiudad) {
    const projectCity = getProjectCity(data.projectId);
    if (projectCity) {
      transferEmployee({
        empleadoId: data.employeeId,
        nuevaCiudad: projectCity,
        motivo: 'Asignacion a proyecto'
      });
    }
  }
  
  return { success: true, data: { id: id }, message: 'Empleado asignado al proyecto' };
}

function removeAssignment(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const assignments = sheet.getDataRange().getValues();
  
  for (let i = 1; i < assignments.length; i++) {
    if (assignments[i][0] === data.assignmentId) {
      sheet.getRange(i + 1, 6).setValue('finalizada');
      sheet.getRange(i + 1, 7).setValue(new Date());
      return { success: true, message: 'Asignacion finalizada' };
    }
  }
  
  return { success: false, error: 'Asignacion no encontrada' };
}

function bulkAssignEmployees(data) {
  const results = [];
  
  for (const employeeId of data.employeeIds) {
    const result = assignEmployeeToProject({
      projectId: data.projectId,
      employeeId: employeeId,
      rol: data.rol,
      actualizarCiudad: data.actualizarCiudad
    });
    results.push({ employeeId, success: result.success });
  }
  
  return { success: true, data: results, message: 'Asignacion masiva completada' };
}

function closeProjectAssignments(projectId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === projectId && data[i][5] === 'activa') {
      sheet.getRange(i + 1, 6).setValue('finalizada');
      sheet.getRange(i + 1, 7).setValue(new Date());
    }
  }
}

function closeEmployeeAssignments(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === employeeId && data[i][5] === 'activa') {
      sheet.getRange(i + 1, 6).setValue('finalizada');
      sheet.getRange(i + 1, 7).setValue(new Date());
    }
  }
}

function getProjectCity(projectId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const data = sheet.getDataRange().getValues();
  const project = data.slice(1).find(row => row[0] === projectId);
  return project ? project[5] : null;
}
