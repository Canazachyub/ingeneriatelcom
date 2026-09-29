import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaGavel, FaSatelliteDish, FaListAlt, FaFolderOpen, FaUserFriends, FaArrowRight, FaTrophy, FaDoorOpen, FaBan,
} from 'react-icons/fa'
import { api, LicProceso, LicResumen } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'

// ============================================================
// Inicio de Licitaciones: "¿qué quieres hacer?". Pantalla pensada para quien
// entra por primera vez: 3 números en palabras simples y 4 botones grandes
// que llevan a cada bloque. Nada de siglas (VR, línea D…) aquí.
// ============================================================

const BLOQUES = [
  {
    a: '/admin/licitaciones/radar',
    icono: <FaSatelliteDish />,
    titulo: 'Buscar licitaciones',
    texto: 'Convocatorias nuevas del SEACE y el mapa de oportunidades.',
  },
  {
    a: '/admin/licitaciones/procesos',
    icono: <FaListAlt />,
    titulo: 'Mis licitaciones',
    texto: 'Todas en las que participamos: cuáles ganamos, con cuánto y contra quién.',
  },
  {
    a: '/admin/licitaciones/personal',
    icono: <FaFolderOpen />,
    titulo: 'Carpeta de la empresa',
    texto: 'Personal, documentos, contratos y experiencia listos para armar una propuesta.',
  },
  {
    a: '/admin/licitaciones/competidores',
    icono: <FaUserFriends />,
    titulo: 'Competencia',
    texto: 'Empresas que se presentan contra nosotros y cuánto suelen ofertar.',
  },
]

function Cifra({ icono, valor, texto, color }: { icono: JSX.Element; valor: string; texto: string; color: string }) {
  return (
    <div className="placa-acero p-5 pl-6 flex items-center gap-4">
      <span aria-hidden="true" className={`absolute left-0 top-4 bottom-4 w-1 ${color}`} />
      <span className="text-2xl text-slate-300">{icono}</span>
      <div>
        <p className="text-3xl font-display font-bold text-white tabular-nums leading-none">{valor}</p>
        <p className="text-sm text-slate-300 mt-1 leading-snug">{texto}</p>
      </div>
    </div>
  )
}

export default function InicioPage() {
  const [resumen, setResumen] = useState<LicResumen | null>(null)
  const [abiertas, setAbiertas] = useState<LicProceso[]>([])
  const [error, setError] = useState('')

  const cargar = async () => {
    setError('')
    const [r, p] = await Promise.all([api.licResumen(), api.licProcesos()])
    if (r.success && r.data) setResumen(r.data)
    else setError(r.error || 'Error desconocido')
    if (p.success && p.data) {
      setAbiertas(p.data.filter((x) => /abierto|en curso/i.test(String(x.resultado || ''))))
    }
  }

  useEffect(() => { cargar() }, [])

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
            <FaGavel className="text-accent-energy" /> Licitaciones
          </h1>
          <p className="text-primary-300 mt-1">¿Qué quieres hacer hoy?</p>
        </div>

        {/* 4 botones grandes */}
        <div className="grid sm:grid-cols-2 gap-4">
          {BLOQUES.map((b) => (
            <Link key={b.a} to={b.a} className="placa-acero group flex items-start gap-4 p-6 hover:brightness-125 transition">
              <span className="w-14 h-14 shrink-0 flex items-center justify-center bg-accent-energy text-[#111827] text-2xl">{b.icono}</span>
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-xl text-white">{b.titulo}</span>
                  <FaArrowRight className="text-slate-400 group-hover:text-accent-energy group-hover:translate-x-1 transition" />
                </span>
                <span className="block text-slate-300 mt-1 leading-snug">{b.texto}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Cómo nos va, en palabras */}
        <div>
          <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-slate-400 mb-3">
            <span className="text-accent-energy mr-2">◆</span>Cómo nos va
          </p>
          {error ? (
            <ErrorCarga que="el resumen de licitaciones" error={error} onReintentar={cargar} />
          ) : !resumen ? (
            <div className="grid sm:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="placa-acero h-24 animate-pulse" />)}</div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <Cifra
                icono={<FaTrophy />}
                valor={`${resumen.ganados} de ${resumen.presentados}`}
                texto="Ganamos esas licitaciones de las que nos presentamos"
                color="bg-green-400"
              />
              <Cifra
                icono={<FaDoorOpen />}
                valor={String(abiertas.length)}
                texto={abiertas.length === 1 ? 'Licitación abierta o en curso ahora' : 'Licitaciones abiertas o en curso ahora'}
                color="bg-accent-energy"
              />
              <Cifra
                icono={<FaBan />}
                valor={String(resumen.no_presentados)}
                texto="Seguimos pero no nos presentamos (para aprender de ellas)"
                color="bg-slate-400"
              />
            </div>
          )}
        </div>

        {abiertas.length > 0 && (
          <div className="placa-acero p-5">
            <p className="rotulo-estencil mb-3">Atención: abiertas ahora</p>
            <ul className="space-y-2">
              {abiertas.map((p) => (
                <li key={p.nomenclatura}>
                  <Link
                    to={`/admin/licitaciones/procesos/${encodeURIComponent(p.nomenclatura)}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 border border-slate-700 hover:border-accent-energy transition-colors"
                  >
                    <span>
                      <span className="block text-white font-semibold">{p.objeto}</span>
                      <span className="block text-xs text-slate-400">{p.entidad} · {p.nomenclatura}</span>
                    </span>
                    <span className="text-sm text-accent-energy whitespace-nowrap">{/abierto/i.test(String(p.resultado)) ? 'Abierta: puedes postular' : 'En curso (no nos presentamos)'} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
