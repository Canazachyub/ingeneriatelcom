# Panel Admin — cómo funciona hoy y cómo ampliarlo

> Estado al **23/09/2026**, levantado del código real (`src/pages/admin/*`, `backend/*.gs`).
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

### 2.2 Roles y permisos (lo que REALMENTE se aplica)
| Nivel de ruta | Quién pasa | Ejemplos |
|---|---|---|
| `publico` | Cualquiera, sin token | kiosko, bolsa pública, contacto, capacitaciones |
| `auth` | **Cualquier usuario con token válido** (incluye rol `empleado`) | empleados, proyectos, asistencias, postulaciones, mensajes, dashboard |
| `admin` | Rol en `admin, administrador, manager, supervisor, rrhh` o permiso `all`, y activo (`esRolAdmin_`, caché 5 min) | planilla y sueldos, feriados, borrar convocatorias/contactos/cursos, crear credenciales |

- La columna `permisos` de `usuarios` (p. ej. `ver_perfil,ver_proyectos`) **se envía al cliente pero el backend no la evalúa** (salvo `all`).
- El **menú no se filtra por rol**: todos ven todas las secciones; si no tienen permiso, la acción falla.
- Único filtro de rol en el frontend: **Planilla** (`PlanillaPage.tsx`) exige `admin` o permiso `all`/`planilla` — *más estricto* que el backend (un `manager` ve "Acceso restringido" aunque el backend lo dejaría).

---

## 3. Módulos del panel

> Formato: **qué puedes hacer** · acciones del backend · hojas. Todas las pantallas están en `src/pages/admin/`.

### 3.1 Dashboard — `/admin` (`DashboardPage.tsx`)
- Solo lectura: tarjetas (empleados activos, proyectos activos/completados, postulaciones pendientes),
  empleados por ciudad, proyectos por estado, **asistencia de hoy** (% y presentes/ausentes), accesos rápidos.
- `getDashboard`, `obtenerAsistenciasHoy` · hojas `sueldos`, `proyectos`, `postulaciones`, `asistencias_v2`.

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
- `sincronizarIncidencias` **no** es automática: se ejecuta con el botón de Planilla.
- `ejecutarTestSalud` (solo lectura): correr antes/después de cada nueva versión. Criterio: 0 FAIL.
- Funciones que borran/recrean hojas (`setupAllSheets`, `cargar*Prueba`, `migrarPlanillaV2`…) están bloqueadas
  salvo que la propiedad `ALLOW_DESTRUCTIVE_OPS` sea `true`. **Mantenerla apagada.**

### 5.5 Límites
- Apps Script responde en 2–30 s (más lento justo tras publicar una versión y en la ráfaga de las 07:30).
- Escrituras con bloqueo global (`withLock_`, espera máx. 30 s → "Sistema ocupado").
- Límites por hora: postulación 5/DNI, contacto 10/email, marca 30/DNI, justificación 10/DNI.
- Archivos: imágenes ≤ 6 MB, documentos ≤ 10 MB (el visor sirve hasta 10 MB).

---

## 6. Deudas y riesgos conocidos (priorizados)

| # | Prioridad | Hallazgo | Dónde |
|---|---|---|---|
| 1 | **Alta** | Cualquier token válido (también rol `empleado`) usa las rutas `auth`: ve empleados, fotos de asistencia, CVs, mensajes. La columna `permisos` no se aplica. | `01_router.gs`, `02_auth.gs` |
| 2 | **Alta** | CVs y subidas genéricas quedan públicos "con el enlace". | `00_nucleo.gs` (`uploadFile`), `05_bolsa.gs` |
| 3 | **Alta** | `TOKEN_SECRET` < 32 caracteres (lo reporta el test de salud). Rotarlo cierra todas las sesiones. | Propiedades del script |
| 4 | Media | Correo de cambio de estado toma nombre/correo por **posición de columna**; con el esquema en inglés de `postulaciones` podría ir a otra columna. | `05_bolsa.gs` (`sendStatusUpdateEmail`) |
| 5 | Media | **Reportes** usa la asistencia vieja (V1) y su rango de fechas no llega al backend; los estados de postulación no coinciden con los que usa Postulaciones. | `ReportsPage.tsx` |
| 6 | Media | **Mensajes** muestra 3 mensajes de ejemplo (2024) si la carga falla, y no avisa cuando una actualización falla. | `MessagesPage.tsx` |
| 7 | Media | Las justificaciones del kiosko solo se ven: no se aprueban ni se vinculan a la incidencia. | `AttendancePage.tsx`, `IncidenciasPanel` |
| 8 | Media | La contraseña temporal de "crear credenciales" se muestra en un `alert()`. | `EmployeesPage.tsx` |
| 9 | Baja | Menú igual para todos; Planilla filtra rol distinto que el backend. | `AdminLayout.tsx`, `PlanillaPage.tsx` |
| 10 | Baja | Capacitaciones y Evaluaciones usan tema claro y no el `AdminLayout`; en Evaluaciones `revisado_por` es siempre "Admin" (sin trazabilidad). | páginas respectivas |
| 11 | Baja | Postulaciones muestra notas pero no permite escribirlas. | `ApplicationsPage.tsx` |
| 12 | Baja | Listas fijas en el frontend (ciudades, áreas, cargos, categorías). | varias páginas |
| 13 | Baja | Test API crea un contacto real en cada ejecución. | `ApiTestPage.tsx` |
| 14 | Baja | `upload`/`uploadJobPdf` no validan tamaño/tipo; proyectos escribe sin bloqueo. | `00_nucleo.gs`, `04_proyectos.gs` |
| 15 | Baja | Hojas y funciones legado (V1 `Asistencias`, `empleados`, `hireApplicant`, etc.). | varios |

---

## 7. Cómo agregar una función nueva (receta)

1. **Backend** — en el módulo `.gs` que corresponda (o uno nuevo `backend/NN_nombre.gs`):
   - función que devuelva `{ success, data }` o `{ success:false, error }`;
   - escrituras dentro de `withLock_(function(){ … })`; lecturas grandes con `leerTramoFinal_` si la hoja crece;
   - si crea una hoja, agregarla a `HOJAS_REQUERIDAS` en `11_salud.gs` (y la función a `FUNCIONES_REQUERIDAS`).
2. **Router** — registrar en `ROUTES` de `backend/01_router.gs` con el **nivel mínimo** necesario
   (`admin` si toca sueldos o datos personales sensibles).
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
   3. `npm run deploy` (frontend a GitHub Pages).

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
