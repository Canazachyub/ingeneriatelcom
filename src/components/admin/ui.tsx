import { ReactNode } from 'react'

// Piezas de presentación del panel, las mismas del dashboard de campo.

export type Tono = 'cian' | 'verde' | 'ambar' | 'rojo' | 'azul' | 'violeta' | 'gris'

const TONO: Record<Tono, { texto: string; punto: string; brillo: string }> = {
  cian: { texto: 'text-accent-electric', punto: 'bg-accent-electric', brillo: 'from-cyan-400/15' },
  verde: { texto: 'text-emerald-400', punto: 'bg-emerald-500', brillo: 'from-emerald-500/15' },
  ambar: { texto: 'text-amber-400', punto: 'bg-amber-500', brillo: 'from-amber-500/15' },
  rojo: { texto: 'text-rose-400', punto: 'bg-rose-500', brillo: 'from-rose-500/15' },
  azul: { texto: 'text-sky-300', punto: 'bg-blue-500', brillo: 'from-blue-600/15' },
  violeta: { texto: 'text-violet-300', punto: 'bg-violet-500', brillo: 'from-violet-500/15' },
  gris: { texto: 'text-white', punto: 'bg-primary-500', brillo: 'from-primary-500/10' },
}

/** Tarjeta de indicador: etiqueta, cifra grande y ayuda. */
export function CifraCard({ etiqueta, valor, ayuda, icono, tono = 'gris', cargando, error }: {
  etiqueta: string
  valor: ReactNode
  ayuda?: ReactNode
  icono?: ReactNode
  tono?: Tono
  cargando?: boolean
  error?: boolean
}) {
  const t = TONO[tono]
  return (
    <div className="tarjeta overflow-hidden p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.brillo} to-transparent`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium text-primary-400">
            <span className={`h-2 w-2 shrink-0 rounded-sm ${t.punto}`} />
            {etiqueta}
          </p>
          <p className={`mt-2 font-mono text-3xl font-semibold leading-none tracking-tight tabular-nums ${t.texto}`}>
            {cargando ? <span className="inline-block h-7 w-12 rounded bg-primary-800 animate-pulse align-middle" /> : error ? '—' : valor}
          </p>
          {ayuda && <p className="mt-2 text-xs text-primary-400">{ayuda}</p>}
        </div>
        {icono && <div className={`rounded-xl border border-primary-800 bg-slate-800 p-2 ${t.texto}`}>{icono}</div>}
      </div>
    </div>
  )
}

/** Tarjeta de sección con encabezado. */
export function Seccion({ titulo, icono, acciones, children, className = '', cuerpo = 'p-5' }: {
  titulo?: ReactNode
  icono?: ReactNode
  acciones?: ReactNode
  children: ReactNode
  className?: string
  cuerpo?: string
}) {
  return (
    <section className={`tarjeta ${className}`}>
      {(titulo || acciones) && (
        <header className="flex items-center justify-between gap-3 border-b border-primary-800 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            {icono && <span className="text-accent-electric">{icono}</span>}
            {titulo}
          </h2>
          {acciones}
        </header>
      )}
      <div className={cuerpo}>{children}</div>
    </section>
  )
}

/** Anillo de avance con varios tramos (SVG, sin librerías). */
export function Anillo({ tramos, total, size = 132, grosor = 12, children }: {
  tramos: { valor: number; color: string; etiqueta: string }[]
  total: number
  size?: number
  grosor?: number
  children?: ReactNode
}) {
  const r = (size - grosor) / 2
  const C = 2 * Math.PI * r
  const largos = tramos.map((t) => (t.valor / Math.max(1, total)) * C)
  const inicios = largos.map((_, i) => largos.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={tramos.map((t) => `${t.etiqueta}: ${t.valor}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={grosor} stroke="rgb(31 52 84)" />
        {tramos.map((t, i) => t.valor > 0 && (
          <circle
            key={t.etiqueta}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={t.color}
            strokeWidth={grosor}
            strokeDasharray={`${Math.max(0.5, largos[i] - 1.5)} ${C}`}
            strokeDashoffset={-inicios[i]}
          >
            <title>{`${t.etiqueta}: ${t.valor}`}</title>
          </circle>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

/** Barra de título de un grupo dentro de una pantalla. */
export function TituloGrupo({ icono, children, id }: { icono?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-sm font-semibold text-white mb-3">
      {icono && <span className="text-accent-electric">{icono}</span>}
      {children}
      <span className="flex-1 h-px bg-gradient-to-r from-primary-700 to-transparent" />
    </h2>
  )
}
