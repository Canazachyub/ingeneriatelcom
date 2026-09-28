import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaCode, FaBolt, FaHardHat, FaMountain, FaCheck, FaArrowRight } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import TiltCard from '../common/TiltCard'
import SectionHeader from '../common/SectionHeader'
import { PROYECTOS_EJECUTADOS, aniosExperiencia } from '../../data/empresa'
import { services, especialidad } from '../../data/services'

// Estructura inspirada en las webs de videojuegos (StarCraft II): primero un
// bloque "cinemático" con la especialidad, después las líneas de servicio como
// tarjetas con el título sobre la foto.

const iconMap: Record<string, React.ReactNode> = {
  'clipboard-check': <FaCode className="text-xl text-accent-electric" />,
  'cog': <FaBolt className="text-xl text-accent-electric" />,
  'paint-brush': <FaHardHat className="text-xl text-accent-electric" />,
  'mineria': <FaMountain className="text-xl text-accent-electric" />,
}

// Foto de operaciones para cada servicio (por id del servicio)
const serviceImages: Record<string, string> = {
  '1': '/assets/images/operaciones/S1.webp', // Eléctrica → sala de tableros
  '2': '/assets/images/operaciones/S3.webp', // Construcción → supervisión de obra
  '3': '/assets/images/operaciones/S5.webp', // Minería → tajo abierto
  '4': '/assets/images/operaciones/S4.webp', // Software y TIC → equipo en oficina
}

const IMAGEN_ESPECIALIDAD = '/assets/images/operaciones/ESP1.webp'

const irAContacto = () => document.querySelector('#contacto')?.scrollIntoView({ behavior: 'smooth' })

export default function ServicesSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="servicios">
      <div ref={ref}>
        <SectionHeader
          id="servicios"
          eyebrow="Servicios"
          title="Qué hacemos"
          subtitle="Una especialidad que nos distingue y cuatro líneas de servicio para acompañar todo el ciclo del proyecto."
        />

        {/* ── Especialidad: bloque cinemático ── */}
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="panel-hud relative overflow-hidden mb-10 border border-accent-electric/30 bg-primary-950"
        >
          <div className="grid lg:grid-cols-[1.05fr_1fr] min-h-[420px]">
            {/* Texto */}
            <div className="relative z-10 p-6 sm:p-8 lg:p-12 flex flex-col justify-center order-2 lg:order-1">
              <p className="font-mono text-[11px] tracking-[0.3em] text-accent-energy mb-3">
                ◆ NUESTRA ESPECIALIDAD
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white leading-tight mb-4">
                {especialidad.titulo}
              </h3>
              <p className="text-primary-200 leading-relaxed mb-6">{especialidad.descripcion}</p>
              <ul className="space-y-2.5 mb-8">
                {especialidad.puntos.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-primary-100">
                    <span className="mt-1 w-5 h-5 shrink-0 flex items-center justify-center bg-accent-electric/15 border border-accent-electric/50 text-accent-electric text-[10px]">
                      <FaCheck />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <div>
                <button onClick={irAContacto} className="btn-primary btn-hud inline-flex items-center gap-2">
                  Solicitar una propuesta
                  <FaArrowRight />
                </button>
              </div>
            </div>

            {/* Imagen a sangre, fundida con el texto */}
            <div className="relative min-h-[240px] lg:min-h-0 order-1 lg:order-2">
              <img
                src={IMAGEN_ESPECIALIDAD}
                alt="Supervisor verificando un medidor de energía en una vivienda"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-primary-950 via-primary-950/30 to-transparent" />
              <span className="hud-scanline absolute inset-0 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </motion.article>

        {/* ── Líneas de servicio: título sobre la foto ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <TiltCard>
                <div className="group relative h-full min-h-[380px] overflow-hidden border border-primary-800 hover:border-accent-electric/50 transition-colors duration-300 bg-primary-950 flex flex-col justify-end">
                  <img
                    src={serviceImages[service.id]}
                    alt={service.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/75 to-primary-950/10" />
                  <div className="relative p-5">
                    <div className="w-10 h-10 mb-3 bg-primary-950/80 backdrop-blur-sm flex items-center justify-center border border-accent-electric/40">
                      {iconMap[service.icon]}
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-accent-electric transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-primary-200 text-sm leading-relaxed lg:min-h-[8.75rem]">{service.description}</p>
                  </div>
                  <span className="absolute top-0 left-0 h-0.5 w-0 bg-accent-electric group-hover:w-full transition-all duration-500" />
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* ── Por qué elegirnos ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-gradient-to-r from-accent-electric/10 to-primary-800/30 p-8 border border-accent-electric/20"
        >
          <h3 className="text-2xl font-display font-semibold text-white mb-4">
            Por qué elegirnos
          </h3>
          <p className="text-primary-200 leading-relaxed">
            Con {PROYECTOS_EJECUTADOS} proyectos ejecutados en {aniosExperiencia()} años para empresas del sector eléctrico y entidades públicas, sabemos que la supervisión se gana en campo: personal propio en el sur del Perú, normativa al día e informes con evidencia digital que se pueden auditar. Y cuando un proceso se puede hacer mejor con tecnología, desarrollamos la herramienta nosotros mismos.
          </p>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
