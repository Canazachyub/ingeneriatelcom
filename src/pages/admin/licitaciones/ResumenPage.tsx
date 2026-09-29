import { useCallback, useEffect, useRef, useState } from 'react'
import { FaGavel, FaTrophy, FaPercentage, FaBan, FaFileImport, FaSpinner, FaChartBar, FaUsers, FaFileInvoiceDollar, FaFileContract } from 'react-icons/fa'
import { api, LIC_LOCAL, LicResumen } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import { useToast } from '../../../context/ToastContext'
import { leerArchivosImportacion, money, pct, Pestanas, nombreLinea } from './licUtils'

function Kpi({ etiqueta, valor, icono, cargando }: { etiqueta: string; valor: string | number; icono: React.ReactNode; cargando: boolean }) {
  return (
    <div className="panel-hud p-4 md:p-5">
      <div className="flex items-center justify-between mb-2 text-accent-electric">{icono}</div>
      <p className="text-2xl md:text-3xl font-display font-bold text-white tabular-nums">
        {cargando ? <span className="inline-block h-7 w-14 bg-primary-800/70 animate-pulse align-middle" /> : valor}
      </p>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary-400 mt-1">{etiqueta}</p>
    </div>
  )
}

function GraficoPorAnio({ total, ganados }: { total: Record<string, number>; ganados: Record<string, number> }) {
  const anios = Array.from(new Set([...Object.keys(total), ...Object.keys(ganados)])).sort()
  if (!anios.length) {
    return <p className="text-primary-500 text-sm">Todavía no hay procesos importados para graficar por año.</p>
  }
  const max = Math.max(1, ...anios.map((a) => total[a] || 0))
  return (
    <div>
      <div className="flex items-center gap-4 mb-6 text-xs text-primary-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-electric" aria-hidden="true" /> Procesos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" aria-hidden="true" /> Ganados
        </span>
      </div>
      <div className="flex items-end gap-3 sm:gap-5 h-48 overflow-x-auto pb-1">
        {anios.map((a) => {
          const t = total[a] || 0
          const g = ganados[a] || 0
          return (
            <div key={a} className="flex flex-col items-center justify-end h-full gap-2 shrink-0" style={{ minWidth: 40 }}>
              <div className="flex items-end gap-1.5 h-full">
                <div className="relative flex items-end justify-center w-4 sm:w-5 h-full">
                  <span className="absolute -top-5 text-[10px] text-primary-300 tabular-nums">{t || ''}</span>
                  <div className="w-full rounded-t bg-accent-electric/70" style={{ height: `${(t / max) * 100}%`, minHeight: t ? 3 : 0 }} />
                </div>
                <div className="relative flex items-end justify-center w-4 sm:w-5 h-full">
                  <span className="absolute -top-5 text-[10px] text-emerald-300 tabular-nums">{g || ''}</span>
                  <div className="w-full rounded-t bg-emerald-400/80" style={{ height: `${(g / max) * 100}%`, minHeight: g ? 3 : 0 }} />
                </div>
              </div>
              <span className="text-[11px] text-primary-500 font-mono">{a}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function LicResumenPage() {
  const toast = useToast()
  const [resumen, setResumen] = useState<LicResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [importando, setImportando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const r = await api.licResumen()
    setCargando(false)
    if (r.success && r.data) setResumen(r.data)
    else setError(r.error || 'Error desconocido')
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const manejarSeleccion = async (files: FileList | null) => {
    if (!files || !files.length) return
    setImportando(true)
    try {
      const { payload, leidos, ignorados } = await leerArchivosImportacion(files)
      if (!leidos.length) {
        toast.error('Ningún archivo coincide con procesos/postores/acciones/competidores/experiencia/documentos.json')
        return
      }
      const r = await api.licImportar(payload)
      if (r.success) {
        toast.success(`Importado: ${leidos.join(', ')}${ignorados.length ? ` (ignorados: ${ignorados.join(', ')})` : ''}`)
        cargar()
      } else {
        toast.error(r.error || 'No se pudo importar')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Alguno de los archivos no es JSON válido')
    } finally {
      setImportando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <AdminLayout>
      <Pestanas grupo="licitaciones" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaGavel className="text-accent-electric" /> Estadísticas
            </h1>
            <p className="text-primary-400">
              Cómo nos va en las licitaciones: cuántas ganamos y con qué precio.
            </p>
          </div>
          {!LIC_LOCAL && (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="application/json"
                multiple
                className="hidden"
                onChange={(e) => manejarSeleccion(e.target.files)}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={importando}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {importando ? <FaSpinner className="animate-spin" /> : <FaFileImport />}
                {importando ? 'Importando…' : 'Importar JSON del vault'}
              </button>
            </div>
          )}
        </div>

        {LIC_LOCAL ? (
          <p className="text-xs text-primary-500 -mt-3">
            Modo local: estos datos se leen directo de los JSON del vault (no hace falta importar; edita el archivo y
            recarga la página).
          </p>
        ) : (
          <p className="text-xs text-primary-500 -mt-3">
            Selecciona uno o varios de: procesos.json, postores.json, acciones.json, competidores.json, experiencia.json,
            documentos.json, personal.json, contratos.json, facturas.json, propuestas.json (los exporta la skill{' '}
            <code className="text-primary-400">descarga-seace</code> del vault).
          </p>
        )}

        {cargando ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Kpi key={i} etiqueta="…" valor="" icono={<FaGavel />} cargando />
            ))}
          </div>
        ) : error ? (
          <ErrorCarga que="los indicadores de licitaciones" error={error} onReintentar={cargar} />
        ) : !resumen || resumen.procesos === 0 ? (
          <EmptyState
            icon={<FaGavel />}
            title="Todavía no hay licitaciones importadas"
            hint={
              LIC_LOCAL
                ? 'No se encontró contenido en los JSON del vault (LIC_DATA_DIR). Verifica que existan en esa carpeta.'
                : "Usa 'Importar JSON del vault' con los archivos que exporta la skill descarga-seace (01_GERENCIA/experiencia/web/*.json)."
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Kpi etiqueta="Licitaciones seguidas" valor={resumen.procesos} icono={<FaGavel />} cargando={false} />
              <Kpi etiqueta="Nos presentamos" valor={resumen.presentados} icono={<FaFileImport />} cargando={false} />
              <Kpi etiqueta="Ganados" valor={resumen.ganados} icono={<FaTrophy />} cargando={false} />
              <Kpi etiqueta="Ganamos (de las presentadas)" valor={pct(resumen.tasa_exito)} icono={<FaPercentage />} cargando={false} />
              <Kpi etiqueta="No nos presentamos" valor={resumen.no_presentados} icono={<FaBan />} cargando={false} />
              <Kpi etiqueta="Ofertamos en promedio (del precio base)" valor={pct(resumen.pct_vr_promedio_ganado)} icono={<FaChartBar />} cargando={false} />
              <Kpi etiqueta="Personal en la carpeta" valor={resumen.personas} icono={<FaUsers />} cargando={false} />
              <Kpi etiqueta="Contratos con documentos" valor={resumen.contratos_con_sustento} icono={<FaFileContract />} cargando={false} />
              <Kpi etiqueta="Total facturado" valor={money(resumen.facturado_total)} icono={<FaFileInvoiceDollar />} cargando={false} />
            </div>

            <div className="panel-hud p-5">
              <h2 className="font-display font-semibold text-white mb-4">Procesos y ganados por año</h2>
              <GraficoPorAnio total={resumen.procesos_por_anio} ganados={resumen.ganados_por_anio} />
            </div>

            {Object.keys(resumen.ganados_por_linea || {}).length > 0 && (
              <div className="panel-hud p-5">
                <h2 className="font-display font-semibold text-white mb-4">Ganadas por tipo de servicio</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(resumen.ganados_por_linea)
                    .filter(([, n]) => n > 0)
                    .map(([linea, n]) => (
                      <span key={linea} className="px-3 py-1.5 rounded-full text-xs bg-primary-800/60 text-primary-200 border border-primary-700/60">
                        {nombreLinea(linea)}: <b className="text-white">{n}</b>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
