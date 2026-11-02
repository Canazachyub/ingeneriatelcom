import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FaSearch, FaArrowRight } from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import Retrato from './Retrato'

export interface EntradaMenu { nombre: string; href: string; icono: JSX.Element; grupo: string }

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Buscador del panel (Ctrl+K): cualquier pantalla o trabajador en dos teclas. */
export default function Buscador({ abierto, onCerrar, menu, verPersonal }: {
  abierto: boolean
  onCerrar: () => void
  menu: EntradaMenu[]
  verPersonal: boolean
}) {
  const navegar = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const { data: gente } = useQuery({
    queryKey: ['rosterBuscador'],
    queryFn: async () => (await api.getTrabajadores(false)).data || [],
    enabled: abierto && verPersonal,
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (abierto) { setQ(''); setSel(0); setTimeout(() => entrada.current?.focus(), 30) }
  }, [abierto])

  const resultados = useMemo(() => {
    const t = sinTildes(q.trim())
    const pantallas = menu
      .filter((m) => !t || sinTildes(`${m.nombre} ${m.grupo}`).includes(t))
      .map((m) => ({ clave: m.href, titulo: m.nombre, sub: m.grupo, icono: m.icono, ir: m.href, dni: '', persona: false }))
    const personas = (t ? gente || [] : [])
      .filter((p) => sinTildes(`${p.nombre} ${p.dni} ${p.cargo}`).includes(t))
      .map((p) => ({ clave: p.dni, titulo: p.nombre, sub: p.cargo, icono: null, ir: `/admin/empleados?ver=${p.dni}`, dni: p.dni, persona: true }))
    return [...personas, ...pantallas].slice(0, 9)
  }, [q, menu, gente])

  useEffect(() => setSel(0), [q])

  if (!abierto) return null

  const ir = (href: string) => { onCerrar(); navegar(href) }
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, resultados.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && resultados[sel]) ir(resultados[sel].ir)
    if (e.key === 'Escape') onCerrar()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="w-full max-w-xl tarjeta overflow-hidden" role="dialog" aria-label="Buscar en el panel">
        <div className="flex items-center gap-3 border-b border-primary-800 px-4 py-3">
          <FaSearch className="text-accent-electric shrink-0" />
          <input
            ref={entrada}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={teclas}
            placeholder={verPersonal ? 'Busca una pantalla o un trabajador…' : 'Busca una pantalla…'}
            className="buscador-entrada w-full bg-transparent text-white placeholder-primary-500 focus:outline-none"
            aria-label="Buscar"
          />
          <kbd className="font-mono text-[10px] text-primary-400 border border-primary-700 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {resultados.map((r, i) => (
            <li key={r.clave}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => ir(r.ir)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === sel ? 'bg-accent-electric/10' : ''}`}
              >
                {r.persona
                  ? <Retrato dni={r.dni} nombre={r.titulo} size={34} />
                  : <span className="w-[34px] h-[34px] flex items-center justify-center rounded-lg bg-slate-800 text-accent-electric shrink-0">{r.icono}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white truncate">{r.titulo}</span>
                  <span className="block text-xs text-primary-400 truncate">{r.sub}</span>
                </span>
                {i === sel && <FaArrowRight className="text-xs text-accent-electric shrink-0" />}
              </button>
            </li>
          ))}
          {!resultados.length && <li className="px-3 py-6 text-center text-sm text-primary-400">Nada coincide con "{q}".</li>}
        </ul>
      </div>
    </div>
  )
}
