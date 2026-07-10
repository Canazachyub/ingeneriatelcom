import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FaHandPointer } from 'react-icons/fa'

// ─── Galería helicoidal 3D "Nuestras Operaciones" ────────────────────────────
// Tarjetas con fotos reales de campo girando en una hélice 3D arrastrable,
// al estilo claude.com/product/claude-science. Es CSS 3D puro (translate3d +
// rotateY + blur de profundidad) animado con requestAnimationFrame mutando
// los transforms por ref — sin three.js y sin re-renders de React por frame.
// Con prefers-reduced-motion se muestra una cuadrícula estática.

const FOTOS = [
  { src: '/assets/images/operaciones/H1.webp', alt: 'Liniero trabajando en torre de media tensión en el altiplano' },
  { src: '/assets/images/operaciones/H2.webp', alt: 'Cuadrilla izando poste eléctrico en zona rural andina' },
  { src: '/assets/images/operaciones/H3.webp', alt: 'Técnico midiendo con multímetro en subestación eléctrica' },
  { src: '/assets/images/operaciones/H4.webp', alt: 'Técnico escalando torre de telecomunicaciones al atardecer' },
  { src: '/assets/images/operaciones/H5.webp', alt: 'Ingeniera revisando planos técnicos en campo' },
  { src: '/assets/images/operaciones/H6.webp', alt: 'Empalme de fibra óptica con fusionadora en campo' },
  { src: '/assets/images/operaciones/H7.webp', alt: 'Camioneta de cuadrilla en ruta del altiplano junto a líneas de transmisión' },
  { src: '/assets/images/operaciones/H8.webp', alt: 'Supervisor revisando checklist con operario en tablero eléctrico' },
  { src: '/assets/images/operaciones/H9.webp', alt: 'Manos conectando cableado en tablero de control industrial' },
  { src: '/assets/images/operaciones/H10.webp', alt: 'Vista aérea de línea de transmisión cruzando el altiplano al amanecer' },
  { src: '/assets/images/operaciones/H11.webp', alt: 'Charla de seguridad matutina de la cuadrilla en campo' },
  { src: '/assets/images/operaciones/H12.webp', alt: 'Mantenimiento eléctrico nocturno con luces de trabajo' },
]

const RADIO = 430            // radio del cilindro (px)
const PASO_Y = 52            // separación vertical entre tarjetas de una hebra (px)
const VELOCIDAD_AUTO = 0.08  // grados por frame en reposo
const CARD_W = 280
const CARD_H = 180

// Doble hélice (forma de ADN): cada foto aparece en las DOS hebras,
// desfasadas 180°. La altura de cada tarjeta es FIJA (según su índice);
// el drag solo cambia el ángulo de giro — por eso la rotación es continua,
// sin saltos al completar una vuelta.
const TARJETAS = [0, 180].flatMap((fase) =>
  FOTOS.map((foto, i) => ({ foto, indice: i, fase }))
)

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function GaleriaHelicoidal() {
  const contRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const rotacion = useRef(0)
  const velocidad = useRef(VELOCIDAD_AUTO)
  const arrastrando = useRef(false)
  const ultimoX = useRef(0)
  const rafId = useRef(0)
  const { ref: inViewRef, inView } = useInView({ threshold: 0.15 })

  useEffect(() => {
    if (!inView) return

    const pasoAngular = 360 / FOTOS.length // 30° por tarjeta de cada hebra

    const pintar = () => {
      // Inercia: al soltar el drag la velocidad decae suavemente hacia el auto-giro
      if (!arrastrando.current) {
        rotacion.current += velocidad.current
        velocidad.current += (VELOCIDAD_AUTO - velocidad.current) * 0.04
      }

      TARJETAS.forEach((t, k) => {
        const el = itemRefs.current[k]
        if (!el) return
        const angulo = rotacion.current + t.indice * pasoAngular + t.fase
        const rad = (angulo * Math.PI) / 180
        const x = RADIO * Math.sin(rad)
        const z = RADIO * Math.cos(rad) - RADIO           // frente = 0, fondo = -2R
        // Altura FIJA por índice: la hebra es una escalera en espiral estable
        const y = (t.indice - (FOTOS.length - 1) / 2) * PASO_Y
        const profundidad = (1 - Math.cos(rad)) / 2       // 0 al frente, 1 al fondo
        el.style.transform =
          `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
          `rotateY(${(angulo % 360).toFixed(2)}deg) scale(${(1 - profundidad * 0.3).toFixed(3)})`
        el.style.filter = profundidad > 0.15 ? `blur(${(profundidad * 4).toFixed(1)}px)` : 'none'
        // La hebra trasera se ve atenuada ENTRE las tarjetas del frente (look ADN)
        el.style.opacity = String(1 - profundidad * 0.62)
        el.style.zIndex = String(Math.round((1 - profundidad) * 100))
      })

      rafId.current = requestAnimationFrame(pintar)
    }

    rafId.current = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(rafId.current)
  }, [inView])

  // Drag con pointer events (mouse y táctil)
  const onPointerDown = (e: React.PointerEvent) => {
    arrastrando.current = true
    ultimoX.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!arrastrando.current) return
    const delta = e.clientX - ultimoX.current
    ultimoX.current = e.clientX
    rotacion.current += delta * 0.28
    velocidad.current = delta * 0.28 * 0.55 // inercia al soltar
  }
  const soltar = () => {
    arrastrando.current = false
  }

  return (
    <div
      ref={(el) => {
        contRef.current = el
        inViewRef(el)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onPointerCancel={soltar}
      className="relative mx-auto select-none cursor-grab active:cursor-grabbing touch-pan-y"
      style={{ height: 720, maxWidth: 1100, perspective: '1400px' }}
      role="region"
      aria-label="Galería 3D de operaciones — arrastra horizontalmente para girar"
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {TARJETAS.map((t, k) => (
          <div
            key={`${t.foto.src}-${t.fase}`}
            ref={(el) => { itemRefs.current[k] = el }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: CARD_W, height: CARD_H }}
          >
            <div className="w-full h-full rounded-2xl overflow-hidden border border-primary-700/60 shadow-2xl shadow-black/50 bg-primary-900">
              <img
                src={t.foto.src}
                alt={t.fase === 0 ? t.foto.alt : ''}
                aria-hidden={t.fase !== 0}
                loading="lazy"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Degradados para que la hélice "emerja" de la oscuridad por los 4 bordes */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-primary-950 to-transparent z-[110]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-primary-950 to-transparent z-[110]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary-950 to-transparent z-[110]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-primary-950 to-transparent z-[110]" />
    </div>
  )
}

// Versión estática accesible (prefers-reduced-motion) — cuadrícula simple
function GaleriaEstatica() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
      {FOTOS.slice(0, 6).map((foto) => (
        <div key={foto.src} className="rounded-2xl overflow-hidden border border-primary-700/60 aspect-[3/2]">
          <img src={foto.src} alt={foto.alt} loading="lazy" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}

export default function OperacionesSection() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <section id="operaciones" className="relative py-24 bg-primary-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-accent-electric bg-accent-electric/10 border border-accent-electric/20 rounded-full mb-4">
            Trabajo real en terreno
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white">
            Nuestras Operaciones
          </h2>
          <p className="mt-4 text-primary-300 max-w-2xl mx-auto">
            Ingeniería eléctrica, telecomunicaciones y supervisión de obras en el sur del Perú —
            del altiplano de Puno al desierto de Tacna.
          </p>
        </div>

        {reducedMotion ? (
          <GaleriaEstatica />
        ) : (
          <>
            <GaleriaHelicoidal />
            <p className="text-center text-primary-500 text-sm -mt-6 flex items-center justify-center gap-2">
              <FaHandPointer className="text-accent-electric/70" />
              Arrastra para girar la galería
            </p>
          </>
        )}
      </div>
    </section>
  )
}
