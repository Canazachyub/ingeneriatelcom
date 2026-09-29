import { useState } from 'react'
import { FaSatelliteDish, FaExternalLinkAlt, FaSyncAlt } from 'react-icons/fa'
import AdminLayout from '../../../components/admin/AdminLayout'

// ============================================================
// Radar SEACE: el mapa de licitaciones del proyecto aparte "SEACE TELCOM"
// (C:\PROGRAMACION\SEACE TELCOM, desplegado en GitHub Pages) embebido en el
// panel. No se copia ni se duplica su lógica: se muestra tal cual, así cada
// proyecto se despliega por separado y el radar se actualiza solo.
// Si el sitio cambia de dirección, basta con editar RADAR_URL.
// ============================================================

const RADAR_URL = 'https://canazachyub.github.io/seacetelcom/'

export default function RadarPage() {
  const [recarga, setRecarga] = useState(0)
  const [cargando, setCargando] = useState(true)

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaSatelliteDish className="text-accent-electric" /> Radar SEACE
            </h1>
            <p className="text-primary-400 text-sm">
              Convocatorias y mapa de licitaciones de SEACE Intelligence (proyecto SEACE TELCOM).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCargando(true); setRecarga((n) => n + 1) }}
              className="px-3 py-2 border border-primary-700 text-primary-200 hover:border-accent-electric inline-flex items-center gap-2 text-sm"
            >
              <FaSyncAlt className={cargando ? 'animate-spin' : ''} /> Recargar
            </button>
            <a
              href={RADAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-primary-700 text-primary-200 hover:border-accent-electric inline-flex items-center gap-2 text-sm"
            >
              Abrir en pestaña nueva <FaExternalLinkAlt className="text-xs" />
            </a>
          </div>
        </div>

        <div className="relative border border-primary-700/60 bg-white overflow-hidden" style={{ height: 'calc(100vh - 13rem)', minHeight: 520 }}>
          {cargando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-primary-300 z-10 bg-primary-950">
              <div className="w-10 h-10 rounded-full border-4 border-accent-electric/20 border-t-accent-electric animate-spin" />
              <p className="font-mono text-xs tracking-[0.2em]">CARGANDO RADAR…</p>
              <p className="text-xs text-primary-500">La primera vez tarda unos segundos: descarga miles de procesos del SEACE.</p>
            </div>
          )}
          <iframe
            key={recarga}
            src={RADAR_URL}
            title="Radar SEACE — SEACE Intelligence"
            className="absolute inset-0 w-full h-full border-0"
            onLoad={() => setTimeout(() => setCargando(false), 4000)}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </AdminLayout>
  )
}
