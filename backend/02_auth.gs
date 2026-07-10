// ============================================================
// AUTH — login, tokens HMAC y usuarios
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// Verify token and return user data
function verifyTokenAction(token) {
  const userId = parseToken_(token);
  if (!userId) {
    return { success: false, error: 'Token invalido o expirado' };
  }

  try {

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

// Create credentials for existing employee.
// El roster real vive hoy en la hoja 'sueldos' y el frontend identifica a
// cada trabajador con id 'SUE-<dni>'. Se mantiene el fallback a la hoja
// legacy 'empleados' por si llega un id EMP0xx antiguo.
function createCredentialsForEmployee(data) {
  return withLock_(function () {
    let employee = null;

    if (typeof data.employeeId === 'string' && data.employeeId.indexOf('SUE-') === 0) {
      const dni = data.employeeId.substring('SUE-'.length);
      const trabajador = leerRosterReal_().filter(function (t) { return t.dni === dni; })[0];
      if (!trabajador) {
        return { success: false, error: 'Empleado no encontrado' };
      }
      if (!trabajador.email) {
        return { success: false, error: 'El trabajador no tiene email registrado en sueldos' };
      }
      employee = {
        id: data.employeeId,
        nombre: trabajador.nombre,
        email: trabajador.email
      };
    } else {
      const empSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
      const employees = empSheet.getDataRange().getValues();

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
    }

    // Check if user already exists
    const userSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const users = userSheet.getDataRange().getValues();

    for (let i = 1; i < users.length; i++) {
      if (users[i][9] === data.employeeId) {
        return { success: false, error: 'El empleado ya tiene credenciales' };
      }
    }

    // Create user (createUser ya hashea la password internamente). Apps Script
    // ejecuta cada request en un unico hilo, asi que volver a pedir el mismo
    // ScriptLock aqui dentro no bloquea: el lock ya lo tiene esta misma ejecucion.
    const result = createUser({
      nombre: employee.nombre,
      email: employee.email,
      rol: 'empleado',
      permisos: ['ver_perfil', 'ver_proyectos'],
      empleadoId: employee.id
    });

    return result;
  });
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

    if (email === data.email && isActive && verificarPassword_(userId, data.password, password)) {
      const token = generateToken(userId);

      // Upgrade-on-login: si la contrasena todavia estaba en texto plano,
      // se reemplaza por su hash para ir limpiando la hoja sola.
      if (typeof password !== 'string' || password.indexOf('sha256:') !== 0) {
        const passwordCol = isStructureA ? 3 : 4; // columna 3 (estructura A) o 4 (estructura B), base 1
        sheet.getRange(i + 1, passwordCol).setValue(hashPassword_(userId, data.password));
      }

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

// Token firmado HMAC-SHA256: base64(userId|timestamp) + '.' + base64(firma).
// El secreto NUNCA viaja dentro del token (el formato anterior base64 lo incluia:
// cualquier admin podia extraerlo de su propio token en localStorage).
function generateToken(userId) {
  const payload = userId + '|' + new Date().getTime();
  const signature = Utilities.computeHmacSha256Signature(payload, getTokenSecret_());
  return Utilities.base64EncodeWebSafe(payload) + '.' + Utilities.base64EncodeWebSafe(signature);
}

// Devuelve el userId si el token es valido (firma correcta y < 24h); null si no.
function parseToken_(token) {
  if (!token) return null;
  try {
    const parts = String(token).split('.');
    if (parts.length !== 2) return null;

    const payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    const expected = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(payload, getTokenSecret_())
    );
    if (expected !== parts[1]) return null;

    const pieces = payload.split('|');
    const timestamp = parseInt(pieces[1], 10);
    if (!timestamp || new Date().getTime() - timestamp > 24 * 60 * 60 * 1000) {
      return null; // expirado (24 horas)
    }
    return pieces[0];
  } catch (e) {
    return null;
  }
}

function validateToken(token) {
  return parseToken_(token) !== null;
}

// ============================================
// ROLES — cache de rol admin por userId (evita leer 'usuarios' en cada request)
// ============================================
// Roles/permisos que el router considera nivel 'admin'.
var ROLES_ADMIN_ = ['admin', 'administrador', 'manager', 'supervisor', 'rrhh'];

function esRolAdmin_(userId) {
  if (!userId) return false;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'rol:' + userId;
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached === '1';
  }

  let esAdmin = false;
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const users = sheet.getDataRange().getValues();
    const headers = users[0];
    const isStructureA = headers[1] === 'email' || headers[1]?.toLowerCase() === 'email';

    for (let i = 1; i < users.length; i++) {
      const row = users[i];
      if (row[0] !== userId) continue;

      let rol, permisos, isActive;
      if (isStructureA) {
        rol = row[4];
        permisos = row[4] === 'admin' ? ['all'] : [];
        isActive = row[6] === true || row[6] === 'true' || row[6] === 'activo' || row[6] === 'TRUE';
      } else {
        rol = row[4];
        permisos = row[5] ? row[5].toString().split(',') : [];
        isActive = row[6] === 'activo';
      }

      if (!isActive) break;

      const rolNorm = String(rol || '').toLowerCase().trim();
      const permisosNorm = permisos.map(function (p) { return String(p || '').toLowerCase().trim(); });
      esAdmin = ROLES_ADMIN_.indexOf(rolNorm) >= 0 || permisosNorm.indexOf('all') >= 0;
      break;
    }
  } catch (e) {
    esAdmin = false;
  }

  cache.put(cacheKey, esAdmin ? '1' : '0', 300);
  return esAdmin;
}

// ============================================
// PASSWORDS — hash SHA-256 con userId como salt por usuario
// ============================================
// Hoy las contrasenas viven en texto plano en la hoja (brecha A7). Se migran
// a hash de forma incremental: cada login/creacion nueva ya queda hasheada.
// NOTA: no se usa TOKEN_SECRET como salt porque rotarlo invalidaria todas
// las contrasenas existentes (el secreto de token se rota para forzar re-login).
function hashPassword_(userId, password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(userId) + ':' + String(password),
    Utilities.Charset.UTF_8
  );
  return 'sha256:' + Utilities.base64Encode(digest);
}

// Compara una contrasena ingresada contra la almacenada. Soporta hash nuevo
// (prefijo 'sha256:') y contrasenas legacy en texto plano.
function verificarPassword_(userId, passwordIngresada, almacenada) {
  if (typeof almacenada === 'string' && almacenada.indexOf('sha256:') === 0) {
    return hashPassword_(userId, passwordIngresada) === almacenada;
  }
  return almacenada === passwordIngresada;
}

function createUser(data) {
  return withLock_(function () {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    const id = generateSequentialId('usuarios', 'USR');

    // Generar password temporal (se envia en claro por email, se guarda hasheada)
    const tempPassword = generateTempPassword();

    const row = [
      id,
      data.nombre,
      data.email,
      hashPassword_(id, tempPassword),
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
  });
}

function changePassword(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();

  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === data.userId && verificarPassword_(data.userId, data.currentPassword, users[i][3])) {
      sheet.getRange(i + 1, 4).setValue(hashPassword_(data.userId, data.newPassword));
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
      sheet.getRange(i + 1, 4).setValue(hashPassword_(users[i][0], tempPassword));

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
// Ejecutar esta funcion manualmente si necesitas crear/recuperar el admin.
// SEGURIDAD: ya no hay contrasena hardcodeada (este repo es publico):
// se genera una temporal, se guarda hasheada y se envia por email al admin.
// ============================================
function createDefaultAdmin() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
  const users = sheet.getDataRange().getValues();

  const adminEmail = 'supervisor1telcom@gmail.com';
  const adminPassword = generateTempPassword();

  // Buscar si ya existe
  for (let i = 1; i < users.length; i++) {
    if (users[i][2] === adminEmail) {
      const existingId = users[i][0];
      // Actualizar password y asegurar que este activo
      sheet.getRange(i + 1, 4).setValue(hashPassword_(existingId, adminPassword)); // password
      sheet.getRange(i + 1, 5).setValue('admin'); // rol
      sheet.getRange(i + 1, 6).setValue('all'); // permisos
      sheet.getRange(i + 1, 7).setValue('activo'); // estado
      sendCredentialsEmail(adminEmail, users[i][1] || 'Supervisor Telcom', adminPassword);
      return 'Usuario admin actualizado: ' + adminEmail + '. Contrasena temporal enviada por email.';
    }
  }

  // Si no existe, crearlo
  const id = generateSequentialId('usuarios', 'USR');
  sheet.appendRow([
    id,
    'Supervisor Telcom',
    adminEmail,
    hashPassword_(id, adminPassword),
    'admin',
    'all',
    'activo',
    '',
    new Date(),
    ''
  ]);

  sendCredentialsEmail(adminEmail, 'Supervisor Telcom', adminPassword);
  return 'Usuario admin creado: ' + adminEmail + ' con ID: ' + id + '. Contrasena temporal enviada por email.';
}
