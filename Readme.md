# 🔌 Ingeniería Telcom EIRL - Sitio Web Corporativo

> **Proyecto de migración y modernización completa del sitio web corporativo de Ingeniería Telcom EIRL**
> 
> Empresa líder en telecomunicaciones y servicios eléctricos en Perú

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Diseño y Estética](#-diseño-y-estética)
- [Funcionalidades](#-funcionalidades)
- [Integraciones](#-integraciones)
- [APIs y Endpoints](#-apis-y-endpoints)
- [Instrucciones de Implementación](#-instrucciones-de-implementación)
- [Despliegue](#-despliegue)
- [Configuración del Dominio](#-configuración-del-dominio)

---

## 🎯 Descripción General

Este proyecto consiste en la **migración completa** de un sitio web HTML estático a una aplicación moderna con **React + TypeScript**, diseñada para ser:

- ✅ Completamente modular y mantenible
- ✅ Conectada con APIs REST (Google Apps Script)
- ✅ Integrada con servicios de Google (Sheets, Drive)
- ✅ Con sistema de bolsa de trabajo funcional
- ✅ Desplegable en GitHub Pages con dominio personalizado

### Información de la Empresa

| Campo | Valor |
|-------|-------|
| **Empresa** | Ingeniería Telcom EIRL |
| **Sector** | Telecomunicaciones y Servicios Eléctricos |
| **Ubicación** | Tacna, Perú |
| **Dominio** | `ingeneriatelcom.com` |
| **Correo** | energysupervision13@gmail.com |
| **Teléfono** | +51 946 728 495 |
| **Facebook** | https://www.facebook.com/profile.php?id=61586657451703 |

---

## 🛠 Stack Tecnológico

### Frontend Principal

```
React 18+          → Framework UI
TypeScript 5+      → Tipado estático
Vite               → Build tool y dev server
TailwindCSS 3+     → Estilos utilitarios
Framer Motion      → Animaciones avanzadas
React Router DOM   → Navegación SPA
```

### Librerías Adicionales

```
@tanstack/react-query  → Manejo de estado servidor y cache
axios                  → Cliente HTTP para APIs
react-hook-form        → Formularios con validación
zod                    → Validación de schemas
react-icons            → Iconografía
swiper                 → Carrusel/slider avanzado
react-intersection-observer → Animaciones on-scroll
date-fns               → Manejo de fechas
```

### Herramientas de Desarrollo

```
ESLint               → Linting
Prettier             → Formateo de código
husky                → Git hooks
```

---

## 📁 Estructura del Proyecto

```
ingenieria-telcom/
├── public/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── logo.png
│   │   │   ├── hero/
│   │   │   │   ├── hero-1.gif          # GIF animado principal
│   │   │   │   ├── hero-2.gif
│   │   │   │   └── hero-3.gif
│   │   │   ├── clients/
│   │   │   │   ├── electrosur.png
│   │   │   │   ├── electropuno.png
│   │   │   │   ├── electrosureste.png
│   │   │   │   └── electroucayali.png
│   │   │   └── team/
│   │   └── fonts/
│   ├── CNAME                           # Para dominio personalizado
│   └── favicon.ico
│
├── src/
│   ├── api/
│   │   ├── appScriptApi.ts            # Cliente API para Google Apps Script
│   │   ├── sheetsApi.ts               # Integración con Google Sheets
│   │   ├── driveApi.ts                # Integración con Google Drive
│   │   └── facebookApi.ts             # Integración con Facebook Graph API
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loader.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Navbar.tsx             # Navegación principal
│   │   │   ├── Footer.tsx             # Pie de página
│   │   │   ├── Layout.tsx             # Layout wrapper
│   │   │   └── MobileMenu.tsx         # Menú móvil hamburguesa
│   │   │
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx        # Carrusel principal con GIFs
│   │   │   ├── AboutSection.tsx       # Quiénes Somos
│   │   │   ├── ServicesSection.tsx    # Servicios
│   │   │   ├── MissionVisionSection.tsx
│   │   │   ├── EthicsSection.tsx      # Código de Ética
│   │   │   ├── OrganizationSection.tsx # Estructura Organizacional
│   │   │   ├── ClientsSection.tsx     # Clientes
│   │   │   ├── JobsSection.tsx        # Bolsa de Trabajo
│   │   │   ├── FacebookFeedSection.tsx # Feed de Facebook
│   │   │   └── ContactSection.tsx     # Contacto
│   │   │
│   │   └── jobs/
│   │       ├── JobCard.tsx            # Tarjeta de convocatoria
│   │       ├── JobModal.tsx           # Modal detalle de trabajo
│   │       ├── ApplicationForm.tsx    # Formulario de postulación
│   │       ├── JobFilters.tsx         # Filtros de búsqueda
│   │       └── CVUploader.tsx         # Componente subida de CV
│   │
│   ├── pages/
│   │   ├── HomePage.tsx               # Página principal
│   │   ├── JobsPage.tsx               # Página completa de bolsa de trabajo
│   │   ├── JobDetailPage.tsx          # Detalle de una convocatoria
│   │   └── NotFoundPage.tsx           # 404
│   │
│   ├── hooks/
│   │   ├── useJobs.ts                 # Hook para convocatorias
│   │   ├── useSubmitApplication.ts    # Hook para enviar postulaciones
│   │   ├── useFacebookPosts.ts        # Hook para posts de FB
│   │   ├── useScrollAnimation.ts      # Hook para animaciones scroll
│   │   └── useContactForm.ts          # Hook para formulario contacto
│   │
│   ├── services/
│   │   ├── jobService.ts              # Lógica de negocio trabajos
│   │   ├── contactService.ts          # Lógica de contacto
│   │   └── uploadService.ts           # Lógica de subida archivos
│   │
│   ├── types/
│   │   ├── job.types.ts               # Tipos para trabajos
│   │   ├── contact.types.ts           # Tipos para contacto
│   │   ├── api.types.ts               # Tipos para respuestas API
│   │   └── common.types.ts            # Tipos comunes
│   │
│   ├── utils/
│   │   ├── constants.ts               # Constantes globales
│   │   ├── helpers.ts                 # Funciones helper
│   │   └── validators.ts              # Validadores
│   │
│   ├── styles/
│   │   ├── globals.css                # Estilos globales + Tailwind
│   │   └── animations.css             # Animaciones personalizadas
│   │
│   ├── data/
│   │   ├── navigation.ts              # Links de navegación
│   │   ├── services.ts                # Datos de servicios
│   │   ├── clients.ts                 # Datos de clientes
│   │   └── organization.ts            # Estructura organizacional
│   │
│   ├── config/
│   │   └── env.ts                     # Variables de entorno
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 🎨 Diseño y Estética

### Dirección Creativa

**Concepto**: _"Industrial Premium"_ - Fusión de estética industrial/técnica con acabados premium y modernos.

### Paleta de Colores

```css
:root {
  /* Colores Primarios */
  --primary-900: #0a1628;      /* Azul oscuro profundo - fondos */
  --primary-800: #0f2847;      /* Azul noche */
  --primary-700: #1a3a5c;      /* Azul industrial */
  --primary-600: #1e4976;      /* Azul corporativo */
  --primary-500: #2563eb;      /* Azul eléctrico principal */
  --primary-400: #3b82f6;      /* Azul brillante */
  --primary-300: #60a5fa;      /* Azul claro */
  
  /* Acentos */
  --accent-electric: #00d4ff;   /* Cyan eléctrico - highlights */
  --accent-energy: #fbbf24;     /* Amarillo energía - CTAs */
  --accent-success: #10b981;    /* Verde éxito */
  --accent-warning: #f59e0b;    /* Naranja advertencia */
  
  /* Neutrales */
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-700: #334155;
  --neutral-800: #1e293b;
  --neutral-900: #0f172a;
  
  /* Gradientes */
  --gradient-hero: linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0f2847 100%);
  --gradient-electric: linear-gradient(90deg, #2563eb 0%, #00d4ff 100%);
  --gradient-card: linear-gradient(180deg, rgba(30,73,118,0.1) 0%, rgba(10,22,40,0.3) 100%);
}
```

### Tipografía

```css
/* Fuente Display - Títulos impactantes */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');

/* Fuente Body - Lectura profesional */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

/* Fuente Mono - Datos técnicos */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Elementos de Diseño

#### Hero Section (Primera Pantalla CAPTURANTE)

```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║                   [NAVBAR FLOTANTE]                   ║  │
│  ║  LOGO          Inicio | Servicios | Trabajo | ...     ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│              ████████████████████████████████               │
│              █                              █               │
│              █     [GIF ANIMADO FULL]       █               │
│              █   Ingeniería eléctrica       █               │
│              █   Trabajadores en torres     █               │
│              █   Chispas eléctricas         █               │
│              █                              █               │
│              ████████████████████████████████               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         ⚡ INGENIERÍA TELCOM EIRL ⚡                 │   │
│  │                                                     │   │
│  │    "Conectando Perú con Excelencia"                │   │
│  │                                                     │   │
│  │   Líderes en Telecomunicaciones y                  │   │
│  │   Servicios Eléctricos                             │   │
│  │                                                     │   │
│  │   [⚡ VER SERVICIOS]  [📋 BOLSA DE TRABAJO]        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│          ▼ Scroll para descubrir más ▼                     │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  🔧 +500        📡 +50           ⚡ 15+        🏆 100%      │
│  Proyectos     Clientes        Años         Satisfacción   │
│  ═══════════════════════════════════════════════════════   │
└─────────────────────────────────────────────────────────────┘
```

#### Efectos Visuales Requeridos

1. **Hero con GIFs Animados**:
   - Carrusel de GIFs de alta calidad mostrando trabajo eléctrico
   - Overlay con gradiente oscuro para legibilidad
   - Partículas flotantes simulando chispas eléctricas (opcional con CSS)
   - Texto con efecto de "glow" eléctrico

2. **Animaciones de Entrada**:
   - Elementos aparecen con stagger (delay escalonado)
   - Efecto de "slide-up" y "fade-in" al hacer scroll
   - Números de estadísticas con contador animado

3. **Tarjetas de Servicio**:
   - Efecto hover con elevación y borde brillante
   - Iconos animados al hover
   - Gradiente sutil en el fondo

4. **Sección de Clientes**:
   - Logos en carrusel infinito automático
   - Efecto grayscale → color al hover

5. **Bolsa de Trabajo**:
   - Grid de tarjetas con badges de estado (Nuevo, Urgente, etc.)
   - Filtros animados con transiciones suaves
   - Modal de postulación con progreso paso a paso

---

## ⚙️ Funcionalidades

### 1. Página Principal (Landing)

| Sección | Descripción | Datos |
|---------|-------------|-------|
| **Hero** | Carrusel de GIFs con mensaje principal | Estático |
| **Estadísticas** | Contadores animados | Estático |
| **Quiénes Somos** | Descripción + 3 cards | Estático |
| **Servicios** | Grid de 4 servicios | Estático/API |
| **Misión/Visión** | Cards con información | Estático |
| **Código de Ética** | Grid de 6 valores | Estático |
| **Estructura Org.** | Organigrama visual | Estático |
| **Clientes** | Carrusel de logos | Estático |
| **Bolsa de Trabajo** | Preview de convocatorias | API (Sheets) |
| **Facebook Feed** | Últimas publicaciones | API (Facebook) |
| **Contacto** | Formulario + info | API (Apps Script) |

### 2. Sistema de Bolsa de Trabajo (CRÍTICO)

#### Funcionalidades Requeridas

```typescript
// Categorías de trabajo disponibles
type JobCategory = 
  | 'ingeniero-electrico'
  | 'ingeniero-telecomunicaciones'
  | 'ingeniero-civil'
  | 'contador'
  | 'abogado'
  | 'tecnico-electricista'
  | 'tecnico-telecomunicaciones'
  | 'administrativo'
  | 'recursos-humanos'
  | 'marketing'
  | 'otros';

// Estructura de una convocatoria
interface JobPosting {
  id: string;
  title: string;
  category: JobCategory;
  description: string;
  requirements: string[];
  benefits: string[];
  location: string;
  modality: 'presencial' | 'remoto' | 'hibrido';
  salary?: {
    min: number;
    max: number;
    currency: 'PEN' | 'USD';
  };
  status: 'activo' | 'pausado' | 'cerrado';
  priority: 'normal' | 'urgente';
  publishedAt: Date;
  closingDate?: Date;
  applicationsCount: number;
}

// Estructura de una postulación
interface JobApplication {
  id: string;
  jobId: string;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
    dni: string;
    linkedIn?: string;
  };
  cvFileUrl: string;        // URL de Google Drive
  cvFileName: string;
  coverLetter?: string;
  expectedSalary?: number;
  availability: string;
  appliedAt: Date;
  status: 'pendiente' | 'revisado' | 'entrevista' | 'rechazado' | 'contratado';
}
```

#### Flujo de Postulación

```
┌─────────────────────────────────────────────────────────────┐
│                    BOLSA DE TRABAJO                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [🔍 Buscar...]  [📂 Categoría ▼]  [📍 Ubicación ▼]        │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 🔴 URGENTE  │ │             │ │             │           │
│  │             │ │             │ │             │           │
│  │ Ing. Eléct. │ │ Contador    │ │ Técnico     │           │
│  │             │ │             │ │             │           │
│  │ Tacna       │ │ Puno        │ │ Arequipa    │           │
│  │ S/3,500-5k  │ │ S/2,500-3k  │ │ S/2,000-2.5k│           │
│  │             │ │             │ │             │           │
│  │ [POSTULAR]  │ │ [POSTULAR]  │ │ [POSTULAR]  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                          │
                          ▼ Click en POSTULAR

┌─────────────────────────────────────────────────────────────┐
│              FORMULARIO DE POSTULACIÓN                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paso 1 de 3: Datos Personales                             │
│  ════════════════════════════════                          │
│                                                             │
│  Nombre Completo *    [________________________]           │
│  DNI *                [____________]                       │
│  Email *              [________________________]           │
│  Teléfono *           [____________]                       │
│  LinkedIn             [________________________]           │
│                                                             │
│                              [Siguiente →]                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paso 2 de 3: Documentos                                   │
│  ════════════════════════════════                          │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │                                             │           │
│  │     📄 Arrastra tu CV aquí                  │           │
│  │        o haz clic para seleccionar          │           │
│  │                                             │           │
│  │     Formatos: PDF, DOC, DOCX (max 5MB)     │           │
│  │                                             │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  Carta de Presentación (opcional)                          │
│  ┌─────────────────────────────────────────────┐           │
│  │                                             │           │
│  │                                             │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│              [← Anterior]    [Siguiente →]                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paso 3 de 3: Confirmación                                 │
│  ════════════════════════════════                          │
│                                                             │
│  Pretensión Salarial   [S/ ________]                       │
│  Disponibilidad        [Inmediata ▼]                       │
│                                                             │
│  ☑ Acepto los términos y condiciones                       │
│  ☑ Autorizo el tratamiento de mis datos personales         │
│                                                             │
│              [← Anterior]    [✓ ENVIAR POSTULACIÓN]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Integración con Facebook

Mostrar las últimas 6 publicaciones de la página de Facebook de la empresa:

```typescript
interface FacebookPost {
  id: string;
  message: string;
  full_picture?: string;
  created_time: string;
  permalink_url: string;
  likes_count: number;
  comments_count: number;
}
```

### 4. Dashboard de Trabajo (Link Externo)

El sitio incluirá un botón/enlace visible para acceder al área de trabajo interna:

**URL**: https://canazachyub.github.io/Telcomdashboard

Este enlace debe estar:
- En el Navbar (solo visible con autenticación o para empleados)
- En el Footer
- Como acceso rápido para personal autorizado

---

## 🔗 Integraciones

### 1. Google Sheets (Base de Datos)

**URL del Sheet**: 
```
https://docs.google.com/spreadsheets/d/15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA/edit?gid=0#gid=0
```

#### Estructura de Hojas Requeridas

**Hoja: `convocatorias`**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | string | ID único |
| titulo | string | Título del puesto |
| categoria | string | Categoría del trabajo |
| descripcion | string | Descripción completa |
| requisitos | string | Lista separada por `|` |
| beneficios | string | Lista separada por `|` |
| ubicacion | string | Ciudad/Región |
| modalidad | string | presencial/remoto/hibrido |
| salario_min | number | Salario mínimo |
| salario_max | number | Salario máximo |
| estado | string | activo/pausado/cerrado |
| prioridad | string | normal/urgente |
| fecha_publicacion | date | Fecha de publicación |
| fecha_cierre | date | Fecha límite |

**Hoja: `postulaciones`**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | string | ID único |
| convocatoria_id | string | FK a convocatorias |
| nombre_completo | string | Nombre del postulante |
| dni | string | DNI |
| email | string | Correo electrónico |
| telefono | string | Teléfono |
| linkedin | string | URL LinkedIn |
| cv_url | string | URL del CV en Drive |
| cv_nombre | string | Nombre del archivo |
| carta_presentacion | string | Texto opcional |
| pretension_salarial | number | Salario esperado |
| disponibilidad | string | Disponibilidad |
| fecha_postulacion | datetime | Timestamp |
| estado | string | Estado de la postulación |

**Hoja: `contactos`**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | string | ID único |
| nombre | string | Nombre |
| email | string | Correo |
| mensaje | string | Mensaje |
| fecha | datetime | Timestamp |
| estado | string | pendiente/respondido |

### 2. Google Drive (Almacenamiento de CVs)

**Carpeta de Drive**:
```
https://drive.google.com/drive/folders/1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV?usp=sharing
```

**ID de la Carpeta**: `1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV`

#### Estructura de Carpetas en Drive

```
📁 Bolsa_de_Trabajo_CVs/
├── 📁 2025/
│   ├── 📁 01_Enero/
│   │   ├── 📁 Ingeniero_Electrico/
│   │   ├── 📁 Contador/
│   │   └── 📁 Tecnico/
│   ├── 📁 02_Febrero/
│   └── ...
└── 📁 Otros/
```

### 3. Google Apps Script (Backend API)

Crear un Web App de Google Apps Script que maneje:

#### Endpoints Requeridos

```javascript
// GET /api/jobs - Obtener convocatorias activas
// GET /api/jobs/:id - Obtener detalle de convocatoria
// POST /api/jobs/apply - Enviar postulación
// POST /api/contact - Enviar mensaje de contacto
// POST /api/upload - Subir archivo a Drive
```

#### Código Base para Apps Script

```javascript
// Code.gs - Google Apps Script

const SHEET_ID = '15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA';
const DRIVE_FOLDER_ID = '1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV';
const NOTIFICATION_EMAIL = 'energysupervision13@gmail.com';

function doGet(e) {
  const action = e.parameter.action;
  
  switch(action) {
    case 'getJobs':
      return getActiveJobs();
    case 'getJob':
      return getJobById(e.parameter.id);
    default:
      return jsonResponse({ error: 'Invalid action' }, 400);
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const data = JSON.parse(e.postData.contents);
  
  switch(action) {
    case 'apply':
      return submitApplication(data);
    case 'contact':
      return submitContact(data);
    case 'upload':
      return uploadFile(data);
    default:
      return jsonResponse({ error: 'Invalid action' }, 400);
  }
}

function getActiveJobs() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('convocatorias');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const jobs = data.slice(1)
    .filter(row => row[10] === 'activo') // estado column
    .map(row => {
      const job = {};
      headers.forEach((header, i) => job[header] = row[i]);
      return job;
    });
  
  return jsonResponse({ success: true, data: jobs });
}

function submitApplication(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('postulaciones');
  
  const row = [
    Utilities.getUuid(),
    data.jobId,
    data.fullName,
    data.dni,
    data.email,
    data.phone,
    data.linkedIn || '',
    data.cvUrl,
    data.cvFileName,
    data.coverLetter || '',
    data.expectedSalary || '',
    data.availability,
    new Date(),
    'pendiente'
  ];
  
  sheet.appendRow(row);
  
  // Enviar notificación por email
  sendNotificationEmail(data);
  
  return jsonResponse({ success: true, message: 'Postulación enviada correctamente' });
}

function uploadFile(data) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(data.fileContent),
    data.mimeType,
    data.fileName
  );
  
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return jsonResponse({
    success: true,
    fileUrl: file.getUrl(),
    fileId: file.getId()
  });
}

function jsonResponse(data, code = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail(data) {
  const subject = `Nueva Postulación: ${data.jobTitle}`;
  const body = `
    Se ha recibido una nueva postulación:
    
    Puesto: ${data.jobTitle}
    Nombre: ${data.fullName}
    Email: ${data.email}
    Teléfono: ${data.phone}
    CV: ${data.cvUrl}
    
    Fecha: ${new Date().toLocaleString('es-PE')}
  `;
  
  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
}
```

### 4. Facebook Graph API

Para mostrar las publicaciones de Facebook:

```typescript
// src/api/facebookApi.ts

const FB_PAGE_ID = '61586657451703';
const FB_ACCESS_TOKEN = process.env.VITE_FB_ACCESS_TOKEN;

export async function getFacebookPosts(limit: number = 6) {
  const fields = 'id,message,full_picture,created_time,permalink_url,likes.summary(true),comments.summary(true)';
  const url = `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts?fields=${fields}&limit=${limit}&access_token=${FB_ACCESS_TOKEN}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.data.map(post => ({
    id: post.id,
    message: post.message,
    image: post.full_picture,
    createdAt: new Date(post.created_time),
    url: post.permalink_url,
    likes: post.likes?.summary?.total_count || 0,
    comments: post.comments?.summary?.total_count || 0,
  }));
}
```

**Nota**: Se necesita generar un Page Access Token desde Facebook Developer Console.

---

## 📡 APIs y Endpoints

### Variables de Entorno

```env
# .env.example

# Google Apps Script Web App URL
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec

# Google Sheets ID
VITE_SHEETS_ID=15ajUr5KqGgs99bsCcp9LnxRaD9mbIWjZArLetk7v4hA

# Google Drive Folder ID
VITE_DRIVE_FOLDER_ID=1B2CPcrNxUJtJcu7x8rXs_7_m9m2p9zAV

# Facebook
VITE_FB_PAGE_ID=61586657451703
VITE_FB_ACCESS_TOKEN=your_facebook_page_access_token

# Contact
VITE_CONTACT_EMAIL=energysupervision13@gmail.com

# Dashboard URL
VITE_DASHBOARD_URL=https://canazachyub.github.io/Telcomdashboard
```

### Cliente API TypeScript

```typescript
// src/api/appScriptApi.ts

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class AppScriptApi {
  private async request<T>(
    action: string,
    method: 'GET' | 'POST' = 'GET',
    data?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (method === 'POST' && data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url.toString(), options);
    return response.json();
  }
  
  // Convocatorias
  async getJobs() {
    return this.request<JobPosting[]>('getJobs');
  }
  
  async getJobById(id: string) {
    const url = new URL(API_URL);
    url.searchParams.set('action', 'getJob');
    url.searchParams.set('id', id);
    return this.request<JobPosting>('getJob');
  }
  
  // Postulaciones
  async submitApplication(application: JobApplication) {
    return this.request<{ id: string }>('apply', 'POST', application);
  }
  
  // Contacto
  async submitContact(contact: ContactForm) {
    return this.request<{ id: string }>('contact', 'POST', contact);
  }
  
  // Upload
  async uploadFile(file: File): Promise<{ fileUrl: string; fileId: string }> {
    const base64 = await this.fileToBase64(file);
    return this.request('upload', 'POST', {
      fileName: file.name,
      mimeType: file.type,
      fileContent: base64,
    });
  }
  
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  }
}

export const api = new AppScriptApi();
```

---

## 🚀 Instrucciones de Implementación

### Para Claude Code - Paso a Paso

#### Fase 1: Configuración Inicial

```bash
# 1. Crear el proyecto con Vite + React + TypeScript
npm create vite@latest ingenieria-telcom -- --template react-ts
cd ingenieria-telcom

# 2. Instalar dependencias principales
npm install react-router-dom @tanstack/react-query axios framer-motion react-hook-form zod @hookform/resolvers react-icons swiper react-intersection-observer date-fns

# 3. Instalar TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Instalar dependencias de desarrollo
npm install -D @types/node
```

#### Fase 2: Configuración de TailwindCSS

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0a1628',
        },
        accent: {
          electric: '#00d4ff',
          energy: '#fbbf24',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff' },
          '100%': { boxShadow: '0 0 20px #00d4ff, 0 0 30px #00d4ff' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

#### Fase 3: Estructura de Archivos

Crear toda la estructura de carpetas y archivos según el árbol definido arriba.

#### Fase 4: Componentes Clave

**PRIORIDAD ALTA** - Implementar en este orden:

1. `Layout.tsx` - Estructura base
2. `Navbar.tsx` - Navegación con menú móvil
3. `HeroSection.tsx` - Hero con carrusel de GIFs
4. `ServicesSection.tsx` - Servicios
5. `JobsSection.tsx` - Bolsa de trabajo
6. `ApplicationForm.tsx` - Formulario de postulación
7. `ContactSection.tsx` - Formulario de contacto
8. `Footer.tsx` - Pie de página

#### Fase 5: Integraciones API

1. Configurar Google Apps Script y desplegar como Web App
2. Configurar las hojas en Google Sheets
3. Obtener Facebook Page Access Token
4. Probar todos los endpoints

#### Fase 6: Testing y Optimización

1. Probar en dispositivos móviles
2. Verificar formularios y subida de archivos
3. Optimizar imágenes y GIFs
4. Verificar SEO básico

---

## 📦 Despliegue

### GitHub Pages

```bash
# 1. Instalar gh-pages
npm install -D gh-pages

# 2. Agregar scripts en package.json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}

# 3. Configurar vite.config.ts para GitHub Pages
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Para dominio personalizado
})

# 4. Crear archivo CNAME en public/
echo "ingeneriatelcom.com" > public/CNAME

# 5. Desplegar
npm run deploy
```

### Configuración del Repositorio GitHub

1. Ir a **Settings** → **Pages**
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `/ (root)`
4. Custom domain: `ingeneriatelcom.com`
5. Enforce HTTPS: ✅

---

## 🌐 Configuración del Dominio

### DNS Records para `ingeneriatelcom.com`

```
Tipo    Nombre    Valor
─────────────────────────────────────────
A       @         185.199.108.153
A       @         185.199.109.153
A       @         185.199.110.153
A       @         185.199.111.153
CNAME   www       canazachyub.github.io
```

### Archivo CNAME

```
ingeneriatelcom.com
```

---

## 📝 Notas Adicionales

### GIFs Recomendados para Hero

Buscar GIFs de alta calidad (1920x1080 mínimo) de:
- Torres de telecomunicaciones con trabajadores
- Chispas eléctricas y rayos
- Instalación de cables de fibra óptica
- Paneles eléctricos industriales
- Equipos de medición eléctrica

**Fuentes recomendadas**:
- Giphy (versión HD)
- Pexels (videos convertidos a GIF)
- Unsplash (animaciones)

### SEO Básico

```html
<!-- index.html -->
<head>
  <title>Ingeniería Telcom EIRL | Telecomunicaciones y Servicios Eléctricos en Perú</title>
  <meta name="description" content="Empresa líder en telecomunicaciones y servicios eléctricos en Perú. Supervisión, análisis y gestión de proyectos eléctricos. Bolsa de trabajo disponible.">
  <meta name="keywords" content="telecomunicaciones, servicios eléctricos, Perú, ingeniería, Tacna, Puno, electricidad">
  <meta property="og:title" content="Ingeniería Telcom EIRL">
  <meta property="og:description" content="Conectando Perú con Excelencia">
  <meta property="og:image" content="/assets/images/og-image.jpg">
  <meta property="og:url" content="https://ingeneriatelcom.com">
</head>
```

---

## 📞 Contacto del Proyecto

| Recurso | URL/Valor |
|---------|-----------|
| Sitio Web | https://ingeneriatelcom.com |
| Dashboard | https://canazachyub.github.io/Telcomdashboard |
| Facebook | https://www.facebook.com/profile.php?id=61586657451703 |
| Email | energysupervision13@gmail.com |
| Teléfono | +51 946 728 495 |

---

## 📄 Licencia

© 2025 Ingeniería Telcom EIRL. Todos los derechos reservados.

---

**Desarrollado con ⚡ por el equipo de Ingeniería Telcom EIRL**