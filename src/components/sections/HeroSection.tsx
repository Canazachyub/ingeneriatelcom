import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion'
import { FaBolt, FaBriefcase, FaChevronDown, FaFolder, FaUsers, FaClock, FaStar } from 'react-icons/fa'
import AnimatedCounter from '../common/AnimatedCounter'
import EnergyGrid from '../effects/EnergyGrid'
import HudFrame from '../effects/HudFrame'
import { statistics } from '../../data/services'
import { useFinePointer } from '../../hooks/useFinePointer'

// Imágenes propias de operaciones (WebP optimizadas, servidas desde el mismo dominio)
// HERO3: altiplano nocturno con red de alta tensión (generada con Codex image_gen).
const heroImages = [
  '/assets/images/operaciones/HERO3.webp',
  '/assets/images/operaciones/HERO1.webp',
  '/assets/images/operaciones/HERO2.webp',
]
// Móvil: toma vertical 9:16 de la misma escena (la panorámica recortada a lo
// alto perdía las torres). Una sola imagen: sin carrusel que descargar.
const HERO_MOVIL = ['/assets/images/operaciones/HERO3M.webp']

// Capa de primer plano del parallax (torre recortada, PNG con alfa → WebP).
// Solo se monta con mouse: en celulares no se descarga. Si el archivo falla,
// la <img> se oculta sola en onError y el hero sigue igual.
const TORRE_PRIMER_PLANO = '/assets/images/hero/hero-torre.webp'

// Punto de referencia del HUD: Puno (sede de operaciones en el altiplano).
const LAT_BASE = -15.8402
const LNG_BASE = -70.0219

const statIcons: Record<string, React.ReactNode> = {
  folder: <FaFolder className="text-accent-electric" />,
  users: <FaUsers className="text-accent-electric" />,
  clock: <FaClock className="text-accent-electric" />,
  star: <FaStar className="text-accent-electric" />,
}

// Desplazamiento de una capa según la posición del mouse (-0.5..0.5).
// profundidad > 0 acompaña al cursor; < 0 va en contra (capas del fondo).
function useCapa(mx: MotionValue<number>, my: MotionValue<number>, profundidad: number) {
  const x = useTransform(mx, (v) => v * profundidad)
  const y = useTransform(my, (v) => v * profundidad)
  return { x, y }
}

export default function HeroSection() {
  const [currentImage, setCurrentImage] = useState(0)
  const [torreOk, setTorreOk] = useState(true)
  const interactivo = useFinePointer()
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  const imagenes = esMovil ? HERO_MOVIL : heroImages

  // Posición normalizada del mouse con resorte (inercia suave)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 })
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 })

  const fondo = useCapa(mx, my, -30)
  const red = useCapa(mx, my, 14)
  const torre = useCapa(mx, my, 55)
  const tituloRotX = useTransform(my, (v) => v * -8)
  const tituloRotY = useTransform(mx, (v) => v * 10)

  // Lectura del HUD: coordenadas que "barren" con el mouse
  const [lectura, setLectura] = useState({ lat: LAT_BASE, lng: LNG_BASE })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = () => { setEsMovil(mq.matches); setCurrentImage(0) }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    if (imagenes.length < 2) return
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % imagenes.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [imagenes.length])

  // Celular: el parallax sigue la inclinación del teléfono (giroscopio).
  // Solo donde no pide permiso (Android); iOS exige un diálogo del sistema y
  // no vale la pena interrumpir al visitante por un efecto decorativo.
  useEffect(() => {
    if (interactivo || typeof DeviceOrientationEvent === 'undefined') return
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof DOE.requestPermission === 'function') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let betaBase: number | null = null
    let ultimo = 0
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      if (betaBase === null) betaBase = e.beta // postura inicial = centro
      const nx = Math.max(-0.5, Math.min(0.5, e.gamma / 60))
      const ny = Math.max(-0.5, Math.min(0.5, (e.beta - betaBase) / 60))
      rawX.set(nx)
      rawY.set(ny)
      const ahora = performance.now()
      if (ahora - ultimo > 100) {
        ultimo = ahora
        setLectura({ lat: LAT_BASE - ny * 0.8, lng: LNG_BASE + nx * 1.2 })
      }
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [interactivo, rawX, rawY])

  useEffect(() => {
    if (!interactivo) return
    let ultimo = 0
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5
      const ny = e.clientY / window.innerHeight - 0.5
      rawX.set(nx)
      rawY.set(ny)
      // La lectura de texto se actualiza a ~15 fps: basta para el efecto
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
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary-950">
      {/* ── Capa 1: fotografía de fondo (se mueve en contra del mouse) ── */}
      <motion.div className="absolute -inset-10" style={fondo}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imagenes[currentImage] || imagenes[0]})` }}
          />
        </AnimatePresence>
      </motion.div>

      {/* Viñeta: oscurece bordes y centro-superior para el título, deja ver la foto abajo */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-950/70 via-primary-950/35 to-primary-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,22,40,0.75)_100%)]" />

      {/* ── Capa 2: red eléctrica interactiva ── */}
      <motion.div className="absolute -inset-6 opacity-90" style={red}>
        <EnergyGrid />
      </motion.div>

      {/* Rejilla táctica + línea de escaneo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />
      <div aria-hidden="true" className="hud-scanline absolute inset-x-0 h-24 pointer-events-none" />

      {/* ── Capa 3: torre en primer plano (solo escritorio) ── */}
      {torreOk && interactivo && (
        <motion.img
          src={TORRE_PRIMER_PLANO}
          alt=""
          aria-hidden="true"
          onError={() => setTorreOk(false)}
          style={torre}
          className="hidden lg:block absolute -right-16 -bottom-6 h-[78%] w-auto object-contain pointer-events-none select-none opacity-70 drop-shadow-[0_0_30px_rgba(0,212,255,0.25)]"
        />
      )}

      {/* ── HUD compacto (móvil) ── */}
      <div aria-hidden="true" className="md:hidden absolute top-[5.5rem] inset-x-4 z-[1] pointer-events-none flex items-center justify-between font-mono text-[9px] tracking-[0.18em] text-accent-electric/80">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
          TELCOM-NET · EN LÍNEA
        </span>
        <span className="tabular-nums text-primary-300/80">{lectura.lat.toFixed(2)}° {lectura.lng.toFixed(2)}°</span>
      </div>
      <span aria-hidden="true" className="md:hidden absolute top-[7rem] left-3 w-6 h-6 border-t-2 border-l-2 border-accent-electric/50 pointer-events-none" />
      <span aria-hidden="true" className="md:hidden absolute top-[7rem] right-3 w-6 h-6 border-t-2 border-r-2 border-accent-electric/50 pointer-events-none" />
      <span aria-hidden="true" className="md:hidden absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-accent-electric/50 pointer-events-none" />
      <span aria-hidden="true" className="md:hidden absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-accent-electric/50 pointer-events-none" />

      {/* ── HUD de mando ── */}
      <div aria-hidden="true" className="hidden md:block absolute inset-6 lg:inset-10 pointer-events-none z-[1] font-mono text-[10px] tracking-[0.2em] text-accent-electric/70">
        <span className="absolute top-16 left-0 w-10 h-10 border-t-2 border-l-2 border-accent-electric/50" />
        <span className="absolute top-16 right-0 w-10 h-10 border-t-2 border-r-2 border-accent-electric/50" />
        <span className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-accent-electric/50" />
        <span className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-accent-electric/50" />

        <div className="absolute top-20 left-4 space-y-1">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
            TELCOM-NET // EN LÍNEA
          </p>
          <p className="text-primary-400/70">SECTOR SUR · PERÚ</p>
        </div>
        <div className="absolute top-20 right-4 text-right space-y-1">
          <p>RED ELÉCTRICA · TIC · SOFTWARE</p>
          <p className="text-accent-energy/80">▲ ESTADO: OPERATIVO</p>
        </div>
        <div className="absolute bottom-4 left-4 space-y-1 tabular-nums">
          <p>LAT {lectura.lat.toFixed(4)}°</p>
          <p>LNG {lectura.lng.toFixed(4)}°</p>
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full border border-accent-electric/40 overflow-hidden">
            <span className="hud-radar absolute inset-0 rounded-full" />
            <span className="absolute top-1/2 left-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-electric" />
          </div>
          <p className="leading-tight">ESCANEO<br />ACTIVO</p>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-32 md:pt-20 pb-16">
        <div className="text-center" style={{ perspective: 1000 }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary-900/60 backdrop-blur-md rounded-full border border-accent-electric/30 mb-6 shadow-[0_0_20px_rgba(0,212,255,0.15)]"
          >
            <FaBolt className="text-accent-electric animate-pulse text-xs md:text-base" />
            <span className="text-[10px] md:text-sm text-primary-200 font-mono tracking-wider">LÍDERES EN SOLUCIONES DE INGENIERÍA</span>
          </motion.div>

          {/* Title — inclinación 3D con el mouse */}
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.4, duration: 0.9 }}
            style={{ rotateX: tituloRotX, rotateY: tituloRotY, transformStyle: 'preserve-3d' }}
            className="text-[2.6rem] leading-[1.1] md:text-6xl lg:text-7xl font-display font-bold text-white mb-5 md:mb-6"
          >
            <span className="block">INGENIERÍA</span>
            <span className="hud-glitch block text-gradient glow-text" data-text="TELCOM EIRL">TELCOM EIRL</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-base md:text-2xl text-primary-200 max-w-3xl mx-auto mb-8"
          >
            "Software, Ingeniería Eléctrica, Minería y Soluciones TIC para el Perú"
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-10 md:mb-12 max-w-xs sm:max-w-none mx-auto"
          >
            <button
              onClick={() => scrollToSection('#servicios')}
              className="btn-primary btn-hud flex items-center justify-center gap-2 text-base md:text-lg"
            >
              <FaBolt />
              Ver Servicios
            </button>
            <button
              onClick={() => scrollToSection('#bolsa-trabajo')}
              className="btn-secondary btn-hud flex items-center justify-center gap-2 text-base md:text-lg backdrop-blur-sm"
            >
              <FaBriefcase />
              Bolsa de Trabajo
            </button>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center gap-2 text-primary-400"
          >
            <span className="text-sm font-mono tracking-widest">DESCUBRE MÁS</span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <FaChevronDown />
            </motion.div>
          </motion.div>
        </div>

        {/* Statistics — paneles tácticos */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-10 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6"
        >
          {statistics.map((stat, index) => (
            <HudFrame key={index} className="group" color="border-accent-electric/40">
              <div className="text-center px-3 py-4 md:p-6 bg-primary-950/60 backdrop-blur-md border border-primary-700/40 group-hover:border-accent-electric/30 group-hover:bg-primary-900/60 transition-colors duration-300">
                <div className="flex justify-center mb-2">
                  {statIcons[stat.icon]}
                </div>
                <div className="text-2xl md:text-4xl font-display font-bold text-white mb-1 tabular-nums">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-primary-300 text-[10px] md:text-sm font-mono uppercase tracking-wider leading-tight">{stat.label}</div>
              </div>
            </HudFrame>
          ))}
        </motion.div>
      </div>

      {/* Image Indicators */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 gap-2 z-10 ${imagenes.length > 1 ? 'flex' : 'hidden'}`}>
        {imagenes.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            aria-label={`Mostrar imagen ${index + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentImage
                ? 'bg-accent-electric w-8'
                : 'w-2 bg-primary-600 hover:bg-primary-500'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
