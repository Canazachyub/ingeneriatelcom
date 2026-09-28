import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion'
import { FaBolt, FaBriefcase, FaFolder, FaUsers, FaClock, FaMapMarkedAlt } from 'react-icons/fa'
import AnimatedCounter from '../common/AnimatedCounter'
import EnergyGrid from '../effects/EnergyGrid'
import { statistics } from '../../data/services'
import { useFinePointer } from '../../hooks/useFinePointer'

// ============================================================
// Hero "cinemático" (inspirado en la portada de StarCraft II):
// una imagen a pantalla completa por cada frente de la empresa, el texto a
// la izquierda (las imágenes dejan ese tercio oscuro a propósito) y un
// selector abajo con barra de progreso. Imágenes: Codex image_gen,
// originales en public/assets/images/fotos generadas/.
// ============================================================

interface Frente {
  id: string
  etiqueta: string
  corto: string // selector en móvil (sin superponerse)
  titulo: string
  texto: string
  imagen: string
}

const FRENTES: Frente[] = [
  {
    id: 'energia',
    etiqueta: 'ENERGÍA',
    corto: 'ENERGÍA',
    titulo: 'Supervisión eléctrica',
    texto: 'Supervisamos en campo la calidad del servicio eléctrico, de la subestación al medidor.',
    imagen: '/assets/images/hero/h-energia.webp',
  },
  {
    id: 'construccion',
    etiqueta: 'CONSTRUCCIÓN',
    corto: 'OBRAS',
    titulo: 'Obras electromecánicas',
    texto: 'Gestionamos y supervisamos obras civiles y eléctricas con seguridad de principio a fin.',
    imagen: '/assets/images/hero/h-construccion.webp',
  },
  {
    id: 'mineria',
    etiqueta: 'MINERÍA',
    corto: 'MINERÍA',
    titulo: 'Operaciones mineras',
    texto: 'Instalaciones, mantenimiento y supervisión técnica para la minería del sur andino.',
    imagen: '/assets/images/hero/h-mineria.webp',
  },
  {
    id: 'software',
    etiqueta: 'SOFTWARE',
    corto: 'SOFTWARE',
    titulo: 'Tecnología propia',
    texto: 'Aplicaciones de campo y tableros que convierten cada inspección en datos confiables.',
    imagen: '/assets/images/hero/h-software.webp',
  },
]

const DURACION_MS = 8000

// Punto de referencia del HUD: Tacna (sede principal de la empresa).
const LAT_BASE = -18.0146
const LNG_BASE = -70.2536

const statIcons: Record<string, React.ReactNode> = {
  folder: <FaFolder className="text-accent-electric" />,
  users: <FaUsers className="text-accent-electric" />,
  clock: <FaClock className="text-accent-electric" />,
  map: <FaMapMarkedAlt className="text-accent-electric" />,
}

// Desplazamiento de una capa según la posición del mouse (-0.5..0.5).
function useCapa(mx: MotionValue<number>, my: MotionValue<number>, profundidad: number) {
  const x = useTransform(mx, (v) => v * profundidad)
  const y = useTransform(my, (v) => v * profundidad)
  return { x, y }
}

export default function HeroSection() {
  const [actual, setActual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const interactivo = useFinePointer()
  const frente = FRENTES[actual]

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 })
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 })
  const fondo = useCapa(mx, my, -24)
  const red = useCapa(mx, my, 12)

  const [lectura, setLectura] = useState({ lat: LAT_BASE, lng: LNG_BASE })

  const siguiente = useCallback(() => setActual((p) => (p + 1) % FRENTES.length), [])

  // Rotación automática (se detiene con el mouse encima del selector)
  useEffect(() => {
    if (pausado) return
    const t = setTimeout(siguiente, DURACION_MS)
    return () => clearTimeout(t)
  }, [actual, pausado, siguiente])

  // Precarga de la imagen siguiente para que el cambio sea instantáneo
  useEffect(() => {
    const img = new Image()
    img.src = FRENTES[(actual + 1) % FRENTES.length].imagen
  }, [actual])

  // Parallax con el mouse (escritorio)
  useEffect(() => {
    if (!interactivo) return
    let ultimo = 0
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5
      const ny = e.clientY / window.innerHeight - 0.5
      rawX.set(nx)
      rawY.set(ny)
      const ahora = performance.now()
      if (ahora - ultimo > 66) {
        ultimo = ahora
        setLectura({ lat: LAT_BASE - ny * 0.8, lng: LNG_BASE + nx * 1.2 })
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [interactivo, rawX, rawY])

  const scrollToSection = (id: string) => {
    const element = document.querySelector(id)
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <section id="inicio" className="relative min-h-screen flex flex-col overflow-hidden bg-primary-950">
      {/* ── Imagen cinemática del frente activo (Ken Burns + parallax) ── */}
      <motion.div className="absolute -inset-8" style={fondo}>
        <AnimatePresence>
          <motion.img
            key={frente.id}
            src={frente.imagen}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.4 }, scale: { duration: DURACION_MS / 1000 + 1.5, ease: 'linear' } }}
            className="absolute inset-0 w-full h-full object-cover object-[68%_center] md:object-[center_15%]"
          />
        </AnimatePresence>
      </motion.div>

      {/* Viñetas: tercio izquierdo oscuro para el texto, base oscura para el selector */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/70 to-primary-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-transparent to-primary-950/60" />

      {/* Red eléctrica interactiva, sutil */}
      <motion.div className="absolute -inset-6 opacity-50 mix-blend-screen" style={red}>
        <EnergyGrid />
      </motion.div>
      <div aria-hidden="true" className="hud-scanline absolute inset-x-0 h-24 pointer-events-none" />

      {/* ── HUD de mando (escritorio) ── */}
      <div aria-hidden="true" className="hidden md:block absolute inset-6 lg:inset-10 pointer-events-none z-[1] font-mono text-[10px] tracking-[0.2em] text-accent-electric/70">
        <span className="absolute top-16 left-0 w-10 h-10 border-t-2 border-l-2 border-accent-electric/50" />
        <span className="absolute top-16 right-0 w-10 h-10 border-t-2 border-r-2 border-accent-electric/50" />
        <div className="absolute top-20 left-4 space-y-1">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
            TELCOM-NET // EN LÍNEA
          </p>
          <p className="text-primary-400/70 tabular-nums">LAT {lectura.lat.toFixed(4)}° · LNG {lectura.lng.toFixed(4)}°</p>
        </div>
        <div className="absolute top-20 right-4 text-right space-y-1">
          <p>
            FRENTE {String(actual + 1).padStart(2, '0')} / {String(FRENTES.length).padStart(2, '0')}
          </p>
          <p className="text-accent-energy/90">▲ {frente.etiqueta}</p>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="relative z-10 flex-1 flex items-center w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-28 md:pt-32 pb-8">
        <div className="w-full grid lg:grid-cols-[1fr_auto] gap-10 items-center">
          <div className="max-w-3xl text-center lg:text-left mx-auto lg:mx-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="placa-acero inline-flex items-stretch mb-6"
            >
              <span aria-hidden="true" className="franja-peligro w-3 md:w-4 shrink-0" />
              <span className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2">
                <FaBolt className="text-accent-energy text-xs md:text-sm" />
                <span className="text-[10px] md:text-xs text-slate-100 font-mono font-semibold tracking-[0.2em]">ESPECIALISTAS EN SUPERVISIÓN DEL SECTOR ELÉCTRICO</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.4, duration: 0.9 }}
              className="text-[2.5rem] sm:text-6xl leading-[1.02] md:text-7xl xl:text-[5.4rem] whitespace-nowrap font-display font-bold text-white mb-6 drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
            >
              <span className="block">INGENIERÍA</span>
              <span className="hud-glitch block text-gradient" data-text="TELCOM EIRL">TELCOM EIRL</span>
            </motion.h1>

            {/* Frente activo: cambia con cada imagen */}
            <div className="min-h-[5.5rem] md:min-h-[5rem] mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={frente.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.45 }}
                >
                  <p className="mb-3">
                    <span className="rotulo-estencil">{frente.etiqueta} · {frente.titulo}</span>
                  </p>
                  <p className="text-lg md:text-2xl text-primary-100 leading-snug">{frente.texto}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto lg:mx-0"
            >
              <button
                onClick={() => scrollToSection('#servicios')}
                className="btn-primary btn-hud flex items-center justify-center gap-2 text-base md:text-lg"
              >
                <FaBolt />
                Ver servicios
              </button>
              <button
                onClick={() => scrollToSection('#bolsa-trabajo')}
                className="btn-secondary btn-hud flex items-center justify-center gap-2 text-base md:text-lg backdrop-blur-sm"
              >
                <FaBriefcase />
                Bolsa de trabajo
              </button>
            </motion.div>
          </div>

          {/* Cifras: columna táctica a la derecha (fila de 2×2 en móvil) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:w-60"
          >
            {statistics.map((stat) => (
              <div key={stat.label} className="placa-acero flex items-center gap-3 pl-5 pr-4 py-3.5">
                <span aria-hidden="true" className="absolute left-0 top-3 bottom-3 w-1 bg-accent-energy" />
                <span className="hidden sm:block text-lg">{statIcons[stat.icon]}</span>
                <div className="text-left">
                  <div className="text-2xl md:text-3xl font-display font-bold text-white tabular-nums leading-none">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-slate-300 text-[10px] md:text-xs font-mono uppercase tracking-wider leading-tight mt-1">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Selector de frentes con barra de progreso ── */}
      <div
        className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pb-6 md:pb-10"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
      >
        <div aria-hidden="true" className="franja-peligro h-1 w-24 mb-3 opacity-90" />
        <div className="grid grid-cols-4 gap-2 md:gap-4" role="tablist" aria-label="Frentes de trabajo">
          {FRENTES.map((f, i) => {
            const activo = i === actual
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={activo}
                onClick={() => setActual(i)}
                className={`group text-left pt-3 border-t transition-colors duration-300 ${activo ? 'border-transparent' : 'border-slate-600/70 hover:border-slate-400'}`}
              >
                <span className="relative block h-0.5 -mt-[13px] mb-3 bg-transparent overflow-hidden">
                  {activo && (
                    <motion.span
                      key={`${f.id}-${pausado}`}
                      className="absolute inset-y-0 left-0 bg-accent-energy"
                      initial={{ width: pausado ? '100%' : '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: pausado ? 0 : DURACION_MS / 1000, ease: 'linear' }}
                    />
                  )}
                </span>
                <span className={`block font-mono text-[10px] tracking-[0.25em] ${activo ? 'text-accent-energy' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`block font-display font-semibold text-[11px] sm:text-sm md:text-base truncate ${activo ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  <span className="sm:hidden">{f.corto}</span>
                  <span className="hidden sm:inline">{f.etiqueta}</span>
                </span>
                <span className="hidden md:block text-xs text-slate-400 mt-0.5 truncate">{f.titulo}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
