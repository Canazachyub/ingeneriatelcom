import { normalizarNombre, useRetratos } from '../../hooks/useRetratos'

export const iniciales = (n: string) =>
  String(n || '?').replace(/,/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

export type EstadoRetrato = 'presente' | 'fuera' | 'pendiente' | 'neutro'

interface RetratoProps {
  dni?: string
  nombre: string
  /** Lado en píxeles; sin `size` llena el contenedor (tarjetas de Personal) */
  size?: number
  estado?: EstadoRetrato
  className?: string
  titulo?: string
}

/** Retrato de unidad: foto de ficha, selfie del kiosko o iniciales. */
export default function Retrato({ dni, nombre, size, estado = 'neutro', className = '', titulo }: RetratoProps) {
  const { porDni, dniDe } = useRetratos()
  const clave = dni || dniDe[normalizarNombre(nombre)]
  const foto = clave ? porDni[clave]?.url : undefined
  const estilo = size ? { width: size, height: size } : undefined
  const letra = size ? { fontSize: Math.max(10, size * 0.34) } : { fontSize: 34 }
  return (
    <span className={`retrato-unidad ${size ? '' : 'w-full h-full'} ${className}`} style={estilo} data-estado={estado} title={titulo || nombre}>
      {foto ? <img src={foto} alt={`Foto de ${nombre}`} draggable={false} /> : <span style={letra}>{iniciales(nombre)}</span>}
    </span>
  )
}

/** Fila de retratos encimados con "+N" al final. */
export function PilaRetratos({ personas, max = 6, size = 34 }: { personas: { dni?: string; nombre: string }[]; max?: number; size?: number }) {
  if (!personas.length) return null
  const resto = personas.length - max
  return (
    <span className="pila-retratos inline-flex items-center">
      {personas.slice(0, max).map((p) => <Retrato key={p.dni || p.nombre} dni={p.dni} nombre={p.nombre} size={size} />)}
      {resto > 0 && (
        <span className="retrato-unidad" style={{ width: size, height: size }} title={`${resto} más`}>
          <span className="text-[11px]">+{resto}</span>
        </span>
      )}
    </span>
  )
}
