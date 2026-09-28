# Libro de Reclamaciones virtual

Estado al 28/09/2026. Cumple el Código de Protección y Defensa del Consumidor (Ley N.° 29571,
art. 150) y el Reglamento del Libro de Reclamaciones (D.S. N.° 011-2011-PCM, texto vigente
según D.S. N.° 101-2022-PCM).

## 1. Piezas

| Pieza | Dónde |
|---|---|
| Formulario público (Hoja de Reclamación) | `/libro-reclamaciones` → `src/pages/LibroReclamacionesPage.tsx` |
| Acceso visible en todas las páginas | Pie de página (placa "Libro de Reclamaciones" y barra legal) |
| Backend | `backend/14_reclamaciones.gs` (acciones `registrarReclamo`, `getReclamos`, `responderReclamo`) |
| Hoja de cálculo | `reclamaciones` (se crea sola con sus cabeceras al primer reclamo) |
| Panel | Comunicación → **Libro de Reclamaciones** (`/admin/reclamaciones`), módulo `mensajes` |

## 2. Qué exige la norma y cómo se cumple

| Exigencia | Implementación |
|---|---|
| Número correlativo de la hoja | `LR-AAAA-00001`, se reinicia cada año |
| Datos del proveedor (razón social, RUC, domicilio) | En el formulario, la constancia y la respuesta (`DATOS_PROVEEDOR_`) |
| Datos del consumidor; padre/madre si es menor de edad | Campos obligatorios; apoderado obligatorio si marca "menor de edad" |
| Bien contratado, monto, detalle y pedido | Campos de la hoja |
| Distinción reclamo / queja | Opciones con las definiciones legales |
| Leyenda sobre INDECOPI | En el formulario y en la constancia |
| Constancia inmediata al consumidor | Correo automático con la copia de la hoja (copia oculta a la empresa) |
| Respuesta en máx. **15 días hábiles improrrogables** | `fechaLimite` calculada (lun–vie, salta feriados de la hoja `feriados`); el panel marca "vence" / "vencido" |
| Conservar las hojas **2 años** como mínimo | No existe acción de borrado; no eliminar filas de la hoja `reclamaciones` |

## 3. Operación (panel)

1. Revisar el panel **Libro de Reclamaciones** al menos 2 veces por semana. El contador muestra
   los pendientes y los vencidos.
2. Abrir la hoja, escribir la respuesta (acciones adoptadas y solución) y pulsar
   **Registrar y enviar respuesta**: queda guardada y se envía al correo del consumidor.
3. Si aparece "la constancia no se pudo enviar", enviarla a mano desde el correo de la empresa.

## 4. Despliegue

Es backend nuevo: `npm run build:backend`, pegar `appscript.js` en el editor de Apps Script y
publicar **Nueva versión** de la misma implementación (no "Nueva implementación"). No pide
permisos nuevos (usa `MailApp` y `SpreadsheetApp`, ya autorizados).

Prueba local sin tocar producción: la lógica se probó con una hoja simulada (validaciones,
correlativo, plazo de 15 días hábiles, constancia, respuesta).

## 5. Pendiente fuera del sistema

- Exhibir en el local físico (Tacna) el aviso del Libro de Reclamaciones, si se atiende público.
- Registrarse en el portal de INDECOPI si la empresa entra en el ámbito de la plataforma
  "Libro de Reclamaciones Virtual" (según tamaño/actividad) — confirmar con asesoría legal.
