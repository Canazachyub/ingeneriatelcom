# Arquitectura del Sistema — Ingeniería Telcom EIRL

> Mapa Frontend ↔ Backend, arquitectura general y estado actual de la aplicación.
> Generado a partir del código real (`src/` y `appscript.js`) — 10 de julio de 2026.

---

## Tabla de Contenidos

- [1. Vista General de la Arquitectura](#1-vista-general-de-la-arquitectura)
- [2. Módulos del Sistema](#2-módulos-del-sistema)
- [3. Rutas del Frontend](#3-rutas-del-frontend)
- [4. Mapa Frontend → Backend (por módulo)](#4-mapa-frontend--backend-por-módulo)
- [5. Cliente API — cómo viaja una petición](#5-cliente-api--cómo-viaja-una-petición)
- [6. Base de Datos — Hojas de Google Sheets](#6-base-de-datos--hojas-de-google-sheets)
- [7. Almacenamiento en Google Drive](#7-almacenamiento-en-google-drive)
- [8. Correos automáticos (MailApp)](#8-correos-automáticos-mailapp)
- [9. Lógica de negocio clave](#9-lógica-de-negocio-clave)
- [10. Estado Actual de la Aplicación](#10-estado-actual-de-la-aplicación)
- [11. Deuda técnica y observaciones](#11-deuda-técnica-y-observaciones)

---

## 1. Vista General de la Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (usuario final)                     │
│   React 18 + TypeScript + Vite + TailwindCSS + Framer Motion     │
│   Hosting: GitHub Pages → ingeneriatelcom.com (CI/CD en push)    │
└───────────────────────────┬──────────────────────────────────────┘
                            │  fetch() GET / POST (text/plain)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              src/api/appScriptApi.ts  (clase AppScriptApi)       │
│   Único punto de comunicación. ~70 métodos públicos.             │
│   Adjunta token admin cuando la acción lo requiere.              │
└───────────────────────────┬──────────────────────────────────────┘
                            │  VITE_APPS_SCRIPT_URL
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│         GOOGLE APPS SCRIPT (appscript.js, ~4800 líneas)          │
│   doGet / doPost → router de 85 acciones                         │
│   19 públicas · 66 protegidas por token                          │
└──────┬──────────────────────────┬────────────────────┬───────────┘
       ▼                          ▼                    ▼
┌──────────────┐         ┌────────────────┐   ┌────────────────┐
│ GOOGLE SHEETS│         │  GOOGLE DRIVE  │   │    MAILAPP     │
│ ~24 hojas    │         │ CVs, fichas PDF│   │ notificaciones │
│ (BD real)    │         │ fotos GPS/exam │   │ y credenciales │
└──────────────┘         └────────────────┘   └────────────────┘
```

**Puntos clave:**

- No hay servidor propio: el "backend" es un Web App de Google Apps Script y la "base de datos" es un Spreadsheet (`15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA`).
- El archivo `appscript.js` vive en el repo pero se **copia manualmente** al editor de Apps Script y se redespliega como nueva versión.
- Zona horaria fija del backend: **America/Lima (UTC-5)** — todos los timestamps se normalizan con `Utilities.formatDate(..., 'America/Lima', ...)`.
- La hoja **`sueldos` es la fuente única de verdad del roster** de trabajadores (13 actuales). Dashboard, Empleados y Asistencia leen de ahí vía `leerRosterReal_()`.

---

## 2. Módulos del Sistema

| # | Módulo | Público / Admin | Estado |
|---|--------|-----------------|--------|
| 1 | Landing corporativa (hero, servicios, clientes, mapa cobertura, contacto) | Público | ✅ Producción |
| 2 | Bolsa de Trabajo (convocatorias + postulación con CV + ficha PDF) | Público + Admin | ✅ Producción |
| 3 | Consulta de postulación por DNI | Público | ✅ Producción |
| 4 | Capacitaciones + Evaluaciones con proctoring (webcam, anti-fraude) | Público + Admin | ✅ Producción |
| 5 | **Asistencia V2** — kiosko con foto + GPS + justificaciones | Público (kiosko) + Admin | ✅ Producción (jul 2026) |
| 6 | **Planilla** — sueldos, tardanzas, faltas, descuentos, bolsa de horas | Admin | ✅ Producción (jul 2026) |
| 7 | Proyectos y asignaciones empleado↔proyecto | Admin | ✅ Funcional |
| 8 | Mensajes de contacto | Admin | ✅ Funcional |
| 9 | Usuarios y credenciales (login, roles) | Admin | ✅ Funcional |
| 10 | Asistencia V1 (hoja `Asistencias`, sin foto) | — | ⚠️ Legacy, reemplazada por V2 |

---

## 3. Rutas del Frontend

Definidas en `src/App.tsx`.

### Rutas públicas

| Ruta | Página | Qué hace |
|------|--------|----------|
| `/` | `HomePage` | Landing con secciones (hero, servicios, clientes, empleos, contacto) |
| `/bolsa-trabajo` | `JobsPage` | Listado de convocatorias activas con filtros |
| `/bolsa-trabajo/:id` | `JobDetailPage` | Detalle + ficha PDF + formulario de postulación |
| `/mi-postulacion` | `ConsultaPostulacionPage` | Consulta estado de postulación por DNI |
| `/asistencia` | `AsistenciaPage` | **Kiosko de asistencia**: DNI → foto + GPS → marca evento |
| `/capacitaciones` | `CapacitacionesPage` | Cursos activos disponibles |
| `/evaluacion/:id` | `EvaluacionPage` | Examen en línea con webcam y proctoring |
| `/terminos`, `/privacidad` | `TermsPage`, `PrivacyPage` | Legales (lazy load) |
| `*` | `NotFoundPage` | 404 |

### Rutas admin (protegidas con `AuthContext` + token)

| Ruta | Página | Qué hace |
|------|--------|----------|
| `/admin/login` | `LoginPage` | Login con email/contraseña → token |
| `/admin` | `DashboardPage` | Estadísticas + asistencias de hoy (roster real) |
| `/admin/empleados` | `EmployeesPage` | Gestión de personal (lee roster de `sueldos`) |
| `/admin/proyectos` | `ProjectsPage` | CRUD proyectos + asignaciones |
| `/admin/bolsa-trabajo` | `JobsManagementPage` | CRUD convocatorias + subida de ficha PDF |
| `/admin/postulaciones` | `ApplicationsPage` | Revisión de postulaciones, cambio de estado |
| `/admin/mensajes` | `MessagesPage` | Mensajes de contacto |
| `/admin/asistencias` | `AttendancePage` | Asistencias V2 + justificaciones |
| `/admin/planilla` | `PlanillaPage` | Sueldos, incidencias, descuentos, bolsa de horas |
| `/admin/capacitaciones` | `CapacitacionesManagementPage` | CRUD cursos + banco de preguntas |
| `/admin/evaluaciones` | `EvaluacionesAdminPage` | Revisión de exámenes, fotos, nota final |
| `/admin/reportes` | `ReportsPage` | Informes |
| `/admin/api-test` | `ApiTestPage` | Herramienta interna de prueba de endpoints |

---

## 4. Mapa Frontend → Backend (por módulo)

Cada fila conecta: **página React → método del cliente API → `action` de Apps Script → hoja(s) de Sheets afectadas**.

### 4.1 Bolsa de Trabajo

| Página | Método API | Action backend | Token | Hojas / Recursos |
|--------|-----------|----------------|:-:|------------------|
| `JobsPage`, `JobsSection` | `getJobs()` | `getJobs` | No | `convocatorias` (solo activas) |
| `JobDetailPage` | `getJobById(id)` | `getJob` | No | `convocatorias` |
| `JobDetailPage` | `submitApplication()` | `apply` | No | `postulaciones` + CV a Drive + 📧 correo |
| `ConsultaPostulacionPage` | `consultarPostulacion(dni)` | `consultarPostulacion` | No | `postulaciones`, `convocatorias` |
| `JobsManagementPage` | `getJobsAdmin()` | `getJobsAdmin` | Sí | `convocatorias` (todas) |
| `JobsManagementPage` | `createJobAdmin()` / `updateJobAdmin()` / `deleteJobAdmin()` | `createJob` / `updateJob` / `deleteJob` | Sí | `convocatorias` |
| `JobsManagementPage` | `uploadJobPdf()` | `uploadJobPdf` | Sí | Drive: `Fichas_Postulacion/<ciudad>/` |
| `ApplicationsPage` | `getApplicationsAdmin()` | `getApplicationsAdmin` | Sí | `postulaciones` |
| `ApplicationsPage` | `updateApplicationStatus()` | `updateApplicationStatus` | Sí | `postulaciones` + 📧 correo al postulante |

### 4.2 Asistencia V2 (kiosko con foto + GPS)

| Página | Método API | Action backend | Token | Hojas / Recursos |
|--------|-----------|----------------|:-:|------------------|
| `AsistenciaPage` | `getTrabajadores()` | `getTrabajadores` | No | `sueldos` (roster, **sin montos**) |
| `AsistenciaPage` | `verificarEmpleado(dni)` | `verificarEmpleado` | No | `empleados`, `Asistencias` |
| `AsistenciaPage` | `registrarAsistenciaFoto()` | `registrarAsistenciaFoto` | No | `asistencias_v2` + foto a Drive `Asistencias/<fecha>/<dni>/` |
| `AsistenciaPage` | `subirJustificacion()` | `subirJustificacion` | No | `justificaciones` + archivo a Drive `Justificaciones/<fecha>/<dni>/` |
| `AttendancePage` (admin) | `registrarAsistenciaManual()` | `registrarAsistenciaManual` | Sí | `asistencias_v2` (sin foto/GPS, columna `nota` obligatoria) |
| `AttendancePage` (admin) | `getAsistenciasV2()` | `getAsistenciasV2` | Sí | `asistencias_v2` (hora normalizada a Lima) |
| `AttendancePage` (admin) | `getJustificaciones()` | `getJustificaciones` | Sí | `justificaciones` |
| `DashboardPage` | `getAttendanceToday()` | `obtenerAsistenciasHoy` | Sí | `sueldos` + `asistencias_v2` |

### 4.3 Planilla (sueldos, incidencias, descuentos)

Todo se opera desde `PlanillaPage` (`/admin/planilla`) y todas requieren token:

| Método API | Action backend | Hojas afectadas |
|-----------|----------------|-----------------|
| `getConfigPlanilla()` / `updateConfigPlanilla()` | `getConfigPlanilla` / `updateConfigPlanilla` | `config_planilla` |
| `getSueldos()` / `updateSueldo()` / `crearTrabajador()` | `getSueldos` / `updateSueldo` / `crearTrabajador` | `sueldos` |
| `getIncidencias()` / `revisarIncidencia()` | `getIncidencias` / `revisarIncidencia` | `incidencias`, `planilla_log` (auditoría) |
| `sincronizarIncidencias(desde, hasta)` | `sincronizarIncidencias` | Lee `asistencias_v2` + `sueldos` → escribe `incidencias`, `bolsa_horas`, consulta `autorizaciones_5pm` |
| `autorizarSalida5pm()` / `getAutorizaciones5pm()` | `autorizarSalida5pm` / `getAutorizaciones5pm` | `autorizaciones_5pm` |
| `registrarMuestreo()` / `getBolsaHoras()` | `registrarMuestreo` / `getBolsaHoras` | `bolsa_horas` |

Los cálculos de descuentos (valor día, valor minuto) se hacen en el frontend con `src/utils/planilla.ts` a partir de la config y las incidencias.

### 4.4 Capacitaciones y Evaluaciones

| Página | Método API | Action backend | Token | Hojas / Recursos |
|--------|-----------|----------------|:-:|------------------|
| `CapacitacionesPage` | `getCapacitaciones()` | `getCapacitaciones` | No | `capacitaciones` (activas) |
| `EvaluacionPage` | `iniciarEvaluacion()` | `iniciarEvaluacion` | No | `capacitaciones`, `banco_preguntas`, `evaluaciones` (crea fila, valida intento único) |
| `EvaluacionPage` | `guardarFotoWebcam()` | `guardarFotoWebcam` | No | `eval_fotos` + Drive `Evaluaciones_Proctoring/<cap>/<dni>/` |
| `EvaluacionPage` | `registrarEventoLog()` | `registrarEventoLog` | No | `eval_logs` (salida de pestaña, pegado, timeout) |
| `EvaluacionPage` | `submitEvaluacion()` | `submitEvaluacion` | No | `evaluaciones` (calcula `puntaje_auto`) |
| `CapacitacionesManagementPage` | `crearCapacitacion()` etc. | `crearCapacitacion` / `actualizarCapacitacion` / `eliminarCapacitacion` | Sí | `capacitaciones` |
| `CapacitacionesManagementPage` | `getPreguntas()` + CRUD preguntas | `getPreguntas` / `crearPregunta` / `actualizarPregunta` / `eliminarPregunta` | Sí | `banco_preguntas` (única vía que expone `respuesta_correcta`) |
| `EvaluacionesAdminPage` | `getEvaluaciones()` | `getEvaluaciones` | Sí | `evaluaciones` |
| `EvaluacionesAdminPage` | `revisarEvaluacion()` | `revisarEvaluacion` | Sí | `evaluaciones`, `capacitaciones` + 📧 correo con resultado |

### 4.5 Empleados, Proyectos y Usuarios (admin)

| Página | Método API | Action backend | Hojas / Recursos |
|--------|-----------|----------------|------------------|
| `EmployeesPage` | `getEmployees()` | `getEmployees` | **`sueldos` (roster real)** |
| `EmployeesPage` | `createEmployee()` / `updateEmployee()` | `createEmployee` / `updateEmployee` | `empleados`, `historial_empleados`, `usuarios` + 📧 |
| `EmployeesPage` | `transferEmployee()` | `transferEmployee` | `empleados`, `historial_empleados` + 📧 |
| `EmployeesPage` | `createEmployeeCredentials()` | `createCredentials` | `empleados`, `usuarios` + 📧 credenciales |
| `ProjectsPage` | `getProjects()` / `createProject()` / `updateProject()` | `getProjects` / `createProject` / `updateProject` | `proyectos`, `asignaciones` |
| `ProjectsPage` | `getAssignments()` / `assignEmployee()` / `removeAssignment()` | `getAssignments` / `assignEmployee` / `removeAssignment` | `asignaciones` (+ `historial_empleados`) |
| `LoginPage` | `login(email, password)` | `login` | `usuarios` → devuelve token |
| `AuthContext` | `verifyToken()` | `verifyToken` | `usuarios` |

### 4.6 Contacto y Dashboard

| Página | Método API | Action backend | Token | Hojas |
|--------|-----------|----------------|:-:|-------|
| `ContactSection` (home) | `submitContact()` | `contact` | No | `contactos` + 📧 correo |
| `MessagesPage` | `getContacts()` / `updateContactStatus()` / `deleteContact()` | `getContacts` / `updateContactStatus` / `deleteContact` | Sí | `contactos` |
| `DashboardPage` | `getDashboardStats()` | `getDashboard` | Sí | `proyectos`, `postulaciones`, `convocatorias`, **`sueldos`** |

---

## 5. Cliente API — cómo viaja una petición

`src/api/appScriptApi.ts` — clase `AppScriptApi`, único punto de salida hacia el backend.

```
Página React
  └─ api.metodo(datos)
       └─ request(action, datos, método)
            ├─ POST (escrituras): fetch con body JSON y
            │    Content-Type: text/plain   ← evita preflight CORS
            └─ GET (lecturas públicas): payload como query param
```

Reglas críticas (aprendidas de bugs pasados):

1. **`text/plain`, nunca `application/json`**: Apps Script no responde el preflight CORS; `text/plain` lo evita y el script igual lee `e.postData.contents`.
2. **Escrituras siempre por body POST**: payloads largos (descripción de convocatoria) rompían el límite de ~2000 caracteres de URL y el token se perdía → error "No autorizado".
3. **Token**: se genera en login (`base64(userId|timestamp|password)`), se guarda en el cliente y se adjunta a las 66 acciones protegidas. `AuthContext` lo verifica al montar la app con `verifyToken`.
4. El backend enruta **la misma tabla de acciones tanto en `doGet` como en `doPost`** — el método HTTP lo decide el frontend según tamaño/sensibilidad del payload.

---

## 6. Base de Datos — Hojas de Google Sheets

Spreadsheet: `15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA`

### Núcleo de negocio

| Hoja | Contenido | Quién escribe |
|------|-----------|---------------|
| `usuarios` | Cuentas admin (email, password, rol, permisos) | login/createUser/createCredentials |
| `empleados` | Ficha extendida de empleados (legacy, 17 cols) | createEmployee/updateEmployee |
| `sueldos` | **Roster oficial: 13 trabajadores** (dni, nombre, cargo, sueldo, usa_rmv, sede, email) | crearTrabajador/updateSueldo |
| `proyectos` / `asignaciones` | Proyectos y asignación empleado↔proyecto | módulo Proyectos |
| `historial_empleados` | Auditoría de cambios (transferencias, altas, bajas) | automático |
| `convocatorias` | Bolsa de trabajo (incluye `pdf_url`) | CRUD admin |
| `postulaciones` | Candidatos con CV en Drive | `apply` público |
| `contactos` | Mensajes del formulario de contacto | `contact` público |

### Asistencia y Planilla (módulos de julio 2026)

| Hoja | Contenido | Generada por |
|------|-----------|--------------|
| `asistencias_v2` | Marcas entrada/salida: dni, evento, fecha, hora, GPS, foto_url, timestamp UTC | Kiosko `/asistencia` |
| `justificaciones` | Justificaciones con archivo de sustento | Kiosko `/asistencia` |
| `config_planilla` | Parámetros clave-valor (horarios, tolerancias, RMV=1130, plazo sustento 48h) | Admin planilla |
| `incidencias` | Tardanzas, faltas, salidas anticipadas/omisiones detectadas | `sincronizarIncidencias()` |
| `planilla_log` | Auditoría de revisiones de incidencias | automático |
| `autorizaciones_5pm` | Permisos de salida 17:00 | Admin planilla |
| `bolsa_horas` | Horas acreditadas (salida autorizada, muestreos) | sincronización + admin |
| `Asistencias` | ⚠️ V1 legacy (sin foto), aún usada por `verificarEmpleado`/`marcarAsistencia` | kiosko antiguo |

### Capacitaciones

| Hoja | Contenido |
|------|-----------|
| `capacitaciones` | Cursos (num_preguntas, nota_minima, tiempo, intervalo foto) |
| `banco_preguntas` | Preguntas con `respuesta_correcta` (nunca expuesta al público) |
| `evaluaciones` | Intentos: respuestas, puntaje_auto, salidas_pestana, nota_final |
| `eval_fotos` / `eval_logs` | Fotos de proctoring y eventos anti-fraude |

---

## 7. Almacenamiento en Google Drive

Carpeta raíz: `1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV`

```
Mi Drive/
├── Fichas_Postulacion/<ciudad>/          ← PDFs de convocatorias
├── Asistencias/<fecha>/<dni>/            ← fotos del kiosko de asistencia
├── Justificaciones/<fecha>/<dni>/        ← sustentos de justificaciones
├── Evaluaciones_Proctoring/<cap>/<dni>/  ← fotos de webcam en exámenes
└── <yyyy-MM>/                            ← CVs y uploads generales por mes
```

Todos los archivos se comparten como `ANYONE_WITH_LINK` (solo lectura) para poder mostrarse en el frontend.

---

## 8. Correos automáticos (MailApp)

| Evento | Destinatario | Función |
|--------|--------------|---------|
| Nueva postulación | energysupervision13@gmail.com | `sendApplicationNotification` |
| Nuevo mensaje de contacto | energysupervision13@gmail.com | `sendContactNotification` |
| Cambio de estado de postulación | Postulante | `sendStatusUpdateEmail` |
| Contratación (`hireApplicant`) | Postulante | `sendHireNotification` |
| Credenciales creadas / reset | Empleado | `sendCredentialsEmail` |
| Transferencia de empleado | Empleado | `sendTransferNotification` |
| Resultado de evaluación (aprobado/observado) | Trabajador evaluado | dentro de `revisarEvaluacion` |

---

## 9. Lógica de negocio clave

### 9.1 Evaluaciones (anti-fraude)

- **Barajeo determinístico por DNI**: semilla `parseInt(dni)` → el mismo DNI siempre ve el mismo examen (reproducible para auditoría), DNIs distintos ven exámenes distintos.
- **Mezcla por dificultad**: 30% fácil / 50% media / 20% difícil.
- **Intento único** por DNI + capacitación.
- Puntaje automático solo para opción múltiple (comparación normalizada sin tildes); preguntas de desarrollo van a revisión manual.
- Estado final lo decide el admin (`pendiente_revision → aprobado/observado`) y recién ahí se envía el correo.

### 9.2 Asistencia V2 y zona horaria

- Cada marca guarda **timestamp ISO en UTC** + fecha/hora ya formateadas en `America/Lima`. Al leer, el backend re-normaliza desde el timestamp para evitar el bug histórico de -12:20 (LMT de Sheets).
- Personal de **oficina**: no puede marcar el mismo evento dos veces el mismo día (la comparación normaliza la celda `fecha`, que Sheets auto-convierte a `Date`). Personal de **campo**: sin esa restricción (flujo de múltiples marcas).
- **Concurrencia (fix 12/08/2026)**: la subida de foto a Drive va FUERA del lock (`withLock_` solo cubre anti-duplicado + `appendRow`); `getTrabajadores` responde desde `CacheService` (10 min, invalidado en altas/ediciones de personal); el kiosko reintenta solo ante fallos transitorios o "Sistema ocupado".
- **Registro manual (12/08/2026)**: el admin puede crear una marca desde `/admin/asistencias` (botón "Registrar manual") para marcas no hechas por error del sistema. Sin foto/GPS, con `nota` obligatoria (columna 13 de `asistencias_v2`); el panel la distingue con el badge "· manual".

### 9.3 Planilla — `sincronizarIncidencias()`

Motor que convierte marcas de `asistencias_v2` en incidencias:

| Regla | Valor |
|-------|-------|
| Horario | 07:30–13:00 / 14:00–18:00 (jornada 9.5 h) |
| Tolerancia | 10 min mañana / **0 min tarde** |
| Tardanza grave | ≥ 60 min |
| Salida antes de 13:00 | Incidencia grave |
| Salida ≥ 17:00 con autorización | No es incidencia → acredita horas a `bolsa_horas` |
| Plazo de sustento | 48 h desde reincorporación; vencido → `injustificada` automática |
| Descuento | Calculado en frontend: sueldo / 30 → valor día/minuto (referencial) |
| Operarios de campo (sin email corporativo) | **Excluidos** del modelo de descuentos |

### 9.4 Roster actual (hoja `sueldos`)

13 trabajadores desde julio 2026: **8 administrativos** (coordinador general, 2 analistas legales, 1 analista junior, 1 asistente administrativo, 3 tramitadores/digitadores — todos con correo corporativo `@ingenieriatelcom.com`, sujetos a control de asistencia y planilla) y **5 operarios de campo** (sueldo RMV S/ 1,130, sin correo, fuera del modelo de descuentos). Fecha de inicio operativo: 2026-07-02, sin faltas retroactivas.

---

## 10. Estado Actual de la Aplicación

### En producción (https://ingeneriatelcom.com)

| Área | Estado |
|------|--------|
| Landing + mapa animado de cobertura nacional | ✅ Desplegado (commit `1ee88e9`) |
| Bolsa de trabajo + fichas PDF | ✅ Estable |
| Capacitaciones + proctoring | ✅ Estable (fix webcam negra aplicado) |
| Asistencia V2 (foto + GPS + justificaciones) | ✅ Operativa desde 01/07/2026 |
| Planilla (incidencias, descuentos referenciales, bolsa de horas) | ✅ Operativa (commit `29d1b8f`) |
| Roster real en Dashboard y Empleados | ✅ Último commit (`d1c3d0e`) |
| Fix zona horaria (-12:20 en horas de asistencia) | ✅ Corregido (`6e614ae`) |
| CI/CD GitHub Actions en push a `main` | ✅ Activo |

### Sin commitear (working tree al 10/07/2026)

- `Manual_Registro_Asistencia.md` / `.pdf` — manual de usuario del kiosko
- `fotos tutorial/` — capturas para el manual

### Cifras rápidas

- **85 acciones** en el backend (19 públicas, 66 con token)
- **~70 métodos** en el cliente API
- **23 rutas** en el frontend (9 públicas + 13 admin + 404)
- **~24 hojas** en Google Sheets, **5 estructuras** de carpetas en Drive
- **13 trabajadores** en el roster

---

## 11. Deuda técnica y observaciones

1. **`updateUser` y `deactivateUser` están ruteadas pero sin función definida** en `appscript.js` — si el frontend las llama, fallarán. Verificar antes de usar el módulo de usuarios completo.
2. **Contraseña admin hardcodeada** en `appscript.js` (repo público en GitHub). Migrar a `PropertiesService` de Apps Script sería más seguro.
3. **Asistencia V1 convive con V2**: `verificarEmpleado`/`marcarAsistencia` aún leen la hoja legacy `Asistencias`. Candidata a limpieza cuando V2 esté consolidada.
4. **Hoja `empleados` semi-legacy**: el roster real es `sueldos`, pero `createEmployee`/`hireApplicant` todavía escriben en `empleados`. Hay dos fuentes de personal que pueden divergir.
5. **Endpoints públicos sensibles**: `registrarAsistenciaFoto`, `subirJustificacion` y `guardarFotoWebcam` no requieren token (necesario para el kiosko), pero cualquiera con la URL del Web App puede escribir. El riesgo es bajo pero existe.
6. **Despliegue manual del backend**: `appscript.js` se copia a mano al editor de Apps Script. El repo puede adelantarse a lo desplegado (o viceversa) — conviene anotar la versión desplegada en cada cambio.
7. **Readme.md desactualizado**: no documenta Asistencia V2, Planilla, Proyectos, Usuarios ni el roster real. Este documento (`ARQUITECTURA.md`) refleja el estado actual.
8. **`recrearHoja()` / funciones de datos de prueba siguen presentes**: ejecutarlas en producción borra datos reales (ya ocurrió con los PDFs). Mantener la advertencia vigente.

---

© 2026 Ingeniería Telcom EIRL — Documento de arquitectura interna.
