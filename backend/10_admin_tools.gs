// ============================================================
// ADMIN TOOLS — setup y funciones DESTRUCTIVAS (tras flag)
// Fuente modular del backend GAS. NO editar appscript.js a mano:
// se regenera con `npm run build:backend`.
// ============================================================
// ATENCION: las funciones de este archivo que crean/recrean hojas o
// cargan/borran datos de prueba son DESTRUCTIVAS (pueden eliminar
// informacion real, como ya paso una vez con PDFs de produccion).
// Todas ellas llaman a assertDestructiveAllowed_() como primera linea,
// que lanza un error a menos que la Script Property
// ALLOW_DESTRUCTIVE_OPS este seteada exactamente en 'true'.
// En PRODUCCION esa Script Property debe estar AUSENTE (o en cualquier
// valor distinto de 'true'); solo se activa manualmente y de forma
// temporal desde el editor de Apps Script para tareas de mantenimiento
// puntuales, y debe borrarse apenas se termina. Ninguna de estas
// funciones esta expuesta por el router (doGet/doPost): solo se
// ejecutan a mano desde el editor.
// ============================================================
// ============================================
// CONFIGURACION INICIAL - EJECUTAR UNA VEZ
// ============================================
function setupAllSheets() {
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
// CONFIGURAR HOJA DE ASISTENCIAS
// Ejecutar manualmente para crear la hoja
// ============================================
function configurarHojaAsistencias() {
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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
  assertDestructiveAllowed_();
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

// MIGRACION V2 — ejecutar UNA VEZ si ya tenias la version anterior:
// 1) agrega las claves nuevas a config_planilla (tolerancias, rmv, salida_autorizada)
// 2) RECREA la hoja sueldos con la lista definitiva y columnas nuevas
// 3) crea autorizaciones_5pm y bolsa_horas
// NO toca incidencias ni planilla_log.
function migrarPlanillaV2() {
  assertDestructiveAllowed_();
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // 1) Config: agregar claves faltantes
  var c = ss.getSheetByName('config_planilla');
  if (c) {
    var rows = c.getDataRange().getValues();
    var existentes = {};
    for (var i = 1; i < rows.length; i++) existentes[String(rows[i][0]).trim()] = true;
    Object.keys(CONFIG_PLANILLA_DEFAULT).forEach(function(k) {
      if (!existentes[k]) c.appendRow([k, CONFIG_PLANILLA_DEFAULT[k]]);
    });
  }

  // 2) Recrear sueldos con la lista definitiva
  var viejo = ss.getSheetByName('sueldos');
  if (viejo) ss.deleteSheet(viejo);
  var s = ss.insertSheet('sueldos');
  s.appendRow(HEADERS_SUELDOS);
  SUELDOS_INICIALES.forEach(function(r) { s.appendRow(r); });
  s.getRange(1, 1, 1, HEADERS_SUELDOS.length).setFontWeight('bold');

  // 3) Hojas nuevas
  setupPlanillaSheets();

  return 'Migracion V2 completada: config actualizada, sueldos recreada con 8 trabajadores, hojas 5pm/bolsa listas';
}

// ACTUALIZACION DE TRABAJADORES V3 — ejecutar UNA VEZ desde el editor.
// RECREA la hoja 'sueldos' con la lista definitiva de 13 trabajadores +
// columna 'email'. NO toca config_planilla, incidencias, planilla_log,
// autorizaciones_5pm ni bolsa_horas. Si algun DNI ya registro asistencia
// bajo otro DNI (p.ej. Condori), esos registros quedan bajo el DNI viejo.
function actualizarTrabajadoresV3() {
  assertDestructiveAllowed_();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var viejo = ss.getSheetByName('sueldos');
  if (viejo) ss.deleteSheet(viejo);
  var s = ss.insertSheet('sueldos');
  s.appendRow(HEADERS_SUELDOS);
  SUELDOS_INICIALES.forEach(function(r) { s.appendRow(r); });
  s.getRange(1, 1, 1, HEADERS_SUELDOS.length).setFontWeight('bold');
  // Asegurar que las demas hojas de planilla existan (no las toca si ya estan)
  setupPlanillaSheets();
  return 'Lista actualizada: ' + SUELDOS_INICIALES.length + ' trabajadores con correos. config/incidencias/bolsa/autorizaciones intactas.';
}
