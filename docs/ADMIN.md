# Panel Admin — cómo funciona hoy y cómo ampliarlo

> Estado al **24/09/2026** (revisado en vivo con sesión de supervisor), levantado del código real (`src/pages/admin/*`, `backend/*.gs`).
> Complementa a `ARQUITECTURA.md` (julio 2026, parcialmente desactualizado).
> URL: `https://ingeneriatelcom.com/admin` · Backend: Apps Script (una sola "implementación web").

---

## 1. Vista general

```
Navegador (React + Vite, GitHub Pages)
  └─ /admin/*  ── ProtectedRoute ── AdminLayout (menú lateral)
        │  api.metodo()  (src/api/appScriptApi.ts)
        ▼
Apps Script  doGet/doPost → handleRequest_ (backend/01_router.gs)
        │  ROUTES[action] → nivel: publico | auth | admin
        ▼
Google Sheets (≈23 hojas)  +  Google Drive (fotos, CVs, PDFs)  +  MailApp (correos)
```

- **Una petición** = `?action=<nombre>` + datos en el cuerpo (POST) o en `?payload=` (GET), con el
  token dentro de los datos. La respuesta siempre es `{ success, data?, error? }`.
- **73 acciones** en el router. Todas las que usa el frontend existen (verificado 23/09/2026).

---

## 2. Acceso, sesión y roles

### 2.1 Login y sesión
| Pieza | Dónde | Cómo funciona |
|---|---|---|
| Login | `src/pages/admin/LoginPage.tsx` → action `login` | Email + contraseña contra la hoja `usuarios`. |
| Token | `localStorage['auth_token']` | `base64(userId|timestamp).HMAC-SHA256(TOKEN_SECRET)`. **Expira a las 24 h** (lo decide el backend, `02_auth.gs`). |
| Revalidación | `src/context/AuthContext.tsx` | Al abrir, al volver a la pestaña (máx. 1/min) y cada 10 min. **Solo cierra sesión si el backend rechaza el token**; un corte de red o "Servidor ocupado" no expulsa. |
| Protección de rutas | `ProtectedRoute` (`src/App.tsx`) + `AdminLayout` | Sin usuario → `/admin/login`. |
| Logout | `api.logout()` | Solo borra el token local (no hay revocación en el servidor). |
| Contraseñas | `02_auth.gs` | Guardadas como `sha256:` + SHA-256(`userId:password`). Si una fila aún tiene texto plano, se convierte en el primer login. |

### 2.2 Roles y permisos por módulo (escalón 2, desde el 24/09/2026)

**Regla única** (backend `puedeModulo_` en `backend/13_usuarios.gs`, replicada en el frontend por
`puede()` en `src/utils/roles.ts`):

1. Rol de administración (`admin, administrador, manager, supervisor, rrhh`) o permiso `all` → **todos
   los módulos** (igual que antes del cambio).
2. Cualquier otro rol → solo los módulos listados en la columna `permisos` de la hoja `usuarios`
   (separados por coma, p. ej. `asistencias,reportes`).
3. Los módulos **solo admin** no se conceden por permiso.
4. Cuenta **inactiva** → rechazada en cada consulta (antes su token seguía sirviendo hasta expirar).

| Módulo (`permisos`) | Pantallas | Acciones del backend |
|---|---|---|
| `asistencias` | Asistencias | `getAsistenciasV2`, `getJustificaciones`, `registrarAsistenciaManual`, `obtenerAsistenciasHoy`, `getAttendances` |
| `personal` | Empleados | `getEmployees`, `getEmployee`, `createEmployee`, `updateEmployee`, `transferEmployee` |
| `proyectos` | Proyectos | `getProjects`, `getProject`, `createProject`, `updateProject`, `getAssignments`, `assignEmployee`, `removeAssignment` |
| `bolsa` | Bolsa de trabajo, Postulaciones | `getJobsAdmin`, `createJob`, `updateJob`, `uploadJobPdf`, `getApplicationsAdmin`, `updateApplicationStatus`, `upload` |
| `mensajes` | Mensajes | `getContacts`, `updateContactStatus` |
| `capacitaciones` | Gestión de cursos, Evaluaciones | cursos, preguntas, `getEvaluaciones`, `revisarEvaluacion` |
| `reportes` | Reportes | `getAsistenciasV2` (la pestaña Postulaciones/Empleados además pide `bolsa`/`personal`) |
| **solo admin** `planilla` | Planilla | sueldos, incidencias, feriados (escritura), bolsa de horas, configuración |
| **solo admin** `usuarios` | Usuarios | `listarUsuarios`, `crearUsuario`, `actualizarUsuario`, `restablecerContrasena` |
| **solo admin** `auditoria` | Auditoría | `getAuditoria` |
| (cualquier sesión) | Centro de actividades | `verifyToken`, `getDashboard`, `getFeriados` |

- `getArchivo` (visor de fotos, CVs, adjuntos) exige **alguno** de `asistencias`, `bolsa` o `capacitaciones`.
- Borrados (`deleteJob`, `deleteContact`, `eliminarCapacitacion`) y `createCredentials` siguen siendo **solo admin**.
- El mapa acción → módulo está en `MODULO_POR_ACCION_` (`backend/01_router.gs`). **Toda acción nueva de
  nivel `auth` debe agregarse ahí**; si no, cualquier sesión válida podrá usarla.
- Caché: el perfil (rol/permisos/estado) se guarda 2 min; un cambio de permisos tarda como máximo eso.
  Un fallo al leer el perfil responde "Servidor ocupado" (no "sin permisos").
- **Protecciones anti-bloqueo** (`actualizarUsuario`): nadie se quita a sí mismo la administración ni se
  desactiva, y siempre queda al menos un administrador activo.
- Menú y Centro de actividades muestran solo lo permitido; **la barrera real es el backend**.
- `verifyToken` devuelve `permisos`; con **inicio optimista** (token vigente + `localStorage['auth_user']`)
  el panel aparece al instante y la verificación corre por detrás.

### 2.3 Auditoría
- Toda acción de **escritura** de nivel `auth`/`admin` queda en la hoja `auditoria` (se crea sola):
  `id, timestamp, usuario_id, usuario, accion, resultado, detalle`.
- `detalle` = datos enviados + respuesta, **sin** token, contraseñas, archivos en base64 ni contraseñas temporales
  (ver `CAMPOS_OCULTOS_AUDITORIA_`), recortado a 4 000 caracteres.
- No se auditan acciones públicas (kiosko, postulación, contacto): el kiosko debe seguir rápido y sus marcas
  ya guardan foto y GPS. Las lecturas tampoco.
- Consultar en **/admin/auditoria** (solo admin). Si la auditoría falla, la acción NO se bloquea (queda en el
  registro de ejecuciones de Apps Script como `registrarAuditoria_ fallo`).

---

## 3. Módulos del panel

> Formato: **qué puedes hacer** · acciones del backend · hojas. Todas las pantallas están en `src/pages/admin/`.

### 3.1 Centro de actividades — `/admin` (`DashboardPage.tsx`)
- **KPIs**: empleados activos, presentes hoy, proyectos activos, convocatorias activas.
- **Requieren atención** (cada tarjeta enlaza a su pantalla): asistencia de hoy (ausentes), incidencias
  pendientes del mes (solo admin, con **aviso si la sincronización tiene más de 2 días**), justificaciones
  de 7 días, postulaciones sin revisar, mensajes pendientes, evaluaciones por calificar, convocatorias activas.
- Carga **escalonada** (primero KPIs y asistencia, luego pendientes) para no saturar Apps Script.
  Si una fuente falla, su tarjeta dice "No se pudo cargar + Reintentar" — nunca un 0 engañoso.
- Fuentes: `getDashboard`, `obtenerAsistenciasHoy`, `getIncidencias`, `getEstadoPlanilla`,
  `getJustificaciones`, `getApplicationsAdmin`, `getContacts`, `getEvaluaciones`, `getJobsAdmin`
  (hooks en `src/hooks/queries.ts`).

### 3.2 Asistencias — `/admin/asistencias` (`AttendancePage.tsx`)
- **Registros**: filtros por trabajador, evento y fechas (atajos semana/semana pasada/mes); foto de cada
  marca (visor privado `FileViewerModal` → `getArchivo`), enlace a Google Maps, puntualidad.
- **Informe**: resumen por trabajador y día, respeta feriados. **Justificaciones**: ver adjuntos.
- **Registrar manual** (sin foto ni GPS, observación obligatoria, queda como "manual").
- **Exportar Excel** (registros e informe). Si la carga falla muestra error + Reintentar (no "sin marcas").
- `getTrabajadores`, `getFeriados`, `getAsistenciasV2`, `getJustificaciones`, `registrarAsistenciaManual` ·
  hojas `asistencias_v2`, `justificaciones`, `feriados`.
- Kiosko de los trabajadores (`/asistencia`): ver `docs/KIOSKO_ASISTENCIA.md`.

### 3.3 Planilla — `/admin/planilla` (`PlanillaPage.tsx` + `planilla/*`) · nivel **admin**
- Mes a mes (desde 2026-07): tabla de sueldos con fila expandible (`SueldosTable`), edición de sueldo,
  **autorizar salida 5 pm**, **muestreo** (descuenta de la bolsa de horas), imprimir por trabajador,
  **alta** (`NuevoTrabajadorModal`), **baja/reactivación** (`BajaTrabajadorModal`, guarda `fecha_fin`).
- **Sincronizar incidencias** → genera faltas, tardanzas, salidas anticipadas y omisiones.
- **Incidencias** (`IncidenciasPanel`): marcar justificada/injustificada con nota y sustento.
- **Feriados** (`FeriadosPanel`), **Bolsa de horas** (`BolsaHorasPanel`), **Configuración** (`ConfigPlanillaForm`), Excel.
- Acciones: `getConfigPlanilla`, `updateConfigPlanilla`, `getSueldos`, `updateSueldo`, `crearTrabajador`,
  `darDeBajaTrabajador`, `reactivarTrabajador`, `getIncidencias`, `revisarIncidencia`, `sincronizarIncidencias`,
  `autorizarSalida5pm`, `registrarMuestreo`, `getBolsaHoras`, `getFeriados`, `agregarFeriado`,
  `eliminarFeriado`, `sembrarFeriadosPeru2026`.
- Hojas: `sueldos` (**roster único de personal**), `incidencias`, `planilla_log`, `autorizaciones_5pm`,
  `bolsa_horas`, `config_planilla`, `feriados`.

**Reglas de cálculo** (`backend/08_planilla.gs`, `src/utils/planilla.ts`):
| Concepto | Regla |
|---|---|
| Horario | 07:30–13:00 y 14:00–18:00 (editable en `config_planilla`) |
| Tolerancia | mañana 10 min, tarde 0 |
| Tardanza | cuenta los minutos **totales** si supera la tolerancia; **grave** si > 60 min |
| Falta | día laborable terminado sin ninguna marca |
| Omisión | falta alguno de los 4 eventos |
| Salida anticipada | antes de hora; la de la tarde con autorización 5 pm y ≥ 17:00 no es incidencia y suma a la bolsa de horas |
| No se evalúa | sábados, domingos, feriados, antes del ingreso/después del cese, personal de campo (sin email) |
| Vencimiento | una incidencia `pendiente` pasa a `injustificada` 48 h después del día de reincorporación |
| Descuentos (frontend) | día = sueldo/30 · hora = día/9.5 · tardanza = minuto × minutos · falta = día × 1.2 · omisión = día · justificada = 0 |
| RMV | trabajadores con `usa_rmv` toman el sueldo del parámetro `rmv` (1130) |

> El descuento es **referencial**: lo calcula el navegador; la planilla oficial la decide el administrador.

### 3.4 Empleados — `/admin/empleados` (`EmployeesPage.tsx`)
- Buscar/filtrar (ciudad, área, estado), crear y editar (nombre, DNI, email, teléfono, cargo, área, ciudad,
  estado, fecha de inicio, salario), **trasladar** de sede (con correo al trabajador), **crear credenciales**
  (usuario con rol `empleado` y contraseña temporal por correo — nivel admin).
- `getEmployees`, `createEmployee`, `updateEmployee`, `transferEmployee`, `createCredentials` ·
  hojas `sueldos`, `historial_empleados`, `asignaciones`, `usuarios`.
- Sin eliminar ni exportar (la baja se hace en Planilla).

### 3.5 Proyectos — `/admin/proyectos` (`ProjectsPage.tsx`)
- Crear/editar (nombre, descripción, cliente, ciudad, estado, fechas, presupuesto), **asignar/quitar personal**.
- `getProjects`, `createProject`, `updateProject`, `getAssignments`, `assignEmployee`, `removeAssignment` ·
  hojas `proyectos`, `asignaciones`. Sin eliminar.

### 3.6 Bolsa de trabajo — `/admin/bolsa-trabajo` (`JobsManagementPage.tsx`)
- Crear/editar convocatorias (título, categoría, descripción, requisitos, beneficios, ubicación, modalidad,
  salario, prioridad, fecha de cierre, estado, imagen por URL, **PDF de la ficha**), activar/desactivar, eliminar (admin).
- `getJobsAdmin`, `createJob`, `updateJob`, `deleteJob`, `uploadJobPdf` · hoja `convocatorias`, Drive `Fichas_Postulacion/`.

### 3.7 Postulaciones — `/admin/postulaciones` (`ApplicationsPage.tsx`)
- Vista lista o kanban, filtros por estado/puesto, ver CV, **cambiar estado**
  (pendiente → en revisión → entrevista → contratado / rechazado), opción de avisar por correo al postulante.
- `getApplicationsAdmin`, `updateApplicationStatus` · hoja `postulaciones`, CVs en Drive.
- El postulante consulta su estado en `/mi-postulacion` (por DNI, datos enmascarados).

### 3.8 Mensajes — `/admin/mensajes` (`MessagesPage.tsx`)
- Mensajes del formulario de contacto: marcar leído/respondido, responder (abre el correo), eliminar (admin).
- `getContacts`, `updateContactStatus`, `deleteContact` · hoja `contactos`. Cada mensaje nuevo avisa por correo.

### 3.9 Capacitaciones — `/admin/capacitaciones` (`CapacitacionesManagementPage.tsx`)
- Cursos (título, material, categoría, estado, n.º de preguntas, nota mínima, tiempo, intervalo de foto) y
  **banco de preguntas** (opción múltiple o completar, dificultad, puntaje, justificación).
- `getCapacitaciones`, `crearCapacitacion`, `actualizarCapacitacion`, `eliminarCapacitacion` (admin),
  `getPreguntas`, `crearPregunta`, `actualizarPregunta`, `eliminarPregunta` · hojas `capacitaciones`, `banco_preguntas`.

### 3.10 Evaluaciones — `/admin/evaluaciones` (`EvaluacionesPage.tsx`)
- Revisar exámenes rendidos: respuestas, **fotos de supervisión (webcam)**, eventos sospechosos; calificar
  0–20 con retroalimentación (Aprobado/Observado) → correo al evaluado. Un intento por DNI y curso.
- `getEvaluaciones`, `revisarEvaluacion` · hojas `evaluaciones`, `eval_fotos`, `eval_logs`.

### 3.11 Reportes — `/admin/reportes` (`ReportsPage.tsx`)
- Pestañas Asistencias, Postulaciones y Empleados con exportación a Excel. **Ver deudas §6** (usa el modelo viejo de asistencia).

### 3.12 Test API — `/admin/api-test` (`ApiTestPage.tsx`)
- 11 pruebas de conexión. **Ojo: la última crea un mensaje de contacto real cada vez.**
  Para pruebas sin efectos usar `npm run test:prod` (ver §8).

---

## 4. Flujos de punta a punta

**Postulación:** web `/bolsa-trabajo` → `apply` (CV a Drive, fila en `postulaciones`, correo a
`energysupervision13@gmail.com`) → admin cambia estado en Postulaciones → correo opcional al postulante →
postulante consulta en `/mi-postulacion`.

**Asistencia → planilla:** trabajador marca en el kiosko (foto + GPS, 4 eventos oficina / ingreso-salida campo)
→ `asistencias_v2` → admin revisa en Asistencias (y registra manuales) → en Planilla pulsa *Sincronizar
incidencias* → revisa y justifica → descuentos referenciales → Excel / impresión.

**Capacitación:** admin crea curso + banco de preguntas → trabajador rinde en `/capacitaciones` con
supervisión por webcam → admin califica en Evaluaciones → correo con la nota.

---

## 5. Datos, archivos y automatismos

### 5.1 Hojas principales
| Hoja | Para qué | Escribe |
|---|---|---|
| `usuarios` | cuentas del panel (rol, permisos, estado) | login, crear credenciales |
| `sueldos` | **roster único**: dni, nombre, cargo, sueldo, fecha_inicio, usa_rmv, sede, email, fecha_fin | Empleados, Planilla |
| `asistencias_v2` | marcas (evento, fecha, hora, GPS, foto, nota) | kiosko, registro manual |
| `justificaciones` | justificaciones con adjunto | kiosko |
| `incidencias` / `planilla_log` | faltas, tardanzas… y su historial de revisión | Planilla |
| `autorizaciones_5pm` / `bolsa_horas` | salidas 5 pm y saldo de horas | Planilla |
| `config_planilla` / `feriados` | parámetros y días no laborables | Planilla |
| `convocatorias` / `postulaciones` | bolsa de trabajo | admin / web |
| `contactos` | formulario de contacto | web |
| `proyectos` / `asignaciones` / `historial_empleados` | proyectos y movimientos | admin |
| `capacitaciones` / `banco_preguntas` / `evaluaciones` / `eval_fotos` / `eval_logs` | cursos y exámenes | admin / web |
| `Asistencias`, `empleados` | **legado** (V1), ya no se alimentan | — |

### 5.2 Drive (carpeta raíz `DRIVE_FOLDER_ID`)
| Carpeta | Contenido | Acceso |
|---|---|---|
| `Asistencias/AAAA-MM-DD/<dni>/` | fotos del kiosko | privado (se ven vía `getArchivo`) |
| `Justificaciones/…`, `Evaluaciones_Proctoring/…` | adjuntos y fotos de examen | privado |
| `Fichas_Postulacion/<ciudad>/` | PDFs de convocatorias | **cualquiera con el enlace** |
| `<AAAA-MM>/` | **CVs** y subidas genéricas | **cualquiera con el enlace** |

### 5.3 Correos automáticos (MailApp)
Credenciales nuevas/reset (usuario) · nueva postulación y nuevo contacto (`energysupervision13@gmail.com`) ·
cambio de estado de postulación (postulante, opcional) · traslado (trabajador) · calificación de evaluación (evaluado).

### 5.4 Tareas programadas y funciones de editor
- **Activador diario 6–7 a. m.:** `precalentarRosterKiosko` (se configura a mano en Apps Script → Activadores).
- **Activador nocturno (crear a mano):** `sincronizarIncidenciasProgramada`, diario 10–11 p. m. Revisa los
  últimos 35 días (idempotente). Deja constancia en `ULTIMA_SYNC_INCIDENCIAS` (Propiedades del script),
  que el Centro de actividades muestra vía `getEstadoPlanilla`. *No se usa código `ScriptApp` a propósito:
  agregaría un permiso nuevo al proyecto y, sin reautorizar, la web dejaría de responder.*
- El botón "Sincronizar incidencias" de Planilla sigue disponible (corre dentro del lock: evitar horas de marcación).
- `ejecutarTestSalud` (solo lectura): correr antes/después de cada nueva versión. Criterio: 0 FAIL.
- Funciones que borran/recrean hojas (`setupAllSheets`, `cargar*Prueba`, `migrarPlanillaV2`…) están bloqueadas
  salvo que la propiedad `ALLOW_DESTRUCTIVE_OPS` sea `true`. **Mantenerla apagada.**

### 5.5 Lecturas por rango (escalón 1)
- `getAsistenciasV2` y `getJustificaciones` con `desde` leen solo el **tramo final** de la hoja
  (`leerFilasAsistenciaDesde_`, `leerTramoFinal_`), ampliándolo hasta cubrir la fecha pedida.
- Corte seguro: se usa el `timestamp` de las marcas del **kiosko** (se escriben en orden). Las marcas
  manuales pueden ser de días pasados y quedar al final, por eso **no pueden tener fecha futura**.
- `ejecutarTestSalud` compara rango vs. lectura completa (últimos 45 días): si difieren → FAIL, no publicar.
- Sin `desde` la lectura sigue siendo completa (compatibilidad).

### 5.6 Límites
- Apps Script responde en 2–30 s (más lento justo tras publicar una versión y en la ráfaga de las 07:30).
- Escrituras con bloqueo global (`withLock_`, espera máx. 30 s → "Sistema ocupado").
- Límites por hora: postulación 5/DNI, contacto 10/email, marca 30/DNI, justificación 10/DNI.
- Archivos: imágenes ≤ 6 MB, documentos ≤ 10 MB (el visor sirve hasta 10 MB).

---

## 6. Deudas y riesgos — estado al 24/09/2026

### 6.1 Corregido el 23–24/09 (auditoría en vivo del admin)
| Hallazgo | Efecto que tenía | Corrección |
|---|---|---|
| `updateApplicationStatus` leía `estado`; el panel envía `status` | **cada cambio de estado de postulación se guardaba vacío** (6 de 7) | acepta ambos, valida, guarda notas, con lock |
| Correo de estado leía columnas por posición | el aviso se enviaba **al DNI** y nunca llegaba | usa cabeceras y valida el correo; `notificar` desde el panel |
| `apply` no revisaba la convocatoria | se podía postular a ofertas **inactivas** (y subir CV) | `validarConvocatoriaAbierta_` antes de subir el CV |
| `submitContact` escribía 8 valores en otro orden que las 9 columnas | **mensajes de clientes desordenados** (texto en "asunto", fecha en "mensaje") | escribe por cabecera; `getContacts` reacomoda las filas viejas al leer |
| Fallo de Google al validar el token → "No autorizado" | falsos rechazos y **cierres de sesión** con carga | `parseToken_` distingue token inválido de fallo transitorio → "Servidor ocupado" |
| Pantallas que mostraban "vacío" si la carga fallaba | Bolsa ofrecía "crear la primera convocatoria"; Mensajes mostraba 3 **mensajes falsos** de 2024 | `ErrorCarga` con Reintentar en todas; lecturas con 1 reintento automático |
| Reportes sobre asistencia V1 | reporte de asistencia **siempre vacío** | usa `getAsistenciasV2` con rango real |
| Spinner de 10–30 s al abrir cualquier URL del admin | panel "colgado" | inicio optimista (usuario guardado + vigencia local del token) |
| Deploy borraba los archivos viejos | **pantallas en blanco** ~10 min tras publicar | `gh-pages --add` + recarga automática si falta un archivo |
| Menú igual para todos; Planilla exigía solo `admin` | secciones inútiles para unos, bloqueadas para supervisor/RR. HH. | `src/utils/roles.ts` replica `esRolAdmin_`; menú por rol |
| Incidencias sin sincronizar desde el 23/07 | **agosto y septiembre sin descuentos calculados**, 58 pendientes sin vencer | registro de última sincronización, aviso en el Centro de actividades y `sincronizarIncidenciasProgramada` para activador nocturno |

### 6.2 Pendiente
| # | Prioridad | Hallazgo | Dónde |
|---|---|---|---|
| 1 | ~~Alta~~ ✅ | ~~Rutas `auth` abiertas a cualquier token~~ → permisos por módulo el 24/09 (§2.2). | `01_router.gs` |
| 2 | **Alta** | CVs y subidas genéricas públicos "con el enlace". | `00_nucleo.gs`, `05_bolsa.gs` |
| 3 | **Alta** | `TOKEN_SECRET` < 32 caracteres. | Propiedades del script |
| 4 | **Alta (negocio)** | Sincronizar agosto–septiembre: generará omisiones/tardanzas reales → descuentos. Revisar antes (ver §6.3). | Planilla |
| 5 | Media | Justificaciones del kiosko no se vinculan a la incidencia. | Asistencias / Planilla |
| 6 | Baja | Datos: un proyecto con estado "tacna" (ciudad en la columna estado); convocatorias de prueba de 2024. | hojas `proyectos`, `convocatorias` |
| 7 | Baja | Listas fijas en el frontend (ciudades, áreas, cargos). | varias páginas |
| 8 | Baja | `upload`/`uploadJobPdf` sin validar tamaño/tipo; proyectos sin lock. | `00_nucleo.gs`, `04_proyectos.gs` |

### 6.3 Antes de sincronizar agosto y septiembre
El reporte de septiembre (Reportes → Asistencias) muestra ~2 de 4 marcas diarias por persona:
al sincronizar, las marcas faltantes serán **omisiones** con descuento (valor de un día cada una).
Confirmar primero si es un hábito real (no marcan salida/ingreso de mediodía) o si hay que
avisar al personal, y decidir desde qué fecha aplicar. La sincronización corre **dentro del lock**:
hacerla fuera del horario de marcación (o dejarla al activador nocturno).

---

## 7. Cómo agregar una función nueva (receta)

1. **Backend** — en el módulo `.gs` que corresponda (o uno nuevo `backend/NN_nombre.gs`):
   - función que devuelva `{ success, data }` o `{ success:false, error }`;
   - escrituras dentro de `withLock_(function(){ … })`; lecturas grandes con `leerTramoFinal_` si la hoja crece;
   - si crea una hoja, agregarla a `HOJAS_REQUERIDAS` en `11_salud.gs` (y la función a `FUNCIONES_REQUERIDAS`).
2. **Router** — registrar en `ROUTES` de `backend/01_router.gs` con el **nivel mínimo** necesario
   (`admin` si toca sueldos o datos personales sensibles). Si es nivel `auth`, **agregarla a
   `MODULO_POR_ACCION_`** con su módulo (si no, cualquier sesión podrá usarla). Las escrituras quedan
   auditadas solas; si es una lectura frecuente y sin parámetros, puede ir en `LECTURAS_CACHEABLES_`.
   Nombra las lecturas con `get…`/`listar…`/`obtener…` (el router trata el resto como escrituras).
3. **Generar** — `npm run build:backend` (regenera `appscript.js`; **nunca editarlo a mano**).
4. **Cliente API** — método en `src/api/appScriptApi.ts`: `this.request('miAccion', 'POST', datos)`.
   Si es una acción pública del kiosko, agregarla a `ACCIONES_SIN_TOAST` en `src/App.tsx`.
5. **Pantalla** — página en `src/pages/admin/`, ruta en `src/App.tsx` dentro de `ProtectedRoute`,
   entrada en `navigationSections` de `src/components/admin/AdminLayout.tsx`.
   Distinguir siempre **"falló la carga"** de **"no hay datos"** (lección de Asistencias).
6. **Probar** — `npx tsc --noEmit -p .`, probar en `npm run dev` (el `.env` local apunta a **producción**: no
   crear datos de prueba reales), agregar un caso seguro a `tools/test-produccion.mjs` si aplica.
7. **Publicar** (fuera de 07:00–08:00 y ~18:00, hora de Lima):
   1. pegar `appscript.js` en Apps Script → *Implementar → Gestionar implementaciones → ✏️ → Nueva versión*
      (**nunca** "Nueva implementación": cambia la URL);
   2. `ejecutarTestSalud` en el editor (0 FAIL) y `npm run test:prod` (SIN FALLAS);
   3. `npm run deploy` (frontend a GitHub Pages; usa `--add` para **no borrar** los archivos de la versión
      anterior — GitHub Pages cachea el `index.html` ~10 min y, sin eso, las pantallas quedaban en blanco).
   4. **Orden:** si el frontend nuevo depende de un cambio del backend, publicar **primero el backend**.

---

## 8. Herramientas de verificación
| Herramienta | Dónde | Qué comprueba |
|---|---|---|
| `ejecutarTestSalud` | editor de Apps Script | hojas, secreto, admins, funciones del router, Drive, anti-duplicado, caché, roster del kiosko (solo lectura) |
| `npm run test:prod` | terminal del proyecto | lecturas públicas, validaciones del kiosko, acciones admin rechazadas sin token (no escribe datos) |
| `/admin/api-test` | panel | conexión con sesión (**crea un contacto real**) |

---

## 9. Propuestas de ampliación

### Fase A — Base para crecer (hacer primero)
1. **Permisos reales por módulo**: matriz rol → módulos en el backend (usar la columna `permisos`),
   menú filtrado por rol, y pantalla **Usuarios** (crear, desactivar, reiniciar contraseña, asignar rol).
   Cierra la deuda #1 y permite dar acceso a RR. HH., supervisores de obra o contabilidad sin exponer todo.
2. **Auditoría central**: hoja `auditoria` (quién, qué, cuándo, antes/después) para sueldos, bajas,
   marcas manuales, estados de postulación y calificaciones.
3. **Privacidad de archivos**: CVs y subidas privados, servidos por `getArchivo` como las fotos.

### Fase B — Arreglos rápidos de alto valor
4. **Justificaciones → incidencias**: aprobar/rechazar una justificación del kiosko y que marque
   automáticamente la incidencia como justificada.
5. **Reportes sobre asistencia V2** con rango real, y estados de postulación unificados.
6. Mensajes sin datos de ejemplo; notas en Postulaciones; Capacitaciones/Evaluaciones dentro del `AdminLayout`.
7. **Sincronizar incidencias automático** (activador nocturno) en vez de depender del botón.

### Fase C — Funciones nuevas
8. **Portal del trabajador** (login con su DNI/credencial): ver sus marcas, incidencias, bolsa de horas,
   subir sustentos y descargar sus constancias.
9. **Boletas / constancias PDF** por trabajador y mes desde Planilla.
10. **Alertas**: resumen diario de asistencia (07:45) y de incidencias pendientes por correo o WhatsApp al coordinador.
11. **Legajo digital**: contratos, SCTR, exámenes médicos, EPP entregado, con fechas de vencimiento y avisos.
12. **Proyectos con avance**: hitos, % de avance, costos vs. presupuesto, personal asignado por día
    (cruzado con la asistencia de campo).
13. **Tablero gerencial**: tardanzas por semana, horas extra, rotación de personal, postulaciones por convocatoria.

> Límite a vigilar al crecer: Apps Script + Sheets aguanta bien la escala actual (12 trabajadores,
> ~50 marcas/día). Si se suman muchos usuarios simultáneos o reportes pesados, evaluar mover la base a un
> servicio dedicado (p. ej. Supabase/Firestore) manteniendo la misma interfaz `api.*` del frontend.

---

## 10. Escalado — hacia el centro de actividades de la empresa

### 10.1 Dónde está el techo hoy (medido el 24/09/2026)
| Recurso | Situación actual | Síntoma al crecer |
|---|---|---|
| Apps Script | 2–30 s por consulta; 19 consultas simultáneas → respuestas de 30–40 s y errores 404 de Google | pantallas lentas, reintentos, ráfaga de las 07:30 |
| Google Sheets | `asistencias_v2` ~1,100 filas/mes; `getAsistenciasV2` y `getJustificaciones` leen la hoja **entera** | cada mes más lento |
| Lock global | toda escritura (kiosko, planilla, sincronización) comparte un único bloqueo | una sincronización larga frena las marcas |
| Cuotas Google | ejecución máx. 6 min; ~30 ejecuciones simultáneas; correos/día limitados | fallas en picos |

### 10.2 Escalones (en orden, cada uno sin romper el anterior)
1. **Optimizar lo actual (sin cambiar de plataforma)** — ✅ *hecho el 24/09: lecturas por rango, caché de lecturas y sincronización nocturna preparada; falta archivar por año cuando la hoja supere ~20 000 filas*
   - Lecturas por rango en `getAsistenciasV2`/`getJustificaciones` (como ya hace el anti-duplicado con `leerTramoFinal_`).
   - Caché de lecturas del panel en `CacheService` (1–5 min) para roster, convocatorias, feriados.
   - Archivar por año: `asistencias_v2_2026`, etc., con índice por mes.
   - Mover la sincronización al activador nocturno (ya preparado) y sacar lo pesado del horario de marcación.
2. **Permisos y auditoría reales (Fase A §9)** — ✅ *hecho el 24/09: permisos por módulo, pantalla Usuarios, auditoría automática (§2.2, §2.3)*
   - Matriz rol → módulo en el router; hoja `auditoria` (quién, qué, cuándo, antes/después).
3. **Separar la base de datos** — *cuando haya >30 trabajadores, varias sedes o reportes pesados*
   - Migrar los datos a una base real (p. ej. Supabase/PostgreSQL o Firestore) manteniendo la **misma
     interfaz `api.*`** del frontend: se cambia `appScriptApi.ts` por otro cliente y las pantallas no se tocan.
   - Apps Script puede quedar solo para lo que hace bien: correos, Drive y activadores.
   - Fotos y CVs a un almacenamiento con URLs firmadas (privadas por defecto).
4. **Aplicaciones por rol**
   - Portal del trabajador (sus marcas, incidencias, bolsa de horas, boletas).
   - App de supervisor de obra (asistencia de campo por proyecto, avances con foto).
   - Tablero gerencial con indicadores históricos.

### 10.3 Reglas para que escale sin romperse
- Toda pantalla distingue **"falló la carga"** de **"no hay datos"** (`ErrorCarga`).
- Toda escritura nueva va con `withLock_` y valida en el backend (el frontend no es una barrera).
- Toda columna se lee **por nombre de cabecera**, nunca por posición (tres fallos de hoy fueron eso).
- Toda acción nueva entra en `ROUTES` con el nivel mínimo, en `FUNCIONES_REQUERIDAS` del test de salud y,
  si es de solo lectura o se puede rechazar sin escribir, en `tools/test-produccion.mjs`.
- Nada nuevo del admin se importa en el kiosko `/asistencia` (debe seguir liviano).

---

## 11. Soporte y operación (manual rápido)

### 11.1 Dar acceso a una persona
1. **/admin/usuarios → Nuevo usuario**: nombre, correo, rol y módulos.
   - Para acceso total: rol `supervisor`, `rrhh`, `manager`, `administrador` o `admin`.
   - Para acceso parcial: rol libre (p. ej. `operador`) + los módulos que necesita.
2. La contraseña temporal se muestra **una vez** y se envía por correo.
3. Los cambios de rol/permisos se aplican en ≤ 2 min.

### 11.2 "No veo una sección" / "Permisos insuficientes (módulo X)"
- Revisar en /admin/usuarios que tenga el módulo X (o un rol de administración) y que esté **activo**.
- Esperar 2 min (caché del perfil) y recargar.

### 11.3 Un administrador quedó bloqueado
- El panel impide quitarse la administración a uno mismo y dejar el sistema sin admins.
- Si aun así pasa (p. ej. editando la hoja a mano): en la hoja `usuarios`, poner su `rol` en `admin` y
  `estado` en `activo`; o en el editor de Apps Script ejecutar `createDefaultAdmin` (crea/restablece
  `supervisor1telcom@gmail.com` y envía una contraseña temporal por correo).

### 11.4 Mensajes de error y qué significan
| Mensaje | Qué pasa | Qué hacer |
|---|---|---|
| "Servidor ocupado, intenta de nuevo…" | Apps Script lento o sobrecargado | nada: el panel reintenta solo; si persiste, esperar unos minutos |
| "No se pudieron cargar … + Reintentar" | la consulta falló (los datos **siguen** en el servidor) | Reintentar |
| "Permisos insuficientes (módulo X)" | la cuenta no tiene ese módulo | §11.2 |
| "No autorizado" / vuelve al login | sesión vencida (24 h) o cuenta desactivada | volver a entrar / reactivar en Usuarios |
| Pantalla en blanco tras publicar | HTML viejo en caché | se recarga sola; si no, Ctrl+F5 |
| Kiosko "Falta confirmar tu registro" | el servidor no respondió | "Comprobar registro" (no duplica). Ver `docs/KIOSKO_ASISTENCIA.md` |

### 11.5 Publicar sin romper (checklist)
1. **Horario**: nunca entre 07:00–08:00, 12:50–13:10, 13:50–14:10 ni ~17:50–18:10 (hora de Lima).
2. Backend: `npm run build:backend` → pegar `appscript.js` → **Guardar** → ejecutar `ejecutarTestSalud`
   **antes** de publicar la versión → revisar FAIL/WARN (p. ej. usuarios que perderían acceso) →
   *Implementar → Gestionar implementaciones → ✏️ → Nueva versión*.
3. `npm run test:prod` → "SIN FALLAS".
4. Frontend: `npm run deploy` (con `--add`). Si el frontend depende del backend nuevo, publicar **después**.
5. Revisar en producción las pantallas tocadas (con `?v=N` en la URL para esquivar la caché del navegador).

### 11.6 Revertir (si algo sale mal)
- **Backend**: Apps Script → *Implementar → Gestionar implementaciones → ✏️ → Versión:* elegir la anterior
  → *Implementar*. Es inmediato y no cambia la URL.
- **Frontend**: `git revert <commit>` → `npm run deploy`. (Con `--add` los archivos viejos siguen servidos.)
- Datos: la hoja `auditoria` indica quién cambió qué y con qué valores, para corregir a mano si hace falta.

### 11.7 Diagnóstico
- `ejecutarTestSalud` (editor): configuración, hojas, admins activos, equivalencia de lecturas por rango,
  usuarios sin módulos, anti-duplicado, roster del kiosko, convocatorias, "ya registrado con hora".
- `npm run test:prod` (terminal): lecturas públicas, validaciones del kiosko, acciones protegidas sin token.
- Registro de ejecuciones de Apps Script: errores con `console.error` (auditoría, correos, tokens).
- Consola del navegador: `API non-JSON response` = error de Google (se reintenta).

### 11.8 Cachés del sistema (para entender "por qué no se ve mi cambio")
| Qué | Dónde | Duración | Se invalida |
|---|---|---|---|
| Convocatorias públicas, cursos, feriados, configuración de planilla | CacheService `lect:*` | 5 min | cualquier escritura por el panel |
| Perfil de usuario (rol, permisos, activo) | CacheService `perfil:*` | 2 min | al editar el usuario en /admin/usuarios |
| Roster del kiosko | CacheService + instantánea | 6 h / diaria | altas, bajas y ediciones de planilla |
| Índice anti-duplicado del día | CacheService `asisdia:*` | 6 h | cada marca |
| Usuario del panel en el navegador | `localStorage['auth_user']` | hasta que vence el token (24 h) | login / logout / verifyToken |
| index.html | GitHub Pages | ~10 min | automático |

Cambios hechos **a mano en la hoja** o desde el editor no pasan por el router: tardan hasta la duración de su caché.
