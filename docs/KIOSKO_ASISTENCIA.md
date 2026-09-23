# Kiosko de asistencia — mensajes al trabajador (sept. 2026)

> Estado: **implementado en local, pendiente de desplegar** (frontend con `npm run deploy`,
> backend pegando `appscript.js` en Apps Script). No desplegar cerca de las 07:30 (hora Lima).

## Problema

Los trabajadores veían "Error" aunque la marca **sí** se guardaba, volvían a marcar y
recibían "Ya registraste este evento hoy" en rojo. El origen:

1. El cliente API disparaba un toast rojo global ("El servidor tardó demasiado") en cada
   intento fallido, aunque el kiosko seguía reintentando y la marca terminaba guardada.
2. Un duplicado en la primera respuesta (evento ya guardado por un intento anterior) se
   mostraba como pantalla de error con "Intentar de nuevo".
3. Sin lista de trabajadores en el teléfono y con el servidor saturado, el DNI terminaba en
   "No se pudo cargar la lista de trabajadores".

## Flujo actual (no romper)

| Respuesta del servidor | Vista | Qué ve el trabajador |
|---|---|---|
| `success` | `success` | Registro confirmado con la hora del servidor |
| `codigo: 'YA_REGISTRADO'` en el 1er intento | `ya_registrado` (verde) | "Ya estás registrado… a las 7:28 am. No necesitas volver a marcar." |
| `YA_REGISTRADO` en un reintento | `success` | El intento anterior sí se guardó |
| Sin respuesta tras 3 intentos (`transporte: true`, "ocupado", "guardar la foto") | `sin_confirmar` (ámbar) | "Falta confirmar tu registro" + botón **Comprobar registro** (reenvía la misma foto) |
| Rechazo de negocio (DNI no habilitado, sin GPS…) | `error` | Mensaje del servidor, sin reintentos |
| DNI digitado sin lista local y el servidor no responde | `conectando` | Reintenta solo cada 3 s y sigue con el DNI al conectar |

## Piezas que sostienen este flujo

- `src/pages/AsistenciaPage.tsx` — `esYaRegistrado`, `esFalloPasajero`, `formatearHora`,
  vistas `ya_registrado` / `sin_confirmar` / `conectando`, texto de progreso `progreso`.
- `src/api/appScriptApi.ts` — `ApiResponse.codigo` y `ApiResponse.transporte` (se pone en
  `true` cuando no hubo respuesta JSON válida: timeout, red caída o HTML de Apps Script).
- `src/App.tsx` — `ACCIONES_SIN_TOAST`: el kiosko (`registrarAsistenciaFoto`,
  `getTrabajadores`, `subirJustificacion`) **no** muestra toasts globales; la pantalla ya
  explica cada caso.
- `backend/07_asistencia.gs` — `respuestaYaRegistrado_()` devuelve
  `{ success:false, codigo:'YA_REGISTRADO', error:'Ya registraste este evento hoy', data:{hora} }`.
  El texto de `error` se mantiene por compatibilidad. `existeMarcaEnHoja_` devuelve la hora de
  la marca encontrada (truthy) y el índice del día en CacheService guarda la hora.

## Reglas para cambios futuros

- No volver a mostrar un duplicado como error: para el trabajador, "ya registrado" es un éxito.
- No reintentar rechazos de negocio; solo fallos pasajeros.
- Cualquier acción pública nueva del kiosko va en `ACCIONES_SIN_TOAST`.
- Los eventos de campo (`ingreso_campo` / `salida_campo`) permiten varias marcas al día, por eso
  "Comprobar registro" en campo **sí** puede duplicar; el texto de la vista lo refleja.
- Probar con fetch simulado en el navegador; el `.env` local apunta al backend de producción y
  una marca de prueba real queda en la hoja.

## Convivencia con la landing (efectos HUD, sept. 2026)

Los efectos de la landing (`src/components/effects/*`, `TiltCard`, `useFinePointer`,
estilos `.hud-*` / `.btn-hud` en `globals.css`) **solo se montan en `HomePage` y
`ServicesSection`**. El kiosko (`/asistencia`) no importa ninguno: no hay canvas, halo del
cursor ni listeners de mouse en los teléfonos de los trabajadores. Mantenerlo así.
