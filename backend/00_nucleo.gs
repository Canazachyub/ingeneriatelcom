// ============================================================
// NUCLEO — configuracion y helpers compartidos
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
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

// SEGURIDAD: el secreto que firma los tokens vive en Script Properties, NUNCA en el codigo
// (este archivo esta en un repo publico de GitHub). Configurar en el editor de Apps Script:
// Configuracion del proyecto > Propiedades del script > TOKEN_SECRET = <valor largo aleatorio>
// Rotar el valor invalida todos los tokens emitidos (fuerza re-login de admins).
function getTokenSecret_() {
  const secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
  if (!secret) {
    throw new Error('TOKEN_SECRET no configurado en Propiedades del Script');
  }
  return secret;
}

// Get or create a subfolder by name inside a parent folder
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

// Variante con cache de IDs de carpeta (CacheService, 6h). En horas punta
// (07:30, 14:00) cada getFoldersByName/createFolder es una llamada a la API
// de Drive y Google aplica rate limit por rafaga ("Service invoked too many
// times") — con los IDs cacheados una subida pasa de ~6 llamadas a ~2.
// getId() sobre un objeto ya obtenido es local (no llama a la API).
function getOrCreateFolderCached_(parentFolder, folderName) {
  const cacheKey = 'fld:' + parentFolder.getId() + '/' + folderName;
  try {
    const cachedId = CacheService.getScriptCache().get(cacheKey);
    if (cachedId) return DriveApp.getFolderById(cachedId);
  } catch (e) { /* cache caido o carpeta borrada: seguir por la via normal */ }
  const folder = getOrCreateFolder(parentFolder, folderName);
  try {
    CacheService.getScriptCache().put(cacheKey, folder.getId(), 21600);
  } catch (e) { /* no critico */ }
  return folder;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
// UTILIDADES
// ============================================

// Normaliza un valor de celda: los Date de Sheets se serializan como ISO con
// offset America/Lima (-05:00) para que el frontend muestre la hora correcta.
// (Antes cada lector normalizaba por su cuenta — o no lo hacia: bug -12:20.)
function normalizeCellValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'America/Lima', "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return value;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = normalizeCellValue_(row[index]);
  });
  return obj;
}

// Normaliza una celda de fecha a 'yyyy-MM-dd' (Sheets devuelve Date en las
// columnas con formato fecha y string en las de texto). Devuelve '' si esta
// vacia. Las comparaciones de calendario del sistema son lexicograficas sobre
// este formato, asi que todo lector debe pasar por aqui.
function fechaISO_(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'America/Lima', 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

// Fecha de hoy en America/Lima ('yyyy-MM-dd').
function hoyISO_() {
  return Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
}

// ============================================
// CONCURRENCIA — LockService en escrituras
// ============================================
// Envuelve una escritura con lock global del script para evitar filas/IDs
// duplicados cuando dos requests escriben a la vez (kiosko + admin).
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(30000); // hasta 30s de espera (maximo permitido)
  if (!acquired) {
    return { success: false, error: 'Sistema ocupado, intenta de nuevo en unos segundos' };
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// VALIDACION DE UPLOADS PUBLICOS (anti-abuso)
// ============================================
var UPLOAD_LIMITS = {
  imagen: { maxBytes: 6 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
  documento: { maxBytes: 10 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] }
};

// Valida tamano y tipo de un archivo base64 subido por un endpoint publico.
// Devuelve null si es valido, o {success:false, error} para responder directo.
function validarArchivoSubido_(base64Content, mimeType, tipo) {
  const limits = UPLOAD_LIMITS[tipo] || UPLOAD_LIMITS.documento;
  if (!base64Content) return { success: false, error: 'Archivo vacio' };
  // Tamano aproximado del binario = 3/4 del base64
  const approxBytes = Math.floor(String(base64Content).length * 0.75);
  if (approxBytes > limits.maxBytes) {
    return { success: false, error: 'Archivo demasiado grande (max ' + Math.round(limits.maxBytes / 1024 / 1024) + ' MB)' };
  }
  if (mimeType && limits.mimes.indexOf(String(mimeType).toLowerCase()) < 0) {
    return { success: false, error: 'Tipo de archivo no permitido: ' + mimeType };
  }
  return null;
}

// Rate limit simple por clave (p.ej. 'apply:<dni>') usando CacheService.
// Devuelve null si esta dentro del limite, o {success:false, error} si lo excede.
function checkRateLimit_(key, maxPorHora) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'rl:' + key;
    const current = parseInt(cache.get(cacheKey), 10) || 0;
    if (current >= maxPorHora) {
      return { success: false, error: 'Demasiadas solicitudes, intenta mas tarde' };
    }
    cache.put(cacheKey, String(current + 1), 3600);
    return null;
  } catch (e) {
    return null; // si el cache falla, no bloquear la operacion
  }
}

// ============================================
// FLAG DE OPERACIONES DESTRUCTIVAS
// ============================================
// Las funciones que borran/recrean hojas o cargan datos de prueba solo corren
// si la Script Property ALLOW_DESTRUCTIVE_OPS = 'true'. En produccion debe
// estar ausente o en 'false'. (Ya hubo perdida real de datos: los PDFs.)
function assertDestructiveAllowed_() {
  const flag = PropertiesService.getScriptProperties().getProperty('ALLOW_DESTRUCTIVE_OPS');
  if (flag !== 'true') {
    throw new Error('Operacion destructiva bloqueada: define ALLOW_DESTRUCTIVE_OPS=true en Script Properties para habilitarla (NO en produccion).');
  }
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

// ============================================================
// FIN MODULO PLANILLA
// ============================================================

// ============================================================
// FUNCIONES DE PRE-AUTORIZACION (ejecutar desde el editor UNA VEZ)
// Sirven para que Apps Script pida permisos de Drive y MailApp
// antes de que lleguen requests reales del frontend.
// ============================================================

function preAutorizarDrive() {
  // Imagen JPEG 1x1 pixel en base64
  var pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  var resultado = guardarFotoWebcam({
    fileContent: pixel,
    fileName: 'pre_auth_test.jpg',
    mimeType: 'image/jpeg',
    capacitacion_id: 'pre_auth',
    dni: '00000000',
    evaluacion_id: ''
  });
  Logger.log('preAutorizarDrive: ' + JSON.stringify(resultado));
  // Limpiar archivo de prueba si se creo
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var proc = folder.getFoldersByName('Evaluaciones_Proctoring');
    if (proc.hasNext()) {
      var preFolder = proc.next().getFoldersByName('pre_auth');
      if (preFolder.hasNext()) {
        var dniFolder = preFolder.next().getFoldersByName('00000000');
        if (dniFolder.hasNext()) {
          var files = dniFolder.next().getFilesByName('pre_auth_test.jpg');
          if (files.hasNext()) files.next().setTrashed(true);
        }
      }
    }
  } catch(e) { /* ignorar */ }
  return resultado;
}

function preAutorizarMail() {
  // Intenta revisar una evaluacion inexistente; falla con "no encontrada"
  // pero eso es suficiente para que Apps Script pre-autorice MailApp
  var resultado = revisarEvaluacion({
    id: 'EVAL_PREAUTH_TEST',
    nota_final: 0,
    retroalimentacion: '',
    estado: 'aprobado',
    revisado_por: 'Admin'
  });
  Logger.log('preAutorizarMail: ' + JSON.stringify(resultado));
  // Resultado esperado: { success: false, error: 'Evaluacion no encontrada' }
  // Eso esta bien — Drive y MailApp quedan autorizados
  return resultado;
}

