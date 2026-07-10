// ============================================================
// BOLSA DE TRABAJO — convocatorias, postulaciones y contacto
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
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
  return withLock_(function () {
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
  });
}

function updateJob(data) {
  return withLock_(function () {
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
  });
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
  return withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
    const jobs = sheet.getDataRange().getValues();

    for (let i = 1; i < jobs.length; i++) {
      if (jobs[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Convocatoria eliminada' };
      }
    }

    return { success: false, error: 'Convocatoria no encontrada' };
  });
}

// ============================================
// POSTULACIONES
// ============================================
function submitApplication(data) {
  // Validar CV subido (si viene) antes de procesar nada mas
  if (data.cvBase64 && data.cvFileName) {
    const cvError = validarArchivoSubido_(data.cvBase64, data.cvMimeType, 'documento');
    if (cvError) return cvError;
  }

  // Rate limit por DNI para evitar spam de postulaciones
  const rlError = checkRateLimit_('apply:' + data.dni, 5);
  if (rlError) return rlError;

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');

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

  const result = withLock_(function () {
    const id = generateSequentialId('postulaciones', 'PO');
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

    return { success: true, data: { id: id, cvUrl: cvUrl }, message: 'Postulacion enviada' };
  });

  // Notificacion por correo fuera del lock (no es parte de la seccion critica)
  if (result.success) {
    data.cvUrl = cvUrl;
    data.jobTitle = jobTitle;
    sendApplicationNotification(data);
  }

  return result;
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
  const rlError = checkRateLimit_('contact:' + (data.email || 'anon'), 10);
  if (rlError) return rlError;

  const result = withLock_(function () {
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

    return { success: true, data: { id: id }, message: 'Mensaje enviado' };
  });

  if (result.success) {
    sendContactNotification(data);
  }

  return result;
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
        createdAt: normalizeCellValue_(data[i][createdAtCol])
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

  // PII enmascarada: este endpoint es publico y consultable con cualquier DNI,
  // asi que email/telefono nunca se devuelven completos.
  return {
    success: true,
    data: {
      postulante: {
        nombre: postulacion.fullName,
        dni: postulacion.dni,
        email: maskEmail_(postulacion.email),
        telefono: maskPhone_(postulacion.phone)
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

// Enmascara PII para respuestas de endpoints publicos (consultables por cualquier DNI)
function maskEmail_(email) {
  const s = String(email || '').trim();
  if (!s) return '';
  const at = s.indexOf('@');
  if (at <= 0) return '***';
  return s.slice(0, Math.min(2, at)) + '***' + s.slice(at);
}

function maskPhone_(phone) {
  const s = String(phone || '').trim();
  if (!s) return '';
  if (s.length <= 3) return '***';
  return '***' + s.slice(-3);
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

  // WHITELIST de campos: endpoint publico — antes volcaba la fila completa,
  // incluyendo cv_url, email y telefono de cualquier postulante (fuga de PII).
  const col = (names) => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const idCol = col(['id']);
  const jobIdCol = col(['jobId', 'convocatoria_id']);
  const jobTitleCol = col(['jobTitle']);
  const statusCol = col(['status', 'estado']);
  const createdAtCol = col(['createdAt', 'fecha_postulacion']);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][dniCol]) === String(dni)) {
      postulaciones.push({
        id: idCol >= 0 ? data[i][idCol] : '',
        jobId: jobIdCol >= 0 ? data[i][jobIdCol] : '',
        jobTitle: jobTitleCol >= 0 ? data[i][jobTitleCol] : '',
        status: (statusCol >= 0 ? data[i][statusCol] : '') || 'pendiente',
        createdAt: createdAtCol >= 0 ? data[i][createdAtCol] : ''
      });
    }
  }

  return { success: true, data: postulaciones };
}
