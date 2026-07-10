// ============================================================
// REPORTES — dashboard y reportes agregados
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// REPORTES Y ESTADISTICAS
// ============================================
function getDashboardStats() {
  const projSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const appSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const jobSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');

  // Empleados: roster real desde la hoja 'sueldos' (fuente unica)
  const rosterReal = leerRosterReal_();

  // Obtener datos con headers
  const projData = projSheet.getDataRange().getValues();
  const appData = appSheet.getDataRange().getValues();
  const jobData = jobSheet.getDataRange().getValues();

  const projHeaders = projData[0];
  const appHeaders = appData[0];
  const jobHeaders = jobData[0];

  const projects = projData.slice(1);
  const applications = appData.slice(1);
  const jobs = jobData.slice(1);

  // Encontrar indices de columnas dinamicamente
  const projEstadoCol = projHeaders.indexOf('estado');
  const appEstadoCol = appHeaders.indexOf('status') >= 0 ? appHeaders.indexOf('status') : appHeaders.indexOf('estado');
  const jobEstadoCol = jobHeaders.indexOf('estado');

  // Conteos
  const totalEmpleados = rosterReal.length;

  const totalProyectos = projects.filter(p => {
    const estado = projEstadoCol >= 0 ? p[projEstadoCol] : p[5];
    return estado === 'activo' || estado === 'in_progress';
  }).length;

  const totalPostulaciones = applications.length;

  const postulacionesPendientes = applications.filter(a => {
    const estado = appEstadoCol >= 0 ? a[appEstadoCol] : a[12];
    return estado === 'pendiente' || estado === 'revision';
  }).length;

  const convocatoriasActivas = jobs.filter(j => {
    const estado = jobEstadoCol >= 0 ? j[jobEstadoCol] : j[13];
    return estado === 'activo';
  }).length;

  // Proyectos completados y distribucion por estado
  const proyectosPorEstado = {};
  projects.forEach(p => {
    const estado = String((projEstadoCol >= 0 ? p[projEstadoCol] : p[5]) || 'sin_estado').toLowerCase().trim();
    proyectosPorEstado[estado] = (proyectosPorEstado[estado] || 0) + 1;
  });
  const proyectosCompletados = (proyectosPorEstado['completado'] || 0) +
    (proyectosPorEstado['completed'] || 0) +
    (proyectosPorEstado['finalizado'] || 0);

  // Empleados por sede
  const empleadosPorCiudad = {};
  rosterReal.forEach(t => {
    const ciudad = t.sede || 'Principal';
    empleadosPorCiudad[ciudad] = (empleadosPorCiudad[ciudad] || 0) + 1;
  });

  // Empleados por tipo (Oficina / Campo)
  const empleadosPorArea = {};
  rosterReal.forEach(t => {
    const area = t.es_campo ? 'Campo' : 'Oficina';
    empleadosPorArea[area] = (empleadosPorArea[area] || 0) + 1;
  });

  return {
    success: true,
    data: {
      totalEmpleados,
      totalProyectos,
      totalPostulaciones,
      postulacionesPendientes,
      convocatoriasActivas,
      proyectosCompletados,
      proyectosPorEstado,
      empleadosPorCiudad,
      empleadosPorArea
    }
  };
}

function getEmployeeReport() {
  const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const assignSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const projSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  
  const employees = empSheet.getDataRange().getValues();
  const assignments = assignSheet.getDataRange().getValues();
  const projects = projSheet.getDataRange().getValues();
  
  const empHeaders = employees[0];
  
  const report = employees.slice(1)
    .filter(e => e[10] === 'activo')
    .map(emp => {
      const empObj = rowToObject(empHeaders, emp);
      
      // Buscar proyecto actual
      const activeAssign = assignments.slice(1).find(a => 
        a[2] === emp[0] && a[5] === 'activa'
      );
      
      if (activeAssign) {
        const project = projects.slice(1).find(p => p[0] === activeAssign[1]);
        empObj.proyecto_actual = project ? project[2] : 'Sin proyecto';
        empObj.cliente_actual = project ? project[3] : '';
      } else {
        empObj.proyecto_actual = 'Sin asignar';
        empObj.cliente_actual = '';
      }
      
      return empObj;
    });
  
  return { success: true, data: report };
}
