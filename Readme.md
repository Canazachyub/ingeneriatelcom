# Ingeniería Telcom EIRL - Sitio Web Corporativo

> Aplicación web corporativa con React + TypeScript + Google Apps Script como backend.
> Empresa de telecomunicaciones y servicios eléctricos — Perú.

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura Real del Proyecto](#estructura-real-del-proyecto)
- [Sistema de Autenticación Admin](#sistema-de-autenticación-admin)
- [Sistema de Bolsa de Trabajo](#sistema-de-bolsa-de-trabajo)
- [Sistema de PDF / Ficha de Postulación](#sistema-de-pdf--ficha-de-postulación)
- [Sistema de Capacitaciones y Evaluaciones](#sistema-de-capacitaciones-y-evaluaciones)
- [Panel de Administración](#panel-de-administración)
- [Google Apps Script (Backend)](#google-apps-script-backend)
- [Base de Datos - Google Sheets](#base-de-datos---google-sheets)
- [APIs y Comunicación](#apis-y-comunicación)
- [Flujo de Postulación](#flujo-de-postulación)
- [Despliegue](#despliegue)
- [Problemas Conocidos y Soluciones](#problemas-conocidos-y-soluciones)
- [Variables de Entorno](#variables-de-entorno)
- [Recursos del Proyecto](#recursos-del-proyecto)

---

## Descripción General

Sitio web corporativo migrado de HTML estático a React + TypeScript. Incluye landing page pública, bolsa de trabajo con postulaciones, sistema de capacitaciones evaluables con proctoring por webcam, y panel de administración completo.

### Información de la Empresa

| Campo | Valor |
|-------|-------|
| **Empresa** | Ingeniería Telcom EIRL |
| **Sector** | Telecomunicaciones y Servicios Eléctricos |
| **Sede principal** | Tacna, Perú |
| **Dominio** | `ingeneriatelcom.com` |
| **Correo** | energysupervision13@gmail.com |
| **Teléfono** | +51 946 728 495 |
| **Facebook** | https://www.facebook.com/profile.php?id=61586657451703 |

### Estadísticas del Sitio (valores reales)

| Stat | Valor |
|------|-------|
| Proyectos Ejecutados | 27 |
| Clientes | 15+ |
| Años de Experiencia | 15+ |
| Satisfacción | 100% |

> Archivo: `src/data/services.ts` — array `statistics[]`

---

## Stack Tecnológico

### Frontend

```
React 18             → Framework UI
TypeScript 5         → Tipado estático
Vite                 → Build tool
TailwindCSS 3        → Estilos utilitarios
Framer Motion        → Animaciones con scroll (useInView)
React Router DOM 6   → Navegación SPA
react-intersection-observer → Triggers de animación
react-icons          → Iconografía (FontAwesome)
```

### Backend / Infraestructura

```
Google Apps Script   → REST API (doGet / doPost)
Google Sheets        → Base de datos
Google Drive         → Almacenamiento de CVs y fichas PDF
GitHub Pages         → Hosting estático con dominio personalizado
GitHub Actions       → CI/CD automático en push a main
```

### Deploy

```bash
npm run deploy       # build + gh-pages -d dist (manual)
# O automático via GitHub Actions en push a main
```

---

## Estructura Real del Proyecto

```
ingenieria-telcom/
├── public/
│   ├── assets/images/         # GIFs hero, logos clientes
│   ├── robots.txt
│   ├── sitemap.xml
│   └── CNAME                  # ingeneriatelcom.com
│
├── src/
│   ├── api/
│   │   └── appScriptApi.ts    # Cliente API (CRÍTICO - ver sección APIs)
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Breadcrumb.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── PageLoader.tsx
│   │   │   └── SectionWrapper.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   └── sections/
│   │       ├── HeroSection.tsx
│   │       ├── ClientsSection.tsx
│   │       ├── ContactSection.tsx
│   │       ├── JobsSection.tsx    # Preview 3 convocatorias en homepage
│   │       └── ...
│   │
│   ├── context/
│   │   └── ToastContext.tsx    # Notificaciones globales
│   │
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── JobsPage.tsx                 # Listado completo con filtros
│   │   ├── JobDetailPage.tsx            # Detalle + PDF ficha + formulario
│   │   ├── ConsultaPostulacionPage.tsx
│   │   ├── CapacitacionesPage.tsx       # Listado público de cursos activos
│   │   ├── EvaluacionPage.tsx           # Examen con webcam + proctoring
│   │   ├── PrivacyPage.tsx
│   │   ├── TermsPage.tsx
│   │   └── admin/
│   │       ├── DashboardPage.tsx
│   │       ├── JobsManagementPage.tsx         # CRUD convocatorias + subida PDF
│   │       ├── ApplicationsPage.tsx           # Revisión de postulaciones
│   │       ├── EmployeesPage.tsx
│   │       ├── ReportsPage.tsx
│   │       ├── CapacitacionesManagementPage.tsx  # CRUD cursos + banco de preguntas
│   │       └── EvaluacionesPage.tsx            # Revisión de evaluaciones + fotos webcam
│   │
│   ├── hooks/
│   │   └── useGeolocation.ts
│   │
│   ├── types/
│   │   ├── job.types.ts           # Interface JobPosting (incluye pdf_url)
│   │   └── capacitacion.types.ts  # Capacitacion, Pregunta, Evaluacion, EvalLog
│   │
│   └── data/
│       ├── services.ts            # Estadísticas y servicios (valores reales)
│       ├── clients.ts
│       ├── navigation.ts
│       └── organization.ts
│
├── appscript.js                   # Código del backend Google Apps Script
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Sistema de Autenticación Admin

El panel admin usa autenticación por token con Google Apps Script.

### Cómo funciona

1. Admin ingresa la contraseña en el login del dashboard
2. El frontend genera un token: `base64(userId|timestamp|ADMIN_PASSWORD)`
3. El token se envía como parámetro `token` en cada request
4. El Apps Script valida el token en cada acción admin

### Acciones que requieren token

Todas las acciones de escritura: `createJob`, `updateJob`, `deleteJob`, `uploadJobPdf`, `updateApplicationStatus`, etc.

### Importante

Si el token se pierde o el URL es demasiado largo, Apps Script responde `{ success: false, error: 'No autorizado' }`. Ver la sección de problemas conocidos para el fix del POST.

---

## Sistema de Bolsa de Trabajo

### Páginas involucradas

| Archivo | Rol |
|---------|-----|
| `src/components/sections/JobsSection.tsx` | Preview de 3 convocatorias activas en homepage |
| `src/pages/JobsPage.tsx` | Listado completo con filtros por categoría, modalidad, ciudad |
| `src/pages/JobDetailPage.tsx` | Detalle completo + ficha PDF + formulario de postulación |
| `src/pages/admin/JobsManagementPage.tsx` | CRUD admin de convocatorias |

### Ciudades disponibles en el dropdown (admin)

El dropdown de ciudades en el formulario de convocatoria incluye ~40 ciudades peruanas:

```
Tacna, Arequipa, Lima, Cusco, Puno, Moquegua, Ilo, Juliaca,
Iquitos, Trujillo, Chiclayo, Piura, Huancayo, Ayacucho,
Cajamarca, Pucallpa, Puerto Maldonado, Tumbes, Chimbote,
Sullana, Tarapoto, Huánuco, Ica, Abancay, Andahuaylaas,
Moyobamba, Bagua, Chachapoyas, Tingo María, Yurimaguas,
Jaén, Huaraz, Cerro de Pasco, La Merced, San Ramón,
Quillabamba, Sicuani, Ilave, Desaguadero, Otros
```

### Categorías de trabajo

```
Ingenieria → Ingeniería
Tecnico    → Técnico
TI         → Tecnología / TI
Administracion → Administración
Finanzas
RRHH       → Recursos Humanos
Operaciones
Otros
```

### Campos de una convocatoria (JobPosting)

```typescript
interface JobPosting {
  id: string
  titulo: string
  categoria: string
  descripcion: string
  requisitos: string          // separados por |
  beneficios: string          // separados por |
  ubicacion: string
  modalidad: 'Presencial' | 'Remoto' | 'Hibrido'
  salario_min: number
  salario_max: number
  estado: 'activo' | 'pausado' | 'cerrado'
  prioridad: 'normal' | 'alta'  // 'alta' muestra badge URGENTE rojo
  imagen?: string             // URL imagen de portada
  pdf_url?: string            // URL ficha de postulación en Drive
  fecha_publicacion?: string
  fecha_cierre?: string
}
```

---

## Sistema de PDF / Ficha de Postulación

Permite subir una ficha PDF por convocatoria desde el admin, guardada en Google Drive organizada por ciudad.

### Flujo completo

```
Admin sube PDF en JobsManagementPage
  → Frontend lee archivo como base64
  → Llama api.uploadJobPdf({ jobId, ciudad, fileName, fileContent })
  → Apps Script crea carpeta: Fichas_Postulacion/<ciudad>/
  → Sube el PDF a esa carpeta
  → Configura acceso: ANYONE_WITH_LINK (solo lectura)
  → Retorna la URL pública del archivo
  → Frontend guarda pdf_url en los datos del job (createJob/updateJob)
  → En la página pública del job, aparece el botón "Ver Ficha"
```

### Estructura en Google Drive

```
Mi Drive/
└── Fichas_Postulacion/
    ├── Tacna/
    │   ├── ficha_tecnico_electricista.pdf
    │   └── ficha_ingeniero_electrico.pdf
    ├── Arequipa/
    │   └── ...
    └── Puerto_Maldonado/
        └── ...
```

### Visualización pública (JobDetailPage)

Si la convocatoria tiene `pdf_url`, aparece una sección destacada en ámbar/dorado antes del formulario de postulación:

- Ícono PDF en caja ámbar
- Etiqueta "Lectura obligatoria"
- Título "Ficha Oficial de Postulación"
- Descripción del contenido
- Botón "Ver Ficha" que abre el PDF en nueva pestaña

### Nota importante

El campo `pdf_url` debe existir como columna en la hoja `convocatorias` de Google Sheets. Si se recrea la hoja con `recrearHoja()` y esa función no incluye `pdf_url` en los headers, la columna desaparece y los PDFs ya no se muestran.

La función `setupAllSheets()` y `cargarConvocatoriasPrueba()` en `appscript.js` ya incluyen `pdf_url` en sus arrays de encabezados.

---

## Sistema de Capacitaciones y Evaluaciones

Módulo completo para crear cursos, banco de preguntas, y que los trabajadores rindan evaluaciones en línea con proctoring ligero.

### Flujo general

```
Admin crea capacitación (título, descripción, config)
  → Admin agrega preguntas al banco (tipo multiple/llenado, dificultad, puntaje)
  → Trabajador navega a /capacitaciones → selecciona curso → /evaluacion/:id
  → Ingresa DNI, nombres, correo → sistema verifica intento único
  → Activa cámara (webcam obligatoria)
  → Rinde examen: 1 pregunta a la vez, sin retroceder, con timer
  → Apps Script calcula puntaje automático (puntaje_auto)
  → Admin revisa en /admin/evaluaciones: ve fotos webcam, asigna nota_final
  → Solo al aprobar/observar se envía correo al trabajador
```

### Proctoring implementado

- **Fotos periódicas**: cada `foto_intervalo_seg` (configurable) captura frame de webcam → JPEG 320×240 → Drive
- **Cambio de pestaña**: `visibilitychange` / `window.blur` → incrementa contador `salidas_pestana`
- **Detección de pegado**: `onpaste` en inputs → registra evento en `eval_logs`
- **Sin retroceso**: no existe botón "Anterior" entre preguntas
- **Auto-submit**: si el timer llega a 0, se envía el examen automáticamente

### Barajeo determinístico por DNI

Las preguntas del banco se barajan usando un PRNG con semilla = `parseInt(dni)`. El mismo DNI siempre obtiene el mismo orden, lo que permite reproducir el examen para revisión, pero dos trabajadores con distinto DNI ven distinto orden.

### Carpeta en Google Drive

```
Mi Drive/
└── Evaluaciones_Proctoring/
    └── <capacitacion_id>/
        └── <dni>/
            ├── foto_1234567890.jpg
            └── foto_1234567891.jpg
```

### Configuración por capacitación

| Campo | Descripción |
|-------|-------------|
| `num_preguntas` | Cuántas preguntas se seleccionan del banco para el examen |
| `nota_minima` | Puntaje mínimo para aprobar |
| `tiempo_limite_min` | Minutos disponibles para rendir |
| `foto_intervalo_seg` | Cada cuántos segundos se captura foto de webcam |

### Regla de seguridad: `respuesta_correcta` nunca pública

El endpoint `iniciarEvaluacion` devuelve las preguntas **sin** `respuesta_correcta` ni `justificacion`. Esos campos solo están disponibles en `getPreguntas` (admin, requiere token).

---

## Panel de Administración

Accesible en `/admin` con contraseña.

### Módulos disponibles

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/admin` | Estadísticas generales |
| Convocatorias | `/admin/bolsa-trabajo` | CRUD completo de trabajos + subida PDF |
| Postulaciones | `/admin/postulaciones` | Ver y gestionar aplicaciones recibidas |
| Empleados | `/admin/empleados` | Gestión de personal |
| Reportes | `/admin/reportes` | Informes y exportación |
| Gestión de Cursos | `/admin/capacitaciones` | CRUD capacitaciones + banco de preguntas |
| Evaluaciones | `/admin/evaluaciones` | Revisar resultados, ver fotos, aprobar/observar |

### Formulario de convocatoria (admin)

El modal de creación/edición incluye:
- Título, categoría, descripción, requisitos (uno por línea), beneficios
- Ciudad (dropdown ~40 ciudades), modalidad, salario min/max
- Estado (activo/pausado/cerrado), prioridad (normal/alta)
- URL de imagen de portada
- Subida de ficha PDF (archivo local → Drive automático)

---

## Google Apps Script (Backend)

**Archivo local**: `appscript.js`
El contenido de este archivo se copia manualmente al editor de Google Apps Script y se redespliega como Web App cuando hay cambios.

### URL del Web App

```
Configurada en: VITE_APPS_SCRIPT_URL (variable de entorno)
```

### Acciones disponibles

#### Públicas (sin token)

| Acción | Método | Descripción |
|--------|--------|-------------|
| `getJobs` | GET | Lista convocatorias activas |
| `getJob` | GET | Detalle de una convocatoria por ID |
| `apply` | POST | Recibir postulación pública (con CV) |
| `contact` | POST | Recibir mensaje de contacto |
| `consultarPostulacion` | GET | Consultar estado de postulación por DNI |
| `verificarEmpleado` | GET | Verificar si empleado existe (para asistencia) |
| `marcarAsistencia` | POST | Registrar entrada/salida con geolocalización |
| `getCapacitaciones` | GET | Lista capacitaciones activas (sin respuestas) |
| `getCapacitacionById` | GET | Detalle de una capacitación |
| `iniciarEvaluacion` | POST | Valida intento único, baraja preguntas, crea fila evaluacion |
| `submitEvaluacion` | POST | Calcula puntaje_auto, guarda, estado → pendiente_revision |
| `guardarFotoWebcam` | POST | Sube foto base64 a Drive (Evaluaciones_Proctoring/) |
| `registrarEventoLog` | POST | Append a eval_logs (salida pestaña, pegado, etc.) |

#### Admin (requieren token)

| Acción | Descripción |
|--------|-------------|
| `getJobsAdmin` | Lista todas las convocatorias |
| `createJob` / `updateJob` / `deleteJob` | CRUD convocatorias |
| `uploadJobPdf` | Subir PDF de ficha a Drive |
| `getApplicationsAdmin` / `updateApplicationStatus` | Gestión postulaciones |
| `getEmployees` / `createEmployee` / `updateEmployee` | Gestión empleados |
| `crearCapacitacion` / `actualizarCapacitacion` / `eliminarCapacitacion` | CRUD capacitaciones |
| `crearPregunta` / `actualizarPregunta` / `eliminarPregunta` | CRUD banco de preguntas |
| `getPreguntas` | Lista preguntas por capacitacion_id (incluye respuesta_correcta) |
| `getEvaluaciones` | Lista evaluaciones con filtros (estado, capacitacion_id) |
| `revisarEvaluacion` | Asigna nota_final, cambia estado, dispara correo |

### Funciones de mantenimiento (NO usar en producción)

```javascript
recrearHoja(nombre)          // PELIGROSO: borra y recrea una hoja completa
setupAllSheets()             // Crea todas las hojas con headers correctos
cargarConvocatoriasPrueba()  // Inserta datos de prueba (usa recrearHoja)
```

**ADVERTENCIA**: `cargarConvocatoriasPrueba()` usa `recrearHoja()` que elimina TODOS los datos existentes. Solo usar en entorno de prueba o proyecto vacío.

### Helpers internos

```javascript
getOrCreateFolder(parentFolder, folderName)  // Crea carpeta en Drive si no existe
rowToObject(headers, row)                    // Convierte fila de Sheet a objeto
getColNum(colName)                           // Detecta número de columna por nombre
jsonResponse(data)                           // Respuesta JSON estándar
```

---

## Base de Datos - Google Sheets

**ID del Spreadsheet**: `15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA`

### Hoja: `convocatorias`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | UUID generado por Apps Script |
| titulo | string | |
| categoria | string | Ver categorías arriba |
| descripcion | string | |
| requisitos | string | Items separados por `\|` |
| beneficios | string | Items separados por `\|` |
| ubicacion | string | Ciudad |
| modalidad | string | Presencial / Remoto / Hibrido |
| salario_min | number | |
| salario_max | number | |
| estado | string | activo / pausado / cerrado |
| prioridad | string | normal / alta |
| fecha_publicacion | string | |
| fecha_cierre | string | |
| imagen | string | URL opcional |
| **pdf_url** | string | URL Google Drive (agregado posteriormente) |

### Hoja: `postulaciones`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | UUID |
| convocatoria_id | string | FK a convocatorias.id |
| nombre_completo | string | |
| dni | string | |
| email | string | |
| telefono | string | |
| linkedin | string | Opcional |
| cv_url | string | URL Google Drive |
| cv_nombre | string | Nombre del archivo |
| carta_presentacion | string | Opcional |
| pretension_salarial | number | |
| disponibilidad | string | |
| fecha_postulacion | datetime | |
| estado | string | pendiente / revisado / entrevista / rechazado / contratado |

### Hoja: `contactos`

| Columna | Tipo |
|---------|------|
| id | string |
| nombre | string |
| email | string |
| telefono | string |
| mensaje | string |
| fecha | datetime |
| estado | string |

### Hoja: `empleados`

| Columna | Tipo |
|---------|------|
| id | string |
| nombre | string |
| cargo | string |
| departamento | string |
| email | string |
| telefono | string |
| estado | string |
| fecha_ingreso | string |

### Hoja: `capacitaciones`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | Ej: CAP001 |
| titulo | string | |
| descripcion | string | |
| material_url | string | URL Drive/YouTube del material de estudio |
| categoria | string | Seguridad / Técnico / Administrativo / Salud / Otro |
| num_preguntas | number | Cuántas preguntas se toman del banco (ej: 20) |
| nota_minima | number | Puntaje mínimo para aprobar (ej: 14) |
| tiempo_limite_min | number | Minutos disponibles (ej: 25) |
| foto_intervalo_seg | number | Segundos entre fotos webcam (ej: 30) |
| estado | string | borrador / activo / cerrado |
| fecha_creacion | datetime | |

### Hoja: `banco_preguntas`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | Ej: P001 |
| capacitacion_id | string | FK a capacitaciones.id |
| pregunta | string | Enunciado completo |
| tipo | string | multiple / llenado |
| opcion_a..d | string | Solo para tipo multiple |
| respuesta_correcta | string | A/B/C/D (multiple) o texto (llenado) |
| justificacion | string | Explicación de la respuesta (admin only) |
| dificultad | string | facil / media / dificil |
| puntaje | number | Puntos que vale la pregunta (normalmente 1) |
| estado | string | activa / inactiva |

### Hoja: `evaluaciones`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | UUID |
| capacitacion_id | string | FK |
| dni | string | |
| nombres | string | |
| email | string | |
| preguntas_asignadas | string | JSON array de IDs de preguntas |
| respuestas | string | JSON: { pregunta_id: respuesta_dada } |
| puntaje_auto | number | Calculado al submit |
| salidas_pestana | number | Veces que el examinado cambió de pestaña |
| fotos_url | string | JSON array de URLs Drive |
| hora_inicio | datetime | |
| hora_fin | datetime | |
| duracion_seg | number | |
| estado | string | en_curso / pendiente_revision / aprobado / observado / abandonado |
| nota_final | number | Asignada manualmente por admin |
| retroalimentacion | string | Comentario del admin |
| revisado_por | string | Nombre del admin que revisó |
| fecha_revision | datetime | |

### Hoja: `eval_fotos`

| Columna | Tipo |
|---------|------|
| id | string |
| evaluacion_id | string |
| foto_url | string |
| timestamp | datetime |
| orden | number |

### Hoja: `eval_logs`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | |
| evaluacion_id | string | |
| tipo_evento | string | salida_pestana / pegado_detectado / timeout / etc |
| detalle | string | Información adicional |
| timestamp | datetime | |

---

## APIs y Comunicación

### Cliente API (`src/api/appScriptApi.ts`)

La clase `AppScriptApi` es el único punto de comunicación con el backend.

#### Método `request()` — comportamiento crítico

Las acciones de escritura (POST) envían el payload en el **body** de la request con `Content-Type: text/plain`, no en la URL.

```typescript
// Para POST con datos: envía body JSON
if (method === 'POST' && requestData && Object.keys(requestData).length > 0) {
  response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(requestData),
    redirect: 'follow',
  })
}
// Para GET: adjunta payload como query param
else {
  url.searchParams.set('payload', JSON.stringify(requestData))
  response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' })
}
```

**Por qué `Content-Type: text/plain`**: Google Apps Script con CORS no acepta `application/json` en requests cross-origin (genera preflight que falla). `text/plain` evita el preflight y Apps Script igual puede leer `e.postData.contents`.

**Por qué no todo en URL**: Payloads grandes (formulario de convocatoria con descripción larga) superan el límite de URL (~2000 chars). Si el token queda fuera del límite, Apps Script lo pierde y responde "No autorizado".

#### Métodos disponibles

```typescript
// Bolsa de Trabajo
api.getJobs()
api.getJobById(id)
api.getJobsAdmin()
api.createJobAdmin(jobData)
api.updateJobAdmin(id, jobData)
api.deleteJobAdmin(id)
api.uploadJobPdf({ fileContent, fileName, mimeType, ciudad })
api.submitApplication(applicationData)
api.getApplicationsAdmin(jobId?)
api.updateApplicationStatus(id, status, notes?)

// Empleados y Asistencia
api.getEmployees()
api.createEmployee(employee)
api.updateEmployee(id, employee)
api.marcarAsistencia(dni, tipo, location)
api.verificarEmpleado(dni)

// Capacitaciones (públicos)
api.getCapacitaciones()
api.getCapacitacionById(id)
api.iniciarEvaluacion({ capacitacion_id, dni, nombres, email })
api.submitEvaluacion({ evaluacion_id, respuestas, salidas_pestana, fotos_url, duracion_seg })
api.guardarFotoWebcam({ evaluacion_id, capacitacion_id, dni, fileContent, fileName, mimeType })
api.registrarEventoLog({ evaluacion_id, tipo_evento, detalle? })

// Capacitaciones (admin)
api.crearCapacitacion(data)
api.actualizarCapacitacion({ id, ...data })
api.eliminarCapacitacion(id)
api.crearPregunta(data)
api.actualizarPregunta({ id, ...data })
api.eliminarPregunta(id)
api.getPreguntas(capacitacion_id)         // incluye respuesta_correcta (admin only)
api.getEvaluaciones({ estado?, capacitacion_id? })
api.revisarEvaluacion({ id, nota_final, retroalimentacion, estado })
```

---

## Flujo de Postulación

```
Visitante navega a /bolsa-trabajo
  → Ve listado de convocatorias activas con filtros
  → Hace click en una convocatoria
  → Llega a /bolsa-trabajo/:id

En la página de detalle:
  1. Lee descripción completa, requisitos, beneficios
  2. (Si hay PDF) Ve el banner ámbar "Ficha Oficial de Postulación" → botón "Ver Ficha"
  3. Completa el formulario de postulación:
     - Nombre completo, DNI, email, teléfono
     - LinkedIn (opcional)
     - Sube su CV (PDF/DOC, máx 5MB) → se guarda en Drive
     - Carta de presentación (opcional)
     - Pretensión salarial, disponibilidad
  4. Envía → Apps Script guarda en hoja postulaciones + notifica por email
  5. Ve confirmación de éxito

Postulante puede consultar estado en: /consulta-postulacion
  → Ingresa DNI o email
  → Ve estado de sus postulaciones
```

### Estados de postulación

```
pendiente → revisado → entrevista → contratado
                    ↘ rechazado
```

---

## Despliegue

### Manual

```bash
npm run deploy
# Ejecuta: tsc && vite build → gh-pages -d dist
```

### Automático (GitHub Actions)

El archivo `.github/workflows/deploy.yml` ejecuta el deploy automáticamente en cada push a `main`.

```yaml
# Requiere secrets en GitHub:
# VITE_APPS_SCRIPT_URL
# VITE_ADMIN_PASSWORD (si aplica)
```

### Configuración GitHub Pages

1. Settings → Pages → Branch: `gh-pages` / root
2. Custom domain: `ingeneriatelcom.com`
3. Enforce HTTPS: activado

### DNS Records

```
Tipo    Nombre    Valor
A       @         185.199.108.153
A       @         185.199.109.153
A       @         185.199.110.153
A       @         185.199.111.153
CNAME   www       canazachyub.github.io
```

### SPA Routing en GitHub Pages

`public/404.html` redirige rutas desconocidas al `index.html` para que React Router funcione correctamente en recarga directa de páginas.

---

## Problemas Conocidos y Soluciones

### 1. "No autorizado" al crear/editar convocatoria

**Causa**: El payload del formulario era tan largo que la URL superaba el límite del navegador. El token quedaba truncado o se perdía. Además, el parámetro `method` en `request()` originalmente tenía nombre `_method` (con guión bajo) y no se usaba, por lo que todo se enviaba como GET.

**Solución**: Implementar POST real con body para todas las acciones de escritura. Ver sección "Método `request()`" arriba.

### 2. PDFs desaparecen después de ejecutar funciones de prueba

**Causa**: `cargarConvocatoriasPrueba()` llama a `recrearHoja('convocatorias')` que borra y recrea la hoja completa, perdiendo todos los datos incluyendo las URLs de PDF.

**Solución**: No usar `cargarConvocatoriasPrueba()` en producción. Si se necesita recrear la estructura, usar `setupAllSheets()` solo en un spreadsheet vacío o de prueba.

**Fix aplicado**: Los arrays de headers en `setupAllSheets()` y `cargarConvocatoriasPrueba()` ahora incluyen `pdf_url` para que la columna exista desde el principio.

### 3. Columna `pdf_url` no existe en Sheet existente

Si la hoja `convocatorias` fue creada con una versión anterior de `appscript.js` que no incluía `pdf_url`, el campo no existe y los PDFs no se guardan/muestran.

**Solución manual**: Abrir el Google Sheet, ir a la hoja `convocatorias`, agregar manualmente la columna `pdf_url` al final de los headers. Luego re-guardar cualquier convocatoria desde el admin para que se escriba el valor.

### 4. Errores "Uncaught (in promise) Object" en consola

**Causa probable**: Apps Script devuelve HTML de error en lugar de JSON cuando hay excepciones no manejadas. El `.json()` del fetch falla.

**Mitigación**: El `request()` tiene try/catch que captura y loguea el error. No rompe la UI pero tampoco da detalle del error real.

---

## Variables de Entorno

```env
# .env (local) / GitHub Secrets (CI/CD)

VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_ID/exec
```

El archivo `.env` no se sube al repositorio (está en `.gitignore`). En GitHub Actions se configura como secret `VITE_APPS_SCRIPT_URL`.

---

## Diseño y Estética

**Concepto**: Industrial Premium — azules profundos, acentos cyan eléctrico y amarillo energía.

### Paleta principal

```css
--primary-950: #0a1628    /* Fondo principal */
--primary-800: #0f2847    /* Fondos secundarios */
--accent-electric: #00d4ff /* Highlights, iconos */
--accent-energy: #fbbf24   /* CTAs, botones primarios */
```

### Tipografías

- `Orbitron` — títulos y display
- `Plus Jakarta Sans` — cuerpo de texto
- `JetBrains Mono` — datos técnicos

### Componentes reutilizables

| Clase CSS | Uso |
|-----------|-----|
| `btn-energy` | Botón CTA amarillo principal |
| `btn-primary` | Botón azul |
| `btn-secondary` | Botón con borde |
| `section-title` | Título de sección |
| `section-subtitle` | Subtítulo de sección |
| `card` | Tarjeta con fondo oscuro y borde |

---

## Recursos del Proyecto

| Recurso | URL |
|---------|-----|
| Sitio Web | https://ingeneriatelcom.com |
| Dashboard Admin | https://canazachyub.github.io/Telcomdashboard |
| Google Sheets DB | https://docs.google.com/spreadsheets/d/15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA |
| Google Drive CVs | https://drive.google.com/drive/folders/1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV |
| Repositorio | https://github.com/canazachyub/ingenieria-telcom |
| Facebook | https://www.facebook.com/profile.php?id=61586657451703 |
| Email | energysupervision13@gmail.com |

---

## Historial de Cambios Relevantes

| Versión / Fecha | Cambio |
|-----------------|--------|
| Inicial | Migración de HTML estático a React + TypeScript |
| v1.1 | Integración Google Apps Script + Sheets |
| v1.2 | Panel de administración completo (CRUD convocatorias, postulaciones, empleados) |
| v1.3 | Fix autenticación: POST real con body para evitar pérdida de token en URLs largas |
| v1.4 | Sistema de ficha PDF por convocatoria: subida desde admin, almacenamiento en Drive por ciudad |
| v1.5 | Expansión dropdown ciudades (~40 ciudades peruanas, incluye Puerto Maldonado) |
| v1.6 | Botón "Ver Ficha" rediseñado en ámbar/dorado con mejor visibilidad |
| v1.7 | Eliminación contador "0 postulantes" de tarjetas de trabajo |
| v1.8 | Fix headers Google Sheet: `pdf_url` incluido en `setupAllSheets` y `cargarConvocatoriasPrueba` |
| v1.9 | Corrección estadísticas homepage: 27 proyectos, 15+ clientes |
| v2.0 | CI/CD automático con GitHub Actions |
| v2.1 | Módulo de Capacitaciones: cursos activos públicos, banco de preguntas, evaluación con webcam y proctoring, revisión admin |
| v2.2 | Fix Banco de Preguntas admin: endpoint `getPreguntas` + método API + corrección frontend para leer desde Google Sheets |

---

## Checklist de Despliegue (Módulo Capacitaciones)

Al actualizar `appscript.js` en Google Apps Script, ejecutar lo siguiente desde el editor:

1. **`setupAllSheets()`** — crea las 5 hojas nuevas si no existen (no toca hojas existentes)
2. **Redesplegar Web App** — "Desplegar" → "Administrar despliegues" → editar → "Nueva versión"
3. **`preAutorizarDrive()`** — pre-autoriza acceso a Drive para guardar fotos webcam
4. **`preAutorizarMail()`** — pre-autoriza MailApp para enviar correos de resultado

> Solo necesario la primera vez o cuando se agregan hojas/funciones nuevas.

---

© 2025 Ingeniería Telcom EIRL. Todos los derechos reservados.
