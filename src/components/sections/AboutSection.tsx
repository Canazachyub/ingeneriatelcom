import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaMapMarkedAlt } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import TiltCard from '../common/TiltCard'
import IconoArea, { Area } from '../common/IconoArea'
import HudFrame from '../effects/HudFrame'
import SectionHeader from '../common/SectionHeader'
import { ANIO_FUNDACION, REGIONES_ATENDIDAS, aniosExperiencia } from '../../data/empresa'

// Ícono de línea propio por área (ver IconoArea). Reemplazan a los genéricos
// originales (foco, personas, cohete) y a los 3D holográficos intermedios.
const features: { icon: Area; title: string; description: string }[] = [
  {
    icon: 'software',
    title: 'Software y tecnología',
    description: 'Desarrollamos sistemas de gestión y aplicaciones de campo para empresas públicas y privadas. Antes de ofrecerlos, los usamos en nuestras propias operaciones.',
  },
  {
    icon: 'electrica',
    title: 'Ingeniería eléctrica',
    description: 'Del diseño a la puesta en marcha. Nuestra especialidad es la supervisión técnica de empresas distribuidoras: calidad de servicio, medidores y atención de reclamos.',
  },
  {
    icon: 'mineria',
    title: 'Construcción y minería',
    description: 'Obras civiles y electromecánicas, instalaciones y mantenimiento para proyectos de construcción y operaciones mineras, con la seguridad como primera regla.',
  },
]

// Regiones de la ficha y del mapa (deben sumar REGIONES_ATENDIDAS)
const REGIONES = ['Tacna', 'Moquegua', 'Puno', 'Cusco', 'Apurímac', 'Madre de Dios']

const EQUIPO = [
  'Ingenieros mecánico-electricistas colegiados',
  'Personal técnico propio en cada zona de trabajo',
  'Software propio para registrar cada inspección',
]

export default function AboutSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  // Ficha de la empresa (estilo "dossier"): solo datos públicos y generales.
  const ficha = [
    { etiqueta: 'SEDE', valor: 'Tacna, Perú' },
    { etiqueta: 'FUNDACIÓN', valor: String(ANIO_FUNDACION) },
    { etiqueta: 'COBERTURA', valor: `${REGIONES_ATENDIDAS} regiones del sur y oriente` },
    { etiqueta: 'ESPECIALIDAD', valor: 'Supervisión del sector eléctrico' },
  ]

  return (
    <SectionWrapper id="quienes-somos" dark>
      <div ref={ref}>
        <SectionHeader
          id="quienes-somos"
          eyebrow="Quiénes somos"
          title="Conoce nuestra empresa"
          subtitle={`Ingeniería Telcom EIRL es una empresa tacneña fundada en ${ANIO_FUNDACION}. Ejecutamos proyectos de ingeniería eléctrica, construcción, minería y software, y somos especialistas en la supervisión técnica del sector eléctrico.`}
        />

        {/* ── Declaración + ficha | mapa ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid lg:grid-cols-[1fr_1.15fr] gap-8 items-stretch mb-16"
        >
          {/* Texto */}
          <div className="flex flex-col justify-center">
            <p className="font-mono text-[11px] tracking-[0.3em] text-accent-energy mb-3">◆ NUESTRO LEMA</p>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-[1.1] mb-6">
              Energizamos el <span className="text-gradient">sur del Perú</span>
            </h3>
            <p className="text-primary-200 text-lg leading-relaxed mb-8">
              En {aniosExperiencia()} años hemos trabajado para empresas del sector eléctrico y entidades públicas del sur del Perú. Supervisamos en campo el cumplimiento de la normativa, gestionamos obras y desarrollamos nuestras propias herramientas de software para que cada inspección quede registrada, con evidencia y a tiempo.
            </p>

            {/* Ficha técnica */}
            <dl className="grid grid-cols-2 gap-px bg-accent-electric/20 border border-accent-electric/25">
              {ficha.map((f) => (
                <div key={f.etiqueta} className="bg-primary-950/90 px-4 py-3">
                  <dt className="font-mono text-[10px] tracking-[0.25em] text-accent-electric/80 mb-1">{f.etiqueta}</dt>
                  <dd className="text-white font-semibold text-sm md:text-base leading-snug">{f.valor}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Mapa animado con la cobertura */}
          <HudFrame color="border-accent-electric/60" size="w-6 h-6">
            <div className="relative m-1.5 h-[calc(100%-0.75rem)] min-h-[320px] overflow-hidden border border-accent-electric/30 bg-primary-950">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                poster="/assets/images/red-electrica-poster.jpg"
                aria-label="Mapa del Perú con la red eléctrica y proyectos de Ingeniería Telcom"
              >
                <source src="/assets/images/red-electrica.webm" type="video/webm" />
                <source src="/assets/images/red-electrica.mp4" type="video/mp4" />
              </video>
              <span className="hud-scanline absolute inset-0 pointer-events-none" aria-hidden="true" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-primary-950/90 to-transparent font-mono text-[10px] tracking-[0.25em] text-primary-200">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
                  MAPA DE OPERACIONES
                </span>
                <span className="text-accent-electric">SUR · PERÚ</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-primary-950 via-primary-950/80 to-transparent">
                <p className="flex items-center gap-2 text-xs text-primary-100 mb-2">
                  <FaMapMarkedAlt className="text-accent-electric" />
                  Regiones donde hemos trabajado
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REGIONES.map((r) => (
                    <span key={r} className="px-2 py-0.5 text-[11px] font-mono tracking-wider text-accent-electric border border-accent-electric/40 bg-primary-950/70">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </HudFrame>
        </motion.div>

        {/* ── Capacidades: módulos numerados ── */}
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <TiltCard>
                <div className="panel-hud group relative h-full overflow-hidden p-6 pt-5">
                  <span aria-hidden="true" className="absolute -top-3 right-3 font-display font-bold text-7xl text-accent-electric/[0.07] group-hover:text-accent-electric/15 transition-colors duration-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true" className="absolute left-0 top-6 bottom-6 w-0.5 bg-gradient-to-b from-accent-electric to-transparent" />
                  <div className="flex items-center gap-4 mb-4">
                    <IconoArea area={feature.icon} className="shrink-0 scale-[0.8] -ml-2" />
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.25em] text-accent-electric/70">CAPACIDAD {String(index + 1).padStart(2, '0')}</p>
                      <h3 className="text-xl font-display font-semibold text-white group-hover:text-accent-electric transition-colors duration-300">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-primary-300 leading-relaxed">{feature.description}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* ── Un solo equipo: texto + fotos escalonadas ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center"
        >
          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-accent-energy mb-3">◆ NUESTRO EQUIPO</p>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              Oficina y campo, un solo equipo
            </h3>
            <p className="text-primary-200 leading-relaxed mb-6">
              Lo que se planifica en la oficina se verifica en el terreno, y lo que se encuentra en el terreno llega el mismo día a la oficina. Así entregamos a tiempo y con evidencia.
            </p>
            <ul className="space-y-3">
              {EQUIPO.map((e) => (
                <li key={e} className="flex items-start gap-3 text-primary-100">
                  <span className="mt-1.5 w-2 h-2 shrink-0 rotate-45 bg-accent-electric shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                  {e}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative pb-10 sm:pb-16">
            <div className="relative overflow-hidden border border-primary-700/60 group w-[88%]">
              <img
                src="/assets/images/operaciones/Q1.webp"
                alt="Equipo administrativo de Ingeniería Telcom colaborando en oficina"
                loading="lazy"
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <span className="absolute top-3 left-3 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-white bg-primary-950/75 border border-primary-600/60">OFICINA</span>
            </div>
            <div className="absolute right-0 bottom-0 w-[58%] overflow-hidden border-2 border-accent-electric/50 shadow-2xl shadow-black/60 group">
              <img
                src="/assets/images/operaciones/Q2.webp"
                alt="Ingeniero de campo y coordinadora de oficina de Ingeniería Telcom"
                loading="lazy"
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <span className="absolute top-3 left-3 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-primary-950 bg-accent-electric">CAMPO</span>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
