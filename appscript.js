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
const ADMIN_PASSWORD = 'telcom2017!Seguro'; // IMPORTANTE: cambiar antes de produccion

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
    const publicActions = [
      'getJobs', 'getJob', 'apply', 'contact', 'login',
      // NUEVAS ACCIONES PUBLICAS - Consulta DNI y Asistencia
      'consultarPostulacion',
      'historialPostulaciones',
      'verificarEmpleado',
      'marcarAsistencia',
      'obtenerAsistenciasHoy',
      // CAPACITACIONES Y EVALUACIONES (publicas)
      'getCapacitaciones',
      'getCapacitacionById',
      'iniciarEvaluacion',
      'submitEvaluacion',
      'guardarFotoWebcam',
      'registrarEventoLog'
    ];

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
      case 'uploadJobPdf':
        return jsonResponse(uploadJobPdf(data));

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

      // ========== CONSULTA POSTULACION POR DNI ==========
      case 'consultarPostulacion':
        return jsonResponse(consultarPostulacion(data.dni || e.parameter.dni));
      case 'historialPostulaciones':
        return jsonResponse(historialPostulaciones(data.dni || e.parameter.dni));

      // ========== ASISTENCIA KIOSKO ==========
      case 'verificarEmpleado':
        return jsonResponse(verificarEmpleado(data.dni || e.parameter.dni));
      case 'marcarAsistencia':
        return jsonResponse(marcarAsistencia(data));
      case 'obtenerAsistenciasHoy':
        return jsonResponse(obtenerAsistenciasHoy());
      case 'getAttendances':
        return jsonResponse(getAttendances(data.fecha || e.parameter.fecha, data.employeeId || e.parameter.employeeId));

      // ========== CAPACITACIONES (PUBLICO) ==========
      case 'getCapacitaciones':
        return jsonResponse(getCapacitaciones());
      case 'getCapacitacionById':
        return jsonResponse(getCapacitacionById(data.id || e.parameter.id));

      // ========== EVALUACIONES (PUBLICO) ==========
      case 'iniciarEvaluacion':
        return jsonResponse(iniciarEvaluacion(data));
      case 'submitEvaluacion':
        return jsonResponse(submitEvaluacion(data));
      case 'guardarFotoWebcam':
        return jsonResponse(guardarFotoWebcam(data));
      case 'registrarEventoLog':
        return jsonResponse(registrarEventoLog(data));

      // ========== CAPACITACIONES ADMIN (requieren token) ==========
      case 'crearCapacitacion':
        return jsonResponse(crearCapacitacion(data));
      case 'actualizarCapacitacion':
        return jsonResponse(actualizarCapacitacion(data));
      case 'eliminarCapacitacion':
        return jsonResponse(eliminarCapacitacion(data));
      case 'crearPregunta':
        return jsonResponse(crearPregunta(data));
      case 'actualizarPregunta':
        return jsonResponse(actualizarPregunta(data));
      case 'eliminarPregunta':
        return jsonResponse(eliminarPregunta(data));
      case 'getEvaluaciones':
        return jsonResponse(getEvaluaciones(data));
      case 'revisarEvaluacion':
        return jsonResponse(revisarEvaluacion(data));

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
    const headers = users[0];

    // Detectar estructura de la hoja
    const isStructureA = headers[1] === 'email' || headers[1]?.toLowerCase() === 'email';

    for (let i = 1; i < users.length; i++) {
      const row = users[i];
      let id, nombre, email, rol, isActive, employeeId;

      if (isStructureA) {
        // Estructura A (8 cols): id, email, password, name, role, employeeId, active, createdAt
        id = row[0];
        email = row[1];
        nombre = row[3];
        rol = row[4];
        employeeId = row[5] || null;
        isActive = row[6] === true || row[6] === 'true' || row[6] === 'activo' || row[6] === 'TRUE';
      } else {
        // Estructura B (10 cols): id, nombre, email, password, rol, permisos, estado, ...
        id = row[0];
        nombre = row[1];
        email = row[2];
        rol = row[4];
        employeeId = row[9] || null;
        isActive = row[6] === 'activo';
      }

      if (id === userId && isActive) {
        return {
          success: true,
          data: {
            user: {
              id: id,
              name: nombre,
              email: email,
              role: rol,
              employeeId: employeeId
            }
          }
        };
      }
    }

    return { success: false, error: 'Usuario no encontrado' };
  } catch (e) {
    return { success: false, error: 'Error verificando token: ' + e.message };
  }
}

// Get all jobs (admin)
function getAllJobs() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const jobs = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const job = rowToObject(headers, row);
      if (job.imagen === undefined) job.imagen = '';
      return job;
    });

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
  const headers = users[0];

  // Detectar estructura de la hoja
  // Estructura A (8 cols): id, email, password, name, role, employeeId, active, createdAt
  // Estructura B (10 cols): id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id
  const isStructureA = headers[1] === 'email' || headers[1]?.toLowerCase() === 'email';

  for (let i = 1; i < users.length; i++) {
    const row = users[i];
    let email, password, isActive, userId, nombre, rol, permisos, employeeId;

    if (isStructureA) {
      // Estructura A (8 columnas): [0]=id, [1]=email, [2]=password, [3]=name, [4]=role, [5]=employeeId, [6]=active, [7]=createdAt
      userId = row[0];
      email = row[1];
      password = row[2];
      nombre = row[3];
      rol = row[4];
      employeeId = row[5] || null;
      isActive = row[6] === true || row[6] === 'true' || row[6] === 'activo' || row[6] === 'TRUE';
      permisos = rol === 'admin' ? ['all'] : ['asistencia', 'boletas'];
    } else {
      // Estructura B (10 columnas): [0]=id, [1]=nombre, [2]=email, [3]=password, [4]=rol, [5]=permisos, [6]=estado, [7]=ultimo_acceso, [8]=fecha_creacion, [9]=empleado_id
      userId = row[0];
      nombre = row[1];
      email = row[2];
      password = row[3];
      rol = row[4];
      permisos = row[5] ? row[5].toString().split(',') : [];
      isActive = row[6] === 'activo';
      employeeId = row[9] || null;
    }

    if (email === data.email && password === data.password && isActive) {
      const token = generateToken(userId);

      // Registrar ultimo acceso
      const accessCol = isStructureA ? 8 : 8; // columna 8 en ambos casos
      sheet.getRange(i + 1, accessCol).setValue(new Date());

      return {
        success: true,
        data: {
          token: token,
          user: {
            id: userId,
            nombre: nombre,
            email: email,
            rol: rol,
            permisos: Array.isArray(permisos) ? permisos : [permisos],
            empleadoId: employeeId
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

// Get or create a subfolder by name inside a parent folder
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

// Upload a PDF for a job posting, organized by city
function uploadJobPdf(data) {
  // data: { fileContent (base64), fileName, mimeType, ciudad, convocatoriaId }
  try {
    if (!data.fileContent || !data.fileName) {
      return { success: false, error: 'Archivo requerido' };
    }

    const mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const fichasFolder = getOrCreateFolder(mainFolder, 'Fichas_Postulacion');
    const cityName = (data.ciudad || 'General').replace(/[\\/:*?"<>|]/g, '_');
    const cityFolder = getOrCreateFolder(fichasFolder, cityName);

    // If replacing an old file for this job, delete it
    if (data.convocatoriaId) {
      const oldFiles = cityFolder.getFilesByName(data.fileName);
      while (oldFiles.hasNext()) {
        oldFiles.next().setTrashed(true);
      }
    }

    const decodedBytes = Utilities.base64Decode(data.fileContent);
    const blob = Utilities.newBlob(
      decodedBytes,
      data.mimeType || 'application/pdf',
      data.fileName
    );
    const file = cityFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      data: {
        fileId: file.getId(),
        fileName: file.getName(),
        viewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId()
      }
    };
  } catch (e) {
    return { success: false, error: 'Error subiendo PDF: ' + e.message };
  }
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

  // Encontrar indice de columna 'estado' dinamicamente
  const estadoCol = headers.indexOf('estado');

  const jobs = data.slice(1)
    .filter(row => {
      if (row[0] === '') return false;
      // Verificar estado usando el indice correcto
      const estado = estadoCol >= 0 ? row[estadoCol] : row[10];
      return estado === 'activo';
    })
    .map(row => {
      const job = rowToObject(headers, row);
      // Normalizar campos para compatibilidad con frontend
      if (!job.prioridad) {
        job.prioridad = (job.urgente === true || job.urgente === 'TRUE' || job.urgente === 'VERDADERO') ? 'alta' : 'media';
      }
      if (!job.fecha_publicacion) {
        job.fecha_publicacion = job.fecha_inicio || job.createdAt || '';
      }
      if (job.postulantes_count === undefined || job.postulantes_count === '') {
        job.postulantes_count = 0;
      }
      if (job.imagen === undefined) job.imagen = '';
      return job;
    });

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

  const jobObj = rowToObject(headers, job);
  // Normalizar campos para compatibilidad con frontend
  if (!jobObj.prioridad) {
    jobObj.prioridad = (jobObj.urgente === true || jobObj.urgente === 'TRUE') ? 'alta' : 'media';
  }
  if (!jobObj.fecha_publicacion) {
    jobObj.fecha_publicacion = jobObj.fecha_inicio || jobObj.createdAt || '';
  }
  if (jobObj.postulantes_count === undefined || jobObj.postulantes_count === '') {
    jobObj.postulantes_count = 0;
  }
  if (jobObj.imagen === undefined) jobObj.imagen = '';
  return { success: true, data: jobObj };
}

function createJob(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const headers = sheet.getDataRange().getValues()[0];
  const id = generateSequentialId('convocatorias', 'JOB');
  const now = new Date();

  // Mapa de valores — soporta tanto la estructura vieja (urgente, vacantes, fecha_inicio)
  // como la nueva (prioridad, postulantes_count, fecha_publicacion)
  const fieldMap = {
    'id': id,
    'titulo': data.titulo,
    'categoria': data.categoria,
    'descripcion': data.descripcion,
    'requisitos': data.requisitos,
    'beneficios': data.beneficios,
    'ubicacion': data.ubicacion,
    'modalidad': data.modalidad,
    'salario_min': data.salario_min || '',
    'salario_max': data.salario_max || '',
    'vacantes': data.vacantes || 1,
    'estado': data.estado || 'activo',
    'urgente': data.urgente !== undefined ? data.urgente : (data.prioridad === 'alta'),
    'prioridad': data.prioridad || (data.urgente ? 'alta' : 'media'),
    'fecha_inicio': data.fecha_inicio || data.fecha_publicacion || now,
    'fecha_publicacion': data.fecha_publicacion || data.fecha_inicio || now,
    'fecha_cierre': data.fecha_cierre || '',
    'postulantes_count': 0,
    'imagen': data.imagen || '',
    'pdf_url': data.pdf_url || '',
    'createdAt': now,
    'updatedAt': now,
  };

  // Construir fila en el orden real de los headers del sheet
  const row = headers.map(header => {
    if (header === '') return '';
    return fieldMap.hasOwnProperty(header) ? fieldMap[header] : '';
  });

  sheet.appendRow(row);

  return { success: true, data: { id: id }, message: 'Convocatoria creada' };
}

function updateJob(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const jobs = sheet.getDataRange().getValues();
  const headers = jobs[0];

  // Funcion helper para obtener indice de columna (1-based para getRange)
  const getColNum = (name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? idx + 1 : -1;
  };

  for (let i = 1; i < jobs.length; i++) {
    if (jobs[i][0] === data.id) {
      // Actualizar campos usando nombres de columna
      if (data.titulo !== undefined) sheet.getRange(i + 1, getColNum('titulo')).setValue(data.titulo);
      if (data.categoria !== undefined) sheet.getRange(i + 1, getColNum('categoria')).setValue(data.categoria);
      if (data.descripcion !== undefined) sheet.getRange(i + 1, getColNum('descripcion')).setValue(data.descripcion);
      if (data.requisitos !== undefined) sheet.getRange(i + 1, getColNum('requisitos')).setValue(data.requisitos);
      if (data.beneficios !== undefined) sheet.getRange(i + 1, getColNum('beneficios')).setValue(data.beneficios);
      if (data.ubicacion !== undefined) sheet.getRange(i + 1, getColNum('ubicacion')).setValue(data.ubicacion);
      if (data.modalidad !== undefined) sheet.getRange(i + 1, getColNum('modalidad')).setValue(data.modalidad);
      if (data.salario_min !== undefined) sheet.getRange(i + 1, getColNum('salario_min')).setValue(data.salario_min);
      if (data.salario_max !== undefined) sheet.getRange(i + 1, getColNum('salario_max')).setValue(data.salario_max);
      if (data.vacantes !== undefined) sheet.getRange(i + 1, getColNum('vacantes')).setValue(data.vacantes);
      if (data.fecha_inicio !== undefined) sheet.getRange(i + 1, getColNum('fecha_inicio')).setValue(data.fecha_inicio);
      if (data.fecha_cierre !== undefined) sheet.getRange(i + 1, getColNum('fecha_cierre')).setValue(data.fecha_cierre);
      if (data.estado !== undefined) sheet.getRange(i + 1, getColNum('estado')).setValue(data.estado);
      if (data.urgente !== undefined) sheet.getRange(i + 1, getColNum('urgente')).setValue(data.urgente);
      if (data.imagen !== undefined) sheet.getRange(i + 1, getColNum('imagen')).setValue(data.imagen);
      if (data.pdf_url !== undefined) sheet.getRange(i + 1, getColNum('pdf_url')).setValue(data.pdf_url);

      // Actualizar updatedAt
      const updatedAtCol = getColNum('updatedAt');
      if (updatedAtCol > 0) sheet.getRange(i + 1, updatedAtCol).setValue(new Date());

      return { success: true, message: 'Convocatoria actualizada' };
    }
  }

  return { success: false, error: 'Convocatoria no encontrada' };
}

function updateJobStatus(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const jobs = sheet.getDataRange().getValues();
  const headers = jobs[0];

  // Encontrar indice de columna 'estado' dinamicamente
  const estadoCol = headers.indexOf('estado');
  const colNum = estadoCol >= 0 ? estadoCol + 1 : 14; // +1 porque getRange es 1-based

  for (let i = 1; i < jobs.length; i++) {
    if (jobs[i][0] === data.id) {
      sheet.getRange(i + 1, colNum).setValue(data.estado);
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

  // Obtener titulo de la convocatoria
  let jobTitle = data.jobTitle || '';
  if (!jobTitle && data.jobId) {
    try {
      const jobSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
      const jobData = jobSheet.getDataRange().getValues();
      const jobHeaders = jobData[0];
      const tituloCol = jobHeaders.indexOf('titulo');
      for (let i = 1; i < jobData.length; i++) {
        if (jobData[i][0] === data.jobId) {
          jobTitle = tituloCol >= 0 ? jobData[i][tituloCol] : jobData[i][1];
          break;
        }
      }
    } catch (e) {
      console.error('Error obteniendo titulo:', e);
    }
  }

  const now = new Date();
  const headers = sheet.getDataRange().getValues()[0];

  const fieldMap = {
    'id': id,
    'jobId': data.jobId,
    'convocatoria_id': data.jobId,
    'jobTitle': jobTitle,
    'titulo_convocatoria': jobTitle,
    'fullName': data.fullName || data.nombre_completo || '',
    'nombre_completo': data.fullName || data.nombre_completo || '',
    'dni': data.dni,
    'email': data.email,
    'phone': data.phone || data.telefono || '',
    'telefono': data.phone || data.telefono || '',
    'linkedIn': data.linkedIn || '',
    'linkedin': data.linkedIn || '',
    'coverLetter': data.coverLetter || '',
    'carta_presentacion': data.coverLetter || '',
    'expectedSalary': data.expectedSalary || '',
    'pretension_salarial': data.expectedSalary || '',
    'availability': data.availability || '',
    'disponibilidad': data.availability || '',
    'cvUrl': cvUrl,
    'cv_url': cvUrl,
    'cvFileName': data.cvFileName || '',
    'cv_nombre': data.cvFileName || '',
    'status': 'pendiente',
    'estado': 'pendiente',
    'notes': '',
    'createdAt': now,
    'fecha_postulacion': now,
    'updatedAt': now,
  };
  const row = headers.map(h => fieldMap.hasOwnProperty(h) ? fieldMap[h] : '');
  sheet.appendRow(row);
  incrementApplicationCount(data.jobId);

  // Agregar titulo del puesto para la notificacion
  data.cvUrl = cvUrl;
  data.jobTitle = jobTitle;
  sendApplicationNotification(data);

  return { success: true, data: { id: id, cvUrl: cvUrl }, message: 'Postulacion enviada' };
}

function getApplications(jobId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let applications = data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const app = rowToObject(headers, row);
      // El titulo ya viene en la columna jobTitle
      // Para compatibilidad, tambien agregamos titulo_convocatoria
      app.titulo_convocatoria = app.jobTitle || 'Sin titulo';
      return app;
    });

  if (jobId) {
    applications = applications.filter(a => a.jobId === jobId);
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
  const headers = apps[0];

  // Encontrar indices dinamicamente
  const statusCol = headers.indexOf('status');
  const updatedAtCol = headers.indexOf('updatedAt');

  for (let i = 1; i < apps.length; i++) {
    if (apps[i][0] === data.id) {
      // Actualizar estado (columna status, default col 13 = indice 12)
      const statusColNum = statusCol >= 0 ? statusCol + 1 : 13;
      sheet.getRange(i + 1, statusColNum).setValue(data.estado);

      // Actualizar updatedAt si existe
      if (updatedAtCol >= 0) {
        sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date());
      }

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

  // Encontrar indice de columna status dinamicamente
  const statusCol = headers.indexOf('status');
  const statusColNum = statusCol >= 0 ? statusCol + 1 : 13;

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

  // Crear empleado - usar nombres de columna correctos (fullName, phone)
  const employeeResult = createEmployee({
    dni: applicant.dni,
    nombre_completo: applicant.fullName || applicant.nombre_completo,
    email: applicant.email,
    telefono: applicant.phone || applicant.telefono,
    cargo: data.cargo,
    area: data.area,
    ciudad_actual: data.ciudad,
    tipo_contrato: data.tipo_contrato,
    salario: data.salario,
    crearUsuario: data.crearUsuario
  });

  if (employeeResult.success) {
    // Actualizar estado de postulacion
    appSheet.getRange(rowIndex + 1, statusColNum).setValue('contratado');

    // Asignar a proyecto si se especifica
    if (data.projectId) {
      assignEmployeeToProject({
        projectId: data.projectId,
        employeeId: employeeResult.data.id,
        rol: data.rol || 'miembro'
      });
    }

    // Notificar
    const nombre = applicant.fullName || applicant.nombre_completo;
    sendHireNotification(applicant.email, nombre, data.cargo);
  }

  return employeeResult;
}

function incrementApplicationCount(jobId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Buscar columna de conteo (soporta ambos nombres)
  let appCountCol = headers.indexOf('postulantes_count');
  if (appCountCol < 0) appCountCol = headers.indexOf('aplicaciones');
  if (appCountCol < 0) return; // columna no encontrada

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === jobId) {
      const count = parseInt(data[i][appCountCol]) || 0;
      sheet.getRange(i + 1, appCountCol + 1).setValue(count + 1);
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

  // Obtener datos con headers
  const empData = empSheet.getDataRange().getValues();
  const projData = projSheet.getDataRange().getValues();
  const appData = appSheet.getDataRange().getValues();
  const jobData = jobSheet.getDataRange().getValues();

  const empHeaders = empData[0];
  const projHeaders = projData[0];
  const appHeaders = appData[0];
  const jobHeaders = jobData[0];

  const employees = empData.slice(1);
  const projects = projData.slice(1);
  const applications = appData.slice(1);
  const jobs = jobData.slice(1);

  // Encontrar indices de columnas dinamicamente
  const empEstadoCol = empHeaders.indexOf('estado');
  const empCiudadCol = empHeaders.indexOf('ciudad_actual');
  const empAreaCol = empHeaders.indexOf('area');

  const projEstadoCol = projHeaders.indexOf('estado');
  const appEstadoCol = appHeaders.indexOf('status') >= 0 ? appHeaders.indexOf('status') : appHeaders.indexOf('estado');
  const jobEstadoCol = jobHeaders.indexOf('estado');

  // Conteos con indices dinamicos
  const totalEmpleados = employees.filter(e => {
    const estado = empEstadoCol >= 0 ? e[empEstadoCol] : e[10];
    return estado === 'activo';
  }).length;

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

  // Empleados por ciudad
  const empleadosPorCiudad = {};
  employees.filter(e => {
    const estado = empEstadoCol >= 0 ? e[empEstadoCol] : e[10];
    return estado === 'activo';
  }).forEach(e => {
    const ciudad = empCiudadCol >= 0 ? (e[empCiudadCol] || 'Sin asignar') : (e[8] || 'Sin asignar');
    empleadosPorCiudad[ciudad] = (empleadosPorCiudad[ciudad] || 0) + 1;
  });

  // Empleados por area
  const empleadosPorArea = {};
  employees.filter(e => {
    const estado = empEstadoCol >= 0 ? e[empEstadoCol] : e[10];
    return estado === 'activo';
  }).forEach(e => {
    const area = empAreaCol >= 0 ? (e[empAreaCol] || 'Sin asignar') : (e[6] || 'Sin asignar');
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
      'prioridad', 'fecha_publicacion', 'fecha_cierre', 'postulantes_count', 'imagen', 'pdf_url'
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

  // ===== HOJAS DE CAPACITACIONES Y EVALUACIONES =====
  let capacitaciones = ss.getSheetByName('capacitaciones');
  if (!capacitaciones) {
    capacitaciones = ss.insertSheet('capacitaciones');
    capacitaciones.appendRow([
      'id', 'titulo', 'descripcion', 'material_url', 'categoria',
      'num_preguntas', 'nota_minima', 'tiempo_limite_min', 'foto_intervalo_seg',
      'estado', 'fecha_creacion'
    ]);
  }

  let banco_preguntas = ss.getSheetByName('banco_preguntas');
  if (!banco_preguntas) {
    banco_preguntas = ss.insertSheet('banco_preguntas');
    banco_preguntas.appendRow([
      'id', 'capacitacion_id', 'pregunta', 'tipo',
      'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
      'respuesta_correcta', 'justificacion', 'dificultad', 'puntaje', 'estado'
    ]);
  }

  let evaluaciones = ss.getSheetByName('evaluaciones');
  if (!evaluaciones) {
    evaluaciones = ss.insertSheet('evaluaciones');
    evaluaciones.appendRow([
      'id', 'capacitacion_id', 'dni', 'nombres', 'email',
      'preguntas_asignadas', 'respuestas', 'puntaje_auto', 'salidas_pestana',
      'fotos_url', 'hora_inicio', 'hora_fin', 'duracion_seg', 'estado',
      'nota_final', 'retroalimentacion', 'revisado_por', 'fecha_revision'
    ]);
  }

  let eval_fotos = ss.getSheetByName('eval_fotos');
  if (!eval_fotos) {
    eval_fotos = ss.insertSheet('eval_fotos');
    eval_fotos.appendRow(['id', 'evaluacion_id', 'foto_url', 'timestamp', 'orden']);
  }

  let eval_logs = ss.getSheetByName('eval_logs');
  if (!eval_logs) {
    eval_logs = ss.insertSheet('eval_logs');
    eval_logs.appendRow(['id', 'evaluacion_id', 'tipo_evento', 'detalle', 'timestamp']);
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

// ============================================
// CONSULTA DE POSTULACION POR DNI
// ============================================

function consultarPostulacion(dni) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI debe tener 8 digitos' };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const applicationsSheet = ss.getSheetByName('postulaciones');

  if (!applicationsSheet) {
    return { success: false, error: 'Hoja de postulaciones no encontrada' };
  }

  const data = applicationsSheet.getDataRange().getValues();
  const headers = data[0];

  // Buscar columnas - soporta estructura nueva y antigua
  const dniCol = headers.indexOf('dni');
  const idCol = headers.indexOf('id');
  // Nueva estructura usa 'jobId', antigua usa 'convocatoria_id'
  let jobIdCol = headers.indexOf('jobId');
  if (jobIdCol < 0) jobIdCol = headers.indexOf('convocatoria_id');
  // Nueva estructura tiene 'jobTitle' directamente
  const jobTitleCol = headers.indexOf('jobTitle');
  // Nueva estructura usa 'fullName', antigua usa 'nombre_completo'
  let fullNameCol = headers.indexOf('fullName');
  if (fullNameCol < 0) fullNameCol = headers.indexOf('nombre_completo');
  const emailCol = headers.indexOf('email');
  // Nueva estructura usa 'phone', antigua usa 'telefono'
  let phoneCol = headers.indexOf('phone');
  if (phoneCol < 0) phoneCol = headers.indexOf('telefono');
  // Nueva estructura usa 'status', antigua usa 'estado'
  let statusCol = headers.indexOf('status');
  if (statusCol < 0) statusCol = headers.indexOf('estado');
  // Nueva estructura usa 'createdAt', antigua usa 'fecha_postulacion'
  let createdAtCol = headers.indexOf('createdAt');
  if (createdAtCol < 0) createdAtCol = headers.indexOf('fecha_postulacion');

  // Buscar la postulacion mas reciente del DNI
  let postulacion = null;
  let puestoNombreDirecto = null;
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][dniCol] === dni || String(data[i][dniCol]) === dni) {
      postulacion = {
        id: data[i][idCol],
        jobId: data[i][jobIdCol],
        dni: data[i][dniCol],
        fullName: data[i][fullNameCol],
        email: data[i][emailCol],
        phone: data[i][phoneCol],
        status: data[i][statusCol] || 'pendiente',
        createdAt: data[i][createdAtCol]
      };
      // Si tenemos jobTitle en la misma fila, usarlo
      if (jobTitleCol >= 0 && data[i][jobTitleCol]) {
        puestoNombreDirecto = data[i][jobTitleCol];
      }
      break;
    }
  }

  if (!postulacion) {
    return { success: false, error: 'No se encontro postulacion con ese DNI' };
  }

  // Obtener info del puesto (solo si no tenemos jobTitle directo)
  let puestoNombre = puestoNombreDirecto || 'Puesto no encontrado';
  if (!puestoNombreDirecto) {
    const jobsSheet = ss.getSheetByName('convocatorias');
    if (jobsSheet && postulacion.jobId) {
      const jobsData = jobsSheet.getDataRange().getValues();
      const jobHeaders = jobsData[0];
      const jobIdIdx = jobHeaders.indexOf('id');
      const jobTitleIdx = jobHeaders.indexOf('titulo');

      for (let i = 1; i < jobsData.length; i++) {
        if (jobsData[i][jobIdIdx] === postulacion.jobId) {
          puestoNombre = jobsData[i][jobTitleIdx];
          break;
        }
      }
    }
  }

  // Generar cronograma basado en estado
  const cronograma = generarCronograma(postulacion.status, postulacion.createdAt);

  return {
    success: true,
    data: {
      postulante: {
        nombre: postulacion.fullName,
        dni: postulacion.dni,
        email: postulacion.email,
        telefono: postulacion.phone
      },
      postulacion: {
        id: postulacion.id,
        puestoId: postulacion.jobId,
        puestoNombre: puestoNombre,
        estado: postulacion.status,
        fechaPostulacion: postulacion.createdAt
      },
      cronograma: cronograma,
      entrevista: null,
      evaluacion: null
    }
  };
}

function generarCronograma(estado, fechaPostulacion) {
  const etapas = [
    { id: 1, nombre: 'Postulacion Recibida', descripcion: 'Tu postulacion ha sido registrada', estado: 'completada' },
    { id: 2, nombre: 'Revision de CV', descripcion: 'Estamos evaluando tu perfil', estado: 'pendiente' },
    { id: 3, nombre: 'Entrevista', descripcion: 'Entrevista con el equipo', estado: 'pendiente' },
    { id: 4, nombre: 'Evaluacion Tecnica', descripcion: 'Prueba de conocimientos', estado: 'pendiente' },
    { id: 5, nombre: 'Resultado Final', descripcion: 'Comunicacion del resultado', estado: 'pendiente' }
  ];

  const estadoMap = {
    'pendiente': 1,
    'en_revision': 2,
    'entrevista': 3,
    'evaluacion': 4,
    'aprobado': 5,
    'rechazado': 5,
    'contratado': 5
  };

  const etapaActual = estadoMap[estado] || 1;

  return etapas.map((etapa, index) => {
    if (index + 1 < etapaActual) {
      etapa.estado = 'completada';
      etapa.fecha = fechaPostulacion;
    } else if (index + 1 === etapaActual) {
      etapa.estado = 'actual';
    }
    return etapa;
  });
}

function historialPostulaciones(dni) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI debe tener 8 digitos' };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const applicationsSheet = ss.getSheetByName('postulaciones');

  if (!applicationsSheet) {
    return { success: false, error: 'Hoja no encontrada' };
  }

  const data = applicationsSheet.getDataRange().getValues();
  const headers = data[0];

  const dniCol = headers.indexOf('dni');
  const postulaciones = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][dniCol] === dni) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = data[i][idx];
      });
      postulaciones.push(row);
    }
  }

  return { success: true, data: postulaciones };
}

// ============================================
// SISTEMA DE ASISTENCIA (KIOSKO)
// ============================================

function verificarEmpleado(dni) {
  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI debe tener 8 digitos' };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const employeesSheet = ss.getSheetByName('empleados');

  if (!employeesSheet) {
    return { success: false, error: 'Hoja de empleados no encontrada' };
  }

  const data = employeesSheet.getDataRange().getValues();
  const headers = data[0];

  const dniCol = headers.indexOf('dni');
  const idCol = headers.indexOf('id');
  const nameCol = headers.indexOf('nombre_completo');
  const positionCol = headers.indexOf('cargo');
  const statusCol = headers.indexOf('estado');

  for (let i = 1; i < data.length; i++) {
    if (data[i][dniCol] === dni) {
      const status = data[i][statusCol];

      if (status !== 'activo') {
        return {
          success: false,
          error: 'Empleado no activo. Contacte a Recursos Humanos.'
        };
      }

      // Verificar si ya marco hoy
      const asistenciaHoy = obtenerAsistenciaEmpleadoHoy(data[i][idCol]);

      return {
        success: true,
        data: {
          id: data[i][idCol],
          dni: dni,
          nombre: data[i][nameCol],
          cargo: data[i][positionCol],
          foto: null,
          asistenciaHoy: asistenciaHoy
        }
      };
    }
  }

  return { success: false, error: 'DNI no encontrado en el sistema' };
}

function obtenerAsistenciaEmpleadoHoy(employeeId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const attendanceSheet = ss.getSheetByName('Asistencias'); // Mayuscula como tu hoja

  if (!attendanceSheet) {
    return null;
  }

  const hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  // Usar nombres de columna de tu estructura existente
  const empIdCol = headers.indexOf('employeeId');
  const dateCol = headers.indexOf('date');
  const checkInCol = headers.indexOf('checkIn');
  const checkOutCol = headers.indexOf('checkOut');

  for (let i = 1; i < data.length; i++) {
    if (data[i][empIdCol] === employeeId && data[i][dateCol] === hoy) {
      return {
        fecha: hoy,
        entrada: data[i][checkInCol] || null,
        salida: data[i][checkOutCol] || null
      };
    }
  }

  return null;
}

function marcarAsistencia(requestData) {
  const { dni, tipo, lat, lng, accuracy } = requestData;
  const location = { lat, lng, accuracy };

  if (!dni || dni.length !== 8) {
    return { success: false, error: 'DNI invalido' };
  }

  if (!tipo || !['entrada', 'salida'].includes(tipo)) {
    return { success: false, error: 'Tipo debe ser entrada o salida' };
  }

  // Verificar empleado
  const empleadoResult = verificarEmpleado(dni);
  if (!empleadoResult.success) {
    return empleadoResult;
  }

  const empleado = empleadoResult.data;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let attendanceSheet = ss.getSheetByName('Asistencias'); // Tu hoja existente con mayuscula

  // Crear hoja si no existe (con tu estructura)
  if (!attendanceSheet) {
    attendanceSheet = ss.insertSheet('Asistencias');
    attendanceSheet.appendRow([
      'id', 'employeeId', 'employeeName', 'employeeDni', 'date',
      'checkIn', 'checkOut', 'checkInLat', 'checkInLng', 'checkInAccuracy',
      'checkOutLat', 'checkOutLng', 'checkOutAccuracy', 'status', 'hoursWorked', 'createdAt'
    ]);
  }

  const ahora = new Date();
  const hoy = Utilities.formatDate(ahora, 'America/Lima', 'yyyy-MM-dd');
  const horaActual = Utilities.formatDate(ahora, 'America/Lima', 'HH:mm:ss');

  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  // Usar nombres de columna de tu estructura existente
  const empIdCol = headers.indexOf('employeeId');
  const dateCol = headers.indexOf('date');
  const checkInCol = headers.indexOf('checkIn');
  const checkOutCol = headers.indexOf('checkOut');
  const checkInLatCol = headers.indexOf('checkInLat');
  const checkInLngCol = headers.indexOf('checkInLng');
  const checkInAccCol = headers.indexOf('checkInAccuracy');
  const checkOutLatCol = headers.indexOf('checkOutLat');
  const checkOutLngCol = headers.indexOf('checkOutLng');
  const checkOutAccCol = headers.indexOf('checkOutAccuracy');
  const statusCol = headers.indexOf('status');
  const hoursWorkedCol = headers.indexOf('hoursWorked');

  // Buscar registro de hoy
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][empIdCol] === empleado.id && data[i][dateCol] === hoy) {
      rowIndex = i + 1;
      break;
    }
  }

  if (tipo === 'entrada') {
    if (rowIndex > 0) {
      return { success: false, error: 'Ya registraste tu entrada hoy' };
    }

    // Crear nuevo registro con tu estructura de columnas
    const newId = Utilities.getUuid();
    const newRow = [
      newId,                          // id
      empleado.id,                    // employeeId
      empleado.nombre,                // employeeName
      empleado.dni,                   // employeeDni
      hoy,                            // date
      horaActual,                     // checkIn
      '',                             // checkOut
      location.lat || '',             // checkInLat
      location.lng || '',             // checkInLng
      location.accuracy || '',        // checkInAccuracy
      '',                             // checkOutLat
      '',                             // checkOutLng
      '',                             // checkOutAccuracy
      'present',                      // status
      '',                             // hoursWorked
      ahora.toISOString()             // createdAt
    ];
    attendanceSheet.appendRow(newRow);

    return {
      success: true,
      data: {
        tipo: 'entrada',
        hora: horaActual,
        empleado: empleado.nombre,
        mensaje: 'Entrada registrada correctamente'
      }
    };
  } else {
    // Salida
    if (rowIndex < 0) {
      return { success: false, error: 'No has registrado entrada hoy' };
    }

    if (data[rowIndex - 1][checkOutCol]) {
      return { success: false, error: 'Ya registraste tu salida hoy' };
    }

    // Actualizar salida
    attendanceSheet.getRange(rowIndex, checkOutCol + 1).setValue(horaActual);
    if (checkOutLatCol >= 0) attendanceSheet.getRange(rowIndex, checkOutLatCol + 1).setValue(location.lat || '');
    if (checkOutLngCol >= 0) attendanceSheet.getRange(rowIndex, checkOutLngCol + 1).setValue(location.lng || '');
    if (checkOutAccCol >= 0) attendanceSheet.getRange(rowIndex, checkOutAccCol + 1).setValue(location.accuracy || '');

    // Calcular horas trabajadas
    const entrada = data[rowIndex - 1][checkInCol];
    const horasTrabajadas = calcularHorasTrabajadas(entrada, horaActual);
    if (hoursWorkedCol >= 0) {
      attendanceSheet.getRange(rowIndex, hoursWorkedCol + 1).setValue(horasTrabajadas);
    }

    return {
      success: true,
      data: {
        tipo: 'salida',
        hora: horaActual,
        empleado: empleado.nombre,
        horasTrabajadas: horasTrabajadas,
        mensaje: 'Salida registrada correctamente'
      }
    };
  }
}

function calcularHorasTrabajadas(entrada, salida) {
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);

  const minutosEntrada = hE * 60 + mE;
  const minutosSalida = hS * 60 + mS;
  const diff = minutosSalida - minutosEntrada;

  return Math.round(diff / 60 * 100) / 100;
}

function obtenerAsistenciasHoy() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const attendanceSheet = ss.getSheetByName('Asistencias'); // Mayuscula como tu hoja

  if (!attendanceSheet) {
    return { success: true, data: { fecha: '', totalEmpleados: 0, presentes: 0, registros: [] } };
  }

  const hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  const dateCol = headers.indexOf('date'); // Tu columna es 'date' no 'fecha'
  const registros = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][dateCol] === hoy) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = data[i][idx];
      });
      registros.push(row);
    }
  }

  // Contar empleados activos
  const employeesSheet = ss.getSheetByName('empleados');
  let totalEmpleados = 0;
  if (employeesSheet) {
    const empData = employeesSheet.getDataRange().getValues();
    const empHeaders = empData[0];
    const statusCol = empHeaders.indexOf('estado');
    for (let i = 1; i < empData.length; i++) {
      if (empData[i][statusCol] === 'activo') totalEmpleados++;
    }
  }

  return {
    success: true,
    data: {
      fecha: hoy,
      totalEmpleados: totalEmpleados,
      presentes: registros.length,
      registros: registros
    }
  };
}

// ============================================
// OBTENER ASISTENCIAS CON FILTROS (ADMIN)
// ============================================
function getAttendances(fecha, employeeId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const attendanceSheet = ss.getSheetByName('Asistencias');

  if (!attendanceSheet) {
    return { success: true, data: [] };
  }

  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  // Obtener indices de columnas
  const idCol = headers.indexOf('id');
  const empIdCol = headers.indexOf('employeeId');
  const empNameCol = headers.indexOf('employeeName');
  const empDniCol = headers.indexOf('employeeDni');
  const dateCol = headers.indexOf('date');
  const checkInCol = headers.indexOf('checkIn');
  const checkOutCol = headers.indexOf('checkOut');
  const checkInLatCol = headers.indexOf('checkInLat');
  const checkInLngCol = headers.indexOf('checkInLng');
  const checkOutLatCol = headers.indexOf('checkOutLat');
  const checkOutLngCol = headers.indexOf('checkOutLng');
  const statusCol = headers.indexOf('status');
  const hoursCol = headers.indexOf('hoursWorked');

  // Usar fecha de hoy si no se proporciona
  const targetDate = fecha || Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');

  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Filtrar por fecha
    if (row[dateCol] !== targetDate) continue;

    // Filtrar por empleado si se especifica
    if (employeeId && row[empIdCol] !== employeeId) continue;

    records.push({
      id: row[idCol],
      employeeId: row[empIdCol],
      employeeName: row[empNameCol],
      employeeDni: row[empDniCol],
      date: row[dateCol],
      checkIn: row[checkInCol] || '',
      checkOut: row[checkOutCol] || '',
      checkInLat: row[checkInLatCol] || null,
      checkInLng: row[checkInLngCol] || null,
      checkOutLat: row[checkOutLatCol] || null,
      checkOutLng: row[checkOutLngCol] || null,
      status: row[statusCol] || 'pending',
      hoursWorked: row[hoursCol] || 0
    });
  }

  return { success: true, data: records };
}

// ============================================
// CONFIGURAR HOJA DE ASISTENCIAS
// Ejecutar manualmente para crear la hoja
// ============================================
function configurarHojaAsistencias() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let attendanceSheet = ss.getSheetByName('Asistencias'); // Mayuscula

  if (!attendanceSheet) {
    attendanceSheet = ss.insertSheet('Asistencias');
    // Usar tu estructura existente con columnas en ingles
    attendanceSheet.appendRow([
      'id', 'employeeId', 'employeeName', 'employeeDni', 'date',
      'checkIn', 'checkOut', 'checkInLat', 'checkInLng', 'checkInAccuracy',
      'checkOutLat', 'checkOutLng', 'checkOutAccuracy', 'status', 'hoursWorked', 'createdAt'
    ]);

    // Formatear cabecera
    const headerRange = attendanceSheet.getRange(1, 1, 1, 16);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');

    return 'Hoja Asistencias creada exitosamente';
  } else {
    return 'Hoja Asistencias ya existe';
  }
}

// ============================================
// FUNCIONES DE DATOS DE PRUEBA
// Ejecutar manualmente desde el editor de Apps Script
// ============================================

/**
 * EJECUTAR ESTA FUNCION PARA LLENAR TODOS LOS DATOS DE PRUEBA
 * Menu: Ejecutar > Ejecutar funcion > cargarTodosLosDatosPrueba
 *
 * IMPORTANTE: Esta funcion ELIMINA y RECREA todas las hojas con los encabezados correctos
 */
function cargarTodosLosDatosPrueba() {
  const resultados = [];

  resultados.push('=== CARGANDO DATOS DE PRUEBA ===');
  resultados.push(cargarUsuariosPrueba());
  resultados.push(cargarEmpleadosPrueba());
  resultados.push(cargarProyectosPrueba());
  resultados.push(cargarAsignacionesPrueba());
  resultados.push(cargarConvocatoriasPrueba());
  resultados.push(cargarPostulacionesPrueba());
  resultados.push(cargarAsistenciasPrueba());
  resultados.push(cargarContactosPrueba());
  resultados.push(cargarHistorialEmpleadosPrueba());
  resultados.push('=== DATOS DE PRUEBA CARGADOS ===');

  Logger.log(resultados.join('\n'));
  return resultados.join('\n');
}

/**
 * Funcion auxiliar para recrear una hoja con encabezados correctos
 * ELIMINA la hoja existente y crea una nueva
 */
function recrearHoja(ss, nombreHoja, encabezados) {
  // Eliminar hoja si existe
  const hojaExistente = ss.getSheetByName(nombreHoja);
  if (hojaExistente) {
    ss.deleteSheet(hojaExistente);
  }

  // Crear nueva hoja
  const sheet = ss.insertSheet(nombreHoja);
  sheet.appendRow(encabezados);
  formatearCabecera(sheet, encabezados.length);

  return sheet;
}

/**
 * Cargar empleados de prueba
 * Encabezados: id, dni, nombre_completo, email, telefono, cargo, area, fecha_ingreso,
 *              ciudad_actual, ciudad_origen, estado, tipo_contrato, salario,
 *              cuenta_bancaria, contacto_emergencia, telefono_emergencia, fecha_registro
 */
function cargarEmpleadosPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'dni', 'nombre_completo', 'email', 'telefono', 'cargo',
    'area', 'fecha_ingreso', 'ciudad_actual', 'ciudad_origen', 'estado',
    'tipo_contrato', 'salario', 'cuenta_bancaria', 'contacto_emergencia',
    'telefono_emergencia', 'fecha_registro'
  ];

  const sheet = recrearHoja(ss, 'empleados', encabezados);

  // Datos: id, dni, nombre_completo, email, telefono, cargo, area, fecha_ingreso, ciudad_actual, ciudad_origen, estado, tipo_contrato, salario, cuenta_bancaria, contacto_emergencia, telefono_emergencia, fecha_registro
  const empleados = [
    ['EMP001', '70123456', 'Juan Carlos Perez Mamani', 'juan.perez@telcom.pe', '946728001', 'Desarrollador Senior', 'Software', '2020-03-15', 'Tacna', 'Puno', 'activo', 'Indefinido', 4500, '123-45678901-01', 'Rosa Mamani', '987654001', new Date()],
    ['EMP002', '70234567', 'Maria Elena Garcia Quispe', 'maria.garcia@telcom.pe', '946728002', 'Ingeniero Electrico', 'Ingenieria Electrica', '2019-06-01', 'Puno', 'Juliaca', 'activo', 'Indefinido', 5000, '123-45678902-02', 'Pedro Garcia', '987654002', new Date()],
    ['EMP003', '70345678', 'Carlos Alberto Lopez Condori', 'carlos.lopez@telcom.pe', '946728003', 'Tecnico TIC', 'TIC', '2021-09-10', 'Arequipa', 'Tacna', 'activo', 'Plazo fijo', 3500, '123-45678903-03', 'Ana Lopez', '987654003', new Date()],
    ['EMP004', '70456789', 'Ana Patricia Ramos Flores', 'ana.ramos@telcom.pe', '946728004', 'Supervisora de Proyectos', 'Administracion', '2018-01-20', 'Tacna', 'Tacna', 'activo', 'Indefinido', 5500, '123-45678904-04', 'Luis Ramos', '987654004', new Date()],
    ['EMP005', '70567890', 'Roberto Luis Vargas Ccama', 'roberto.vargas@telcom.pe', '946728005', 'Ingeniero de Redes', 'TIC', '2022-02-01', 'Tacna', 'Arequipa', 'activo', 'Indefinido', 4200, '123-45678905-05', 'Carmen Ccama', '987654005', new Date()],
    ['EMP006', '70678901', 'Lucia Fernanda Huanca Torres', 'lucia.huanca@telcom.pe', '946728006', 'Analista de Sistemas', 'Software', '2021-05-15', 'Tacna', 'Tacna', 'activo', 'Indefinido', 4000, '123-45678906-06', 'Fernando Huanca', '987654006', new Date()],
    ['EMP007', '70789012', 'Diego Fernando Ticona Apaza', 'diego.ticona@telcom.pe', '946728007', 'Tecnico Electricista', 'Ingenieria Electrica', '2020-08-01', 'Puno', 'Puno', 'activo', 'Plazo fijo', 3200, '123-45678907-07', 'Juana Apaza', '987654007', new Date()],
    ['EMP008', '70890123', 'Carmen Rosa Choque Vilca', 'carmen.choque@telcom.pe', '946728008', 'Asistente Administrativa', 'Administracion', '2022-11-01', 'Tacna', 'Moquegua', 'activo', 'Plazo fijo', 2500, '123-45678908-08', 'Mario Vilca', '987654008', new Date()],
    ['EMP009', '70901234', 'Miguel Angel Calizaya Pari', 'miguel.calizaya@telcom.pe', '946728009', 'Jefe de Proyectos', 'Mineria', '2017-04-10', 'Arequipa', 'Arequipa', 'activo', 'Indefinido', 6500, '123-45678909-09', 'Elena Pari', '987654009', new Date()],
    ['EMP010', '71012345', 'Sandra Beatriz Mamani Cruz', 'sandra.mamani@telcom.pe', '946728010', 'Desarrollador Junior', 'Software', '2023-01-15', 'Tacna', 'Ilo', 'activo', 'Plazo fijo', 2800, '123-45678910-10', 'Jorge Cruz', '987654010', new Date()],
    ['EMP011', '71123456', 'Pedro Jose Gutierrez Rios', 'pedro.gutierrez@telcom.pe', '946728011', 'Ingeniero de Campo', 'Ingenieria Electrica', '2019-03-01', 'Juliaca', 'Juliaca', 'activo', 'Indefinido', 4800, '123-45678911-11', 'Teresa Rios', '987654011', new Date()],
    ['EMP012', '71234567', 'Veronica Isabel Castillo Luna', 'veronica.castillo@telcom.pe', '946728012', 'Coordinadora RRHH', 'Administracion', '2018-07-15', 'Tacna', 'Lima', 'activo', 'Indefinido', 4500, '123-45678912-12', 'Ricardo Luna', '987654012', new Date()],
    ['EMP013', '71345678', 'Fernando Raul Quispe Hancco', 'fernando.quispe@telcom.pe', '946728013', 'Tecnico de Soporte', 'TIC', '2021-02-01', 'Puno', 'Puno', 'licencia', 'Indefinido', 3000, '123-45678913-13', 'Gloria Hancco', '987654013', new Date()],
    ['EMP014', '71456789', 'Gabriela Sofia Torres Mendoza', 'gabriela.torres@telcom.pe', '946728014', 'Contadora', 'Administracion', '2020-01-10', 'Tacna', 'Tacna', 'activo', 'Indefinido', 4200, '123-45678914-14', 'Oscar Mendoza', '987654014', new Date()],
    ['EMP015', '71567890', 'Andres Felipe Coaquira Nina', 'andres.coaquira@telcom.pe', '946728015', 'Supervisor Electrico', 'Ingenieria Electrica', '2019-11-01', 'Arequipa', 'Puno', 'activo', 'Indefinido', 5200, '123-45678915-15', 'Silvia Nina', '987654015', new Date()],
  ];

  empleados.forEach(emp => sheet.appendRow(emp));

  return `Empleados: ${empleados.length} registros creados`;
}

/**
 * Cargar proyectos de prueba
 * Encabezados: id, nombre, descripcion, cliente, ciudad, estado, fecha_inicio, fecha_fin, presupuesto, createdAt, updatedAt
 */
function cargarProyectosPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'nombre', 'descripcion', 'cliente', 'ciudad', 'estado',
    'fecha_inicio', 'fecha_fin', 'presupuesto', 'createdAt', 'updatedAt'
  ];

  const sheet = recrearHoja(ss, 'proyectos', encabezados);

  const proyectos = [
    ['PRY001', 'Modernizacion Red Electrica Toquepala', 'Actualizacion del sistema de distribucion electrica para la mina Toquepala', 'Southern Peru', 'Tacna', 'in_progress', '2024-01-15', '2024-12-31', 250000, new Date(), new Date()],
    ['PRY002', 'Sistema de Monitoreo IoT Minera', 'Implementacion de sensores IoT para monitoreo de equipos mineros', 'Minsur', 'Puno', 'in_progress', '2024-03-01', '2024-09-30', 180000, new Date(), new Date()],
    ['PRY003', 'Automatizacion Planta Procesadora', 'Sistema SCADA para control de procesos industriales', 'Cemento Sur', 'Arequipa', 'completed', '2023-06-01', '2024-02-28', 320000, new Date(), new Date()],
    ['PRY004', 'Red de Fibra Optica Municipal', 'Tendido de fibra optica para conectividad municipal', 'Municipalidad de Tacna', 'Tacna', 'in_progress', '2024-02-01', '2024-08-31', 450000, new Date(), new Date()],
    ['PRY005', 'Mantenimiento Subestaciones SEAL', 'Mantenimiento preventivo y correctivo de subestaciones electricas', 'SEAL', 'Arequipa', 'in_progress', '2024-01-01', '2024-12-31', 150000, new Date(), new Date()],
    ['PRY006', 'Software de Gestion de Activos', 'Desarrollo de sistema web para gestion de activos mineros', 'Volcan Mining', 'Lima', 'planning', '2024-06-01', '2025-03-31', 280000, new Date(), new Date()],
    ['PRY007', 'Instalacion Paneles Solares Agroindustria', 'Sistema fotovoltaico para planta agroindustrial', 'Agroindustrial Danper', 'Tacna', 'completed', '2023-09-01', '2024-01-15', 95000, new Date(), new Date()],
    ['PRY008', 'Centro de Datos Regional', 'Implementacion de data center para gobierno regional', 'Gobierno Regional Puno', 'Puno', 'on_hold', '2024-04-01', '2025-06-30', 520000, new Date(), new Date()],
  ];

  proyectos.forEach(pry => sheet.appendRow(pry));

  return `Proyectos: ${proyectos.length} registros creados`;
}

/**
 * Cargar asignaciones de prueba
 * Encabezados: id, employeeId, employeeName, projectId, projectName, role, startDate, endDate, status, createdAt
 */
function cargarAsignacionesPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'employeeId', 'employeeName', 'projectId', 'projectName',
    'role', 'startDate', 'endDate', 'status', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'asignaciones', encabezados);

  const asignaciones = [
    ['ASG001', 'EMP001', 'Juan Carlos Perez Mamani', 'PRY006', 'Software de Gestion de Activos', 'Desarrollador Principal', '2024-06-01', '', 'active', new Date()],
    ['ASG002', 'EMP006', 'Lucia Fernanda Huanca Torres', 'PRY006', 'Software de Gestion de Activos', 'Desarrollador', '2024-06-01', '', 'active', new Date()],
    ['ASG003', 'EMP010', 'Sandra Beatriz Mamani Cruz', 'PRY006', 'Software de Gestion de Activos', 'Desarrollador Junior', '2024-06-15', '', 'active', new Date()],
    ['ASG004', 'EMP002', 'Maria Elena Garcia Quispe', 'PRY001', 'Modernizacion Red Electrica Toquepala', 'Ingeniero Principal', '2024-01-15', '', 'active', new Date()],
    ['ASG005', 'EMP015', 'Andres Felipe Coaquira Nina', 'PRY001', 'Modernizacion Red Electrica Toquepala', 'Supervisor', '2024-01-15', '', 'active', new Date()],
    ['ASG006', 'EMP007', 'Diego Fernando Ticona Apaza', 'PRY001', 'Modernizacion Red Electrica Toquepala', 'Tecnico', '2024-02-01', '', 'active', new Date()],
    ['ASG007', 'EMP005', 'Roberto Luis Vargas Ccama', 'PRY002', 'Sistema de Monitoreo IoT Minera', 'Ingeniero de Redes', '2024-03-01', '', 'active', new Date()],
    ['ASG008', 'EMP003', 'Carlos Alberto Lopez Condori', 'PRY002', 'Sistema de Monitoreo IoT Minera', 'Tecnico TIC', '2024-03-15', '', 'active', new Date()],
    ['ASG009', 'EMP009', 'Miguel Angel Calizaya Pari', 'PRY003', 'Automatizacion Planta Procesadora', 'Jefe de Proyecto', '2023-06-01', '2024-02-28', 'completed', new Date()],
    ['ASG010', 'EMP004', 'Ana Patricia Ramos Flores', 'PRY004', 'Red de Fibra Optica Municipal', 'Supervisora', '2024-02-01', '', 'active', new Date()],
    ['ASG011', 'EMP011', 'Pedro Jose Gutierrez Rios', 'PRY005', 'Mantenimiento Subestaciones SEAL', 'Ingeniero de Campo', '2024-01-01', '', 'active', new Date()],
  ];

  asignaciones.forEach(asg => sheet.appendRow(asg));

  return `Asignaciones: ${asignaciones.length} registros creados`;
}

/**
 * Cargar convocatorias (vacantes) de prueba
 * Encabezados: id, titulo, categoria, descripcion, requisitos, beneficios, ubicacion, modalidad,
 *              salario_min, salario_max, vacantes, fecha_inicio, fecha_cierre, estado, urgente, createdAt, updatedAt
 */
function cargarConvocatoriasPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'titulo', 'categoria', 'descripcion', 'requisitos', 'beneficios',
    'ubicacion', 'modalidad', 'salario_min', 'salario_max', 'vacantes',
    'fecha_inicio', 'fecha_cierre', 'estado', 'urgente', 'pdf_url', 'createdAt', 'updatedAt'
  ];

  const sheet = recrearHoja(ss, 'convocatorias', encabezados);

  const convocatorias = [
    ['JOB001', 'Desarrollador Full Stack Senior', 'Software', 'Buscamos desarrollador con experiencia en React, Node.js y bases de datos. Participara en proyectos de software para el sector minero e industrial.', 'Bachiller en Ingenieria de Sistemas o afines|3+ años de experiencia en desarrollo web|Conocimiento de React, Node.js, TypeScript|Experiencia con bases de datos SQL y NoSQL|Ingles intermedio', 'Sueldo competitivo S/4,500 - S/6,000|Seguro de salud EPS|Capacitaciones constantes|Bono por desempeño|Trabajo hibrido', 'Tacna', 'Hibrido', 4500, 6000, 2, '2024-01-15', '2024-03-15', 'activo', true, new Date(), new Date()],
    ['JOB002', 'Ingeniero Electricista', 'Ingenieria Electrica', 'Se requiere ingeniero electricista colegiado para proyectos de media y alta tension en el sector minero.', 'Titulo profesional en Ingenieria Electrica|Colegiatura habilitada CIP|5+ años de experiencia en proyectos electricos|Conocimiento de normativas electricas peruanas|Licencia de conducir A1', 'Sueldo S/5,000 - S/7,000|Movilidad|Viaticos|Seguro SCTR|Linea de carrera', 'Arequipa', 'Presencial', 5000, 7000, 1, '2024-01-20', '2024-02-28', 'activo', true, new Date(), new Date()],
    ['JOB003', 'Tecnico en Telecomunicaciones', 'TIC', 'Tecnico para instalacion y mantenimiento de redes de comunicacion, fibra optica y sistemas de radiocomunicacion.', 'Tecnico titulado en Telecomunicaciones o Electronica|2+ años de experiencia|Conocimiento en fibra optica y redes LAN/WAN|Disponibilidad para viajar|Licencia de conducir', 'Sueldo S/2,800 - S/3,500|Seguro de salud|Capacitaciones tecnicas|Uniforme y EPP|Bonos por proyecto', 'Tacna', 'Presencial', 2800, 3500, 3, '2024-02-01', '2024-03-30', 'activo', false, new Date(), new Date()],
    ['JOB004', 'Supervisor de Obras Electricas', 'Ingenieria Electrica', 'Supervisar la ejecucion de proyectos electricos en campo, asegurando cumplimiento de calidad y seguridad.', 'Ingeniero o Tecnico Electricista|8+ años de experiencia en supervision|Conocimiento de AutoCAD y MS Project|Experiencia en sector minero|Liderazgo de equipos', 'Sueldo S/6,000 - S/8,000|Vehiculo asignado|Viaticos completos|Seguro de vida|Bono anual', 'Puno', 'Presencial', 6000, 8000, 1, '2024-01-25', '2024-02-25', 'activo', true, new Date(), new Date()],
    ['JOB005', 'Asistente de Sistemas', 'Software', 'Soporte tecnico de primer nivel, mantenimiento de equipos y apoyo en desarrollo de software interno.', 'Estudiante o bachiller en Ingenieria de Sistemas|1+ año de experiencia en soporte tecnico|Conocimiento de Windows, Linux, redes|Proactivo y con ganas de aprender|Disponibilidad inmediata', 'Sueldo S/1,800 - S/2,200|Horario flexible|Capacitaciones|Posibilidad de crecimiento|Buen ambiente laboral', 'Tacna', 'Presencial', 1800, 2200, 1, '2024-02-10', '2024-03-10', 'activo', false, new Date(), new Date()],
    ['JOB006', 'Analista de Datos', 'Software', 'Analista para procesamiento y visualizacion de datos operacionales del sector minero e industrial.', 'Bachiller en Estadistica, Sistemas o afines|2+ años en analisis de datos|Dominio de Python, SQL, Power BI|Conocimiento de machine learning basico|Ingles intermedio', 'Sueldo S/3,500 - S/4,500|Trabajo remoto|Capacitaciones en cloud|Horario flexible|Bono por resultados', 'Remoto', 'Remoto', 3500, 4500, 1, '2024-02-15', '2024-04-15', 'activo', false, new Date(), new Date()],
    ['JOB007', 'Jefe de Proyectos Electricos', 'Administracion', 'Liderar la gestion de proyectos electricos desde la planificacion hasta la entrega final.', 'Ingeniero Electricista o Industrial|10+ años de experiencia|Certificacion PMP deseable|Experiencia en sector minero|Habilidades de negociacion', 'Sueldo S/8,000 - S/12,000|Auto de empresa|Seguro familiar|Bono semestral|Acciones de la empresa', 'Lima', 'Hibrido', 8000, 12000, 1, '2024-01-10', '2024-02-10', 'cerrado', false, new Date(), new Date()],
    ['JOB008', 'Practicante de Ingenieria Electrica', 'Ingenieria Electrica', 'Programa de practicas pre-profesionales para estudiantes de ultimos ciclos de Ingenieria Electrica.', 'Estudiante de 8vo ciclo o superior|Disponibilidad de 6 horas diarias|Conocimiento de AutoCAD|Manejo de Excel avanzado|Interes en sector minero', 'Subvencion S/1,200|Horario flexible|Certificado de practicas|Mentoria|Posibilidad de contratacion', 'Tacna', 'Presencial', 1200, 1200, 2, '2024-02-20', '2024-04-20', 'activo', false, new Date(), new Date()],
  ];

  convocatorias.forEach(conv => sheet.appendRow(conv));

  return `Convocatorias: ${convocatorias.length} registros creados`;
}

/**
 * Cargar postulaciones de prueba
 * Encabezados: id, jobId, jobTitle, fullName, dni, email, phone, linkedIn, coverLetter,
 *              expectedSalary, availability, cvUrl, status, notes, createdAt, updatedAt
 */
function cargarPostulacionesPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'jobId', 'jobTitle', 'fullName', 'dni', 'email', 'phone',
    'linkedIn', 'coverLetter', 'expectedSalary', 'availability',
    'cvUrl', 'status', 'notes', 'createdAt', 'updatedAt'
  ];

  const sheet = recrearHoja(ss, 'postulaciones', encabezados);

  const postulaciones = [
    ['POST001', 'JOB001', 'Desarrollador Full Stack Senior', 'Ricardo Alejandro Flores Mendez', '72345678', 'ricardo.flores@gmail.com', '987654321', 'linkedin.com/in/ricardoflores', 'Soy desarrollador con 4 años de experiencia en React y Node.js. He trabajado en proyectos para el sector financiero y retail.', 5500, 'Inmediata', 'https://drive.google.com/cv1', 'revision', '', new Date(), new Date()],
    ['POST002', 'JOB001', 'Desarrollador Full Stack Senior', 'Mariana Isabel Gutierrez Arias', '72456789', 'mariana.gutierrez@outlook.com', '976543210', 'linkedin.com/in/marianagutierrez', 'Full stack developer con experiencia en startups tecnologicas. Dominio de TypeScript y arquitecturas cloud.', 5000, '15 dias', 'https://drive.google.com/cv2', 'entrevista', 'Perfil muy interesante, agendar entrevista tecnica', new Date(), new Date()],
    ['POST003', 'JOB001', 'Desarrollador Full Stack Senior', 'Jorge Luis Paredes Salazar', '72567890', 'jorge.paredes@gmail.com', '965432109', '', 'Ingeniero de software con background en sistemas distribuidos. Busco nuevos retos profesionales.', 6000, '30 dias', 'https://drive.google.com/cv3', 'pendiente', '', new Date(), new Date()],
    ['POST004', 'JOB002', 'Ingeniero Electricista', 'Alberto Jose Mendoza Ramirez', '72678901', 'alberto.mendoza@gmail.com', '954321098', 'linkedin.com/in/albertomendoza', 'Ingeniero electricista con 6 años en proyectos de alta tension. Experiencia en Southern Peru y Antamina.', 6500, 'Inmediata', 'https://drive.google.com/cv4', 'entrevista', 'Excelente perfil, coordinar con gerencia', new Date(), new Date()],
    ['POST005', 'JOB002', 'Ingeniero Electricista', 'Patricia Carmen Velasquez Cruz', '72789012', 'patricia.velasquez@hotmail.com', '943210987', '', 'Ingeniera electrica colegiada con especializacion en sistemas de potencia.', 5500, '15 dias', 'https://drive.google.com/cv5', 'revision', '', new Date(), new Date()],
    ['POST006', 'JOB003', 'Tecnico en Telecomunicaciones', 'Luis Alberto Condori Mamani', '72890123', 'luis.condori@gmail.com', '932109876', '', 'Tecnico en telecomunicaciones con 3 años de experiencia en instalacion de fibra optica.', 3200, 'Inmediata', 'https://drive.google.com/cv6', 'aceptado', 'Contratado - inicia 01/03', new Date(), new Date()],
    ['POST007', 'JOB003', 'Tecnico en Telecomunicaciones', 'Kevin Fernando Quispe Torres', '72901234', 'kevin.quispe@outlook.com', '921098765', '', 'Experiencia en redes de comunicacion y mantenimiento de equipos de radio.', 3000, 'Inmediata', 'https://drive.google.com/cv7', 'revision', '', new Date(), new Date()],
    ['POST008', 'JOB004', 'Supervisor de Obras Electricas', 'Raul Antonio Apaza Ccama', '73012345', 'raul.apaza@gmail.com', '910987654', 'linkedin.com/in/raulapaza', 'Supervisor con 10 años de experiencia en proyectos mineros. Liderazgo de equipos de hasta 30 personas.', 7500, '30 dias', 'https://drive.google.com/cv8', 'entrevista', 'Segunda entrevista programada', new Date(), new Date()],
    ['POST009', 'JOB005', 'Asistente de Sistemas', 'Daniela Milagros Huanca Ramos', '73123456', 'daniela.huanca@gmail.com', '909876543', '', 'Estudiante de ultimo año de Ingenieria de Sistemas con practicas en soporte tecnico.', 2000, 'Inmediata', 'https://drive.google.com/cv9', 'aceptado', 'Contratada para puesto', new Date(), new Date()],
    ['POST010', 'JOB005', 'Asistente de Sistemas', 'Bryan Eduardo Torres Luna', '73234567', 'bryan.torres@outlook.com', '898765432', '', 'Bachiller en sistemas con conocimiento en desarrollo web y soporte.', 2100, '15 dias', 'https://drive.google.com/cv10', 'rechazado', 'No cumple requisitos minimos', new Date(), new Date()],
    ['POST011', 'JOB006', 'Analista de Datos', 'Claudia Stefany Pari Vilca', '73345678', 'claudia.pari@gmail.com', '887654321', 'linkedin.com/in/claudiapari', 'Analista de datos con experiencia en Python y visualizacion. Certificada en AWS.', 4200, 'Inmediata', 'https://drive.google.com/cv11', 'revision', '', new Date(), new Date()],
    ['POST012', 'JOB008', 'Practicante de Ingenieria Electrica', 'Rodrigo Sebastian Flores Condori', '73456789', 'rodrigo.flores@unsa.edu.pe', '876543210', '', 'Estudiante de 9no ciclo de Ingenieria Electrica UNSA. Disponibilidad completa.', 1200, 'Inmediata', 'https://drive.google.com/cv12', 'entrevista', 'Buen promedio academico', new Date(), new Date()],
  ];

  postulaciones.forEach(post => sheet.appendRow(post));

  return `Postulaciones: ${postulaciones.length} registros creados`;
}

/**
 * Cargar asistencias de prueba (ultimos 7 dias)
 * Encabezados: id, employeeId, employeeName, employeeDni, date, checkIn, checkOut,
 *              checkInLat, checkInLng, checkInAccuracy, checkOutLat, checkOutLng,
 *              checkOutAccuracy, status, hoursWorked, createdAt
 */
function cargarAsistenciasPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'employeeId', 'employeeName', 'employeeDni', 'date',
    'checkIn', 'checkOut', 'checkInLat', 'checkInLng', 'checkInAccuracy',
    'checkOutLat', 'checkOutLng', 'checkOutAccuracy', 'status', 'hoursWorked', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'Asistencias', encabezados);

  const empleados = [
    { id: 'EMP001', name: 'Juan Carlos Perez Mamani', dni: '70123456' },
    { id: 'EMP002', name: 'Maria Elena Garcia Quispe', dni: '70234567' },
    { id: 'EMP003', name: 'Carlos Alberto Lopez Condori', dni: '70345678' },
    { id: 'EMP004', name: 'Ana Patricia Ramos Flores', dni: '70456789' },
    { id: 'EMP005', name: 'Roberto Luis Vargas Ccama', dni: '70567890' },
    { id: 'EMP006', name: 'Lucia Fernanda Huanca Torres', dni: '70678901' },
    { id: 'EMP007', name: 'Diego Fernando Ticona Apaza', dni: '70789012' },
    { id: 'EMP008', name: 'Carmen Rosa Choque Vilca', dni: '70890123' },
    { id: 'EMP009', name: 'Miguel Angel Calizaya Pari', dni: '70901234' },
    { id: 'EMP010', name: 'Sandra Beatriz Mamani Cruz', dni: '71012345' },
  ];

  const hoy = new Date();
  let contador = 0;

  // Generar asistencias para los ultimos 7 dias
  for (let d = 6; d >= 0; d--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - d);
    const fechaStr = Utilities.formatDate(fecha, 'America/Lima', 'yyyy-MM-dd');

    // Saltar fines de semana
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;

    empleados.forEach((emp) => {
      // Simular 80% de asistencia
      if (Math.random() > 0.2) {
        const entradaBase = 8;
        const entradaMin = Math.floor(Math.random() * 30);
        const salidaBase = 17;
        const salidaMin = Math.floor(Math.random() * 45);

        const checkIn = `${String(entradaBase).padStart(2, '0')}:${String(entradaMin).padStart(2, '0')}:00`;
        const checkOut = d === 0 && Math.random() > 0.4 ? '' : `${String(salidaBase).padStart(2, '0')}:${String(salidaMin).padStart(2, '0')}:00`;

        const hoursWorked = checkOut ? ((salidaBase * 60 + salidaMin) - (entradaBase * 60 + entradaMin)) / 60 : 0;

        // Coordenadas aleatorias cerca de Tacna
        const lat = -18.0146 + (Math.random() - 0.5) * 0.01;
        const lng = -70.2536 + (Math.random() - 0.5) * 0.01;

        sheet.appendRow([
          `ATT${String(++contador).padStart(5, '0')}`,
          emp.id,
          emp.name,
          emp.dni,
          fechaStr,
          checkIn,
          checkOut,
          lat.toFixed(6),
          lng.toFixed(6),
          Math.floor(Math.random() * 20) + 5,
          checkOut ? lat.toFixed(6) : '',
          checkOut ? lng.toFixed(6) : '',
          checkOut ? Math.floor(Math.random() * 20) + 5 : '',
          checkOut ? 'completed' : 'in_progress',
          hoursWorked.toFixed(2),
          new Date()
        ]);
      }
    });
  }

  return `Asistencias: ${contador} registros creados`;
}

/**
 * Cargar mensajes de contacto de prueba
 * Encabezados: id, nombre, email, telefono, empresa, asunto, mensaje, estado, createdAt
 */
function cargarContactosPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'nombre', 'email', 'telefono', 'empresa', 'asunto', 'mensaje', 'estado', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'contactos', encabezados);

  const contactos = [
    ['CTT001', 'Fernando Gutierrez', 'fernando.g@minera.com', '999888777', 'Minera del Sur SAC', 'Cotizacion de servicios', 'Buenos dias, estamos interesados en cotizar servicios de mantenimiento electrico para nuestra planta en Moquegua. Por favor contactarnos.', 'nuevo', new Date()],
    ['CTT002', 'Laura Martinez', 'lmartinez@constructora.pe', '988777666', 'Constructora Andina', 'Proyecto de automatizacion', 'Necesitamos implementar un sistema de control automatizado para una nueva linea de produccion. Quisiera agendar una reunion.', 'respondido', new Date()],
    ['CTT003', 'Carlos Rojas', 'crojas@agroexport.com', '977666555', 'AgroExport Peru', 'Instalacion electrica', 'Requerimos instalacion electrica para nuevo almacen de 2000m2. Urgente cotizacion.', 'en_proceso', new Date()],
    ['CTT004', 'Maria Sanchez', 'msanchez@municipalidad.gob.pe', '966555444', 'Municipalidad Provincial', 'Consulta tecnica', 'Solicitamos informacion sobre sus servicios de consultoria en proyectos de alumbrado publico LED.', 'nuevo', new Date()],
    ['CTT005', 'Roberto Diaz', 'rdiaz@industriasperu.com', '955444333', 'Industrias Peru SA', 'Mantenimiento preventivo', 'Interesados en contratar servicio de mantenimiento preventivo mensual para nuestras instalaciones electricas.', 'respondido', new Date()],
  ];

  contactos.forEach(cont => sheet.appendRow(cont));

  return `Contactos: ${contactos.length} registros creados`;
}

/**
 * Cargar usuarios del sistema
 * Encabezados: id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id
 * IMPORTANTE: login() espera: [2]=email, [3]=password, [6]='activo' (string)
 */
function cargarUsuariosPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Estructura de 10 columnas que coincide con lo que espera login()
  const encabezados = [
    'id', 'nombre', 'email', 'password', 'rol', 'permisos', 'estado', 'ultimo_acceso', 'fecha_creacion', 'empleado_id'
  ];

  const sheet = recrearHoja(ss, 'usuarios', encabezados);

  // IMPORTANTE: El admin principal siempre es supervisor1telcom@gmail.com / DARWINTELCOM2026
  // Estructura: [id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id]
  const usuarios = [
    ['USR001', 'Supervisor Telcom', 'supervisor1telcom@gmail.com', 'DARWINTELCOM2026', 'admin', 'all', 'activo', '', new Date(), ''],
    ['USR002', 'Gerente General', 'gerencia@telcom.pe', 'gerencia123', 'manager', 'empleados,proyectos,reportes', 'activo', '', new Date(), ''],
    ['USR003', 'Juan Carlos Perez Mamani', 'juan.perez@telcom.pe', 'emp12345', 'employee', 'asistencia,boletas', 'activo', '', new Date(), 'EMP001'],
    ['USR004', 'Maria Elena Garcia Quispe', 'maria.garcia@telcom.pe', 'emp23456', 'employee', 'asistencia,boletas', 'activo', '', new Date(), 'EMP002'],
    ['USR005', 'Recursos Humanos', 'rrhh@telcom.pe', 'rrhh2024', 'manager', 'empleados,postulaciones,reportes', 'activo', '', new Date(), ''],
  ];

  usuarios.forEach(usr => sheet.appendRow(usr));

  return `Usuarios: ${usuarios.length} registros creados`;
}

/**
 * Formatear cabecera de una hoja
 */
function formatearCabecera(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a365d');
  headerRange.setFontColor('white');
  sheet.setFrozenRows(1);
}

/**
 * Cargar historial de empleados de prueba
 * Encabezados: id, employeeId, tipo, descripcion, fecha, responsable, notas, createdAt
 */
function cargarHistorialEmpleadosPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const encabezados = [
    'id', 'employeeId', 'tipo', 'descripcion', 'fecha', 'responsable', 'notas', 'createdAt'
  ];

  const sheet = recrearHoja(ss, 'historial_empleados', encabezados);

  const historial = [
    ['HIST001', 'EMP001', 'contratacion', 'Ingreso a la empresa como Desarrollador Junior', '2020-03-15', 'Veronica Castillo', 'Contratacion directa post-pasantia', new Date()],
    ['HIST002', 'EMP001', 'ascenso', 'Promocion a Desarrollador Senior', '2022-06-01', 'Gerencia General', 'Excelente desempeño en proyecto Volcan', new Date()],
    ['HIST003', 'EMP002', 'contratacion', 'Ingreso como Ingeniero Electrico', '2019-06-01', 'Miguel Calizaya', 'Experiencia previa en Southern Peru', new Date()],
    ['HIST004', 'EMP003', 'contratacion', 'Ingreso como Tecnico TIC', '2021-09-10', 'Veronica Castillo', 'Recomendado por cliente Minsur', new Date()],
    ['HIST005', 'EMP004', 'ascenso', 'Promocion a Supervisora de Proyectos', '2020-01-15', 'Gerencia General', 'Liderazgo destacado', new Date()],
    ['HIST006', 'EMP009', 'ascenso', 'Promocion a Jefe de Proyectos', '2019-01-01', 'Gerencia General', '10 años de experiencia', new Date()],
    ['HIST007', 'EMP013', 'licencia', 'Licencia por enfermedad', '2024-01-15', 'RRHH', 'Licencia medica por 30 dias', new Date()],
    ['HIST008', 'EMP010', 'capacitacion', 'Curso React Avanzado completado', '2023-08-20', 'Juan Perez', 'Certificacion obtenida', new Date()],
    ['HIST009', 'EMP007', 'reconocimiento', 'Empleado del mes', '2024-01-31', 'Gerencia General', 'Proyecto Toquepala terminado antes de tiempo', new Date()],
    ['HIST010', 'EMP012', 'capacitacion', 'Curso de Gestion de RRHH', '2023-05-10', 'Externo', 'Certificacion SHRM', new Date()],
  ];

  historial.forEach(h => sheet.appendRow(h));

  return `Historial Empleados: ${historial.length} registros creados`;
}

/**
 * Limpiar todos los datos de prueba (CUIDADO!)
 * Esta funcion elimina TODOS los datos pero mantiene las hojas
 */
function limpiarDatosPrueba() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hojas = ['empleados', 'proyectos', 'asignaciones', 'convocatorias', 'postulaciones', 'Asistencias', 'contactos', 'usuarios', 'historial_empleados'];

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }
  });

  return 'Datos de prueba eliminados (se mantuvieron las cabeceras)';
}


// ============================================================
// MODULO CAPACITACIONES Y EVALUACIONES
// ============================================================

// --- Helpers ---

function seededRandom(seed) {
  var s = (seed >>> 0) || 1;
  return function() {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967295;
  };
}

function normalizar(str) {
  return (str || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchFlexible(respuesta, correcta) {
  return normalizar(respuesta) === normalizar(correcta);
}

function shuffleArray(arr, rng) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// --- CRUD Capacitaciones ---

function getCapacitaciones() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) { return rowToObject(headers, r); })
    .filter(function(c) { return c.estado === 'activo'; });
  return { success: true, data: rows };
}

function getCapacitacionById(id) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return { success: true, data: rowToObject(headers, data[i]) };
    }
  }
  return { success: false, error: 'Capacitacion no encontrada' };
}

function crearCapacitacion(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja capacitaciones no encontrada' };
  var id = 'CAP' + Utilities.getUuid().substring(0, 8).toUpperCase();
  sheet.appendRow([
    id,
    data.titulo || '',
    data.descripcion || '',
    data.material_url || '',
    data.categoria || '',
    data.num_preguntas || 15,
    data.nota_minima || 14,
    data.tiempo_limite_min || 30,
    data.foto_intervalo_seg || 20,
    data.estado || 'borrador',
    new Date().toISOString()
  ]);
  return { success: true, data: { id: id }, message: 'Capacitacion creada' };
}

function actualizarCapacitacion(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      var fieldMap = {
        titulo: data.titulo, descripcion: data.descripcion,
        material_url: data.material_url, categoria: data.categoria,
        num_preguntas: data.num_preguntas, nota_minima: data.nota_minima,
        tiempo_limite_min: data.tiempo_limite_min, foto_intervalo_seg: data.foto_intervalo_seg,
        estado: data.estado
      };
      headers.forEach(function(h, col) {
        if (fieldMap.hasOwnProperty(h) && fieldMap[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(fieldMap[h]);
        }
      });
      return { success: true, message: 'Capacitacion actualizada' };
    }
  }
  return { success: false, error: 'Capacitacion no encontrada' };
}

function eliminarCapacitacion(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('capacitaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Capacitacion eliminada' };
    }
  }
  return { success: false, error: 'Capacitacion no encontrada' };
}

// --- CRUD Banco de Preguntas ---

function crearPregunta(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja banco_preguntas no encontrada' };
  var id = 'PQ' + Utilities.getUuid().substring(0, 8).toUpperCase();
  sheet.appendRow([
    id,
    data.capacitacion_id || '',
    data.pregunta || '',
    data.tipo || 'multiple',
    data.opcion_a || '',
    data.opcion_b || '',
    data.opcion_c || '',
    data.opcion_d || '',
    data.respuesta_correcta || '',
    data.justificacion || '',
    data.dificultad || 'media',
    data.puntaje || 1,
    data.estado || 'activa'
  ]);
  return { success: true, data: { id: id }, message: 'Pregunta creada' };
}

function actualizarPregunta(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      var fieldMap = {
        pregunta: data.pregunta, tipo: data.tipo,
        opcion_a: data.opcion_a, opcion_b: data.opcion_b,
        opcion_c: data.opcion_c, opcion_d: data.opcion_d,
        respuesta_correcta: data.respuesta_correcta,
        justificacion: data.justificacion, dificultad: data.dificultad,
        puntaje: data.puntaje, estado: data.estado
      };
      headers.forEach(function(h, col) {
        if (fieldMap.hasOwnProperty(h) && fieldMap[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(fieldMap[h]);
        }
      });
      return { success: true, message: 'Pregunta actualizada' };
    }
  }
  return { success: false, error: 'Pregunta no encontrada' };
}

function eliminarPregunta(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('banco_preguntas');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Pregunta eliminada' };
    }
  }
  return { success: false, error: 'Pregunta no encontrada' };
}

// --- Evaluaciones ---

function iniciarEvaluacion(data) {
  var capacitacion_id = data.capacitacion_id;
  var dni = String(data.dni || '').trim();
  var nombres = data.nombres || '';
  var email = data.email || '';

  if (!capacitacion_id || !dni || !nombres || !email) {
    return { success: false, error: 'Faltan campos obligatorios: capacitacion_id, dni, nombres, email' };
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);

  var capResult = getCapacitacionById(capacitacion_id);
  if (!capResult.success) return { success: false, error: 'Capacitacion no encontrada' };
  var cap = capResult.data;
  if (cap.estado !== 'activo') return { success: false, error: 'Esta capacitacion no esta disponible' };

  // Verificar intento unico
  var evalSheet = ss.getSheetByName('evaluaciones');
  if (!evalSheet) return { success: false, error: 'Hoja evaluaciones no encontrada' };
  var evalData = evalSheet.getDataRange().getValues();
  var evalHeaders = evalData[0];
  var capIdCol = evalHeaders.indexOf('capacitacion_id');
  var dniCol2 = evalHeaders.indexOf('dni');
  var estadoCol = evalHeaders.indexOf('estado');
  for (var i = 1; i < evalData.length; i++) {
    if (String(evalData[i][capIdCol]) === String(capacitacion_id) &&
        String(evalData[i][dniCol2]) === dni &&
        evalData[i][estadoCol] !== 'abandonado') {
      return { success: false, error: 'Ya existe un intento registrado para esta capacitacion con este DNI' };
    }
  }

  // Cargar preguntas activas
  var bancoSheet = ss.getSheetByName('banco_preguntas');
  if (!bancoSheet) return { success: false, error: 'Banco de preguntas no encontrado' };
  var bancoData = bancoSheet.getDataRange().getValues();
  var bancoHeaders = bancoData[0];
  var bCapCol = bancoHeaders.indexOf('capacitacion_id');
  var bEstCol = bancoHeaders.indexOf('estado');
  var todasPreguntas = [];
  for (var j = 1; j < bancoData.length; j++) {
    if (String(bancoData[j][bCapCol]) === String(capacitacion_id) &&
        bancoData[j][bEstCol] === 'activa') {
      todasPreguntas.push(rowToObject(bancoHeaders, bancoData[j]));
    }
  }
  if (todasPreguntas.length === 0) {
    return { success: false, error: 'No hay preguntas activas para esta capacitacion' };
  }

  var seed = parseInt(dni.replace(/\D/g, ''), 10) || 12345678;
  var rng = seededRandom(seed);
  var numPreguntass = parseInt(cap.num_preguntas, 10) || 15;

  var faciles = todasPreguntas.filter(function(p) { return p.dificultad === 'facil'; });
  var medias  = todasPreguntas.filter(function(p) { return p.dificultad === 'media'; });
  var dificiles = todasPreguntas.filter(function(p) { return p.dificultad === 'dificil'; });
  var seleccionadas = [];

  if (faciles.length > 0 || medias.length > 0 || dificiles.length > 0) {
    var nFacil = Math.round(numPreguntass * 0.30);
    var nDificil = Math.round(numPreguntass * 0.20);
    var nMedia = numPreguntass - nFacil - nDificil;
    seleccionadas = seleccionadas
      .concat(shuffleArray(faciles, rng).slice(0, nFacil))
      .concat(shuffleArray(medias, rng).slice(0, nMedia))
      .concat(shuffleArray(dificiles, rng).slice(0, nDificil));
    if (seleccionadas.length < numPreguntass) {
      var todas = shuffleArray(todasPreguntas, rng);
      var ids = seleccionadas.map(function(p) { return p.id; });
      for (var k = 0; k < todas.length && seleccionadas.length < numPreguntass; k++) {
        if (ids.indexOf(todas[k].id) < 0) seleccionadas.push(todas[k]);
      }
    }
  } else {
    seleccionadas = shuffleArray(todasPreguntas, rng).slice(0, numPreguntass);
  }

  var preguntasParaCliente = seleccionadas.map(function(p, idx) {
    var rngP = seededRandom(seed + idx + 1);
    var opciones = [];
    if (p.opcion_a) opciones.push({ key: 'A', texto: p.opcion_a });
    if (p.opcion_b) opciones.push({ key: 'B', texto: p.opcion_b });
    if (p.opcion_c) opciones.push({ key: 'C', texto: p.opcion_c });
    if (p.opcion_d) opciones.push({ key: 'D', texto: p.opcion_d });
    return {
      id: p.id,
      pregunta: p.pregunta,
      tipo: p.tipo,
      opciones: shuffleArray(opciones, rngP),
      puntaje: p.puntaje
    };
  });

  var evalId = 'EVAL' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var horaInicio = new Date().toISOString();
  var preguntasIds = JSON.stringify(seleccionadas.map(function(p) { return p.id; }));
  evalSheet.appendRow([
    evalId, capacitacion_id, dni, nombres, email,
    preguntasIds, '', '', 0, '',
    horaInicio, '', '', 'en_curso',
    '', '', '', ''
  ]);

  return {
    success: true,
    data: {
      evaluacion_id: evalId,
      preguntas: preguntasParaCliente,
      config: {
        tiempo_limite_min: cap.tiempo_limite_min || 30,
        foto_intervalo_seg: cap.foto_intervalo_seg || 20,
        nota_minima: cap.nota_minima || 14,
        titulo: cap.titulo
      }
    }
  };
}

function submitEvaluacion(requestData) {
  var evaluacion_id = requestData.evaluacion_id;
  var respuestas = requestData.respuestas;
  var salidas_pestana = requestData.salidas_pestana || 0;
  var fotos_url = requestData.fotos_url || '';
  var duracion_seg = requestData.duracion_seg || 0;

  if (!evaluacion_id) return { success: false, error: 'evaluacion_id requerido' };

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var evalSheet = ss.getSheetByName('evaluaciones');
  if (!evalSheet) return { success: false, error: 'Hoja evaluaciones no encontrada' };

  var evalData = evalSheet.getDataRange().getValues();
  var evalHeaders = evalData[0];
  var rowIdx = -1;
  var evalRow = null;
  var idCol = evalHeaders.indexOf('id');
  for (var i = 1; i < evalData.length; i++) {
    if (String(evalData[i][idCol]) === String(evaluacion_id)) {
      rowIdx = i + 1;
      evalRow = rowToObject(evalHeaders, evalData[i]);
      break;
    }
  }
  if (!evalRow) return { success: false, error: 'Evaluacion no encontrada' };
  if (evalRow.estado !== 'en_curso') return { success: false, error: 'Esta evaluacion ya fue enviada' };

  var preguntasIds = [];
  try { preguntasIds = JSON.parse(evalRow.preguntas_asignadas || '[]'); } catch(e) {}

  var bancoSheet = ss.getSheetByName('banco_preguntas');
  var bancoPorId = {};
  if (bancoSheet) {
    var bancoData = bancoSheet.getDataRange().getValues();
    var bHeaders = bancoData[0];
    for (var j = 1; j < bancoData.length; j++) {
      var pObj = rowToObject(bHeaders, bancoData[j]);
      bancoPorId[pObj.id] = pObj;
    }
  }

  var puntajeAuto = 0;
  var respObj = typeof respuestas === 'string' ? JSON.parse(respuestas) : (respuestas || {});
  var tieneLlenado = false;
  preguntasIds.forEach(function(pid) {
    var p = bancoPorId[pid];
    if (!p) return;
    var resp = respObj[pid];
    if (p.tipo === 'multiple') {
      if (normalizar(resp) === normalizar(p.respuesta_correcta)) {
        puntajeAuto += Number(p.puntaje) || 1;
      }
    } else {
      tieneLlenado = true;
      if (matchFlexible(resp, p.respuesta_correcta)) {
        puntajeAuto += Number(p.puntaje) || 1;
      }
    }
  });

  var updateMap = {
    respuestas: JSON.stringify(respObj),
    puntaje_auto: puntajeAuto,
    salidas_pestana: salidas_pestana,
    fotos_url: typeof fotos_url === 'string' ? fotos_url : JSON.stringify(fotos_url),
    hora_fin: new Date().toISOString(),
    duracion_seg: duracion_seg,
    estado: 'pendiente_revision'
  };
  evalHeaders.forEach(function(h, col) {
    if (updateMap.hasOwnProperty(h)) {
      evalSheet.getRange(rowIdx, col + 1).setValue(updateMap[h]);
    }
  });

  return {
    success: true,
    data: { puntaje_auto: puntajeAuto, tiene_llenado: tieneLlenado },
    message: 'Evaluacion recibida. Tu resultado llegara a tu correo tras revision.'
  };
}

function getEvaluaciones(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('evaluaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var result = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) { return rowToObject(headers, r); });
  if (data && data.estado) result = result.filter(function(e) { return e.estado === data.estado; });
  if (data && data.capacitacion_id) result = result.filter(function(e) { return String(e.capacitacion_id) === String(data.capacitacion_id); });
  result.sort(function(a, b) { return String(b.hora_inicio) > String(a.hora_inicio) ? 1 : -1; });
  return { success: true, data: result };
}

function revisarEvaluacion(data) {
  var id = data.id;
  var nota_final = data.nota_final;
  var retroalimentacion = data.retroalimentacion || '';
  var estado = data.estado;

  if (!id || nota_final === undefined || !estado) return { success: false, error: 'Faltan campos: id, nota_final, estado' };
  if (['aprobado', 'observado'].indexOf(estado) < 0) return { success: false, error: 'Estado debe ser aprobado u observado' };

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('evaluaciones');
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var rowIdx = -1;
  var evalRow = null;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      rowIdx = i + 1;
      evalRow = rowToObject(headers, rows[i]);
      break;
    }
  }
  if (!evalRow) return { success: false, error: 'Evaluacion no encontrada' };

  var updateMap = {
    nota_final: nota_final,
    retroalimentacion: retroalimentacion,
    estado: estado,
    revisado_por: data.revisado_por || 'Admin',
    fecha_revision: new Date().toISOString()
  };
  headers.forEach(function(h, col) {
    if (updateMap.hasOwnProperty(h)) sheet.getRange(rowIdx, col + 1).setValue(updateMap[h]);
  });

  var capResult = getCapacitacionById(evalRow.capacitacion_id);
  var tituloCap = capResult.success ? capResult.data.titulo : 'Capacitacion';

  try {
    var emailDest = evalRow.email;
    if (emailDest && emailDest.indexOf('@') > 0) {
      var estadoLabel = estado === 'aprobado' ? 'APROBADO' : 'OBSERVADO';
      var colorEstado = estado === 'aprobado' ? '#16a34a' : '#d97706';
      MailApp.sendEmail({
        to: emailDest,
        subject: 'Resultado Evaluacion: ' + tituloCap + ' - ' + estadoLabel,
        htmlBody: '<p>Estimado/a <strong>' + evalRow.nombres + '</strong>,</p>' +
          '<p>Hemos revisado tu evaluacion de <strong>' + tituloCap + '</strong>.</p>' +
          '<table style="border-collapse:collapse;margin:16px 0"><tr>' +
          '<td style="padding:6px 16px;background:#f1f5f9"><strong>Resultado</strong></td>' +
          '<td style="padding:6px 16px;color:' + colorEstado + '"><strong>' + estadoLabel + '</strong></td></tr>' +
          '<tr><td style="padding:6px 16px;background:#f1f5f9"><strong>Nota</strong></td>' +
          '<td style="padding:6px 16px"><strong>' + nota_final + '</strong></td></tr></table>' +
          (retroalimentacion ? '<p><strong>Retroalimentacion del evaluador:</strong><br>' + retroalimentacion + '</p>' : '') +
          '<p>Att,<br><strong>Ingenieria Telcom EIRL</strong></p>'
      });
    }
  } catch(mailErr) {
    return { success: true, message: 'Revision guardada. Error al enviar correo: ' + mailErr.message };
  }

  return { success: true, message: 'Revision guardada y correo enviado a ' + evalRow.email };
}

function guardarFotoWebcam(data) {
  var fileContent = data.fileContent;
  var fileName = data.fileName || ('foto_' + new Date().getTime() + '.jpg');
  var mimeType = data.mimeType || 'image/jpeg';
  var capacitacion_id = data.capacitacion_id || 'general';
  var dni = data.dni || 'sin_dni';
  var evaluacion_id = data.evaluacion_id || '';

  if (!fileContent) return { success: false, error: 'fileContent requerido' };

  try {
    var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var proctoringFolder = getOrCreateFolder(mainFolder, 'Evaluaciones_Proctoring');
    var capFolder = getOrCreateFolder(proctoringFolder, String(capacitacion_id));
    var dniFolder = getOrCreateFolder(capFolder, String(dni));

    var blob = Utilities.newBlob(Utilities.base64Decode(fileContent), mimeType, fileName);
    var file = dniFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fotoUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';

    if (evaluacion_id) {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var fotosSheet = ss.getSheetByName('eval_fotos');
      if (fotosSheet) {
        fotosSheet.appendRow([
          Utilities.getUuid(), evaluacion_id, fotoUrl, new Date().toISOString(), fotosSheet.getLastRow()
        ]);
      }
    }
    return { success: true, data: { foto_url: fotoUrl, foto_id: file.getId() } };
  } catch(e) {
    return { success: false, error: 'Error al guardar foto: ' + e.message };
  }
}

function registrarEventoLog(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('eval_logs');
  if (!sheet) return { success: false, error: 'Hoja eval_logs no encontrada' };
  sheet.appendRow([
    Utilities.getUuid(),
    data.evaluacion_id || '',
    data.tipo_evento || 'desconocido',
    data.detalle || '',
    new Date().toISOString()
  ]);
  return { success: true };
}

// ============================================================
// FIN MODULO CAPACITACIONES Y EVALUACIONES
// ============================================================
