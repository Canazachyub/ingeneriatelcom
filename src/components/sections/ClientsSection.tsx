import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaBolt, FaCheckCircle } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import SectionHeader from '../common/SectionHeader'
import TiltCard from '../common/TiltCard'
import HudFrame from '../effects/HudFrame'
import { clients } from '../../data/clients'
import { Client } from '../../types/common.types'

// Iniciales de respaldo si el logo externo no carga (vienen de otros dominios
// y pueden caerse o bloquear el hotlink).
const iniciales = (nombre: string) =>
  nombre
    .replace(/S\.A\.?A?\.?|S\.A/gi, '')
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

function PlacaCliente({ client, index }: { client: Client; index: number }) {
  const [fallo, setFallo] = useState(false)
  return (
    <TiltCard max={6}>
      <HudFrame className="group h-full" color="border-accent-electric/30">
        <div className="h-full flex flex-col bg-primary-950/60 backdrop-blur-sm border border-primary-700/40 group-hover:border-accent-electric/40 transition-colors duration-300">
          {/* Placa del logo: fondo claro uniforme para logos de fondos distintos */}
          <div className="relative m-3 mb-0 h-28 rounded-sm bg-gradient-to-b from-white to-slate-200 flex items-center justify-center px-4 overflow-hidden">
            {fallo ? (
              <span className="font-display text-3xl font-bold text-primary-800">{iniciales(client.name)}</span>
            ) : (
              <img
                src={client.logo}
                alt={`Logo de ${client.name}`}
                loading="lazy"
                onError={() => setFallo(true)}
                className="max-h-20 max-w-full object-contain grayscale-[40%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            )}
            {/* Brillo de barrido al pasar el mouse */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 group-hover:opacity-100 group-hover:left-[120%] transition-all duration-700"
            />
          </div>
          <div className="p-4 pt-3 flex-1 flex flex-col">
            <span className="font-mono text-[10px] tracking-[0.25em] text-accent-electric/70 mb-1">
              CLIENTE {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-display text-sm font-semibold text-white leading-snug mb-1.5 group-hover:text-accent-electric transition-colors duration-300">
              {client.name}
            </h3>
            <p className="text-xs text-primary-300 leading-relaxed">{client.description}</p>
          </div>
        </div>
      </HudFrame>
    </TiltCard>
  )
}

export default function ClientsSection() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  const reducir = useReducedMotion()
  // Cinta de nombres (se duplica para que el desplazamiento sea continuo)
  const cinta = [...clients, ...clients]

  return (
    <SectionWrapper id="clientes">
      <div ref={ref}>
        <SectionHeader
          id="clientes"
          eyebrow="Confían en nosotros"
          title="Nuestros Clientes"
          subtitle="Empresas del sector eléctrico y entidades públicas que ya trabajan con nosotros en el sur y el oriente del Perú."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
          {clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
              className={index === clients.length - 1 && clients.length % 2 === 1 ? 'col-span-2 md:col-span-1' : ''}
            >
              <PlacaCliente client={client} index={index} />
            </motion.div>
          ))}
        </div>

        {/* Cinta tipo teletipo: sectores y clientes en bucle */}
        <div className="relative mt-10 overflow-hidden border-y border-primary-700/40 py-3 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <motion.div
            className="flex w-max gap-10 font-mono text-xs tracking-[0.2em] uppercase text-primary-400"
            animate={reducir ? undefined : { x: ['0%', '-50%'] }}
            transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
          >
            {cinta.map((c, i) => (
              <span key={`${c.id}-${i}`} className="flex items-center gap-3 whitespace-nowrap">
                <FaBolt className="text-accent-electric/70" />
                {c.name}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-primary-300 text-center"
        >
          <FaCheckCircle className="text-accent-success shrink-0" />
          Software, soporte TIC e ingeniería eléctrica para el sector público y privado.
        </motion.p>
      </div>
    </SectionWrapper>
  )
}
