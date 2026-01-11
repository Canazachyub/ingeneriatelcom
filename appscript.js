// ============================================
// SISTEMA DE GESTION TELCOM - APPS SCRIPT
// ============================================
// Autor: Ingenieria Telcom EIRL
// Version: 2.0
// ============================================

// CONFIGURACION
const SHEET_ID = '15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA';
const DRIVE_FOLDER_ID = '1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV';
const NOTIFICATION_EMAIL = 'energysupervision13@gmail.com';
const ADMIN_PASSWORD = 'telcom2017'; // Cambiar en produccion

// ============================================
// ENDPOINTS PRINCIPALES
// ============================================
function doGet(e) {
  const action = e.parameter.action;

  // Parse payload if exists (for CORS-friendly requests)
  let data = {};
  if (e.parameter.payload) {
    try {
      data = JSON.parse(e.parameter.payload);
    } catch (err) {
      data = {};
    }
  }

  const token = data.token || e.parameter.token;

  try {
    // Acciones publicas (sin autenticacion)
    const publicActions = ['getJobs', 'getJob', 'apply', 'contact', 'login'];

    if (!publicActions.includes(action)) {
      if (!validateToken(token)) {
        return jsonResponse({ success: false, error: 'No autorizado' });
      }
    }

    switch(action) {
      // === AUTENTICACION ===
      case 'login':
        return jsonResponse(login(data));
      case 'verifyToken':
        return jsonResponse(verifyTokenAction(token));
      case 'changePassword':
        return jsonResponse(changePassword(data));

      // === CONVOCATORIAS (PUBLICO) ===
      case 'getJobs':
        return jsonResponse(getActiveJobs());
      case 'getJob':
        return jsonResponse(getJobById(data.id || e.parameter.id));
      case 'getJobsAdmin':
        return jsonResponse(getAllJobs());
      case 'createJob':
        return jsonResponse(createJob(data));
      case 'updateJob':
        return jsonResponse(updateJob(data));
      case 'updateJobStatus':
        return jsonResponse(updateJobStatus(data));
      case 'deleteJob':
        return jsonResponse(deleteJob(data));

      // === EMPLEADOS ===
      case 'getEmployees':
        return jsonResponse(getEmployees(data.filters || e.parameter.filters));
      case 'getEmployee':
        return jsonResponse(getEmployeeById(data.id || e.parameter.id));
      case 'getEmployeesByProject':
        return jsonResponse(getEmployeesByProject(data.projectId || e.parameter.projectId));
      case 'getEmployeesByCity':
        return jsonResponse(getEmployeesByCity(data.city || e.parameter.city));
      case 'createEmployee':
        return jsonResponse(createEmployee(data));
      case 'updateEmployee':
        return jsonResponse(updateEmployee(data));
      case 'deactivateEmployee':
        return jsonResponse(deactivateEmployee(data));
      case 'transferEmployee':
        return jsonResponse(transferEmployee(data));
      case 'createCredentials':
        return jsonResponse(createCredentialsForEmployee(data));

      // === PROYECTOS ===
      case 'getProjects':
        return jsonResponse(getProjects());
      case 'getProject':
        return jsonResponse(getProjectById(data.id || e.parameter.id));
      case 'getActiveProjects':
        return jsonResponse(getActiveProjects());
      case 'createProject':
        return jsonResponse(createProject(data));
      case 'updateProject':
        return jsonResponse(updateProject(data));
      case 'closeProject':
        return jsonResponse(closeProject(data));

      // === ASIGNACIONES ===
      case 'getAssignments':
        return jsonResponse(getAssignments(data.projectId));
      case 'getAssignmentsByEmployee':
        return jsonResponse(getAssignmentsByEmployee(data.employeeId || e.parameter.employeeId));
      case 'assignEmployee':
        return jsonResponse(assignEmployeeToProject(data));
      case 'removeAssignment':
        return jsonResponse(removeAssignment(data));
      case 'bulkAssign':
        return jsonResponse(bulkAssignEmployees(data));

      // === POSTULACIONES ===
      case 'apply':
        return jsonResponse(submitApplication(data));
      case 'getApplications':
      case 'getApplicationsAdmin':
        return jsonResponse(getApplications(data.jobId || e.parameter.jobId));
      case 'getApplication':
        return jsonResponse(getApplicationById(data.id || e.parameter.id));
      case 'updateApplicationStatus':
        return jsonResponse(updateApplicationStatus(data));
      case 'hireApplicant':
        return jsonResponse(hireApplicant(data));

      // === USUARIOS/CREDENCIALES ===
      case 'getUsers':
        return jsonResponse(getUsers());
      case 'createUser':
        return jsonResponse(createUser(data));
      case 'updateUser':
        return jsonResponse(updateUser(data));
      case 'resetPassword':
        return jsonResponse(resetPassword(data));
      case 'deactivateUser':
        return jsonResponse(deactivateUser(data));

      // === CONTACTO (PUBLICO) ===
      case 'contact':
        return jsonResponse(submitContact(data));
      case 'getContacts':
        return jsonResponse(getContacts());
      case 'updateContactStatus':
        return jsonResponse(updateContactStatus(data));
      case 'deleteContact':
        return jsonResponse(deleteContact(data));

      // === ARCHIVOS ===
      case 'upload':
        return jsonResponse(uploadFile(data));

      // === REPORTES ===
      case 'getDashboard':
      case 'getDashboardStats':
        return jsonResponse(getDashboardStats());
      case 'getEmployeeReport':
        return jsonResponse(getEmployeeReport());

      default:
        return jsonResponse({ success: false, error: 'Accion no valida: ' + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// Keep doPost for backwards compatibility
function doPost(e) {
  const action = e.parameter.action;
  let data = {};

  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    data = {};
  }

  // Create a fake GET event and delegate to doGet
  const fakeEvent = {
    parameter: {
      action: action,
      payload: JSON.stringify(data)
    }
  };

  return doGet(fakeEvent);
}

// Verify token and return user data
function verifyTokenAction(token) {
  if (!validateToken(token)) {
    return { success: false, error: 'Token invalido o expirado' };
  }

  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const parts = decoded.split('|');
    const userId = parts[0];

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const users = sheet.getDataRange().getValues();

    for (let i = 1; i < users.length; i++) {
      if (users[i][0] === userId && users[i][6] === 'activo') {
        return {
          success: true,
          data: {
            user: {
              id: users[i][0],
              name: users[i][1],
              email: users[i][2],
              role: users[i][4],
              employeeId: users[i][9] || null
            }
          }
        };
      }
    }

    return { success: false, error: 'Usuario no encontrado' };
  } catch (e) {
    return { success: false, error: 'Error verificando token' };
  }
}

// Get all jobs (admin)
function getAllJobs() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const jobs = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => rowToObject(headers, row));

  return { success: true, data: jobs };
}

// Create credentials for existing employee
function createCredentialsForEmployee(data) {
  const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = empSheet.getDataRange().getValues();

  let employee = null;
  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === data.employeeId) {
      employee = {
        id: employees[i][0],
        nombre: employees[i][2],
        email: employees[i][3]
      };
      break;
    }
  }

  if (!employee) {
    return { success: false, error: 'Empleado no encontrado' };
  }

  // Check if user already exists
  const userSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = userSheet.getDataRange().getValues();

  for (let i = 1; i < users.length; i++) {
    if (users[i][9] === data.employeeId) {
      return { success: false, error: 'El empleado ya tiene credenciales' };
    }
  }

  // Create user
  const result = createUser({
    nombre: employee.nombre,
    email: employee.email,
    rol: 'empleado',
    permisos: ['ver_perfil', 'ver_proyectos'],
    empleadoId: employee.id
  });

  return result;
}

// ============================================
// AUTENTICACION Y USUARIOS
// ============================================
function login(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][2] === data.email && users[i][3] === data.password && users[i][6] === 'activo') {
      const token = generateToken(users[i][0]);
      
      // Registrar ultimo acceso
      sheet.getRange(i + 1, 8).setValue(new Date());
      
      return {
        success: true,
        data: {
          token: token,
          user: {
            id: users[i][0],
            nombre: users[i][1],
            email: users[i][2],
            rol: users[i][4],
            permisos: users[i][5].split(','),
            empleadoId: users[i][9] || null
          }
        }
      };
    }
  }
  
  return { success: false, error: 'Credenciales invalidas' };
}

function generateToken(userId) {
  const timestamp = new Date().getTime();
  const data = userId + '|' + timestamp + '|' + ADMIN_PASSWORD;
  return Utilities.base64Encode(data);
}

function validateToken(token) {
  if (!token) return false;
  
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const parts = decoded.split('|');
    const timestamp = parseInt(parts[1]);
    const now = new Date().getTime();
    
    // Token valido por 24 horas
    if (now - timestamp > 24 * 60 * 60 * 1000) {
      return false;
    }
    
    return parts[2] === ADMIN_PASSWORD;
  } catch (e) {
    return false;
  }
}

function createUser(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const id = generateSequentialId('usuarios', 'USR');
  
  // Generar password temporal
  const tempPassword = generateTempPassword();
  
  const row = [
    id,
    data.nombre,
    data.email,
    tempPassword,
    data.rol, // admin, supervisor, rrhh, empleado
    data.permisos.join(','), // lista de permisos separados por coma
    'activo',
    '',
    new Date(),
    data.empleadoId || ''
  ];
  
  sheet.appendRow(row);
  
  // Enviar credenciales por email
  sendCredentialsEmail(data.email, data.nombre, tempPassword);
  
  return { 
    success: true, 
    data: { id: id, tempPassword: tempPassword },
    message: 'Usuario creado. Credenciales enviadas por email.'
  };
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function changePassword(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === data.userId && users[i][3] === data.currentPassword) {
      sheet.getRange(i + 1, 4).setValue(data.newPassword);
      return { success: true, message: 'Contrasena actualizada' };
    }
  }
  
  return { success: false, error: 'Contrasena actual incorrecta' };
}

function resetPassword(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === data.userId) {
      const tempPassword = generateTempPassword();
      sheet.getRange(i + 1, 4).setValue(tempPassword);
      
      sendCredentialsEmail(users[i][2], users[i][1], tempPassword);
      
      return { success: true, message: 'Nueva contrasena enviada por email' };
    }
  }
  
  return { success: false, error: 'Usuario no encontrado' };
}

function getUsers() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const users = data.slice(1).map(row => {
    const user = rowToObject(headers, row);
    delete user.password; // No enviar password
    return user;
  });
  
  return { success: true, data: users };
}

// ============================================
// GESTION DE EMPLEADOS
// ============================================
function getEmployees(filters) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let employees = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => rowToObject(headers, row));
  
  // Aplicar filtros si existen
  if (filters) {
    const f = typeof filters === 'string' ? JSON.parse(filters) : filters;
    
    if (f.estado) employees = employees.filter(e => e.estado === f.estado);
    if (f.ciudad) employees = employees.filter(e => e.ciudad_actual === f.ciudad);
    if (f.area) employees = employees.filter(e => e.area === f.area);
    if (f.cargo) employees = employees.filter(e => e.cargo === f.cargo);
  }
  
  return { success: true, data: employees };
}

function getEmployeeById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const employee = data.slice(1).find(row => row[0] === id);
  
  if (!employee) {
    return { success: false, error: 'Empleado no encontrado' };
  }
  
  const emp = rowToObject(headers, employee);
  
  // Obtener asignaciones actuales
  emp.asignaciones = getAssignmentsByEmployee(id).data;
  
  // Obtener historial de movimientos
  emp.historial = getEmployeeHistory(id).data;
  
  return { success: true, data: emp };
}

function getEmployeesByProject(projectId) {
  const assignSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('asignaciones');
  const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  
  const assignments = assignSheet.getDataRange().getValues();
  const employees = empSheet.getDataRange().getValues();
  const empHeaders = employees[0];
  
  const employeeIds = assignments.slice(1)
    .filter(row => row[1] === projectId && row[5] === 'activa')
    .map(row => row[2]);
  
  const result = employees.slice(1)
    .filter(row => employeeIds.includes(row[0]))
    .map(row => rowToObject(empHeaders, row));
  
  return { success: true, data: result };
}

function getEmployeesByCity(city) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const employees = data.slice(1)
    .filter(row => row[8] === city && row[10] === 'activo')
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: employees };
}

function createEmployee(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const id = generateSequentialId('empleados', 'EMP');
  
  const row = [
    id,
    data.dni,
    data.nombre_completo,
    data.email,
    data.telefono,
    data.cargo,
    data.area,
    data.fecha_ingreso || new Date(),
    data.ciudad_actual,
    data.ciudad_origen || data.ciudad_actual,
    'activo',
    data.tipo_contrato, // planilla, locacion, practicas
    data.salario || '',
    data.cuenta_bancaria || '',
    data.contacto_emergencia || '',
    data.telefono_emergencia || '',
    new Date()
  ];
  
  sheet.appendRow(row);
  
  // Registrar en historial
  addHistoryRecord(id, 'ingreso', null, data.ciudad_actual, 'Ingreso a la empresa');
  
  // Crear usuario si se solicita
  if (data.crearUsuario) {
    createUser({
      nombre: data.nombre_completo,
      email: data.email,
      rol: 'empleado',
      permisos: ['ver_perfil', 'ver_proyectos'],
      empleadoId: id
    });
  }
  
  return { success: true, data: { id: id }, message: 'Empleado registrado exitosamente' };
}

function updateEmployee(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();
  
  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === data.id) {
      // Actualizar campos especificos
      if (data.cargo) sheet.getRange(i + 1, 6).setValue(data.cargo);
      if (data.area) sheet.getRange(i + 1, 7).setValue(data.area);
      if (data.telefono) sheet.getRange(i + 1, 5).setValue(data.telefono);
      if (data.salario) sheet.getRange(i + 1, 13).setValue(data.salario);
      if (data.tipo_contrato) sheet.getRange(i + 1, 12).setValue(data.tipo_contrato);
      
      return { success: true, message: 'Empleado actualizado' };
    }
  }
  
  return { success: false, error: 'Empleado no encontrado' };
}

function transferEmployee(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();
  
  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === data.empleadoId) {
      const ciudadAnterior = employees[i][8];
      
      // Actualizar ciudad
      sheet.getRange(i + 1, 9).setValue(data.nuevaCiudad);
      
      // Si cambia de area tambien
      if (data.nuevaArea) {
        sheet.getRange(i + 1, 7).setValue(data.nuevaArea);
      }
      
      // Registrar en historial
      addHistoryRecord(
        data.empleadoId, 
        'transferencia', 
        ciudadAnterior, 
        data.nuevaCiudad, 
        data.motivo || 'Transferencia de ubicacion'
      );
      
      // Notificar al empleado
      if (data.notificar) {
        sendTransferNotification(employees[i][3], employees[i][2], ciudadAnterior, data.nuevaCiudad);
      }
      
      return { success: true, message: 'Empleado transferido exitosamente' };
    }
  }
  
  return { success: false, error: 'Empleado no encontrado' };
}

function deactivateEmployee(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();
  
  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === data.empleadoId) {
      sheet.getRange(i + 1, 11).setValue('inactivo');
      
      // Cerrar asignaciones activas
      closeEmployeeAssignments(data.empleadoId);
      
      // Desactivar usuario si existe
      deactivateUserByEmployee(data.empleadoId);
      
      // Registrar en historial
      addHistoryRecord(data.empleadoId, 'baja', null, null, data.motivo || 'Baja de la empresa');
      
      return { success: true, message: 'Empleado dado de baja' };
    }
  }
  
  return { success: false, error: 'Empleado no encontrado' };
}

function getEmployeeHistory(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('historial_empleados');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const history = data.slice(1)
    .filter(row => row[1] === employeeId)
    .map(row => rowToObject(headers, row))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  return { success: true, data: history };
}

function addHistoryRecord(employeeId, tipo, ubicacionAnterior, ubicacionNueva, descripcion) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('historial_empleados');
  const id = generateSequentialId('historial_empleados', 'HIST');

  sheet.appendRow([
    id,
    employeeId,
    tipo,
    ubicacionAnterior || '',
    ubicacionNueva || '',
    descripcion,
    new Date(),
    Session.getActiveUser().getEmail() || 'sistema'
  ]);
}

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

// ============================================
// CONVOCATORIAS (BOLSA DE TRABAJO)
// ============================================
function getActiveJobs() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const jobs = data.slice(1)
    .filter(row => row[0] !== '' && row[10] === 'activo')
    .map(row => rowToObject(headers, row));
  
  return { success: true, data: jobs };
}

function getJobById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const job = data.slice(1).find(row => row[0] === id);
  
  if (!job) {
    return { success: false, error: 'Convocatoria no encontrada' };
  }
  
  return { success: true, data: rowToObject(headers, job) };
}

function createJob(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const id = generateSequentialId('convocatorias', 'CON');
  
  const row = [
    id,
    data.titulo,
    data.categoria,
    data.descripcion,
    data.requisitos,
    data.beneficios,
    data.ubicacion,
    data.modalidad,
    data.salario_min || '',
    data.salario_max || '',
    'activo',
    data.prioridad || 'normal',
    new Date(),
    data.fecha_cierre || '',
    0
  ];
  
  sheet.appendRow(row);
  
  return { success: true, data: { id: id }, message: 'Convocatoria creada' };
}

function updateJob(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const jobs = sheet.getDataRange().getValues();

  for (let i = 1; i < jobs.length; i++) {
    if (jobs[i][0] === data.id) {
      if (data.titulo !== undefined) sheet.getRange(i + 1, 2).setValue(data.titulo);
      if (data.categoria !== undefined) sheet.getRange(i + 1, 3).setValue(data.categoria);
      if (data.descripcion !== undefined) sheet.getRange(i + 1, 4).setValue(data.descripcion);
      if (data.requisitos !== undefined) sheet.getRange(i + 1, 5).setValue(data.requisitos);
      if (data.beneficios !== undefined) sheet.getRange(i + 1, 6).setValue(data.beneficios);
      if (data.ubicacion !== undefined) sheet.getRange(i + 1, 7).setValue(data.ubicacion);
      if (data.modalidad !== undefined) sheet.getRange(i + 1, 8).setValue(data.modalidad);
      if (data.salario_min !== undefined) sheet.getRange(i + 1, 9).setValue(data.salario_min);
      if (data.salario_max !== undefined) sheet.getRange(i + 1, 10).setValue(data.salario_max);
      if (data.estado !== undefined) sheet.getRange(i + 1, 11).setValue(data.estado);
      if (data.prioridad !== undefined) sheet.getRange(i + 1, 12).setValue(data.prioridad);
      if (data.fecha_cierre !== undefined) sheet.getRange(i + 1, 14).setValue(data.fecha_cierre);

      return { success: true, message: 'Convocatoria actualizada' };
    }
  }

  return { success: false, error: 'Convocatoria no encontrada' };
}

function updateJobStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const jobs = sheet.getDataRange().getValues();
  
  for (let i = 1; i < jobs.length; i++) {
    if (jobs[i][0] === data.id) {
      sheet.getRange(i + 1, 11).setValue(data.estado);
      return { success: true, message: 'Estado actualizado' };
    }
  }
  
  return { success: false, error: 'Convocatoria no encontrada' };
}

function deleteJob(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const jobs = sheet.getDataRange().getValues();
  
  for (let i = 1; i < jobs.length; i++) {
    if (jobs[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Convocatoria eliminada' };
    }
  }
  
  return { success: false, error: 'Convocatoria no encontrada' };
}

// ============================================
// POSTULACIONES
// ============================================
function submitApplication(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const id = generateSequentialId('postulaciones', 'PO');

  // Subir CV si viene incluido en base64
  let cvUrl = data.cvUrl || '';
  if (data.cvBase64 && data.cvFileName) {
    try {
      const uploadResult = uploadFileFromBase64(data.cvBase64, data.cvMimeType, data.cvFileName);
      if (uploadResult.success) {
        cvUrl = uploadResult.data.fileUrl;
      }
    } catch (e) {
      console.error('Error subiendo CV:', e);
    }
  }

  const row = [
    id,
    data.jobId,
    data.fullName,
    data.dni,
    data.email,
    data.phone,
    data.linkedIn || '',
    cvUrl,
    data.cvFileName || '',
    data.coverLetter || '',
    data.expectedSalary || '',
    data.availability,
    new Date(),
    'pendiente'
  ];

  sheet.appendRow(row);
  incrementApplicationCount(data.jobId);

  // Agregar titulo del puesto para la notificacion
  data.cvUrl = cvUrl;
  sendApplicationNotification(data);

  return { success: true, data: { id: id, cvUrl: cvUrl }, message: 'Postulacion enviada' };
}

function getApplications(jobId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const jobSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const jobData = jobSheet.getDataRange().getValues();
  const headers = data[0];

  // Crear mapa de IDs a titulos de convocatorias
  const jobTitles = {};
  for (let i = 1; i < jobData.length; i++) {
    jobTitles[jobData[i][0]] = jobData[i][1]; // id -> titulo
  }

  let applications = data.slice(1).map(row => {
    const app = rowToObject(headers, row);
    // Agregar titulo de la convocatoria
    app.titulo_convocatoria = jobTitles[app.convocatoria_id] || 'Sin titulo';
    return app;
  });

  if (jobId) {
    applications = applications.filter(a => a.convocatoria_id === jobId);
  }

  return { success: true, data: applications };
}

function getApplicationById(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const app = data.slice(1).find(row => row[0] === id);
  
  if (!app) {
    return { success: false, error: 'Postulacion no encontrada' };
  }
  
  return { success: true, data: rowToObject(headers, app) };
}

function updateApplicationStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const apps = sheet.getDataRange().getValues();
  
  for (let i = 1; i < apps.length; i++) {
    if (apps[i][0] === data.id) {
      sheet.getRange(i + 1, 14).setValue(data.estado);
      
      if (data.notificar) {
        sendStatusUpdateEmail(apps[i], data.estado);
      }
      
      return { success: true, message: 'Estado actualizado' };
    }
  }
  
  return { success: false, error: 'Postulacion no encontrada' };
}

function hireApplicant(data) {
  // Obtener datos del postulante
  const appSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const apps = appSheet.getDataRange().getValues();
  const headers = apps[0];
  
  let applicant = null;
  let rowIndex = -1;
  
  for (let i = 1; i < apps.length; i++) {
    if (apps[i][0] === data.applicationId) {
      applicant = rowToObject(headers, apps[i]);
      rowIndex = i;
      break;
    }
  }
  
  if (!applicant) {
    return { success: false, error: 'Postulacion no encontrada' };
  }
  
  // Crear empleado
  const employeeResult = createEmployee({
    dni: applicant.dni,
    nombre_completo: applicant.nombre_completo,
    email: applicant.email,
    telefono: applicant.telefono,
    cargo: data.cargo,
    area: data.area,
    ciudad_actual: data.ciudad,
    tipo_contrato: data.tipo_contrato,
    salario: data.salario,
    crearUsuario: data.crearUsuario
  });
  
  if (employeeResult.success) {
    // Actualizar estado de postulacion
    appSheet.getRange(rowIndex + 1, 14).setValue('contratado');
    
    // Asignar a proyecto si se especifica
    if (data.projectId) {
      assignEmployeeToProject({
        projectId: data.projectId,
        employeeId: employeeResult.data.id,
        rol: data.rol || 'miembro'
      });
    }
    
    // Notificar
    sendHireNotification(applicant.email, applicant.nombre_completo, data.cargo);
  }
  
  return employeeResult;
}

function incrementApplicationCount(jobId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === jobId) {
      const count = data[i][14] || 0;
      sheet.getRange(i + 1, 15).setValue(count + 1);
      break;
    }
  }
}

// ============================================
// CONTACTO
// ============================================
function submitContact(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const id = generateSequentialId('contactos', 'CNT');

  sheet.appendRow([
    id,
    data.name,
    data.email,
    data.phone || '',
    data.subject || 'Consulta',
    data.message,
    new Date(),
    'pendiente'
  ]);

  sendContactNotification(data);

  return { success: true, data: { id: id }, message: 'Mensaje enviado' };
}

function getContacts() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const contacts = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => rowToObject(headers, row))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { success: true, data: contacts };
}

function updateContactStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const contacts = sheet.getDataRange().getValues();

  for (let i = 1; i < contacts.length; i++) {
    if (contacts[i][0] === data.id) {
      sheet.getRange(i + 1, 8).setValue(data.estado);
      return { success: true, message: 'Estado actualizado' };
    }
  }

  return { success: false, error: 'Mensaje no encontrado' };
}

function deleteContact(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('contactos');
  const contacts = sheet.getDataRange().getValues();

  for (let i = 1; i < contacts.length; i++) {
    if (contacts[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Mensaje eliminado' };
    }
  }

  return { success: false, error: 'Mensaje no encontrado' };
}

// ============================================
// ARCHIVOS
// ============================================
function uploadFile(data) {
  return uploadFileFromBase64(data.fileContent, data.mimeType, data.fileName);
}

// Funcion auxiliar para subir archivos desde base64
function uploadFileFromBase64(base64Content, mimeType, fileName) {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const now = new Date();
    const yearMonth = Utilities.formatDate(now, 'America/Lima', 'yyyy-MM');

    // Crear subcarpeta por mes si no existe
    let subFolder;
    const subFolders = folder.getFoldersByName(yearMonth);
    if (subFolders.hasNext()) {
      subFolder = subFolders.next();
    } else {
      subFolder = folder.createFolder(yearMonth);
    }

    // Crear blob desde base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Content),
      mimeType || 'application/pdf',
      fileName || 'archivo_' + new Date().getTime()
    );

    // Crear archivo en Drive
    const file = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      data: {
        fileUrl: file.getUrl(),
        fileId: file.getId(),
        fileName: file.getName()
      }
    };
  } catch (e) {
    console.error('Error en uploadFileFromBase64:', e);
    return {
      success: false,
      error: e.message || 'Error al subir archivo'
    };
  }
}

// ============================================
// REPORTES Y ESTADISTICAS
// ============================================
function getDashboardStats() {
  const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const projSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('proyectos');
  const appSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const jobSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  
  const employees = empSheet.getDataRange().getValues().slice(1);
  const projects = projSheet.getDataRange().getValues().slice(1);
  const applications = appSheet.getDataRange().getValues().slice(1);
  const jobs = jobSheet.getDataRange().getValues().slice(1);
  
  // Conteos
  const totalEmpleados = employees.filter(e => e[10] === 'activo').length;
  const totalProyectos = projects.filter(p => p[8] === 'activo').length;
  const totalPostulaciones = applications.length;
  const postulacionesPendientes = applications.filter(a => a[13] === 'pendiente').length;
  const convocatoriasActivas = jobs.filter(j => j[10] === 'activo').length;
  
  // Empleados por ciudad
  const empleadosPorCiudad = {};
  employees.filter(e => e[10] === 'activo').forEach(e => {
    const ciudad = e[8] || 'Sin asignar';
    empleadosPorCiudad[ciudad] = (empleadosPorCiudad[ciudad] || 0) + 1;
  });
  
  // Empleados por area
  const empleadosPorArea = {};
  employees.filter(e => e[10] === 'activo').forEach(e => {
    const area = e[6] || 'Sin asignar';
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

// ============================================
// NOTIFICACIONES
// ============================================
function sendApplicationNotification(data) {
  const subject = `Nueva Postulacion - ${data.jobTitle || 'Convocatoria'}`;
  const body = `
Nueva postulacion recibida:

Nombre: ${data.fullName}
DNI: ${data.dni}
Email: ${data.email}
Telefono: ${data.phone}
CV: ${data.cvUrl || 'No adjuntado'}

Fecha: ${new Date().toLocaleString('es-PE')}
  `;
  
  try {
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendContactNotification(data) {
  const subject = `Nuevo Mensaje - ${data.subject || 'Contacto'}`;
  const body = `
Mensaje recibido:

Nombre: ${data.name}
Email: ${data.email}
Telefono: ${data.phone || 'No proporcionado'}

Mensaje:
${data.message}

Fecha: ${new Date().toLocaleString('es-PE')}
  `;
  
  try {
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendStatusUpdateEmail(applicationRow, newStatus) {
  const messages = {
    'revisado': 'Tu postulacion ha sido revisada.',
    'entrevista': 'Has sido seleccionado para entrevista.',
    'rechazado': 'Lamentamos informarte que no has sido seleccionado.',
    'contratado': 'Felicitaciones! Has sido seleccionado.'
  };
  
  const body = `
Hola ${applicationRow[2]},

${messages[newStatus] || 'El estado de tu postulacion ha cambiado.'}

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(applicationRow[4], 'Actualizacion de Postulacion', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendCredentialsEmail(email, nombre, password) {
  const body = `
Hola ${nombre},

Se han creado tus credenciales de acceso al sistema de Ingenieria Telcom EIRL:

Email: ${email}
Contrasena temporal: ${password}

Por favor cambia tu contrasena despues del primer inicio de sesion.

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(email, 'Credenciales de Acceso - Telcom', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendTransferNotification(email, nombre, ciudadAnterior, nuevaCiudad) {
  const body = `
Hola ${nombre},

Te informamos que has sido transferido:

De: ${ciudadAnterior}
A: ${nuevaCiudad}

Para mas detalles, contacta con Recursos Humanos.

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(email, 'Notificacion de Transferencia', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function sendHireNotification(email, nombre, cargo) {
  const body = `
Hola ${nombre},

Felicitaciones! Has sido seleccionado para el puesto de ${cargo} en Ingenieria Telcom EIRL.

Pronto recibiras mas informacion sobre tu incorporacion.

Bienvenido al equipo!

Saludos,
Ingenieria Telcom EIRL
  `;
  
  try {
    MailApp.sendEmail(email, 'Bienvenido a Telcom!', body);
  } catch (e) {
    console.error('Error enviando email:', e);
  }
}

function deactivateUserByEmployee(employeeId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][9] === employeeId) {
      sheet.getRange(i + 1, 7).setValue('inactivo');
      break;
    }
  }
}

// ============================================
// CREAR/ACTUALIZAR ADMIN POR DEFECTO
// Ejecutar esta funcion manualmente si necesitas crear el admin
// ============================================
function createDefaultAdmin() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();

  const adminEmail = 'supervisor1telcom@gmail.com';
  const adminPassword = 'DARWINTELCOM2026';

  // Buscar si ya existe
  for (let i = 1; i < users.length; i++) {
    if (users[i][2] === adminEmail) {
      // Actualizar password y asegurar que este activo
      sheet.getRange(i + 1, 4).setValue(adminPassword); // password
      sheet.getRange(i + 1, 5).setValue('admin'); // rol
      sheet.getRange(i + 1, 6).setValue('all'); // permisos
      sheet.getRange(i + 1, 7).setValue('activo'); // estado
      return 'Usuario admin actualizado: ' + adminEmail;
    }
  }

  // Si no existe, crearlo
  const id = generateSequentialId('usuarios', 'USR');
  sheet.appendRow([
    id,
    'Supervisor Telcom',
    adminEmail,
    adminPassword,
    'admin',
    'all',
    'activo',
    '',
    new Date(),
    ''
  ]);

  return 'Usuario admin creado: ' + adminEmail + ' con ID: ' + id;
}

// ============================================
// UTILIDADES
// ============================================
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return obj;
}

// Genera IDs secuenciales amigables (PO001, CON001, EMP001, etc.)
function generateSequentialId(sheetName, prefix) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  // Buscar el numero mas alto existente
  let maxNum = 0;
  const regex = new RegExp('^' + prefix + '(\\d+)$');

  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]);
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  // Generar siguiente ID con padding de 3 digitos
  const nextNum = maxNum + 1;
  return prefix + String(nextNum).padStart(3, '0');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// CONFIGURACION INICIAL - EJECUTAR UNA VEZ
// ============================================
function setupAllSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // USUARIOS
  let usuarios = ss.getSheetByName('usuarios');
  if (!usuarios) {
    usuarios = ss.insertSheet('usuarios');
    usuarios.appendRow([
      'id', 'nombre', 'email', 'password', 'rol', 'permisos', 
      'estado', 'ultimo_acceso', 'fecha_creacion', 'empleado_id'
    ]);
    // Usuario admin por defecto
    usuarios.appendRow([
      'USR001', 'Supervisor Telcom', 'supervisor1telcom@gmail.com', 'DARWINTELCOM2026',
      'admin', 'all', 'activo', '', new Date(), ''
    ]);
  }
  
  // EMPLEADOS
  let empleados = ss.getSheetByName('empleados');
  if (!empleados) {
    empleados = ss.insertSheet('empleados');
    empleados.appendRow([
      'id', 'dni', 'nombre_completo', 'email', 'telefono', 'cargo', 'area',
      'fecha_ingreso', 'ciudad_actual', 'ciudad_origen', 'estado', 
      'tipo_contrato', 'salario', 'cuenta_bancaria', 'contacto_emergencia',
      'telefono_emergencia', 'fecha_registro'
    ]);
  }
  
  // PROYECTOS
  let proyectos = ss.getSheetByName('proyectos');
  if (!proyectos) {
    proyectos = ss.insertSheet('proyectos');
    proyectos.appendRow([
      'id', 'codigo', 'nombre', 'cliente', 'descripcion', 'ciudad',
      'fecha_inicio', 'fecha_fin_estimada', 'estado', 'presupuesto',
      'supervisor', 'fecha_creacion'
    ]);
  }
  
  // ASIGNACIONES
  let asignaciones = ss.getSheetByName('asignaciones');
  if (!asignaciones) {
    asignaciones = ss.insertSheet('asignaciones');
    asignaciones.appendRow([
      'id', 'proyecto_id', 'empleado_id', 'rol', 'fecha_inicio', 
      'estado', 'fecha_fin'
    ]);
  }
  
  // HISTORIAL DE EMPLEADOS
  let historial = ss.getSheetByName('historial_empleados');
  if (!historial) {
    historial = ss.insertSheet('historial_empleados');
    historial.appendRow([
      'id', 'empleado_id', 'tipo', 'ubicacion_anterior', 'ubicacion_nueva',
      'descripcion', 'fecha', 'usuario'
    ]);
  }
  
  // CONVOCATORIAS
  let convocatorias = ss.getSheetByName('convocatorias');
  if (!convocatorias) {
    convocatorias = ss.insertSheet('convocatorias');
    convocatorias.appendRow([
      'id', 'titulo', 'categoria', 'descripcion', 'requisitos', 'beneficios',
      'ubicacion', 'modalidad', 'salario_min', 'salario_max', 'estado',
      'prioridad', 'fecha_publicacion', 'fecha_cierre', 'postulantes_count'
    ]);
  }
  
  // POSTULACIONES
  let postulaciones = ss.getSheetByName('postulaciones');
  if (!postulaciones) {
    postulaciones = ss.insertSheet('postulaciones');
    postulaciones.appendRow([
      'id', 'convocatoria_id', 'nombre_completo', 'dni', 'email', 'telefono',
      'linkedin', 'cv_url', 'cv_nombre', 'carta_presentacion',
      'pretension_salarial', 'disponibilidad', 'fecha_postulacion', 'estado'
    ]);
  }
  
  // CONTACTOS
  let contactos = ss.getSheetByName('contactos');
  if (!contactos) {
    contactos = ss.insertSheet('contactos');
    contactos.appendRow([
      'id', 'nombre', 'email', 'telefono', 'asunto', 'mensaje', 'fecha', 'estado'
    ]);
  }
  
  return 'Todas las hojas creadas exitosamente. Ejecuta createDefaultAdmin() para crear el usuario administrador.';
}

// ============================================
// DATOS DE PRUEBA - EJECUTAR UNA VEZ
// ============================================
function fillTestData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Primero asegurarse de que las hojas existen
  setupAllSheets();

  // ========== EMPLEADOS ==========
  const empleados = ss.getSheetByName('empleados');
  const empleadosData = [
    [Utilities.getUuid(), '12345678', 'Juan Carlos Perez Mamani', 'juan.perez@telcom.com', '+51 951 234 567', 'Ingeniero Electricista', 'Operaciones', '2020-03-15', 'Tacna', 'Tacna', 'activo', 'indefinido', 3500, '1234567890123', 'Maria Perez', '+51 999 111 222', new Date()],
    [Utilities.getUuid(), '23456789', 'Maria Elena Garcia Torres', 'maria.garcia@telcom.com', '+51 952 345 678', 'Supervisora de Proyectos', 'Proyectos', '2019-06-01', 'Puno', 'Puno', 'activo', 'indefinido', 4200, '2345678901234', 'Pedro Garcia', '+51 999 222 333', new Date()],
    [Utilities.getUuid(), '34567890', 'Carlos Alberto Quispe Huanca', 'carlos.quispe@telcom.com', '+51 953 456 789', 'Tecnico Electricista', 'Operaciones', '2021-01-10', 'Tacna', 'Juliaca', 'activo', 'plazo_fijo', 2800, '3456789012345', 'Ana Quispe', '+51 999 333 444', new Date()],
    [Utilities.getUuid(), '45678901', 'Ana Lucia Condori Mamani', 'ana.condori@telcom.com', '+51 954 567 890', 'Asistente Administrativa', 'Administracion', '2022-03-01', 'Tacna', 'Tacna', 'activo', 'indefinido', 2200, '4567890123456', 'Jose Condori', '+51 999 444 555', new Date()],
    [Utilities.getUuid(), '56789012', 'Roberto Luis Mamani Choque', 'roberto.mamani@telcom.com', '+51 955 678 901', 'Ingeniero de Telecomunicaciones', 'TI', '2020-08-15', 'Puno', 'Puno', 'activo', 'indefinido', 4000, '5678901234567', 'Rosa Mamani', '+51 999 555 666', new Date()],
    [Utilities.getUuid(), '67890123', 'Patricia Soledad Ramos Apaza', 'patricia.ramos@telcom.com', '+51 956 789 012', 'Contadora', 'Finanzas', '2018-11-20', 'Tacna', 'Tacna', 'activo', 'indefinido', 3800, '6789012345678', 'Luis Ramos', '+51 999 666 777', new Date()],
    [Utilities.getUuid(), '78901234', 'Miguel Angel Torres Vargas', 'miguel.torres@telcom.com', '+51 957 890 123', 'Tecnico de Campo', 'Operaciones', '2023-02-01', 'Juliaca', 'Juliaca', 'activo', 'plazo_fijo', 2500, '7890123456789', 'Carmen Torres', '+51 999 777 888', new Date()],
    [Utilities.getUuid(), '89012345', 'Luisa Fernanda Vargas Nina', 'luisa.vargas@telcom.com', '+51 958 901 234', 'Recursos Humanos', 'RRHH', '2021-07-01', 'Tacna', 'Moquegua', 'activo', 'indefinido', 3200, '8901234567890', 'Jorge Vargas', '+51 999 888 999', new Date()],
  ];
  empleadosData.forEach(row => empleados.appendRow(row));

  // ========== PROYECTOS ==========
  const proyectos = ss.getSheetByName('proyectos');
  const proyectosData = [
    [Utilities.getUuid(), 'PROY-2024-001', 'Instalacion Red Electrica Mina Santa Rosa', 'Minera Santa Rosa SAC', 'Instalacion completa de red electrica de media tension para operaciones mineras', 'Puno', '2024-01-15', '2024-06-30', 'en_progreso', 250000, 'Maria Garcia', new Date()],
    [Utilities.getUuid(), 'PROY-2024-002', 'Mantenimiento Torres Telecomunicaciones', 'Claro Peru', 'Mantenimiento preventivo y correctivo de 15 torres de telecomunicaciones', 'Tacna', '2024-02-01', '2024-04-30', 'en_progreso', 85000, 'Juan Perez', new Date()],
    [Utilities.getUuid(), 'PROY-2024-003', 'Sistema SCADA Planta Procesadora', 'Pesquera del Sur', 'Implementacion de sistema SCADA para monitoreo de planta procesadora', 'Tacna', '2024-03-01', '2024-08-31', 'planificacion', 180000, 'Roberto Mamani', new Date()],
    [Utilities.getUuid(), 'PROY-2023-015', 'Ampliacion Subestacion Electrica', 'Southern Peru', 'Ampliacion de capacidad de subestacion electrica principal', 'Moquegua', '2023-06-01', '2023-12-15', 'completado', 450000, 'Maria Garcia', new Date()],
    [Utilities.getUuid(), 'PROY-2024-004', 'Cableado Estructurado Edificio Corporativo', 'Banco de la Nacion', 'Instalacion de cableado estructurado Cat6A en edificio de 8 pisos', 'Tacna', '2024-04-01', '2024-05-15', 'en_progreso', 45000, 'Carlos Quispe', new Date()],
    [Utilities.getUuid(), 'PROY-2024-005', 'Red Fibra Optica Municipal', 'Municipalidad Provincial Puno', 'Tendido de 25km de fibra optica para red municipal', 'Puno', '2024-05-01', '2024-10-31', 'planificacion', 320000, 'Roberto Mamani', new Date()],
  ];
  proyectosData.forEach(row => proyectos.appendRow(row));

  // ========== CONVOCATORIAS ==========
  const convocatorias = ss.getSheetByName('convocatorias');
  const convocatoriasData = [
    [Utilities.getUuid(), 'Ingeniero Electricista Senior', 'Ingenieria', 'Buscamos ingeniero electricista con experiencia en proyectos de media y alta tension para liderar equipos de trabajo en proyectos mineros.', 'Titulo profesional en Ingenieria Electrica|Colegiatura vigente|5+ anos de experiencia|Conocimiento en normas NEC y CNE|Disponibilidad para viajar', 'Sueldo competitivo|Seguro de salud EPS|Bonos por proyecto|Capacitaciones constantes|Linea de carrera', 'Tacna', 'Presencial', 5000, 7000, 'activo', 'alta', new Date(), '2024-03-31', 0],
    [Utilities.getUuid(), 'Tecnico Electricista', 'Tecnico', 'Se requiere tecnico electricista para trabajos de instalacion y mantenimiento en proyectos de telecomunicaciones.', 'Titulo tecnico en Electricidad|2+ anos de experiencia|Licencia de conducir A1|Conocimiento en instalaciones electricas industriales', 'Sueldo acorde al mercado|Seguro SCTR|Alimentacion incluida|Transporte', 'Puno', 'Presencial', 2500, 3500, 'activo', 'media', new Date(), '2024-02-28', 0],
    [Utilities.getUuid(), 'Desarrollador Full Stack', 'TI', 'Buscamos desarrollador para crear aplicaciones web y moviles para gestion de proyectos internos.', 'Bachiller en Sistemas o afines|Experiencia en React y Node.js|Conocimiento de bases de datos SQL y NoSQL|Ingles intermedio', 'Trabajo remoto parcial|Horario flexible|Laptop de trabajo|Capacitaciones en nuevas tecnologias', 'Tacna', 'Hibrido', 4000, 6000, 'activo', 'alta', new Date(), '2024-04-15', 0],
    [Utilities.getUuid(), 'Asistente de Proyectos', 'Administracion', 'Apoyo en la gestion administrativa de proyectos, seguimiento de cronogramas y coordinacion con clientes.', 'Bachiller en Administracion o Ingenieria|Manejo de MS Project|Excel avanzado|Buena comunicacion', 'Sueldo fijo|Seguro de salud|Oportunidad de crecimiento', 'Tacna', 'Presencial', 2000, 2800, 'activo', 'baja', new Date(), '2024-03-15', 0],
    [Utilities.getUuid(), 'Supervisor de Obra Electrica', 'Ingenieria', 'Supervision de obras electricas en proyectos mineros e industriales en la zona sur del Peru.', 'Ingeniero Electricista o Mecanico Electricista|Colegiatura vigente|3+ anos supervisando obras|Residencia en zona sur', 'Sueldo competitivo|Bonificacion por proyecto|Movilidad asignada|Seguro complementario', 'Moquegua', 'Presencial', 5500, 7500, 'activo', 'alta', new Date(), '2024-04-30', 0],
  ];
  convocatoriasData.forEach(row => convocatorias.appendRow(row));

  // Obtener IDs de convocatorias para las postulaciones
  const convocatoriasRows = convocatorias.getDataRange().getValues();
  const convocatoriaIds = convocatoriasRows.slice(1).map(row => row[0]).filter(id => id);

  // ========== POSTULACIONES ==========
  const postulaciones = ss.getSheetByName('postulaciones');
  const postulacionesData = [
    [Utilities.getUuid(), convocatoriaIds[0] || '', 'Pedro Martinez Gonzales', '11223344', 'pedro.martinez@gmail.com', '+51 961 111 222', 'linkedin.com/in/pedromartinez', '', '', 'Soy ingeniero electricista con 6 anos de experiencia en proyectos mineros.', 6000, 'Inmediata', new Date('2024-01-20'), 'pendiente'],
    [Utilities.getUuid(), convocatoriaIds[0] || '', 'Rosa Fernandez Diaz', '22334455', 'rosa.fernandez@hotmail.com', '+51 962 222 333', '', '', '', 'Cuento con amplia experiencia en supervision de obras electricas.', 6500, '2 semanas', new Date('2024-01-22'), 'en_revision'],
    [Utilities.getUuid(), convocatoriaIds[1] || '', 'Jorge Gutierrez Lopez', '33445566', 'jorge.gutierrez@gmail.com', '+51 963 333 444', '', '', '', 'Tecnico electricista con experiencia en telecomunicaciones.', 3000, 'Inmediata', new Date('2024-01-25'), 'pendiente'],
    [Utilities.getUuid(), convocatoriaIds[2] || '', 'Sandra Rojas Mendoza', '44556677', 'sandra.rojas@gmail.com', '+51 964 444 555', 'linkedin.com/in/sandrarojas', '', '', 'Desarrolladora con 3 anos de experiencia en React y Node.js.', 5000, '1 mes', new Date('2024-01-28'), 'entrevista'],
    [Utilities.getUuid(), convocatoriaIds[2] || '', 'Luis Herrera Castro', '55667788', 'luis.herrera@outlook.com', '+51 965 555 666', 'linkedin.com/in/luisherrera', '', '', 'Full stack developer especializado en MERN stack.', 5500, '2 semanas', new Date('2024-01-30'), 'pendiente'],
    [Utilities.getUuid(), convocatoriaIds[3] || '', 'Carmen Salazar Vega', '66778899', 'carmen.salazar@gmail.com', '+51 966 666 777', '', '', '', 'Bachiller en administracion con experiencia en gestion de proyectos.', 2500, 'Inmediata', new Date('2024-02-01'), 'contratado'],
  ];
  postulacionesData.forEach(row => postulaciones.appendRow(row));

  // Obtener IDs de proyectos y empleados para asignaciones
  const proyectosRows = proyectos.getDataRange().getValues();
  const proyectoIds = proyectosRows.slice(1).map(row => row[0]).filter(id => id);

  const empleadosRows = empleados.getDataRange().getValues();
  const empleadoIds = empleadosRows.slice(1).map(row => row[0]).filter(id => id);

  // ========== ASIGNACIONES ==========
  const asignaciones = ss.getSheetByName('asignaciones');
  const asignacionesData = [
    [Utilities.getUuid(), proyectoIds[0] || '', empleadoIds[1] || '', 'Supervisor Principal', '2024-01-15', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[0] || '', empleadoIds[2] || '', 'Tecnico de Campo', '2024-01-15', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[1] || '', empleadoIds[0] || '', 'Ingeniero Lider', '2024-02-01', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[1] || '', empleadoIds[6] || '', 'Tecnico de Campo', '2024-02-01', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[2] || '', empleadoIds[4] || '', 'Ingeniero de Sistemas', '2024-03-01', 'activo', ''],
    [Utilities.getUuid(), proyectoIds[3] || '', empleadoIds[1] || '', 'Supervisor', '2023-06-01', 'completado', '2023-12-15'],
    [Utilities.getUuid(), proyectoIds[4] || '', empleadoIds[2] || '', 'Tecnico Instalador', '2024-04-01', 'activo', ''],
  ];
  asignacionesData.forEach(row => asignaciones.appendRow(row));

  // ========== CONTACTOS ==========
  const contactos = ss.getSheetByName('contactos');
  const contactosData = [
    [Utilities.getUuid(), 'Carlos Rodriguez Silva', 'carlos.rodriguez@empresa.com', '+51 987 654 321', 'Consulta sobre servicios de software', 'Buenas tardes, estoy interesado en conocer mas sobre sus servicios de desarrollo de software. Tenemos un proyecto de gestion de inventarios que nos gustaria implementar. Podrian enviarme informacion sobre costos y tiempos de desarrollo?', new Date('2024-01-11T10:30:00'), 'pendiente'],
    [Utilities.getUuid(), 'Ana Maria Torres Gutierrez', 'ana.torres@minera.pe', '+51 956 123 456', 'Cotizacion proyecto minero', 'Estimados, somos una empresa minera ubicada en Puno y necesitamos supervision de obras electricas. Quisiera agendar una reunion para discutir los detalles del proyecto. Nuestro presupuesto es de aproximadamente $200,000.', new Date('2024-01-10T15:45:00'), 'respondido'],
    [Utilities.getUuid(), 'Luis Fernando Mendoza', 'lfernandez@gmail.com', '+51 945 789 012', 'Consulta general', 'Hola, vi su pagina web y me gustaria saber si realizan trabajos en la ciudad de Arequipa. Gracias de antemano por su respuesta.', new Date('2024-01-09T09:15:00'), 'pendiente'],
    [Utilities.getUuid(), 'Patricia Huaman Rios', 'patricia.huaman@constructora.com', '+51 978 456 123', 'Alianza estrategica', 'Buenos dias, represento a una constructora y estamos interesados en establecer una alianza para proyectos de electrificacion. Favor contactarme.', new Date('2024-01-08T14:20:00'), 'leido'],
    [Utilities.getUuid(), 'Roberto Sanchez Velasquez', 'r.sanchez@industrial.pe', '', 'Mantenimiento preventivo', 'Necesitamos cotizacion para mantenimiento preventivo de nuestras instalaciones electricas. Somos una planta industrial en Tacna.', new Date('2024-01-07T11:00:00'), 'respondido'],
  ];
  contactosData.forEach(row => contactos.appendRow(row));

  // ========== USUARIOS ADICIONALES ==========
  const usuarios = ss.getSheetByName('usuarios');
  // Agregar usuario manager
  usuarios.appendRow([
    Utilities.getUuid(), 'Maria Garcia', 'maria.garcia@telcom.com', 'manager123',
    'manager', 'ver_empleados,editar_empleados,ver_proyectos,editar_proyectos', 'activo', '', new Date(), empleadoIds[1] || ''
  ]);

  return 'Datos de prueba insertados exitosamente! Se crearon: 8 empleados, 6 proyectos, 5 convocatorias, 6 postulaciones, 7 asignaciones, 5 mensajes de contacto, 1 usuario manager adicional.';
}
