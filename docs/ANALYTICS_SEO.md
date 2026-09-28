# Google Analytics, robots.txt y sitemap

Estado al 28/09/2026. Qué hay, cómo se activa y qué revisar si algo deja de medir.

---

## 1. Piezas

| Archivo | Qué hace |
|---|---|
| `public/robots.txt` | Deja indexar las páginas públicas y bloquea las internas: `/admin`, `/asistencia`, `/evaluacion/`, `/mi-postulacion`. Apunta al sitemap. |
| `public/sitemap.xml` | Lista de páginas públicas: `/`, `/bolsa-trabajo`, `/capacitaciones`, `/terminos`, `/privacidad`. |
| `src/utils/analytics.ts` | Carga Google Analytics 4 (gtag.js) y envía vistas y eventos. |
| `src/App.tsx` → `AnalyticsRutas` | Envía una vista en cada cambio de ruta. |
| `.env` → `VITE_GA_ID` | ID de medición de GA4 (`G-XXXXXXXXXX`). Vacío = no se carga nada. |
| `src/pages/PrivacyPage.tsx` §9 | Aviso de cookies y analítica (Ley N.° 29733). |
| `index.html` | JSON-LD de Organización y WebSite, y metadatos Open Graph (imagen, idioma, nombre del sitio). |

`robots.txt` y `sitemap.xml` están en `public/`, así que `npm run build` los copia a `dist/` y
`npm run deploy` los publica en la raíz del dominio.

---

## 2. Cómo funciona la analítica

- **Solo en producción.** En `npm run dev` no se carga, así las pruebas no ensucian los datos.
- **Carga diferida.** El script de Google se inyecta en la primera vista pública; no está en
  `index.html`.
- **Web de una sola página (SPA).** React Router cambia de página sin recargar el navegador.
  Las vistas las cuenta la **Medición mejorada** del flujo GA4 "TELCOM" (cambios de página según
  el historial del navegador). El código **no** envía `page_view` a mano, porque se contarían
  doble. Si alguien desactiva la medición mejorada, dejarán de contarse las navegaciones internas.
- **Pantallas excluidas** (`RUTAS_INTERNAS`): `/admin…`, `/asistencia`, `/evaluacion/…`.
  - Si la primera página abierta es una de ellas, el script de Google **ni se descarga**.
  - El kiosko de asistencia queda igual de liviano que antes (ver `docs/KIOSKO_ASISTENCIA.md`).

### Eventos

| Evento | Cuándo | Parámetros |
|---|---|---|
| `page_view` | Automático (medición mejorada) | — |
| `generate_lead` | Formulario de contacto enviado con éxito | `formulario: contacto` |
| `postulacion_enviada` | Postulación enviada con éxito | `puesto` (título de la oferta) |
| `clic_contacto` | Clic en un enlace de WhatsApp, `tel:` o `mailto:` | `canal: whatsapp / telefono / correo` |

**Nunca** enviar a GA datos personales (nombre, DNI, correo, teléfono): lo prohíben las
condiciones de Google y la Ley 29733. Para un evento nuevo, usar
`registrarEvento('nombre', { … })` desde `src/utils/analytics.ts`.

---

## 3. Activación (una sola vez)

1. En **analytics.google.com** → Administrar → Crear → **Propiedad**.
   - Nombre: "Ingeniería Telcom". Zona horaria: **Perú**. Moneda: PEN.
2. Crear un **flujo de datos Web**:
   - URL: `https://ingeneriatelcom.com`.
   - Dejar activada la "Medición mejorada".
   - Copiar el **ID de medición** (`G-…`).
3. Pegarlo en `.env`: `VITE_GA_ID=G-XXXXXXXXXX`. **Activo desde 28/09/2026: `G-TNNL6YFQZ9` (flujo "TELCOM").**
4. `npm run deploy` (fuera del horario de marcación).
5. Verificar: GA → Informes → **Tiempo real**. Abrir la web en el celular; en menos de un
   minuto debe aparecer 1 usuario.
6. Marcar como **eventos clave**: GA → Administrar → Eventos → activar la estrella en
   `generate_lead` y `postulacion_enviada`. Aparecen en la lista a las ~24 h del primer envío.

### Google Search Console (recomendado)

Es lo que usa `robots.txt` y `sitemap.xml`.

1. Entrar en **search.google.com/search-console** → Agregar propiedad → **Dominio** →
   `ingeneriatelcom.com`.
2. Verificar con el **registro TXT** que indica Google, en el DNS del proveedor del dominio.
   No se usa el método "Google Analytics": el script se carga después del HTML inicial y Google
   no siempre lo detecta.
3. Sitemaps → enviar `https://ingeneriatelcom.com/sitemap.xml`.
4. GA → Administrar → Vínculos de productos → **Search Console** → vincular. Así se ven las
   búsquedas de Google que traen visitas.

---

## 4. Mantenimiento

- **Página pública nueva:** agregarla a `sitemap.xml` (y actualizar `<lastmod>`).
- **Página interna nueva:** agregarla a `Disallow` en `robots.txt` y a `RUTAS_INTERNAS` en
  `analytics.ts`.
- **Cambiar el ID de GA:** solo `.env` + `npm run deploy`.
- **Desactivar la analítica:** dejar `VITE_GA_ID=` vacío + `npm run deploy`.

### Si GA no muestra datos

1. Abrir la web publicada → F12 → Consola. `window.dataLayer` debe existir y tener eventos
   `page_view`.
2. Pestaña Red → buscar `collect?v=2`. Si no aparece, un bloqueador de anuncios lo está
   bloqueando (es normal en algunos navegadores).
3. Si `dataLayer` no existe:
   - Confirmar que `.env` tenía `VITE_GA_ID` **al momento del build**.
   - Las variables `VITE_` se incrustan al compilar: cambiar `.env` exige volver a desplegar.

Prueba hecha el 28/09/2026 con un build de producción y un ID de prueba:

| Qué se probó | Resultado |
|---|---|
| Vista de `/` | ✔ `page_view` |
| Navegación a `/bolsa-trabajo` | ✔ `page_view` (vía React Router) |
| `/asistencia` | ✔ sin script de Google ni `dataLayer` |
