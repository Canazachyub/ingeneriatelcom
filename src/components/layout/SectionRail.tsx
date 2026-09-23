import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaArrowUp } from 'react-icons/fa'
import { SECCIONES, numeroSeccion } from '../../data/empresa'
import { useSeccionActiva, irASeccion } from '../../hooks/useSeccionActiva'

// Navegación de la landing (solo HomePage):
//  · Riel lateral (escritorio): un marcador por sección; el activo se ilumina
//    y al pasar el mouse muestra el nombre. Sirve de índice y de "estás aquí".
//  · Botón "volver arriba" (todas las pantallas) tras el primer pantallazo.
export default function SectionRail() {
  const actual = useSeccionActiva()
  const [presentes, setPresentes] = useState(SECCIONES)
  const [mostrarArriba, setMostrarArriba] = useState(false)

  useEffect(() => {
    // Algunas secciones aparecen o desaparecen después de cargar (Bolsa de
    // trabajo se oculta si el servidor no devuelve ofertas): se re-evalúa en
    // cada scroll. Son 11 getElementById: coste despreciable.
    const revisar = () => {
      setMostrarArriba(window.scrollY > window.innerHeight * 0.8)
      setPresentes((prev) => {
        const ahora = SECCIONES.filter((s) => document.getElementById(s.id))
        return ahora.length === prev.length && ahora.every((s, i) => s.id === prev[i].id) ? prev : ahora
      })
    }
    revisar()
    const t = setTimeout(revisar, 1500)
    window.addEventListener('scroll', revisar, { passive: true })
    return () => { clearTimeout(t); window.removeEventListener('scroll', revisar) }
  }, [])

  return (
    <>
      <nav
        aria-label="Secciones de la página"
        className="hidden xl:flex fixed right-5 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-2.5"
      >
        {presentes.map((s) => {
          const activa = s.id === actual
          return (
            <button
              key={s.id}
              onClick={() => irASeccion(s.id)}
              aria-label={`Ir a ${s.etiqueta}`}
              aria-current={activa ? 'true' : undefined}
              className="group flex items-center gap-3 py-0.5"
            >
              <span
                className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-300 whitespace-nowrap px-2 py-0.5 bg-primary-950/80 backdrop-blur-sm border ${
                  activa
                    ? 'opacity-100 text-accent-electric border-accent-electric/40'
                    : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-primary-200 border-primary-700/60'
                }`}
              >
                {numeroSeccion(s.id)} · {s.etiqueta}
              </span>
              <span
                className={`block transition-all duration-300 ${
                  activa
                    ? 'w-6 h-[3px] bg-accent-electric shadow-[0_0_10px_rgba(0,212,255,0.9)]'
                    : 'w-3 h-[2px] bg-primary-500/70 group-hover:w-5 group-hover:bg-accent-electric/70'
                }`}
              />
            </button>
          )
        })}
      </nav>

      <AnimatePresence>
        {mostrarArriba && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Volver arriba"
            className="btn-hud fixed bottom-5 right-5 z-40 w-12 h-12 flex items-center justify-center bg-primary-900/90 backdrop-blur-md border border-accent-electric/40 text-accent-electric hover:bg-accent-electric hover:text-primary-950 transition-colors shadow-[0_0_20px_rgba(0,212,255,0.25)]"
          >
            <FaArrowUp />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
