import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

// Íconos de línea de las 3 áreas de negocio (SVG propio, sin imágenes).
// Estilo corporativo: trazo fino uniforme, sin relleno, un solo acento ámbar.
// Reemplazan a los íconos 3D generados, que se veían "de videojuego".
// Al entrar en pantalla el trazo se dibuja una vez (nada en bucle).

export type Area = 'software' | 'electrica' | 'mineria'

interface Trazo { d: string; acento?: boolean }

const TRAZOS: Record<Area, Trazo[]> = {
  // Monitor con código
  software: [
    { d: 'M11 12h42a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z' },
    { d: 'M27 42l-2 9M37 42l2 9M21 51h22' },
    { d: 'M24 22l-6 5 6 5M40 22l6 5-6 5' },
    { d: 'M34.5 19l-5 16', acento: true },
  ],
  // Torre de alta tensión
  electrica: [
    { d: 'M30 9L22 56M34 9l8 47M30 9h4' },
    { d: 'M15 19h34M18 30h28' },
    { d: 'M16 19v5M48 19v5M19 30v5M45 30v5' },
    { d: 'M26.6 30l12.2 9M37.4 30l-12.2 9M25.2 39l15.3 10M38.8 39l-15.3 10' },
    { d: 'M12 56h40' },
    { d: 'M54 6l-4 7h4l-4 7', acento: true },
  ],
  // Casco de seguridad sobre relieve de montaña
  mineria: [
    { d: 'M14 38c0-12 8-20 18-20s18 8 18 20' },
    { d: 'M10 38h44a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z' },
    { d: 'M32 18v8M25 21c-2 5-2.5 11-2.5 17M39 21c2 5 2.5 11 2.5 17' },
    { d: 'M28.5 30h7v5h-7z', acento: true },
    { d: 'M8 57l11-7 6 4 9-8 8 6 5-3 9 8' },
  ],
}

export default function IconoArea({ area, className = '' }: { area: Area; className?: string }) {
  const reducir = useReducedMotion()
  const { ref, inView } = useInView({ threshold: 0.4, triggerOnce: true })
  const dibujar = inView || reducir

  return (
    <div ref={ref} className={`relative w-28 h-28 mx-auto ${className}`}>
      {/* Marco: anillo fino + retícula de puntos, discreto */}
      <svg viewBox="0 0 96 96" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <circle cx="48" cy="48" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary-600/50 group-hover:text-accent-electric/50 transition-colors duration-500" />
        <circle cx="48" cy="48" r="38" fill="rgba(0,212,255,0.04)" stroke="rgba(0,212,255,0.12)" strokeWidth="1" />
        {[20, 76].map((x) => [20, 76].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(0,212,255,0.35)" />
        )))}
      </svg>
      <svg
        viewBox="0 0 64 64"
        className="absolute inset-[16%] w-[68%] h-[68%]"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {TRAZOS[area].map((t, i) => (
          <motion.path
            key={i}
            d={t.d}
            stroke={t.acento ? '#fbbf24' : '#00d4ff'}
            initial={reducir ? false : { pathLength: 0, opacity: 0 }}
            animate={dibujar ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: 'easeInOut' }}
          />
        ))}
      </svg>
    </div>
  )
}
