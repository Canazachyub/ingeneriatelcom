import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaBullseye, FaEye, FaAward } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import SectionHeader from '../common/SectionHeader'
import TiltCard from '../common/TiltCard'
import HudFrame from '../effects/HudFrame'
import { missionVision } from '../../data/organization'

// Directivas de la empresa: misión y visión como dos paneles "de mando"
// enfrentados, valores como módulos numerados y la política de calidad como
// una banda tipo certificado.

const directivas = [
  {
    codigo: 'DIRECTIVA 01',
    titulo: 'Misión',
    texto: missionVision.mission,
    icono: FaBullseye,
    color: 'text-accent-electric',
    anillo: 'border-accent-electric/50',
    brillo: 'shadow-[0_0_30px_rgba(0,212,255,0.25)]',
  },
  {
    codigo: 'DIRECTIVA 02',
    titulo: 'Visión',
    texto: missionVision.vision,
    icono: FaEye,
    color: 'text-accent-energy',
    anillo: 'border-accent-energy/50',
    brillo: 'shadow-[0_0_30px_rgba(251,191,36,0.2)]',
  },
]

// Ícono dentro de un hexágono con anillo que gira despacio (se detiene con
// prefers-reduced-motion).
function IconoHex({ Icono, color, anillo, brillo }: {
  Icono: typeof FaBullseye
  color: string
  anillo: string
  brillo: string
}) {
  const reducir = useReducedMotion()
  return (
    <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0">
      <motion.span
        aria-hidden="true"
        className={`absolute inset-0 rounded-full border border-dashed ${anillo}`}
        animate={reducir ? undefined : { rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <div
        className={`absolute inset-2 bg-primary-900/90 flex items-center justify-center ${brillo}`}
        style={{ clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' }}
      >
        <Icono className={`text-2xl md:text-3xl ${color}`} />
      </div>
    </div>
  )
}

export default function MissionVisionSection() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })

  return (
    <SectionWrapper id="mision-vision" dark>
      <div ref={ref}>
        <SectionHeader
          id="mision-vision"
          eyebrow="Nuestra filosofía"
          title="Misión, Visión y Valores"
          subtitle="Las directivas que orientan cada proyecto que ejecutamos, del diseño a la puesta en marcha."
        />

        {/* Misión y Visión */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {directivas.map((d, i) => (
            <motion.div
              key={d.titulo}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1 }}
            >
              <TiltCard max={4}>
                <HudFrame className="group h-full" color="border-accent-electric/30">
                  <div className="panel-hud h-full p-6 md:p-8">
                    <div className="flex items-center gap-4 md:gap-5 mb-5">
                      <IconoHex Icono={d.icono} color={d.color} anillo={d.anillo} brillo={d.brillo} />
                      <div>
                        <p className={`font-mono text-[10px] md:text-xs tracking-[0.3em] ${d.color} opacity-80`}>
                          {d.codigo}
                        </p>
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-white">
                          {d.titulo}
                        </h3>
                      </div>
                    </div>
                    <p className="text-primary-200 text-base md:text-lg leading-relaxed border-l-2 border-primary-700/60 group-hover:border-accent-electric/60 pl-4 transition-colors duration-300">
                      {d.texto}
                    </p>
                  </div>
                </HudFrame>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Valores: módulos numerados */}
        <div className="flex items-center gap-3 mb-5 font-mono text-xs tracking-[0.3em] text-accent-success uppercase">
          <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
          Valores corporativos
          <span className="flex-1 h-px bg-gradient-to-r from-accent-success/40 to-transparent" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {missionVision.values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.35 + index * 0.07 }}
              className="group relative panel-hud p-5 overflow-hidden hover:bg-primary-800/40"
            >
              {/* barrido de luz al pasar el mouse */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-accent-electric/10 to-transparent group-hover:left-full transition-all duration-700"
              />
              <div className="relative flex items-start gap-4">
                <span className="font-display text-2xl font-bold text-primary-700 group-hover:text-accent-electric transition-colors duration-300 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h4 className="font-display font-semibold text-white mb-1 group-hover:text-accent-electric transition-colors duration-300">
                    {value.title}
                  </h4>
                  <p className="text-sm text-primary-300 leading-relaxed">{value.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Política de calidad: banda tipo certificado */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="relative p-[1px] bg-gradient-to-r from-accent-energy/60 via-accent-electric/40 to-accent-energy/60"
          style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}
        >
          <div
            className="bg-primary-950/95 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8"
            style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}
          >
            <div className="relative w-20 h-20 shrink-0 rounded-full border-2 border-accent-energy/60 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <span aria-hidden="true" className="absolute inset-1.5 rounded-full border border-dashed border-accent-energy/40" />
              <FaAward className="text-3xl text-accent-energy" />
            </div>
            <div>
              <p className="font-mono text-[10px] md:text-xs tracking-[0.3em] text-accent-energy mb-1">
                COMPROMISO · SISTEMA DE GESTIÓN
              </p>
              <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-2">
                Política de Calidad
              </h3>
              <p className="text-primary-200 leading-relaxed">
                {missionVision.qualityPolicy}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
