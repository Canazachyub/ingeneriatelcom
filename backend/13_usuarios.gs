// ============================================================
// USUARIOS, PERMISOS POR MODULO, AUDITORIA Y CACHE DE LECTURAS
// Escalones 1 y 2 (sept. 2026). Documentado en docs/ADMIN.md §2.2, §5.6, §11.
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================

// ── Modulos del panel ──────────────────────────────────────────
// Un usuario con rol de administracion (ROLES_ADMIN_ en 02_auth.gs) o permiso
// 'all' accede a TODO, igual que antes. Cualquier otro usuario necesita el
// permiso explicito del modulo en la columna `permisos` de la hoja usuarios
// (lista separada por comas). Los modulos marcados soloAdmin no se conceden
// por permiso: exigen rol de administracion.
var MODULOS_PANEL_ = {
  asistencias:    { etiqueta: 'Asistencias',     soloAdmin: false },
  personal:       { etiqueta: 'Empleados',       soloAdmin: false },
  proyectos:      { etiqueta: 'Proyectos',       soloAdmin: false },
  bolsa:          { etiqueta: 'Bolsa y postulaciones', soloAdmin: false },
  mensajes:       { etiqueta: 'Mensajes',        soloAdmin: false },
  capacitaciones: { etiqueta: 'Capacitaciones',  soloAdmin: false },
  reportes:       { etiqueta: 'Reportes',        soloAdmin: false },
  planilla:       { etiqueta: 'Planilla',        soloAdmin: true },
  usuarios:       { etiqueta: 'Usuarios',        soloAdmin: true },
  auditoria:      { etiqueta: 'Auditoria',       soloAdmin: true }
};

var ESTADOS_USUARIO_ = ['activo', 'inactivo'];

// ── Lectura de la hoja usuarios por CABECERA ──────────────────
// La hoja existe con dos esquemas historicos:
//   A: id, email, password, name, role, employeeId, active, createdAt
//   B: id, nombre, email, password, rol, permisos, estado, ultimo_acceso, fecha_creacion, empleado_id
// Todo lo nuevo lee y escribe por nombre de columna (nunca por posicion).
var ALIAS_USUARIO_ = {
  id: ['id'],
  nombre: ['nombre', 'name'],
  email: ['email', 'correo'],
  password: ['password', 'contrasena'],
  rol: ['rol', 'role'],
  permisos: ['permisos', 'permissions'],
  estado: ['estado', 'active', 'activo'],
  ultimo_acceso: ['ultimo_acceso', 'lastLogin'],
  creado: ['fecha_creacion', 'createdAt'],
  empleado_id: ['empleado_id', 'employeeId']
};

function columnasUsuarios_(headers) {
  var cols = {};
  for (var campo in ALIAS_USUARIO_) {
    cols[campo] = -1;
    for (var k = 0; k < ALIAS_USUARIO_[campo].length; k++) {
      var c = headers.indexOf(ALIAS_USUARIO_[campo][k]);
      if (c >= 0) { cols[campo] = c; break; }
    }
  }
  return cols;
}

function esActivoValor_(v) {
  return v === true || v === 'true' || v === 'TRUE' || String(v).toLowerCase() === 'activo';
}

function listaPermisos_(v) {
  return String(v || '').split(',').map(function (p) { return p.toLowerCase().trim(); }).filter(Boolean);
}

function filaAUsuario_(row, cols) {
  var rol = cols.rol >= 0 ? String(row[cols.rol] || '').toLowerCase().trim() : '';
  var permisos = cols.permisos >= 0 ? listaPermisos_(row[cols.permisos]) : (rol === 'admin' ? ['all'] : []);
  var activo = cols.estado >= 0 ? esActivoValor_(row[cols.estado]) : true;
  return {
    id: String(row[cols.id] || ''),
    nombre: cols.nombre >= 0 ? String(row[cols.nombre] || '') : '',
    email: cols.email >= 0 ? String(row[cols.email] || '') : '',
    rol: rol,
    permisos: permisos,
    activo: activo,
    esAdmin: activo && (ROLES_ADMIN_.indexOf(rol) >= 0 || permisos.indexOf('all') >= 0),
    ultimo_acceso: cols.ultimo_acceso >= 0 && row[cols.ultimo_acceso] ? String(row[cols.ultimo_acceso]) : '',
    empleado_id: cols.empleado_id >= 0 ? String(row[cols.empleado_id] || '') : ''
  };
}

// ── Perfil del usuario de la sesion (con cache corto) ──────────
// A diferencia del esRolAdmin_ original, un fallo al leer la hoja NO se
// cachea como "sin permisos": lanza TOKEN_TRANSITORIO y el router responde
// "Servidor ocupado" (el cliente reintenta). Antes un tropiezo de Google
// dejaba a un admin sin acceso durante 5 minutos.
function perfilUsuario_(userId) {
  if (!userId) return null;
  var cache = CacheService.getScriptCache();
  var clave = 'perfil:' + userId;
  try {
    var enCache = cache.get(clave);
    if (enCache) return JSON.parse(enCache);
  } catch (e) { /* sin cache: se lee la hoja */ }

  var filas;
  try {
    filas = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios').getDataRange().getValues();
  } catch (e) {
    console.error('perfilUsuario_: no se pudo leer usuarios: ' + e.message);
    throw new Error('TOKEN_TRANSITORIO');
  }
  var cols = columnasUsuarios_(filas[0]);
  var perfil = null;
  for (var i = 1; i < filas.length; i++) {
    if (String(filas[i][cols.id]) === String(userId)) { perfil = filaAUsuario_(filas[i], cols); break; }
  }
  if (!perfil) perfil = { id: String(userId), activo: false, esAdmin: false, permisos: [], rol: '' };
  try { cache.put(clave, JSON.stringify(perfil), 120); } catch (e) {}
  return perfil;
}

function invalidarPerfil_(userId) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('perfil:' + userId);
    cache.remove('rol:' + userId); // cache del esRolAdmin_ original
  } catch (e) {}
}

// true si el perfil puede usar el modulo (o alguno de la lista).
function puedeModulo_(perfil, modulos) {
  if (!perfil || !perfil.activo) return false;
  if (perfil.esAdmin) return true;
  var lista = Array.isArray(modulos) ? modulos : [modulos];
  for (var k = 0; k < lista.length; k++) {
    var m = MODULOS_PANEL_[lista[k]];
    if (m && !m.soloAdmin && perfil.permisos.indexOf(lista[k]) >= 0) return true;
  }
  return false;
}

// ── Pantalla Usuarios (nivel admin) ────────────────────────────
function listarUsuarios() {
  var filas = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios').getDataRange().getValues();
  var cols = columnasUsuarios_(filas[0]);
  var usuarios = [];
  for (var i = 1; i < filas.length; i++) {
    if (!filas[i][cols.id]) continue;
    usuarios.push(filaAUsuario_(filas[i], cols)); // nunca incluye la contrasena
  }
  var modulos = Object.keys(MODULOS_PANEL_).map(function (k) {
    return { clave: k, etiqueta: MODULOS_PANEL_[k].etiqueta, soloAdmin: MODULOS_PANEL_[k].soloAdmin };
  });
  return { success: true, data: { usuarios: usuarios, modulos: modulos, rolesAdmin: ROLES_ADMIN_ } };
}

function normalizarPermisosEntrada_(permisos) {
  var lista = Array.isArray(permisos) ? permisos : listaPermisos_(permisos);
  return lista.map(function (p) { return String(p).toLowerCase().trim(); })
    .filter(function (p) { return p === 'all' || (MODULOS_PANEL_[p] && !MODULOS_PANEL_[p].soloAdmin); });
}

function crearUsuario(data, ctx) {
  var email = String(data.email || '').trim().toLowerCase();
  var nombre = String(data.nombre || '').trim();
  var rol = String(data.rol || '').toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { success: false, error: 'Correo no valido' };
  if (!nombre) return { success: false, error: 'El nombre es obligatorio' };
  if (!rol) return { success: false, error: 'El rol es obligatorio' };
  var permisos = normalizarPermisosEntrada_(data.permisos);

  return withLock_(function () {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    var filas = sheet.getDataRange().getValues();
    var headers = filas[0];
    var cols = columnasUsuarios_(headers);
    for (var i = 1; i < filas.length; i++) {
      if (String(filas[i][cols.email]).toLowerCase().trim() === email) {
        return { success: false, error: 'Ya existe un usuario con ese correo' };
      }
    }
    // Esquema A no tiene columna permisos: se agrega al FINAL (no desplaza
    // las posiciones que usan login/verifyToken).
    if (cols.permisos < 0 && permisos.length) {
      sheet.getRange(1, headers.length + 1).setValue('permisos');
      headers = headers.concat(['permisos']);
      cols = columnasUsuarios_(headers);
    }
    var id = generateSequentialId('usuarios', 'USR');
    var temporal = generateTempPassword();
    var fila = headers.map(function () { return ''; });
    var poner = function (campo, valor) { if (cols[campo] >= 0) fila[cols[campo]] = valor; };
    poner('id', id);
    poner('nombre', nombre);
    poner('email', email);
    poner('password', hashPassword_(id, temporal));
    poner('rol', rol);
    poner('permisos', permisos.join(','));
    // En esquema A la columna es `active` (booleano); en B, `estado` ('activo')
    poner('estado', headers[cols.estado] === 'active' ? true : 'activo');
    poner('creado', new Date());
    poner('empleado_id', data.empleado_id || '');
    sheet.appendRow(fila);
    sendCredentialsEmail(email, nombre, temporal);
    return { success: true, data: { id: id, email: email, tempPassword: temporal } };
  });
}

// Cambia rol, permisos, estado o nombre. Protecciones anti-bloqueo:
// nadie se quita a si mismo la administracion ni se desactiva, y siempre
// debe quedar al menos un administrador activo.
function actualizarUsuario(data, ctx) {
  var id = String(data.id || '');
  if (!id) return { success: false, error: 'Falta el usuario' };
  if (data.estado !== undefined && ESTADOS_USUARIO_.indexOf(String(data.estado)) === -1) {
    return { success: false, error: 'Estado no valido' };
  }
  return withLock_(function () {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    var filas = sheet.getDataRange().getValues();
    var headers = filas[0];
    var cols = columnasUsuarios_(headers);
    var fila = -1;
    for (var i = 1; i < filas.length; i++) { if (String(filas[i][cols.id]) === id) { fila = i; break; } }
    if (fila < 0) return { success: false, error: 'Usuario no encontrado' };

    var antes = filaAUsuario_(filas[fila], cols);
    var nuevoRol = data.rol !== undefined ? String(data.rol).toLowerCase().trim() : antes.rol;
    var nuevosPermisos = data.permisos !== undefined ? normalizarPermisosEntrada_(data.permisos) : antes.permisos;
    var nuevoActivo = data.estado !== undefined ? data.estado === 'activo' : antes.activo;
    var despuesEsAdmin = nuevoActivo && (ROLES_ADMIN_.indexOf(nuevoRol) >= 0 || nuevosPermisos.indexOf('all') >= 0);

    if (ctx && String(ctx.userId) === id && antes.esAdmin && !despuesEsAdmin) {
      return { success: false, error: 'No puedes quitarte la administracion ni desactivarte a ti mismo' };
    }
    if (antes.esAdmin && !despuesEsAdmin) {
      var otrosAdmins = 0;
      for (var j = 1; j < filas.length; j++) {
        if (j !== fila && filaAUsuario_(filas[j], cols).esAdmin) otrosAdmins++;
      }
      if (otrosAdmins === 0) return { success: false, error: 'Debe quedar al menos un administrador activo' };
    }

    if (data.permisos !== undefined && cols.permisos < 0) {
      sheet.getRange(1, headers.length + 1).setValue('permisos');
      headers = headers.concat(['permisos']);
      cols = columnasUsuarios_(headers);
    }
    var fijar = function (campo, valor) { if (cols[campo] >= 0) sheet.getRange(fila + 1, cols[campo] + 1).setValue(valor); };
    if (data.nombre !== undefined) fijar('nombre', String(data.nombre).trim());
    if (data.rol !== undefined) fijar('rol', nuevoRol);
    if (data.permisos !== undefined) fijar('permisos', nuevosPermisos.join(','));
    if (data.estado !== undefined) fijar('estado', headers[cols.estado] === 'active' ? nuevoActivo : (nuevoActivo ? 'activo' : 'inactivo'));

    invalidarPerfil_(id);
    return { success: true, data: { antes: antes, despues: { rol: nuevoRol, permisos: nuevosPermisos, activo: nuevoActivo } } };
  });
}

function restablecerContrasena(data) {
  var id = String(data.id || '');
  return withLock_(function () {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('usuarios');
    var filas = sheet.getDataRange().getValues();
    var cols = columnasUsuarios_(filas[0]);
    for (var i = 1; i < filas.length; i++) {
      if (String(filas[i][cols.id]) === id) {
        var u = filaAUsuario_(filas[i], cols);
        var temporal = generateTempPassword();
        sheet.getRange(i + 1, cols.password + 1).setValue(hashPassword_(filas[i][cols.id], temporal));
        sendCredentialsEmail(u.email, u.nombre, temporal);
        return { success: true, data: { id: id, email: u.email, tempPassword: temporal } };
      }
    }
    return { success: false, error: 'Usuario no encontrado' };
  });
}

// ── Auditoria ──────────────────────────────────────────────────
// El router registra AUTOMATICAMENTE toda accion de escritura de nivel
// auth/admin (quien, que, cuando, con que datos y el resultado). No se
// auditan las acciones publicas (el kiosko debe seguir rapido; sus marcas ya
// quedan con foto y GPS en asistencias_v2).
var HEADERS_AUDITORIA_ = ['id', 'timestamp', 'usuario_id', 'usuario', 'accion', 'resultado', 'detalle'];
var CAMPOS_OCULTOS_AUDITORIA_ = ['token', 'password', 'contrasena', 'fileContent', 'cvBase64', 'base64', 'foto', 'tempPassword'];

function resumirDatos_(obj, profundidad) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj.length > 200 ? obj.slice(0, 200) + '…' : obj;
  if (typeof obj !== 'object') return obj;
  if ((profundidad || 0) > 2) return '[…]';
  var out = Array.isArray(obj) ? [] : {};
  for (var k in obj) {
    if (CAMPOS_OCULTOS_AUDITORIA_.indexOf(k) >= 0) { out[k] = '[oculto]'; continue; }
    out[k] = resumirDatos_(obj[k], (profundidad || 0) + 1);
  }
  return out;
}

function registrarAuditoria_(ctx, action, resultado) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var hoja = ss.getSheetByName('auditoria');
    if (!hoja) {
      hoja = ss.insertSheet('auditoria');
      hoja.appendRow(HEADERS_AUDITORIA_);
      hoja.getRange(1, 1, 1, HEADERS_AUDITORIA_.length).setFontWeight('bold');
    }
    var perfil = null;
    try { perfil = perfilUsuario_(ctx.userId); } catch (e) {}
    var detalle = JSON.stringify({ datos: resumirDatos_(ctx.data), respuesta: resumirDatos_(resultado && resultado.data) });
    if (detalle.length > 4000) detalle = detalle.slice(0, 4000) + '…';
    hoja.appendRow([
      Utilities.getUuid(),
      new Date().toISOString(),
      String(ctx.userId || ''),
      perfil ? (perfil.nombre || perfil.email || '') : '',
      action,
      resultado && resultado.success ? 'ok' : ('error: ' + String(resultado && resultado.error || '')).slice(0, 200),
      detalle
    ]);
  } catch (e) {
    console.error('registrarAuditoria_ fallo (no bloquea la accion): ' + e.message);
  }
}

// Lectura desde el final (lo mas reciente primero), con filtros.
function getAuditoria(data) {
  var hoja = SpreadsheetApp.openById(SHEET_ID).getSheetByName('auditoria');
  if (!hoja || hoja.getLastRow() < 2) return { success: true, data: [] };
  var limite = Math.min(Number(data && data.limite) || 300, 1000);
  var t = leerTramoFinal_(hoja, Math.max(limite * 3, 600));
  var h = t.headers;
  var filas = t.rows.map(function (r) { return rowToObject(h, r); }).reverse();
  var desde = data && data.desde ? String(data.desde) : '';
  var hasta = data && data.hasta ? String(data.hasta) + 'T99' : '';
  var usuario = data && data.usuario ? String(data.usuario).toLowerCase() : '';
  var accion = data && data.accion ? String(data.accion) : '';
  filas = filas.filter(function (f) {
    var ts = String(f.timestamp || '');
    if (desde && ts < desde) return false;
    if (hasta && ts > hasta) return false;
    if (usuario && String(f.usuario || '').toLowerCase().indexOf(usuario) === -1 && String(f.usuario_id) !== data.usuario) return false;
    if (accion && f.accion !== accion) return false;
    return true;
  });
  return { success: true, data: filas.slice(0, limite) };
}

// ── Cache de lecturas frecuentes (escalon 1) ───────────────────
// Lecturas sin parametros que se piden mucho y cambian poco. TTL 5 min y
// se invalidan TODAS tras cualquier escritura exitosa que pase por el router
// (asi ningun cambio del panel queda oculto por la cache). Cambios hechos a
// mano en la hoja o desde el editor tardan como maximo 5 min en verse.
var LECTURAS_CACHEABLES_ = ['getJobs', 'getCapacitaciones', 'getFeriados', 'getConfigPlanilla'];
var TTL_LECTURAS_ = 300;

function leerConCache_(action, fn) {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  var clave = 'lect:' + action;
  if (cache) {
    try {
      var guardado = cache.get(clave);
      if (guardado) return JSON.parse(guardado);
    } catch (e) {}
  }
  var res = fn();
  if (cache && res && res.success) {
    try {
      var json = JSON.stringify(res);
      if (json.length < 90000) cache.put(clave, json, TTL_LECTURAS_); // limite de CacheService: 100 KB
    } catch (e) {}
  }
  return res;
}

function invalidarLecturas_() {
  try { CacheService.getScriptCache().removeAll(LECTURAS_CACHEABLES_.map(function (a) { return 'lect:' + a; })); } catch (e) {}
}

// Acciones de solo lectura (no se auditan ni invalidan cache).
function esAccionDeLectura_(action) {
  return /^(get|obtener|verify|consultar|historial|listar|login)/i.test(action);
}
