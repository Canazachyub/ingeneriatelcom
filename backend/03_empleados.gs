// ============================================================
// EMPLEADOS — roster (hoja sueldos) e historial
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ============================================
// GESTION DE EMPLEADOS
// ============================================
// Roster real de trabajadores (hoja 'sueldos') — fuente unica de la verdad.
// Reemplaza los datos demo de la hoja 'empleados' en Dashboard/Empleados.
function leerRosterReal_() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var h = rows[0];
  var cDni = h.indexOf('dni'), cNom = h.indexOf('nombre'), cCargo = h.indexOf('cargo'),
      cSede = h.indexOf('sede'), cEmail = h.indexOf('email');
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var dni = rows[i][cDni];
    if (!dni) continue;
    var email = cEmail >= 0 ? String(rows[i][cEmail] || '') : '';
    out.push({
      dni: String(dni),
      nombre: String(rows[i][cNom] || ''),
      cargo: cCargo >= 0 ? String(rows[i][cCargo] || '') : '',
      sede: cSede >= 0 ? String(rows[i][cSede] || '') : '',
      email: email,
      es_campo: !email
    });
  }
  return out;
}

// Convierte un registro del roster real (hoja 'sueldos') al shape de empleado
// que consume el frontend (interface Employee de src/api/appScriptApi.ts),
// el mismo que arma getEmployees(). Fuente unica para no duplicar el mapeo
// entre getEmployees, getEmployeeById, updateEmployee, transferEmployee y createEmployee.
function trabajadorRosterAEmployee_(t) {
  return {
    id: 'SUE-' + t.dni,
    dni: t.dni,
    nombre_completo: t.nombre,
    email: t.email,
    telefono: '',
    cargo: t.cargo,
    area: t.es_campo ? 'Campo' : 'Oficina',
    ciudad_actual: t.sede || 'Principal',
    estado: 'activo',
    registro_simple: t.es_campo
  };
}

function getEmployees(filters) {
  var employees = leerRosterReal_().map(trabajadorRosterAEmployee_);

  if (filters) {
    var f = typeof filters === 'string' ? JSON.parse(filters) : filters;
    if (f.estado) employees = employees.filter(function(e){ return e.estado === f.estado; });
    if (f.ciudad) employees = employees.filter(function(e){ return e.ciudad_actual === f.ciudad; });
    if (f.area) employees = employees.filter(function(e){ return e.area === f.area; });
    if (f.cargo) employees = employees.filter(function(e){ return e.cargo === f.cargo; });
  }

  return { success: true, data: employees };
}

// Extrae el DNI a partir de un id 'SUE-<dni>' o un DNI suelto de 8 digitos.
// Devuelve null si el id no corresponde al formato del roster real.
function dniDesdeIdRoster_(id) {
  const s = String(id || '');
  if (s.indexOf('SUE-') === 0) return s.substring(4);
  if (/^\d{8}$/.test(s)) return s;
  return null;
}

function getEmployeeById(id) {
  const dni = dniDesdeIdRoster_(id);

  if (dni) {
    // Roster real (hoja 'sueldos') — fuente unica de la verdad.
    const trabajador = leerRosterReal_().filter(function(t) { return t.dni === dni; })[0];
    if (!trabajador) {
      return { success: false, error: 'Empleado no encontrado' };
    }

    const emp = trabajadorRosterAEmployee_(trabajador);

    // Obtener asignaciones actuales e historial (usan el id SUE-<dni>)
    emp.asignaciones = getAssignmentsByEmployee(emp.id).data;
    emp.historial = getEmployeeHistory(emp.id).data;

    return { success: true, data: emp };
  }

  // Fallback legacy: id formato EMP0xx en la hoja 'empleados'.
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
  data = data || {};

  // El frontend (EmployeesPage) envia campos en ingles (name, position, city,
  // email, salary...); tambien aceptamos las claves en espanol por si algun
  // otro caller las usa. dni es obligatorio: es la clave del roster real.
  const dni = String(data.dni || '').trim();
  if (!/^\d{8}$/.test(dni)) {
    return { success: false, error: 'DNI requerido (8 digitos)' };
  }

  const nombre = data.name || data.nombre_completo || '';
  const cargo = data.position || data.cargo || '';
  const sede = data.city || data.ciudad_actual || '';
  const email = data.email || '';
  const salario = data.salary != null ? data.salary : (data.salario || 0);

  return withLock_(function() {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
    if (!sheet) {
      return { success: false, error: 'Hoja sueldos no encontrada' };
    }

    // Evitar duplicados: un DNI ya presente en el roster real.
    const yaExiste = leerRosterReal_().some(function(t) { return t.dni === dni; });
    if (yaExiste) {
      return { success: false, error: 'Ya existe un trabajador con ese DNI' };
    }

    const fechaInicio = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');

    const headers = sheet.getDataRange().getValues()[0];
    const fila = headers.map(function(h) {
      switch (h) {
        case 'dni': return dni;
        case 'nombre': return nombre;
        case 'cargo': return cargo;
        case 'sueldo': return salario;
        case 'fecha_inicio': return fechaInicio;
        case 'usa_rmv': return '';
        case 'sede': return sede;
        case 'email': return email;
        default: return '';
      }
    });

    sheet.appendRow(fila);

    const emp = trabajadorRosterAEmployee_({
      dni: dni,
      nombre: nombre,
      cargo: cargo,
      sede: sede,
      email: email,
      es_campo: !email
    });

    // Registrar alta en historial
    addHistoryRecord(emp.id, 'ingreso', null, sede, 'Ingreso a la empresa');

    return { success: true, data: emp, message: 'Empleado registrado exitosamente' };
  });
}

function updateEmployee(data) {
  data = data || {};
  const dni = dniDesdeIdRoster_(data.id);

  if (dni) {
    // Roster real (hoja 'sueldos'). Mapeo frontend -> columnas de sueldos:
    // name->nombre, position->cargo, city->sede, email->email, salary->sueldo.
    // Campos que sueldos no tiene (phone, department, status) se ignoran sin error.
    return withLock_(function() {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
      if (!sheet) {
        return { success: false, error: 'Hoja sueldos no encontrada' };
      }

      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const cDni = headers.indexOf('dni');
      const colMap = {
        name: headers.indexOf('nombre'),
        position: headers.indexOf('cargo'),
        city: headers.indexOf('sede'),
        email: headers.indexOf('email'),
        salary: headers.indexOf('sueldo')
      };

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][cDni]) !== dni) continue;

        if (data.name != null && colMap.name >= 0) sheet.getRange(i + 1, colMap.name + 1).setValue(data.name);
        if (data.position != null && colMap.position >= 0) sheet.getRange(i + 1, colMap.position + 1).setValue(data.position);
        if (data.city != null && colMap.city >= 0) sheet.getRange(i + 1, colMap.city + 1).setValue(data.city);
        if (data.email != null && colMap.email >= 0) sheet.getRange(i + 1, colMap.email + 1).setValue(data.email);
        if (data.salary != null && colMap.salary >= 0) sheet.getRange(i + 1, colMap.salary + 1).setValue(data.salary);
        // phone, department, status: la hoja sueldos no los tiene -> se ignoran con gracia.

        const trabajador = leerRosterReal_().filter(function(t) { return t.dni === dni; })[0];
        return { success: true, data: trabajadorRosterAEmployee_(trabajador), message: 'Empleado actualizado' };
      }

      return { success: false, error: 'Empleado no encontrado' };
    });
  }

  // Fallback legacy: id formato EMP0xx en la hoja 'empleados'.
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
  data = data || {};

  // Acepta ambos contratos: backend legacy (empleadoId/nuevaCiudad) y el que
  // realmente envia el frontend (employeeId/newCity/newDepartment) — brecha M2.
  const empleadoId = data.empleadoId || data.employeeId;
  const nuevaCiudad = data.nuevaCiudad || data.newCity;
  const nuevaArea = data.nuevaArea || data.newDepartment;

  const dni = dniDesdeIdRoster_(empleadoId);

  if (dni) {
    // Roster real (hoja 'sueldos'): solo existe la columna 'sede', no hay area.
    return withLock_(function() {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('sueldos');
      if (!sheet) {
        return { success: false, error: 'Hoja sueldos no encontrada' };
      }

      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const cDni = headers.indexOf('dni');
      const cSede = headers.indexOf('sede');
      const cEmail = headers.indexOf('email');
      const cNombre = headers.indexOf('nombre');

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][cDni]) !== dni) continue;

        const ciudadAnterior = cSede >= 0 ? rows[i][cSede] : '';
        if (cSede >= 0) sheet.getRange(i + 1, cSede + 1).setValue(nuevaCiudad);

        const emp = trabajadorRosterAEmployee_({
          dni: dni,
          nombre: cNombre >= 0 ? String(rows[i][cNombre] || '') : '',
          cargo: '',
          sede: nuevaCiudad,
          email: cEmail >= 0 ? String(rows[i][cEmail] || '') : '',
          es_campo: cEmail >= 0 ? !rows[i][cEmail] : true
        });

        // Registrar en historial
        addHistoryRecord(
          emp.id,
          'transferencia',
          ciudadAnterior,
          nuevaCiudad,
          data.motivo || 'Transferencia de ubicacion'
        );

        // Notificar al empleado si tiene email
        if (emp.email) {
          sendTransferNotification(emp.email, emp.nombre_completo, ciudadAnterior, nuevaCiudad);
        }

        return { success: true, data: emp, message: 'Empleado transferido exitosamente' };
      }

      return { success: false, error: 'Empleado no encontrado' };
    });
  }

  // Fallback legacy: id formato EMP0xx en la hoja 'empleados'.
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('empleados');
  const employees = sheet.getDataRange().getValues();

  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] === empleadoId) {
      const ciudadAnterior = employees[i][8];

      // Actualizar ciudad
      sheet.getRange(i + 1, 9).setValue(nuevaCiudad);

      // Si cambia de area tambien
      if (nuevaArea) {
        sheet.getRange(i + 1, 7).setValue(nuevaArea);
      }

      // Registrar en historial
      addHistoryRecord(
        empleadoId,
        'transferencia',
        ciudadAnterior,
        nuevaCiudad,
        data.motivo || 'Transferencia de ubicacion'
      );

      // Notificar al empleado
      if (data.notificar) {
        sendTransferNotification(employees[i][3], employees[i][2], ciudadAnterior, nuevaCiudad);
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
