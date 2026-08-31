# PLAN — Blindaje del subsistema de asistencia

> Enfoque B aprobado el 31/08/2026. Fase 1 cerrada.
> Ventana de trabajo: madrugada del lunes 31/08, ~6.5 h antes del ingreso de las 07:30.

---

## Objetivo

La app de asistencias **funciona**. Este plan no corrige una avería: elimina los tres riesgos que la degradan con el tiempo o la bloquean ante un imprevisto, y destraba el pipeline que lleva 5 días sin publicar.

El criterio que ordena todo: **una marca de asistencia nunca debe perderse, y su coste no debe crecer con el histórico.**

---

## Diagnóstico

### R1 — El anti-duplicado barre la hoja entera dentro del lock (CRÍTICO)

`registrarAsistenciaFoto` hace `getDataRange().getValues()` sobre toda la hoja `asistencias_v2`, **dentro del lock global**, en cada marca ([backend/07_asistencia.gs:487](backend/07_asistencia.gs#L487)).

La hoja crece ~1,100 filas/mes (12 de oficina × 4 eventos × ~22 días, más los de campo). Operando desde el 02/07, hoy rondará las 2,000 filas; en un año, ~15,000.

A las 07:30 marcan doce personas en pocos minutos, **en fila por ese mismo lock**. El tiempo que cada marca lo retiene crece linealmente con el histórico. Los errores de *"Sistema ocupado"* del 12–13/08 volverán solos, y cada mes un poco antes.

### R2 — La foto se sube antes del anti-duplicado

La subida a Drive ocurre antes de comprobar el duplicado. Cada intento repetido deja un archivo huérfano. Sumado a los 3 reintentos del kiosko, un duplicado genera **3 fotos basura** y consume cuota de Drive en plena ráfaga.

### R3 — El GPS es un bloqueo duro sin salida

`handleRegistrar` corta si `location` es null ([src/pages/AsistenciaPage.tsx:229](src/pages/AsistenciaPage.tsx#L229)). GPS apagado, sin señal dentro del local o permiso denegado = **el trabajador no puede marcar**. Además el mensaje se pinta sin cambiar de vista, así que puede ni verse.

### R4 — El reintento convierte un duplicado legítimo en éxito falso

La conversión de *"Ya registraste este evento hoy"* a éxito vive dentro del bucle y no cubre la primera respuesta. Quien ya marcó y reintenta recibe "registrado" en vez del aviso correcto — y de paso dispara los reintentos de R2.

### R5 — Pages lleva 5 días sin publicar

`status: errored`. Los builds del 26/08 quedaron en `failure` y `cancelled` durante la caída de Actions y nadie los relanzó. El bundle correcto espera en `gh-pages` sin servirse.

### R6 — Sincronización de incidencias fila por fila

`sincronizarIncidencias` hace `appendRow` por incidencia. Lento y consume cuota en el cierre de mes.

---

## Pasos

El orden no es negociable: **el deploy va primero**. Corregir el kiosko sin pipeline es repetir lo de estos 5 días.

### Paso 1 — Destrabar el pipeline (R5)

Relanzar el build de Pages ahora que Actions está operativo y verificar que el dominio sirve el bundle nuevo.

- **Archivos:** ninguno (operación sobre GitHub).
- **Aceptación:** `ingeneriatelcom.com` sirve `index-CU_X5kbU.js`; `gh api .../pages` reporta `status: built`.

### Paso 2 — Anti-duplicado de coste constante (R1)

Sustituir el barrido completo por dos capas:

1. **Índice del día en `CacheService`** (`asis:<fecha>` → claves `dni|evento`). Vía rápida: acierto = rechazo inmediato sin tocar la hoja.
2. **Lectura acotada al tramo final** cuando el caché no responde. Las filas se añaden en orden cronológico, así que las de hoy están siempre al final. Se lee un margen holgado y se amplía solo si el tramo leído no alcanza a cubrir la fecha buscada — nunca se da por bueno un tramo insuficiente.

La escritura sigue dentro del lock; lo que sale del lock es el barrido.

- **Archivos:** `backend/07_asistencia.gs`, `backend/00_nucleo.gs`.
- **Aceptación:** una marca no lee más de un tramo acotado; el duplicado se sigue rechazando; el lock se retiene por debajo de 1 s con la hoja actual.

### Paso 3 — Foto después del duplicado (R2)

Pre-chequeo barato de duplicado **antes** de subir a Drive y fuera del lock. La verificación autoritativa se mantiene dentro del lock, y la subida sigue fuera de él.

Un duplicado deja de subir foto. En una carrera entre dos marcas simultáneas del mismo evento puede quedar una huérfana; es el caso raro y aceptable frente a retener el lock durante la subida.

- **Archivos:** `backend/07_asistencia.gs`.
- **Aceptación:** un intento duplicado responde sin crear archivo en Drive.

### Paso 4 — ~~GPS degradable~~ → **GPS obligatorio reforzado** (R3)

> **Decisión del dueño, 31/08/2026:** se propuso volver el GPS degradable y **se rechazó**. Una marca sin ubicación no es evidencia válida de presencia. Revertido.

En su lugar se refuerza la obligatoriedad **en las dos capas**: el kiosko sigue exigiendo ubicación (con mejor mensaje y botón de reintento), y el backend **rechaza** una marca sin coordenadas. Antes la regla vivía solo en el cliente y `registrarAsistenciaFoto` es una action pública.

La válvula de escape cuando el GPS falla es *Registrar manual* desde el panel, que exige observación y deja constancia de quién autorizó.

- **Archivos:** `src/pages/AsistenciaPage.tsx`, `src/pages/admin/AttendancePage.tsx`, `backend/07_asistencia.gs`.
- **Aceptación:** sin ubicación no se puede marcar ni desde el kiosko ni llamando la API directamente.

### Paso 5 — Reintento honesto (R4)

Un duplicado en la **primera** respuesta se muestra como tal. Solo se interpreta como éxito cuando llega tras un reintento, que es el caso para el que se diseñó: el servidor escribió pero la respuesta se perdió.

- **Archivos:** `src/pages/AsistenciaPage.tsx`.
- **Aceptación:** marcar dos veces el mismo evento muestra "ya registraste"; una respuesta perdida seguida de reintento sigue mostrando éxito.

### Paso 6 — Incidencias por lotes (R6)

Acumular las filas y escribirlas de una vez en lugar de `appendRow` por incidencia.

- **Archivos:** `backend/08_planilla.gs`.
- **Aceptación:** sincronizar un mes completo produce las mismas incidencias que antes, con una sola escritura por bloque.

### Paso 7 — Cobertura en el test de salud

Añadir comprobaciones de lo introducido: caché de duplicados operativo y tamaño de `asistencias_v2` con aviso al superar un umbral.

- **Archivos:** `backend/11_salud.gs`.
- **Aceptación:** `ejecutarTestSalud` en **0 FAIL**.

### Paso 8 — Test de funcionamiento

Verificación contra producción, sin escribir en la hoja:

1. Roster y kiosko responden con el contenido esperado.
2. Trabajador activo supera la validación de roster (se corta a propósito en el mimetype).
3. Cesado y DNI inventado son rechazados.
4. Un duplicado se rechaza **sin** dejar foto en Drive.
5. Ráfaga concurrente de lecturas de `getTrabajadores`, como la prueba del 12/08.

---

## Fuera de alcance

- **Partir `AttendancePage.tsx`** (851 líneas). Es mantenibilidad, no robustez, y mezclarla con cambios de concurrencia impediría aislar la causa si la prueba de ráfaga falla. Queda como trabajo propio.
- **Corrección de datos** (las 4 faltas de Marcela del 20 al 25). Decisión del usuario: lo hace desde el panel.
- **`TOKEN_SECRET` por debajo de 32 caracteres.** No se puede tocar desde aquí; queda como paso manual documentado.
- **Correo duplicado** entre Marroquín y Vargas Pinto. Pendiente de decisión del usuario.

---

## Criterios de cierre

- [ ] `ingeneriatelcom.com` sirve el bundle nuevo
- [ ] `npm run build:backend` y `tsc --noEmit` sin errores
- [ ] `ejecutarTestSalud` en 0 FAIL
- [ ] Marca legítima aceptada; duplicado, cesado y DNI inventado rechazados
- [ ] Un duplicado no genera archivo en Drive
- [ ] Sin GPS **no** se puede marcar, ni desde el kiosko ni por API
- [ ] Ráfaga concurrente sin "Sistema ocupado"

---

© 2026 Ingeniería Telcom EIRL — Plan de trabajo interno.
