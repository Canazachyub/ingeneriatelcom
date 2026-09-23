import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import HudFrame from '../effects/HudFrame'

// Cabecera común de las páginas internas (bolsa de trabajo, postulación,
// capacitaciones...). Mismo idioma visual que la landing: fondo oscuro con
// rejilla cian tenue enmascarada, rótulo "── EYEBROW", título Orbitron.
// Reemplaza al hero con degradado azul→morado, que no encajaba con el resto.

export interface Miga {
  label: string
  to?: string
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  migas,
  accent = 'electric',
  metrica,
  volver = true,
}: {
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  migas: Miga[]
  accent?: 'electric' | 'energy'
  metrica?: ReactNode
  volver?: boolean
}) {
  const navigate = useNavigate()
  const color = accent === 'energy' ? 'text-accent-energy' : 'text-accent-electric'
  const linea = accent === 'energy' ? 'from-accent-energy/0 to-accent-energy/70' : 'from-accent-electric/0 to-accent-electric/70'

  return (
    <header className="relative overflow-hidden bg-primary-950 pt-28 pb-12 md:pb-16 border-b border-primary-800/70">
      {/* Rejilla táctica tenue */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 30% 40%, black 15%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, black 15%, transparent 70%)',
        }}
      />
      {/* Halo de color */}
      <div
        aria-hidden="true"
        className={`absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none ${accent === 'energy' ? 'bg-accent-energy/10' : 'bg-accent-electric/10'}`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6">
            {volver && (
              <button
                onClick={() => (window.history.length <= 1 ? navigate('/') : navigate(-1))}
                className="inline-flex items-center gap-2 min-h-[44px] text-sm text-primary-300 hover:text-accent-electric transition-colors group"
              >
                <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                Volver
              </button>
            )}
            <nav aria-label="Ruta de navegación" className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-primary-500">
              {migas.map((m, i) => (
                <span key={m.label} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {m.to ? (
                    <Link to={m.to} className="hover:text-accent-electric transition-colors">{m.label}</Link>
                  ) : (
                    <span className="text-primary-200" aria-current="page">{m.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <p className={`flex items-center gap-3 mb-4 font-mono text-xs tracking-[0.3em] uppercase ${color}`}>
                <span className={`h-px w-10 md:w-16 bg-gradient-to-r ${linea}`} />
                {eyebrow}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 leading-tight">
                {title}
              </h1>
              {subtitle && <p className="text-base md:text-xl text-primary-300 leading-relaxed">{subtitle}</p>}
            </div>

            {metrica && (
              <HudFrame className="shrink-0" color={accent === 'energy' ? 'border-accent-energy/50' : 'border-accent-electric/50'}>
                <div className="panel-hud px-6 py-4 flex items-center gap-6">{metrica}</div>
              </HudFrame>
            )}
          </div>
        </motion.div>
      </div>
    </header>
  )
}
