import { useEffect, useState } from 'react'
import { SECCIONES } from '../data/empresa'

// Scroll-spy de la landing: devuelve el id de la sección que ocupa la franja
// superior de la pantalla. Una sección ausente (p. ej. Bolsa de trabajo sin
// ofertas no se renderiza) simplemente se omite.
export function useSeccionActiva(activo = true): string {
  const [actual, setActual] = useState('inicio')

  useEffect(() => {
    if (!activo) return
    let raf = 0
    const calcular = () => {
      raf = 0
      const linea = window.innerHeight * 0.35
      let id = 'inicio'
      for (const s of SECCIONES) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= linea) id = s.id
      }
      // Al tocar fondo, la última sección visible es la activa aunque sea corta
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const visibles = SECCIONES.filter((s) => document.getElementById(s.id))
        if (visibles.length) id = visibles[visibles.length - 1].id
      }
      setActual(id)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calcular) }
    calcular()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [activo])

  return actual
}

// Desplazamiento suave a una sección, dejando espacio para el menú fijo.
export function irASeccion(id: string) {
  const el = document.getElementById(id.replace(/^#/, ''))
  if (!el) return
  const top = el.getBoundingClientRect().top + window.pageYOffset - 80
  window.scrollTo({ top, behavior: 'smooth' })
}
