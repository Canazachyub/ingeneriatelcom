# ESTADO — Auditoría Fase 0 · Sitio Corporativo TELCOM EIRL

> Informe de brechas del flujo de datos, seguridad y arquitectura.
> Generado por auditoría multiagente sobre el código real (`appscript.js` 4,774 líneas · `src/`) — julio 2026.
> **Estado: Fase 0 completada y aprobada · Fase 0.5 (quick wins) IMPLEMENTADA — ver §6 para el deploy del backend.**

---

## 0. Resumen ejecutivo

**Por qué "el Dashboard no fluye" (causa raíz confirmada):** no es un problema de datos ni de fuente. El backend (`getDashboardStats`) responde `success:true` con datos reales del roster, pero **los nombres de campo no coinciden** con lo que la interfaz del frontend espera. El backend devuelve `totalEmpleados`, `totalProyectos`, `postulacionesPendientes`, `empleadosPorCiudad`; el frontend lee `totalEmployees`, `activeProjects`, `pendingApplications`, `employeesByCity`. **Ningún nombre calza → las 4 tarjetas KPI y los 2 gráficos muestran siempre 0/vacío**, indistinguible de "no hay datos". El único widget que funciona (Asistencia Hoy) es el único cuyo método API sí remapea los campos. Es un arreglo de bajo esfuerzo y altísimo impacto visible.

**Lo más grave del sistema (seguridad):** el "secreto" que firma todos los tokens de admin es la constante `ADMIN_PASSWORD = 'telcom2017!Seguro'` escrita en texto plano en `appscript.js:12`, y ese archivo está en un **repositorio público de GitHub**. El token es `base64(userId|timestamp|ADMIN_PASSWORD)` — no hay firma criptográfica. Cualquiera que lea el repo puede fabricar un token válido para cualquier usuario y, como la autorización es binaria (sin roles en el backend), desbloquear las 88 acciones: sueldos, DNIs, CVs, fotos con GPS, respuestas de exámenes. **Todo el backend está, en la práctica, sin autenticación real.**

**Salud general:** de 85 actions, 55 están vivas, 2 rotas (`updateUser`, `deactivateUser` → `ReferenceError`), ~22 huérfanas, 2 pares duplicados, y 19 funciones destructivas siguen ejecutables desde el editor GAS.

---

## 1. Diagrama de flujo — real vs esperado

### 1.1 Roster de personal (la "doble fuente de verdad")

```
ESPERADO:  sueldos (roster único) ──► todo lo de personal

REAL:
                        ┌─────────────────────────────────────────────┐
   hoja `sueldos`  ────►│ getEmployees (lista, id sintético SUE-<dni>) │
   (13 reales)          │ getDashboardStats (conteo)                  │
                        │ obtenerAsistenciasHoy · getSueldos          │
                        │ getTrabajadores · updateSueldo · crearTrab. │
                        └─────────────────────────────────────────────┘
                                          ✗  NO se cruzan (id ≠ id)
                        ┌─────────────────────────────────────────────┐
   hoja `empleados`────►│ getEmployeeById (busca EMP0xx)              │
   (legacy, vacía?)     │ updateEmployee · transferEmployee          │
                        │ deactivateEmployee · verificarEmpleado     │
                        │ getEmployeeReport · hireApplicant (escribe) │
                        └─────────────────────────────────────────────┘
```

**Rotura práctica:** `getEmployees` sintetiza el id como `SUE-<dni>`, pero `getEmployeeById`/`updateEmployee`/`transferEmployee`/`deactivateEmployee` buscan un id formato `EMP0xx` en la hoja `empleados`. Un empleado que ves en el listado **no se puede abrir, editar, transferir ni dar de baja**. Un candidato contratado (`hireApplicant`) entra solo a `empleados`, nunca a `sueldos` → no aparece en el roster real ni en el kiosko.

### 1.2 Asistencia V1 vs V2

```
V1 (legacy):  verificarEmpleado ─► lee `empleados` ─► marcarAsistencia ─► `Asistencias`
              getAttendances ─► `Asistencias`   (usada aún por ReportsPage)

V2 (viva):    AsistenciaPage ─► registrarAsistenciaFoto ─► `asistencias_v2` + foto Drive
              AttendancePage ─► getAsistenciasV2 / getJustificaciones
              DashboardPage  ─► obtenerAsistenciasHoy ─► sueldos + asistencias_v2  ✓
```

**Hallazgo:** el kiosko V1 (`marcarAsistencia`→`verificarEmpleado`) valida el DNI contra `empleados`. Si esa hoja está vacía, **rechaza a los 13 trabajadores reales** aunque estén en `sueldos`. `AttendancePage` además NO llama a la API: lee `src/data/trabajadores.ts`, una lista **hardcodeada de 13 registros en el frontend** → un alta desde Planilla es invisible en Asistencias hasta editar código y redeployar.

### 1.3 Dashboard KPIs (síntoma reportado)

```
DashboardPage ─► getDashboardStats() ─► action getDashboard ─► sueldos/proyectos/postulaciones ✓ (datos reales)
       │
       └─ interface DashboardStats espera:  totalEmployees, activeProjects, pendingApplications,
                                             completedProjects, employeesByCity, projectsByStatus
          backend responde:                 totalEmpleados, totalProyectos, postulacionesPendientes,
                                             convocatoriasActivas, empleadosPorCiudad, empleadosPorArea
                                             ✗ NINGÚN nombre coincide → todo 0/vacío
```

---

## 2. Tabla de brechas priorizadas

### CRÍTICO

| # | Brecha | Ubicación | Impacto |
|---|--------|-----------|---------|
| C1 | **Mismatch de campos Dashboard** — backend devuelve `totalEmpleados`… frontend lee `totalEmployees`… | appscript.js:1759-1770 vs appScriptApi.ts:138-145 | Todos los KPIs y gráficos del dashboard en 0. **Es la causa del síntoma reportado.** |
| C2 | **Secreto de token en repo público** — `ADMIN_PASSWORD` en texto plano; token base64 sin firma | appscript.js:12, 492-516 | Token 100% falsificable por cualquiera que lea GitHub |
| C3 | **Autorización binaria sin roles** — cualquier token válido abre las 88 actions | appscript.js:55-59 | Un empleado raso (o un atacante) accede a sueldos, usuarios, respuestas de examen |
| C4 | **`historialPostulaciones` filtra CV** — vuelca fila completa incl. `cv_url` sin token, por DNI ajeno | appscript.js:2428-2457 | Acceso público a CVs (PII) de cualquier postulante |
| C5 | **`getPreguntas` expone `respuesta_correcta`** — protegida solo por token falsificable | appscript.js:3389-3405 | Permite hacer trampa en las evaluaciones |
| C6 | **Fotos Drive `ANYONE_WITH_LINK`** — asistencia+GPS, proctoring, justificaciones médicas | appscript.js:3775, 3902, 3948 | Rostros, ubicación y documentos médicos con enlace público |
| C7 | **IDs de roster incompatibles** — `SUE-<dni>` (lista) vs `EMP0xx` (edición) | appscript.js:689 vs 713-888 | Empleado listado no se puede abrir/editar/transferir/desactivar |

### ALTO

| # | Brecha | Ubicación | Impacto |
|---|--------|-----------|---------|
| A1 | **`getDashboardStats` no calcula `completedProjects`** — el KPI no tiene fuente aunque se arregle el nombre | appscript.js:1699-1771 | Requiere lógica nueva, no solo remapeo |
| A2 | **`AttendancePage` usa roster hardcodeado** (`src/data/trabajadores.ts`) en vez de la API | AttendancePage.tsx:21-28 | Altas/bajas de personal invisibles en Asistencias sin redeploy |
| A3 | **Manejo de errores silencioso** — `request()` colapsa todo a "Network error"; páginas responden con listas vacías | appScriptApi.ts:207-210 | Usuario no distingue "sin datos" de "API falló". `ToastContext` existe pero no se usa para errores |
| A4 | **`hireApplicant` escribe solo en `empleados`** | appscript.js:1502, 1528 | Contratado no entra al roster real ni al kiosko |
| A5 | **Cero `LockService` en escrituras** | appscript.js (global) | Race conditions: filas/IDs duplicados con uso concurrente |
| A6 | **`consultarPostulacion` expone nombre/email/teléfono** por DNI sin verificar identidad | appscript.js:2287-2394 | Enumeración de PII de postulantes |
| A7 | **Contraseñas de `usuarios` en texto plano** (comparación y almacenamiento sin hash) | appscript.js:465 | Filtración de la hoja = credenciales en claro |
| A8 | **Escrituras públicas sin límite** de tamaño/mimetype/rate-limit | appscript.js:1353, 1584, 3861-3968 | Spam de filas y agotamiento de cuota Drive/Sheets (DoS) |
| A9 | **`recrearHoja` + 9 `cargar*Prueba` + `limpiarDatosPrueba`** ejecutables desde el editor | appscript.js:2872, 2893-3247 | Ya destruyó los PDFs una vez. Borrado accidental de producción |
| A10 | **`getEmployeeReport` lee `empleados`** (legacy) mientras el dashboard lee `sueldos` | appscript.js:1773 | Dos vistas admin con cifras distintas |
| A11 | **Sin niveles de rol en backend** — la distinción admin/empleado es solo cosmética en la UI | appscript.js:452 vs router | Escalada horizontal y vertical de privilegios |

### MEDIO

| # | Brecha | Ubicación | Impacto |
|---|--------|-----------|---------|
| M1 | **2 actions ROTAS** — `updateUser`, `deactivateUser` ruteadas sin función | appscript.js:153, 157 | `ReferenceError` si se invocan |
| M2 | **Bug de contrato en `transferEmployee`** — frontend envía `employeeId`/`newCity`, backend espera `empleadoId`/`nuevaCiudad` | appScriptApi vs appscript.js:829 | La transferencia siempre falla |
| M3 | **Timezone no uniforme** — `getEvaluaciones`, `getApplications`, `consultarPostulacion` devuelven fechas crudas sin normalizar a America/Lima | appscript.js:3676, 1435, 2287 | Riesgo residual de desfase de fecha |
| M4 | **`rowToObject` no normaliza fechas** — el conversor central es frágil ante funciones nuevas | appscript.js:2000 | Cualquier lectura nueva hereda el bug de timezone |
| M5 | **Sin estado global ni caché** (no React Query/SWR/Context de datos) | frontend (global) | Cada navegación re-fetchea; sin invalidación cruzada |
| M6 | **Sin code-splitting admin** — 12 páginas (incl. PlanillaPage 1,027 líneas) en el bundle inicial | App.tsx:22-34 | Bundle inflado también para visitantes públicos |
| M7 | **~22 actions huérfanas** — módulo `usuarios` completo sin UI; 10 métodos API muertos | varios | Superficie muerta que confunde el mantenimiento |
| M8 | **2 pares duplicados** — `getApplications`/`getApplicationsAdmin`, `getDashboard`/`getDashboardStats` | appscript.js:137, 174 | Alias sin consumidor; ruido |
| M9 | **`PlanillaPage` usa toast local** en vez de `ToastContext` | PlanillaPage.tsx:112-115 | UX inconsistente, doble mantenimiento |
| M10 | **`AuthContext` valida token solo al montar** — sin revalidación ni logout ante rechazo | AuthContext.tsx:18-32 | Sesión "zombie" en cliente |
| M11 | **IDs reales de Sheet/Drive hardcodeados** como fallback en bundle público | env.ts:3-4, .env.example | Reconocimiento facilitado; no debería ir al repo |
| M12 | **`sueldos` sin columna `id`** — no puede tener historial ni asignaciones | appscript.js | Trabajador solo-en-sueldos queda fuera de proyectos/historial |
| M13 | **`setupAllSheets()` no crea `sueldos`** | appscript.js:2040 | Entorno nuevo queda sin roster real |

---

## 3. Censo de actions (85 total)

- **VIVAS:** 55
- **ROTAS:** 2 — `updateUser`, `deactivateUser`
- **DUPLICADAS:** 2 pares — canónicas `getApplicationsAdmin`, `getDashboard`
- **HUÉRFANAS:** ~22 (todo el submódulo `usuarios`: `getUsers`/`createUser`/`resetPassword`; + `getEmployee`, `getProject`, `historialPostulaciones`, `getCapacitacionById`, `upload`, `getAutorizaciones5pm`, etc.)
- **LEGACY (Asistencia V1):** `verificarEmpleado`, `marcarAsistencia` (huérfanas) · `obtenerAsistenciasHoy`, `getAttendances` (aún vivas)
- **PELIGROSAS (fuera del router, ejecutables en editor GAS):** 19 funciones — `recrearHoja`, `setupAllSheets`, 9× `cargar*Prueba`, `limpiarDatosPrueba`, `migrarPlanillaV2`, `actualizarTrabajadoresV3`, `createDefaultAdmin`

---

## 4. Plan por fases (propuesto, reversible, sin downtime)

### Fase 0.5 — Quick wins (bajo riesgo, alto impacto visible) — 1 despliegue
1. **Arreglar el Dashboard (C1):** remapear campos en `getDashboardStats()` del cliente API (como ya se hace en `getAttendanceToday`). El dashboard vuelve a mostrar datos reales. *Frontend only, reversible.*
2. **Rotar `ADMIN_PASSWORD` (C2) y moverla a Script Properties.** Mitiga de inmediato C2, C3, C5, C6 de "explotable por internet" a "requiere acceso legítimo". Fuerza re-login.
3. **Whitelist de campos en `historialPostulaciones`/`consultarPostulacion` (C4, A6):** dejar de volcar la fila completa; nunca devolver `cv_url`.
4. **Superficie de errores al usuario (A3):** conectar el `catch` de `request()` al `ToastContext`.

### Fase 1 — Backend por módulos (según prompt maestro)
- Modularizar `appscript.js` con router declarativo `ROUTES` y niveles `publico`/`admin` (patrón Plataforma de Reclamos).
- **Token HMAC firmado con TTL** (`computeHmacSha256Signature` + secreto en Script Properties), migración aceptando ambos formatos N días.
- **Roster único en `sueldos`**: unificar IDs (C7, A4), `empleados` a solo-lectura o migrada; `verificarEmpleado`/`hireApplicant` apuntan a `sueldos`.
- `LockService` en escrituras (A5); normalizador de timezone único (M3, M4); respuestas `{ok, data|error}` uniformes.
- Aislar funciones destructivas tras flag `ALLOW_DESTRUCTIVE_OPS` (A9); eliminar rotas/duplicadas/huérfanas (M1, M7, M8).
- Validación de tamaño/mimetype/rate-limit en escrituras públicas (A8); hash de contraseñas (A7).
- Proxy autenticado para archivos de Drive en vez de `ANYONE_WITH_LINK` (C6).
- `ejecutarTestSalud()` en 0-FAIL antes de redeploy.

### Fase 2 — Frontend (arquitectura)
- `AttendancePage` deja de usar `trabajadores.ts` → consume la API (A2).
- Estado global (roster/config/auth) en Context o Zustand; React Query/SWR para caché (M5).
- Partir páginas grandes (PlanillaPage, JobsManagementPage); code-splitting admin lazy (M6).
- Toasts unificados (M9); revalidación de sesión (M10); skeletons y errores visibles.

### Fase 3 — Rediseño visual + auditoría AA
- Según prompt maestro (tokens únicos, jerarquía tipográfica, dashboard con KPIs conectados, kiosko ≥44px, contraste AA).
- **Animaciones 3D (aprobadas 10/07/2026):**
  - **Galería helicoidal "Nuestras Operaciones"** en la landing — carrusel 3D arrastrable tipo claude.com/product/claude-science: tarjetas con fotos reales de campo en hélice (CSS 3D transforms: `translate3d` + `rotateY` + blur de profundidad — SIN three.js; se implementa con Framer Motion ya instalado o GSAP ~30 KB). Fotos optimizadas AVIF/WebP con `loading="lazy"`.
  - **Tilt 3D en tarjetas** de servicios/proyectos (CSS puro, costo cero).
  - Opcional si el presupuesto de peso lo permite: una escena WebGL protagonista (mapa del Perú 3D con sedes luminosas, React Three Fiber lazy-load solo en landing).
  - Reglas: `prefers-reduced-motion` → versión estática; el admin y el kiosko NO cargan nada de esto; movimiento sobrio (rotación por drag/scroll, sin autoplay agresivo).

---

## 5. Criterio de cierre de Fase 0

- [x] Cada KPI del dashboard trazado a su hoja fuente real y explicada su falla.
- [x] Diagrama de flujo real vs esperado (roster, asistencia, dashboard).
- [x] 85 actions clasificadas (viva/rota/duplicada/huérfana/legacy/peligrosa).
- [x] Auditoría de seguridad con severidad y referencias de línea.
- [ ] **Aprobación del plan por el dueño** ← pendiente.

---

## 6. Fase 0.5 — Quick wins IMPLEMENTADOS (10/07/2026)

### Qué se cambió

| Brecha | Cambio | Archivo |
|--------|--------|---------|
| C1 | `getDashboardStats()` del cliente remapea los campos del backend (español) a `DashboardStats`, normaliza estados de proyecto (`activo`→`in_progress`, etc.) y se eliminaron los "datos de ejemplo" falsos del Dashboard | `src/api/appScriptApi.ts`, `src/pages/admin/DashboardPage.tsx` |
| A1 | El backend calcula `proyectosCompletados` y `proyectosPorEstado` (antes el KPI no tenía fuente) | `appscript.js` (getDashboardStats) |
| C2 | **Token firmado HMAC-SHA256** — `base64(userId\|ts).base64(firma)` — y el secreto sale del código a Script Properties (`TOKEN_SECRET`). Se adelantó el HMAC de Fase 1 porque el formato anterior incluía el secreto DENTRO del token (extraíble desde localStorage de cualquier admin) | `appscript.js` (generateToken, parseToken_, validateToken, verifyTokenAction) |
| C4 | `historialPostulaciones` ya no vuelca la fila completa: whitelist `id, jobId, jobTitle, status, createdAt` — nunca más `cv_url`/email/teléfono | `appscript.js` |
| A6 | `consultarPostulacion` enmascara email (`ca***@gmail.com`) y teléfono (`***123`) | `appscript.js` (maskEmail_, maskPhone_) |
| A3 | Errores de transporte (red caída, respuesta HTML de GAS, HTTP ≠ 2xx) se detectan, se muestran como toast y ya no se colapsan a "Network error" silencioso | `src/api/appScriptApi.ts`, `src/App.tsx` (ApiErrorBridge) |

El frontend es **compatible con el backend actualmente desplegado** (el remapeo acepta ambos juegos de nombres y el token es opaco para el cliente): se puede desplegar por GH Actions sin esperar al backend.

### ⚠️ Checklist de deploy del backend (manual, en el editor de Apps Script)

1. **Crear el secreto:** Configuración del proyecto → Propiedades del script → agregar `TOKEN_SECRET` con un valor largo aleatorio (≥ 32 caracteres, generado nuevo — **NO** reutilizar `telcom2017!Seguro`, ya está quemado en el historial público de GitHub).
2. Pegar el `appscript.js` actualizado del repo.
3. Implementar → Administrar implementaciones → **Nueva versión** (misma URL).
4. **Efecto inmediato:** todos los tokens anteriores quedan inválidos → los admins deben volver a iniciar sesión (esperado y deseado).
5. Verificar en la hoja `usuarios` que ninguna cuenta use `telcom2017!Seguro` como contraseña; si alguna la usa, cambiarla.
6. Probar: login en `/admin/login`, Dashboard con KPIs reales, `/mi-postulacion` (datos enmascarados).

### Pendiente (siguientes fases)

- C3/A11 (roles en backend), C6 (fotos Drive públicas), C7/A4 (roster único), A5 (LockService), A7 (hash de contraseñas), A8, A9 (flag destructivas) → **Fase 1**.
- A2 (AttendancePage hardcodeada), M5, M6, M9, M10 → **Fase 2**.

---

## 7. Fase 1 — Backend modularizado (10/07/2026)

### Nueva arquitectura

La fuente del backend ya NO es `appscript.js` a mano: es **`backend/*.gs`** (módulos por dominio) y `appscript.js` se **genera** con `npm run build:backend` (concatena + verifica sintaxis y duplicados). El deploy sigue siendo un solo copy-paste del `appscript.js` generado.

| Módulo | Contenido |
|--------|-----------|
| `backend/00_nucleo.gs` | Config, `getTokenSecret_`, `rowToObject` (ahora normaliza TODAS las fechas a ISO America/Lima — cierra M4), `withLock_` (LockService), `validarArchivoSubido_`, `checkRateLimit_`, `assertDestructiveAllowed_` |
| `backend/01_router.gs` | **Router declarativo `ROUTES`** con niveles `publico`/`auth`/`admin`. `doGet`/`doPost` unificados en `handleRequest_`. 19 actions huérfanas/rotas eliminadas (M1, M7, M8) |
| `backend/02_auth.gs` | Token HMAC, `esRolAdmin_` (roles con caché 5 min — cierra C3/A11), **hash de contraseñas SHA-256 con upgrade-on-login** (A7), credenciales contra roster real |
| `backend/03_empleados.gs` | **Roster único en `sueldos`** (C7): `getEmployeeById`/`updateEmployee`/`transferEmployee`/`createEmployee` operan sobre `sueldos` con IDs `SUE-<dni>` (fallback legacy EMP0xx se conserva). `transferEmployee` acepta ambos contratos (M2) |
| `backend/04_proyectos.gs` | Proyectos y asignaciones (sin cambios de comportamiento) |
| `backend/05_bolsa.gs` | Convocatorias/postulaciones/contacto + rate limits y validación de CV (A8), whitelist PII (C4/A6) |
| `backend/06_capacitaciones.gs` | Evaluaciones: lock en intento único, validación de fotos, fechas Lima (M3) |
| `backend/07_asistencia.gs` | `verificarEmpleado` valida contra **roster real** (el kiosko V1 ya no rechaza a los 13 reales), validación de uploads + locks |
| `backend/08_planilla.gs` | `withLock_` en todas las escrituras (A5) |
| `backend/09_reportes.gs` | `getDashboardStats` (+ proyectosCompletados/porEstado) |
| `backend/10_admin_tools.gs` | Las 17 funciones destructivas **bloqueadas tras `ALLOW_DESTRUCTIVE_OPS`** (A9) |
| `backend/11_salud.gs` | **`ejecutarTestSalud()`**: 0-FAIL requerido antes de cada deploy (verifica secreto, hojas, roster, cuenta admin, funciones del router, Drive) |

### Niveles de acceso del router

- `publico` — kiosko, bolsa de trabajo, evaluaciones (18 actions)
- `auth` — token HMAC válido (dashboard, empleados, proyectos, contactos, capacitaciones admin)
- `admin` — token + rol en {admin, administrador, manager, supervisor, rrhh} o permiso `all`: **toda la planilla/sueldos**, credenciales, deletes
- `obtenerAsistenciasHoy` dejó de ser pública (filtraba roster + horarios sin token)

### ⚠️ Checklist de deploy Fase 1 (backend, manual)

1. Todo lo del checklist de Fase 0.5 (§6) si aún no se hizo: `TOKEN_SECRET` en Script Properties.
2. **Verificar que la cuenta admin en la hoja `usuarios` tenga rol `admin`** (o manager/supervisor/rrhh): las rutas de planilla ahora lo exigen. `ejecutarTestSalud()` lo verifica (FAIL si no hay ninguna activa).
3. NO definir `ALLOW_DESTRUCTIVE_OPS` (o dejarla ≠ 'true').
4. `npm run build:backend` → pegar `appscript.js` generado → ejecutar **`ejecutarTestSalud`** en el editor → **0 FAIL** → Nueva versión.
5. Las contraseñas en texto plano se migran a hash automáticamente en el primer login de cada usuario.
6. **Rotar la contraseña de `supervisor1telcom@gmail.com`**: la anterior (`DARWINTELCOM2026`) estaba hardcodeada y queda en el historial público de GitHub. Ejecutar `createDefaultAdmin()` en el editor: ahora genera una temporal aleatoria, la guarda hasheada y la envía por email.

### Pendiente de Fase 1 (consciente, documentado)

- **C6 (archivos Drive `ANYONE_WITH_LINK`)**: requiere proxy autenticado o visor con base64 — cambia contrato con el frontend; se hará junto con Fase 2 para tocar cliente y backend a la vez.
- `hireApplicant` (A4) quedó FUERA del router (el frontend no la llama); si se reactiva, debe escribir en `sueldos`.
- Hoja `empleados` queda de solo lectura de facto (nada del router escribe en ella, salvo el fallback legacy EMP0xx de updateEmployee/transferEmployee).

---

## 8. Fase 2A — Refactor frontend (10/07/2026)

### Implementado

| Brecha | Cambio |
|--------|--------|
| A2 | **`AttendancePage` y el kiosko consumen la API** (`getTrabajadores`): la constante hardcodeada `TRABAJADORES` fue eliminada de `src/data/trabajadores.ts` (quedan solo tipos/utilidades). El kiosko muestra spinner + botón "Reintentar" si la lista no carga — ya no falla en silencio. Las altas de personal aparecen solas en Asistencias. |
| M6 | **Code-splitting**: 13 páginas admin + Capacitaciones/Evaluación en `lazy()` con `PageLoader`. Bundle inicial **854 KB → 609 KB** (−29%); cada página admin se descarga bajo demanda (20 chunks). |
| M7 | Métodos muertos eliminados del cliente (`asistenciasHoy`, `reporteAsistencia` — llamaban actions inexistentes). |
| M10 | **Revalidación de sesión** en `AuthContext`: al recuperar foco (throttle 60s) + intervalo de 10 min. Token rechazado → logout y redirect a login; corte de red NO cierra sesión. |
| M9 | `PlanillaPage` migrada al `ToastContext` global (~17 llamadas); toast local eliminado. |
| — | 24 imágenes de operaciones generadas por IA, optimizadas **48 MB → 2 MB** WebP (`public/assets/images/operaciones/`, pipeline `npm run optimize:images`, originales gitignoreados). |

## 9. Fase 2B — Caché, PlanillaPage y visor seguro de archivos (10/07/2026)

### Implementado

| Brecha | Cambio |
|--------|--------|
| M5 | **React Query** en las lecturas del admin: `src/hooks/queries.ts` (useDashboardStats, useAttendanceToday con staleTime 60s, useEmployees, useProjects, useAssignments) + invalidación tras mutaciones. Dashboard/Empleados/Proyectos ya no re-fetchean en cada navegación (caché 5 min). Mocks de fallback eliminados de EmployeesPage/ProjectsPage. |
| — | **PlanillaPage partida**: 1,027 → 471 líneas; sub-vistas en `src/pages/admin/planilla/` (SueldosTable, IncidenciasPanel, ConfigPlanillaForm, BolsaHorasPanel, NuevoTrabajadorModal, planilla.types). |
| **C6** | **Archivos de Drive privados + visor autenticado**: `backend/12_archivos.gs` con action `getArchivo` (nivel auth, sirve el binario en base64, máx 10 MB); las fotos de asistencia/proctoring y justificaciones NUEVAS ya no se comparten como `ANYONE_WITH_LINK`; `FileViewerModal` en AttendancePage (fotos + justificaciones) y EvaluacionesPage (proctoring). Los PDFs de convocatorias siguen públicos a propósito; CVs pendiente de decisión. |

### ⚠️ Checklist de deploy Fase 2B (backend, manual)

1. `npm run build:backend` → pegar `appscript.js` en el editor GAS → `ejecutarTestSalud` → **0 FAIL** → Nueva versión.
2. **Ejecutar UNA VEZ desde el editor: `revocarComparticionPublica()`** — recorre Asistencias/, Justificaciones/ y Evaluaciones_Proctoring/ en Drive y pone TODOS los archivos ya subidos en privado (loguea el conteo). Hasta ejecutarla, las fotos antiguas siguen públicas.
3. Verificar en `/admin/asistencias`: clic en la foto de una marca → debe abrir el visor con la imagen (ya no el enlace directo a Drive).

### Pendiente (menor)

- Skeletons de carga en tablas admin (se hará con la Fase 3 visual).
- CVs de postulantes: siguen `ANYONE_WITH_LINK` (los revisa el admin desde ApplicationsPage con enlace directo). Decidir si migran al visor.

---

## 10. Fase 3 — Rediseño visual (10/07/2026, en curso)

### 3A publicada (commits d483531 + 43c4117)

- **Hero**: fotos stock de Unsplash reemplazadas por HERO1/HERO2 propias (WebP, mismo dominio).
- **Galería helicoidal 3D "Nuestras Operaciones"** (nueva sección tras Servicios): 12 fotos de campo en **doble hélice (ADN)** — 2 hebras desfasadas 180°, altura fija por tarjeta (rotación continua sin saltos), arrastrable con inercia, auto-giro, blur de profundidad, anima solo en viewport, `prefers-reduced-motion` → cuadrícula estática. CSS 3D puro + rAF (sin three.js, cero peso extra).
- **Servicios**: tarjetas con foto (S1-S4) + tilt 3D sobrio al mouse.
- **Quiénes Somos**: banda del equipo (Q1 oficina, Q2 campo+oficina); mapa animado intacto.

### 3B publicada

- Bolsa de Trabajo: CTA convertido en banner con B2 (técnico aspiracional al amanecer).
- Capacitaciones: header con C1 (entrenamiento de seguridad).
- `tabular-nums` en KPIs del dashboard y tabla de sueldos.

### 3-final publicada — PLAN MAESTRO COMPLETADO ✅

- **Skeletons** (`TableSkeleton`) y **empty states con guía** (`EmptyState`) en Empleados, Proyectos, Mensajes y Asistencias — distinguen "vacío real" (con botón de acción) de "filtros sin coincidencias".
- **Auditoría AA ejecutada**: `:focus-visible` global (anillo cian 2px), 9 targets del kiosko elevados a ≥44px (botón volver, reintentos, cancelar, WhatsApp), 3 textos con contraste <3:1 corregidos a ≥4.8:1 (wizard de postulación, dropzone de CV, contador de DNI). Todas las imágenes públicas con alt descriptivo.

### Criterios de éxito del plan maestro — verificación final

- [x] Fase 0: informe de brechas completo, cada KPI trazado a su hoja fuente.
- [x] Backend: módulos por dominio, roster único, token firmado, 0 endpoints huérfanos, test de salud 0-FAIL (verificado en deploy).
- [x] Frontend: dashboard fluye con datos vivos, errores visibles (toasts), carga admin bajo demanda (bundle −29% + React Query).
- [x] Visual: landing premium con identidad (hero propio, galería helicoidal 3D, fotos de operaciones), AA verificado.
- [x] Cero downtime: cada fase desplegada de forma independiente y reversible.

---

## 11. Fix concurrencia kiosko de asistencia (12/08/2026)

**Síntoma:** a la hora de ingreso (ej. 14:00) varios trabajadores abrían `/asistencia` a la vez; solo uno lograba registrar y los demás veían "No se pudo cargar la lista de trabajadores".

**Causas y cambios:**

| Causa | Fix | Archivo |
|-------|-----|---------|
| `registrarAsistenciaFoto` mantenía el lock global durante la subida de la foto a Drive (3–15 s) → los demás requests esperaban y fallaban con "Sistema ocupado" | Subida a Drive **fuera** de `withLock_`; el lock solo cubre verificación anti-duplicado + `appendRow` (<1 s). Igual en `subirJustificacion` | `backend/07_asistencia.gs` |
| `getTrabajadores` abría el Spreadsheet 2 veces por request, sin caché → ventana de fallo grande bajo ráfaga | Roster del kiosko cacheado 10 min en `CacheService` (`kiosk_trabajadores_v1`); invalidación en `crearTrabajador`, `updateSueldo`, `createEmployee`, `updateEmployee`, `transferEmployee` | `backend/08_planilla.gs`, `backend/03_empleados.gs` |
| Espera del lock 20 s (insuficiente en la cola) | `tryLock(30000)` (máximo permitido) | `backend/00_nucleo.gs` |
| El kiosko no reintentaba nada: un fallo transitorio = pantalla de error fatal | `cargarTrabajadores` reintenta hasta 3 veces (1.5 s / 3 s); `handleRegistrar` reintenta 1 vez si el error es "Sistema ocupado" (caso en que el backend no escribió nada) | `src/pages/AsistenciaPage.tsx` |
| **Bug latente hallado en las pruebas:** el anti-duplicado ("Ya registraste este evento hoy") NUNCA matcheaba — Sheets auto-convierte `fecha` a `Date` al `appendRow` y la comparación `String(date) === 'yyyy-MM-dd'` siempre fallaba | Normalizar la celda: si es `Date`, formatear a `yyyy-MM-dd` antes de comparar | `backend/07_asistencia.gs` |

### Pruebas de concurrencia ejecutadas (12/08/2026, contra el Web App en producción)

- **8 GET `getTrabajadores` simultáneos** → 8/8 HTTP 200 en 1.4–1.9 s (caché activo: 3.6 s en frío → ~2 s cacheado).
- **3 `registrarAsistenciaFoto` simultáneos** (DNIs de prueba 99999991/92/93) → 3/3 `success:true` en 5–7.3 s, sin "Sistema ocupado".
- **2 registros simultáneos del mismo DNI+evento** → expusieron el bug de anti-duplicado (ambos pasaron); corregido arriba.
- Limpieza pendiente: borrar en la hoja `asistencias_v2` las filas de prueba del 12/08/2026 con DNIs 9999999x ("PRUEBA CONCURRENCIA") y sus fotos en Drive `Asistencias/2026-08-12/9999999x/`.

### Registro manual de asistencia desde el panel (12/08/2026)

Nueva action `registrarAsistenciaManual` (nivel auth) + botón **"Registrar manual"** en `/admin/asistencias`: el admin puede registrar la marca que un trabajador no pudo hacer (p. ej. por el error de concurrencia). Reglas:

- Valida DNI contra el roster real, evento válido (oficina o campo), fecha `yyyy-mm-dd` y hora `HH:mm`; nombre/cargo se toman del roster, nunca del cliente.
- **Observación obligatoria** (`nota`, columna 13 que se agrega al header de `asistencias_v2` si no existe) — auditoría del registro manual.
- Sin foto ni GPS: el panel muestra badge "· manual" (tooltip con la nota). El timestamp se construye como `fechaThora-05:00` para que `getAsistenciasV2` y `sincronizarIncidencias` lo traten igual que una marca del kiosko (cancela falta/tardanza correspondiente).
- Mismo anti-duplicado del kiosko para eventos de oficina (no permite duplicar un evento ya registrado ese día).

### Feriados / días no laborables (12/08/2026)

Antes solo se saltaban sábados y domingos (hardcodeado). Ahora hay hoja **`feriados`** (fecha, descripcion) gestionable desde el panel:

- Actions: `getFeriados` (auth), `agregarFeriado` / `eliminarFeriado` / `sembrarFeriadosPeru2026` (admin — este último precarga los 15 feriados oficiales de Perú 2026, idempotente).
- UI: `FeriadosPanel` en `/admin/planilla` (lista con eliminar, agregar fecha+descripción, botón de carga automática).
- Efectos: `sincronizarIncidencias` no genera falta/omisión en feriados; el informe de `/admin/asistencias` no los cuenta como falta y los pinta violeta en la matriz.

### ⚠️ Checklist de deploy (backend, manual)

1. `npm run build:backend` → pegar `appscript.js` en el editor GAS → `ejecutarTestSalud` → **0 FAIL** → Nueva versión.
2. Sin cambios de hojas ni de Script Properties; compatible con el frontend actual.
3. Prueba de humo: abrir `/asistencia` en 2–3 dispositivos a la vez y registrar ingreso en cada uno.

---

© 2026 Ingeniería Telcom EIRL — Documento de auditoría interna (Fase 0).
