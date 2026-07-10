// ============================================================
// ARCHIVOS — visor seguro de archivos privados de Drive (fotos de
// asistencia con GPS, proctoring, justificaciones)
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// BRECHA C6: las fotos de asistencia/proctoring y las justificaciones se
// subian con setSharing(ANYONE_WITH_LINK) — cualquiera con el enlace las
// veia. Ahora quedan privadas y solo se sirven via getArchivo (nivel auth),
// que descarga el binario en el servidor y lo devuelve en base64 al admin
// autenticado. Las columnas foto_url/archivo_url en las hojas se siguen
// guardando igual (URL de Drive); el visor extrae el fileId de esa URL.

var TAMANO_MAX_VISOR_BYTES = 10 * 1024 * 1024; // 10 MB

// Acepta un fileId directo o una URL de Drive y devuelve el fileId, o null
// si no se pudo reconocer el formato.
// Formatos soportados:
//   - fileId "pelado" (sin barras ni protocolo)
//   - https://drive.google.com/file/d/<ID>/view
//   - https://drive.google.com/uc?export=download&id=<ID>
function extraerDriveFileId_(idOUrl) {
  if (!idOUrl) return null;
  var s = String(idOUrl).trim();
  if (!s) return null;

  // Ya es un fileId "pelado" (no contiene ni '/' ni '?')
  if (s.indexOf('/') === -1 && s.indexOf('?') === -1) {
    return s;
  }

  // https://drive.google.com/file/d/<ID>/view
  var m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];

  // https://drive.google.com/uc?export=download&id=<ID> (o cualquier query con id=)
  var m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];

  return null;
}

// Devuelve el contenido de un archivo de Drive en base64, solo para admins
// autenticados (ruta nivel 'auth'). Limita el tamano para no reventar el
// tiempo de respuesta ni la memoria del cliente.
function getArchivo(data) {
  try {
    var fileId = extraerDriveFileId_(data && data.fileId);
    if (!fileId) return { success: false, error: 'fileId invalido' };

    var file = DriveApp.getFileById(fileId);
    var size = file.getSize();
    if (size > TAMANO_MAX_VISOR_BYTES) {
      return { success: false, error: 'Archivo demasiado grande para visor' };
    }

    var blob = file.getBlob();
    return {
      success: true,
      data: {
        base64: Utilities.base64Encode(blob.getBytes()),
        mimeType: blob.getContentType(),
        fileName: file.getName()
      }
    };
  } catch (e) {
    return { success: false, error: e.message || 'Error al leer el archivo' };
  }
}

// ============================================================
// REMEDIACION C6 — revocar el sharing publico de archivos ya subidos.
// Ejecutar UNA VEZ desde el editor de Apps Script (no es una ruta del
// router). Recorre recursivamente las carpetas sensibles y las deja
// privadas; el visor (getArchivo) sigue funcionando porque usa
// DriveApp.getFileById desde el propio script, que siempre tiene acceso.
// NO toca 'Fichas_Postulacion' (PDFs de convocatorias, publicos a
// proposito) ni las carpetas mensuales de CVs (se decide aparte).
// ============================================================
function revocarComparticionPublica() {
  var CARPETAS_A_REVOCAR = ['Asistencias', 'Justificaciones', 'Evaluaciones_Proctoring'];
  var mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var totalArchivos = 0;

  CARPETAS_A_REVOCAR.forEach(function (nombreCarpeta) {
    var folders = mainFolder.getFoldersByName(nombreCarpeta);
    while (folders.hasNext()) {
      var folder = folders.next();
      totalArchivos += revocarComparticionRecursiva_(folder);
    }
  });

  Logger.log('revocarComparticionPublica: ' + totalArchivos + ' archivo(s) puestos en privado');
  return totalArchivos;
}

// Recorre una carpeta y todas sus subcarpetas, poniendo cada archivo en
// privado. Devuelve la cantidad de archivos procesados.
function revocarComparticionRecursiva_(folder) {
  var count = 0;

  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      count++;
    } catch (e) {
      Logger.log('No se pudo revocar sharing de ' + file.getId() + ': ' + e.message);
    }
  }

  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    count += revocarComparticionRecursiva_(subfolders.next());
  }

  return count;
}
