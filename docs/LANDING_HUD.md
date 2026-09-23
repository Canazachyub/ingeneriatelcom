# Landing — estética "consola de mando" (sept. 2026)

| Pieza | Archivo | Notas |
|---|---|---|
| Red eléctrica interactiva (canvas) | `src/components/effects/EnergyGrid.tsx` | Nodos + enlaces + pulsos; el cursor ilumina, atrae y dispara pulsos. Se pausa fuera de pantalla / pestaña oculta; con reduced-motion dibuja un cuadro estático. |
| Halo que sigue al cursor | `src/components/effects/CursorSpotlight.tsx` | Solo con mouse (`useFinePointer`). Montado en `HomePage`. |
| Esquinas tácticas | `src/components/effects/HudFrame.tsx` | Paneles de estadísticas del hero. |
| Tilt 3D + reflejo | `src/components/common/TiltCard.tsx` | Tarjetas de servicios. Inactivo en táctil. |
| Hero con parallax | `src/components/sections/HeroSection.tsx` | Capas: foto (−30 px), red (+14 px), torre (+55 px, solo con mouse), título inclinado 3D, HUD con coordenadas que siguen al mouse, radar y escaneo. |
| Galería 3D de operaciones | `src/components/sections/OperacionesSection.tsx` | El mouse inclina la hélice y hace de timón (derecha acelera, izquierda invierte). La foto del frente se resalta con retícula (`.galeria-tarjeta[data-activa]`) y su descripción aparece en la ficha "REG 05/12". Se escala en celular (mín. 0.62). |
| Íconos "Quiénes somos" | `src/components/common/IconoArea.tsx` | Íconos SVG de línea (monitor con código, torre de alta tensión, casco sobre relieve) que se dibujan una vez al entrar en pantalla. |
| Hero en móvil | `HeroSection.tsx` | Fondo vertical `HERO3M`, HUD compacto, botones a lo ancho, parallax por giroscopio (solo Android: iOS pide permiso) y un toque dispara una ráfaga en la red eléctrica. |
| Logo sin fondo blanco | `tools/logo-transparente.mjs` | Máscara elíptica: conserva el blanco DENTRO del óvalo, quita el de fuera. Navbar usa `logo-horizontal-transparente.webp` (55 KB, antes PNG de 1.6 MB); footer `logo-square-transparente.webp` (18 KB, antes 6.3 MB). |
| Estilos | `src/styles/globals.css` | `.btn-hud`, `.hud-scanline`, `.hud-radar`, `.hud-glitch`; todos respetan `prefers-reduced-motion`. |

## Imágenes generadas (Codex `image_gen`)

- `HERO3` — altiplano nocturno, torres con cables cian, Vía Láctea → `operaciones/HERO3.webp` (117 KB).
- `TORRE1` — torre de alta tensión con fondo transparente → `hero/hero-torre.webp` (323 KB, solo escritorio).
- `HERO3M` — versión vertical 9:16 para celular → `operaciones/HERO3M.webp` (155 KB).
- Íconos de "Quiénes somos": ya NO son imágenes. Son SVG de línea propios (`src/components/common/IconoArea.tsx`), más sobrios; los 3D holográficos se descartaron por verse "de videojuego".
- Originales PNG en `public/assets/images/fotos generadas/` (ignorados por git).

## Coherencia y navegación (rediseño de secciones)

- **Fuente única de datos**: `src/data/empresa.ts` → año de fundación (2017), años de experiencia
  (calculados), proyectos (27), clientes (15), y `SECCIONES` (orden de la página). Hero, Servicios y
  Quiénes somos leen de ahí; ya no hay cifras que se contradigan.
- **Encabezado común** `SectionHeader` en todas las secciones: `── 05 // RÓTULO ──` + título + subtítulo.
  El número sale de `SECCIONES`, igual que en el riel lateral.
- **Panel base** `.panel-hud` (vidrio oscuro, esquina cortada con filo cian) en lugar de tarjetas genéricas.
- **Navegación**: scroll-spy en el menú (`useSeccionActiva`; antes "Inicio" y "Contacto" salían activos
  a la vez), barra de progreso de lectura bajo el menú, riel lateral de secciones en escritorio
  (`SectionRail`, xl+) y botón "volver arriba".
- **Orden**: Inicio → Quiénes somos → Servicios → Operaciones → Clientes → Misión y visión → Código de
  ética → Organización → Bolsa de trabajo → Novedades (Facebook) → Contacto.
- **Robustez**: cada sección va envuelta en `SeccionSegura` (error boundary). Si una falla, se oculta sola
  y la página sigue. Motivo: una animación de framer-motion con keyframes de tipos mezclados
  (`'10%'` con `'calc(...)'`) dejaba TODA la landing en blanco al llegar al organigrama.
  Regla: en `animate={{ prop: [a, b, c] }}` todos los valores deben ser del mismo tipo/unidad.

## Pendiente fuera del código

- La página de Facebook muestra el teléfono +51 961 575 043; el sitio usa +51 946 728 495.
- Los logos de clientes se cargan desde sitios externos (gstatic, else.com.pe…): si esos sitios los
  cambian, se muestran las iniciales. Conviene tenerlos locales.

## Páginas internas (mismo estilo)

`PageHeader` (`src/components/common/PageHeader.tsx`) es la cabecera común de las páginas internas:
Bolsa de trabajo, detalle de oferta + postulación, Consultar postulación y Capacitaciones. Solo se
cambió la presentación; las llamadas `api.*`, los campos del formulario (`register`) y los handlers se
verificaron idénticos a la versión anterior. El kiosko `/asistencia` tiene marco de terminal en
escritorio (solo CSS, sin efectos de mouse).
