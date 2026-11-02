import { useEffect, useState } from 'react'

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const dos = (n: number) => String(n).padStart(2, '0')

/** Reloj de panel de mando: el mismo del dashboard de campo. */
export default function RelojTerran() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pulso = ahora.getSeconds() % 2 === 0

  return (
    <div className="reloj-terran relative hidden md:flex select-none items-center gap-3 px-4 py-1.5" role="timer" aria-label={ahora.toLocaleString('es-PE')}>
      <span className="flex flex-col gap-[3px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-[3px] w-3 rounded-sm ${(ahora.getSeconds() + i) % 4 === 0 ? 'bg-accent-electric shadow-[0_0_6px_#00d4ff]' : 'bg-accent-electric/25'}`} />
        ))}
      </span>
      <div className="leading-none">
        <p className="font-display text-[9px] font-semibold tracking-[0.28em] text-accent-energy">
          {DIAS[ahora.getDay()]} · {dos(ahora.getDate())} {MESES[ahora.getMonth()]} {ahora.getFullYear()}
        </p>
        <p className="mt-1 flex items-baseline font-display text-[22px] font-bold tracking-[0.08em] text-accent-electric [text-shadow:0_0_12px_rgba(0,212,255,0.55)]">
          {dos(ahora.getHours())}
          <span className={`mx-0.5 transition-opacity ${pulso ? 'opacity-100' : 'opacity-25'}`}>:</span>
          {dos(ahora.getMinutes())}
          <span className="ml-1.5 text-[13px] text-accent-energy [text-shadow:0_0_10px_rgba(251,191,36,0.5)]">{dos(ahora.getSeconds())}</span>
        </p>
      </div>
      <p className="self-end pb-0.5 font-mono text-[9px] leading-tight text-primary-400">LIMA<br />UTC−05</p>
    </div>
  )
}
