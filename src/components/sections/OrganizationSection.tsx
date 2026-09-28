import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaBuilding, FaCog, FaCalculator, FaUsers, FaBullhorn, FaDesktop } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import SectionHeader from '../common/SectionHeader'
import HudFrame from '../effects/HudFrame'
import { departments } from '../../data/organization'

// Organigrama real: Gerencia General arriba, conectada por líneas a los
// departamentos. Escritorio: conectores SVG trazados sobre las posiciones
// MEDIDAS de cada tarjeta (llegan exactos al centro de cada área) y un pulso
// que sale de la Gerencia, se reparte y enciende cada área al llegar.
// Celular: árbol vertical con línea troncal a la izquierda.

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'building': FaBuilding,
  'cog': FaCog,
  'calculator': FaCalculator,
  'users': FaUsers,
  'megaphone': FaBullhorn,
  'computer': FaDesktop,
}

// Descripción breve: el texto oficial empieza siempre con "El/La <nombre> se
// encarga de...", redundante bajo el título del nodo.
const resumen = (texto: string) => {
  const m = texto.match(/se encarga de (.*)$|es la encargada de (.*)$/i)
  const cuerpo = m ? (m[1] || m[2]) : texto
  return cuerpo.charAt(0).toUpperCase() + cuerpo.slice(1)
}

const nombreCorto = (nombre: string) => nombre.replace(/^Departamento de /, '')

function Nodo({ dept, raiz = false }: { dept: typeof departments[number]; raiz?: boolean }) {
  const Icono = iconMap[dept.icon] || FaCog
  return (
    <HudFrame className="group h-full" color={raiz ? 'border-accent-energy/60' : 'border-accent-electric/30'} size="w-3 h-3">
      <div className={`panel-hud h-full p-4 ${raiz ? 'md:p-6' : ''} text-left`}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`shrink-0 flex items-center justify-center ${raiz ? 'w-12 h-12 text-xl text-accent-energy bg-accent-energy/10 border border-accent-energy/40' : 'w-10 h-10 text-accent-electric bg-accent-electric/10 border border-accent-electric/30 group-hover:bg-accent-electric/20'} transition-colors`}
            style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
          >
            <Icono />
          </div>
          <div className="min-w-0">
            <p className={`font-mono text-[9px] tracking-[0.25em] ${raiz ? 'text-accent-energy' : 'text-primary-500 group-hover:text-accent-electric'} transition-colors`}>
              {raiz ? 'NIVEL 1 · DIRECCIÓN' : 'NIVEL 2 · ÁREA'}
            </p>
            <h3 className={`font-display font-semibold text-white leading-tight ${raiz ? 'text-lg md:text-xl' : 'text-sm md:text-base'} group-hover:text-accent-electric transition-colors`}>
              {raiz ? dept.name : nombreCorto(dept.name)}
            </h3>
          </div>
        </div>
        <p className={`text-primary-300 leading-relaxed ${raiz ? 'text-sm' : 'text-xs md:text-sm'}`}>
          {resumen(dept.description)}
        </p>
      </div>
    </HudFrame>
  )
}

type Dept = typeof departments[number]

interface Geometria {
  ancho: number
  alto: number
  origen: { x: number; y: number }
  bus: { x: number; y: number }
  puertos: { x: number; y: number }[]
  rutas: string[]
}

const RADIO_CODO = 10

function ArbolEscritorio({ raiz, areas, inView, reducir }: { raiz: Dept; areas: Dept[]; inView: boolean; reducir: boolean }) {
  const contRef = useRef<HTMLDivElement>(null)
  const raizRef = useRef<HTMLDivElement>(null)
  const areaRefs = useRef<(HTMLDivElement | null)[]>([])
  const [geo, setGeo] = useState<Geometria | null>(null)
  const [activo, setActivo] = useState(false)

  // Medición con offset* (no getBoundingClientRect): ignora los transforms de
  // la animación de entrada, así las líneas apuntan a la posición FINAL.
  useLayoutEffect(() => {
    const cont = contRef.current
    if (!cont) return
    const medir = () => {
      const r = raizRef.current
      const nodos = areaRefs.current.filter((n): n is HTMLDivElement => !!n)
      if (!r || !nodos.length) return
      const origen = { x: r.offsetLeft + r.offsetWidth / 2, y: r.offsetTop + r.offsetHeight }
      const puertos = nodos.map((n) => ({ x: n.offsetLeft + n.offsetWidth / 2, y: n.offsetTop }))
      const busY = origen.y + (Math.min(...puertos.map((p) => p.y)) - origen.y) / 2
      const rutas = puertos.map((p) => {
        const dx = p.x - origen.x
        if (Math.abs(dx) < 1) return `M${origen.x} ${origen.y} V${p.y}`
        const sg = Math.sign(dx)
        const rr = Math.min(RADIO_CODO, Math.abs(dx) / 2, (p.y - busY) / 2)
        return `M${origen.x} ${origen.y} V${busY - rr} Q${origen.x} ${busY} ${origen.x + sg * rr} ${busY} ` +
          `H${p.x - sg * rr} Q${p.x} ${busY} ${p.x} ${busY + rr} V${p.y}`
      })
      setGeo({ ancho: cont.offsetWidth, alto: cont.offsetHeight, origen, bus: { x: origen.x, y: busY }, puertos, rutas })
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(cont)
    return () => ro.disconnect()
  }, [])

  // El pulso arranca cuando terminó la animación de entrada. Todas las ramas
  // comparten duración: los pulsos llegan juntos y las áreas se encienden a
  // la vez (ciclo de 4 s definido en globals.css, .org-*).
  useEffect(() => {
    if (!inView || reducir) return
    const t = setTimeout(() => setActivo(true), 1600)
    return () => clearTimeout(t)
  }, [inView, reducir])

  return (
    <div ref={contRef} className={`hidden lg:block relative ${activo ? 'org-activo' : ''}`}>
      {geo && (
        <svg
          aria-hidden="true"
          className="absolute left-0 top-0 pointer-events-none overflow-visible"
          width={geo.ancho}
          height={geo.alto}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Líneas base (se trazan al entrar) */}
          {geo.rutas.map((d, i) => (
            <motion.path
              key={`base-${i}`}
              d={d}
              stroke="rgba(0,212,255,0.35)"
              strokeWidth={1.5}
              initial={reducir ? false : { pathLength: 0 }}
              animate={inView || reducir ? { pathLength: 1 } : {}}
              transition={{ duration: 0.9, delay: 0.6, ease: 'easeInOut' }}
            />
          ))}
          {/* Pulsos de energía (animados por CSS: .org-pulso) */}
          {geo.rutas.map((d, i) => (
            <path key={`pulso-${i}`} d={d} pathLength={100} className="org-pulso" stroke="#7ee8ff" strokeWidth={2.5} />
          ))}
          {/* Salida de la Gerencia, nodo de reparto y puertos de llegada */}
          <circle cx={geo.origen.x} cy={geo.origen.y} r={3.5} fill="#0a1628" stroke="#fbbf24" strokeWidth={1.5} />
          <circle cx={geo.bus.x} cy={geo.bus.y} r={3} fill="#00d4ff" />
          {geo.puertos.map((p, i) => (
            <rect
              key={`puerto-${i}`}
              x={p.x - 3.5}
              y={p.y - 3.5}
              width={7}
              height={7}
              transform={`rotate(45 ${p.x} ${p.y})`}
              fill="#0a1628"
              stroke="#00d4ff"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      )}

      <motion.div
        ref={raizRef}
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="org-raiz relative max-w-md mx-auto"
      >
        <Nodo dept={raiz} raiz />
      </motion.div>

      {/* Espacio para los conectores */}
      <div className="h-20" />

      <div className="grid grid-cols-5 gap-4">
        {areas.map((dept, i) => (
          <motion.div
            key={dept.id}
            ref={(el) => { areaRefs.current[i] = el }}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
            className="org-nodo relative"
          >
            <Nodo dept={dept} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default function OrganizationSection() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  const reducir = useReducedMotion()
  const [raiz, ...areas] = departments

  return (
    <SectionWrapper id="estructura-organizacional" dark>
      <div ref={ref}>
        <SectionHeader
          id="estructura-organizacional"
          eyebrow="Nuestra organización"
          title="Estructura organizacional"
          subtitle="Una organización ligera: decisiones rápidas en la gerencia y equipos técnicos con autonomía en cada zona de trabajo."
        />

        {/* ── Escritorio: árbol horizontal con conectores medidos ── */}
        <ArbolEscritorio raiz={raiz} areas={areas} inView={inView} reducir={!!reducir} />

        {/* ── Celular / tablet: árbol vertical con troncal a la izquierda ── */}
        <div className="lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Nodo dept={raiz} raiz />
          </motion.div>
          <ul className="ml-4 sm:ml-6">
            {areas.map((dept, i) => {
              const ultima = i === areas.length - 1
              return (
                <motion.li
                  key={dept.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  className="relative pl-8 pt-5"
                >
                  {/* tramo de troncal (el último llega solo hasta su conector) */}
                  <span aria-hidden="true" className={`absolute left-0 top-0 w-px bg-accent-electric/50 ${ultima ? 'h-[calc(1.25rem+2.25rem)]' : 'h-full'}`} />
                  {/* conector horizontal al nodo */}
                  <span aria-hidden="true" className="absolute left-0 top-[calc(1.25rem+2.25rem)] w-8 h-px bg-accent-electric/50" />
                  <span aria-hidden="true" className="absolute left-[-3px] top-[calc(1.25rem+2.25rem-3px)] w-[7px] h-[7px] rotate-45 border border-accent-electric bg-primary-950" />
                  <Nodo dept={dept} />
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>
    </SectionWrapper>
  )
}
