import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaUsers, FaSearch, FaGraduationCap, FaFolderOpen, FaSave, FaSpinner, FaLink, FaCheckCircle } from 'react-icons/fa'
import { api, Employee, LicPersonal } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { useToast } from '../../../context/ToastContext'
import { fecha, Pestanas, ocultarDni } from './licUtils'

function BarraExperiencia({ anios, max }: { anios: number; max: number }) {
  const ancho = max > 0 ? Math.max(3, (anios / max) * 100) : 0
  return (
    <div className="h-2 rounded-full bg-primary-800 overflow-hidden">
      <div className="h-full rounded-full bg-accent-electric" style={{ width: `${ancho}%` }} />
    </div>
  )
}

interface Edicion {
  empleado_vinculado: string
  notas: string
}

export default function LicPersonalPage() {
  const toast = useToast()
  const [lista, setLista] = useState<LicPersonal[]>([])
  const [empleados, setEmpleados] = useState<Employee[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [edicion, setEdicion] = useState<Record<string, Edicion>>({})
  const [guardandoDni, setGuardandoDni] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const [rp, re] = await Promise.all([api.licPersonal(), api.getEmployees()])
    setCargando(false)
    if (rp.success && rp.data) setLista(rp.data)
    else setError(rp.error || 'Error desconocido')
    if (re.success && re.data) setEmpleados(re.data)
  }

  useEffect(() => { cargar() }, [])

  const empleadosPorDni = useMemo(() => {
    const m = new Map<string, Employee>()
    empleados.forEach((e) => { if (e.dni) m.set(String(e.dni), e) })
    return m
  }, [empleados])

  const maxAnios = Math.max(1, ...lista.map((p) => Number(p.anios_experiencia) || 0))

  const filtrados = lista.filter((p) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || p.dni.includes(q)
  })

  const valor = (p: LicPersonal, campo: keyof Edicion): string => edicion[p.dni]?.[campo] ?? (p[campo] as string) ?? ''

  const marcar = (dni: string, cambios: Partial<Edicion>) => {
    setEdicion((prev) => {
      const base: Edicion = prev[dni] || { empleado_vinculado: '', notas: '' }
      return { ...prev, [dni]: { ...base, ...cambios } }
    })
  }

  const guardar = async (p: LicPersonal) => {
    const cambios = edicion[p.dni]
    if (!cambios) return
    setGuardandoDni(p.dni)
    const r = await api.licActualizarPersona({ dni: p.dni, ...cambios })
    setGuardandoDni(null)
    if (r.success) {
      setLista((prev) => prev.map((x) => (x.dni === p.dni ? { ...x, ...cambios } : x)))
      setEdicion((prev) => { const { [p.dni]: _q, ...resto } = prev; return resto })
      toast.success('Persona actualizada')
    } else {
      toast.error(r.error || 'No se pudo guardar')
    }
  }

  return (
    <AdminLayout>
      <Pestanas grupo="carpeta" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaUsers className="text-accent-electric" /> Personal clave
          </h1>
          <p className="text-primary-400">Nuestros profesionales: títulos, cargos y años de experiencia para presentarlos en una propuesta.</p>
        </div>

        {!cargando && !error && lista.length > 0 && (
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o DNI…"
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
        )}

        {cargando ? (
          <TableSkeleton rows={4} cols={4} />
        ) : error ? (
          <ErrorCarga que="el personal" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState icon={<FaUsers />} title="Todavía no hay personal importado" hint="Se llena al importar personal.json desde el vault." />
        ) : filtrados.length === 0 ? (
          <EmptyState icon={<FaSearch />} title="Sin coincidencias" hint="Prueba limpiar la búsqueda." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtrados.map((p) => {
              const empleado = empleadosPorDni.get(p.dni)
              const tieneCambios = !!edicion[p.dni]
              const cargosOrdenados = [...(p.cargos || [])].sort((a, b) => String(a.desde || '').localeCompare(String(b.desde || '')))
              return (
                <div key={p.dni} className="panel-hud p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold">{p.nombre}</p>
                      <p className="text-primary-500 text-xs font-mono" title="DNI oculto en la lista">{ocultarDni(p.dni)}</p>
                    </div>
                    {empleado ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 shrink-0">
                        <FaCheckCircle /> Empleado activo
                      </span>
                    ) : (
                      <span className="text-[11px] text-primary-500 shrink-0">Sin vincular</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-primary-400 mb-1">
                      <span>Experiencia</span>
                      <span className="tabular-nums text-white">{p.anios_experiencia || 0} años</span>
                    </div>
                    <BarraExperiencia anios={Number(p.anios_experiencia) || 0} max={maxAnios} />
                  </div>

                  {p.titulos && p.titulos.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-primary-500 mb-1.5"><FaGraduationCap /> Títulos</p>
                      <ul className="space-y-1 text-sm text-primary-200">
                        {p.titulos.map((t) => (
                          <li key={t.id} className="truncate" title={t.titulo}>{t.titulo} <span className="text-primary-500 text-xs">({fecha(t.fecha)})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cargosOrdenados.length > 0 && (
                    <div>
                      <p className="text-xs text-primary-500 mb-1.5">Cargos</p>
                      <ol className="space-y-2 border-l border-primary-800 pl-3">
                        {cargosOrdenados.map((c) => (
                          <li key={c.id} className="relative">
                            <span className="absolute -left-[15px] top-1 w-2 h-2 rounded-full bg-accent-electric" />
                            <p className="text-xs text-primary-200 leading-snug">{c.titulo}</p>
                            <p className="text-[11px] text-primary-500">{fecha(c.desde)} – {fecha(c.hasta)}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <Link
                    to={`/admin/licitaciones/documentos?dni=${encodeURIComponent(p.dni)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-accent-electric hover:underline"
                  >
                    <FaFolderOpen /> {p.documentos || 0} documento(s) en el acervo
                  </Link>

                  <div className="pt-3 border-t border-primary-800 space-y-2">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-primary-400 mb-1"><FaLink /> Vincular con empleado (nombre o DNI)</label>
                      <input
                        type="text"
                        value={valor(p, 'empleado_vinculado')}
                        onChange={(e) => marcar(p.dni, { empleado_vinculado: e.target.value })}
                        placeholder={empleado ? empleado.name : 'Ej: SUE-12345678 o nombre exacto'}
                        className="w-full px-3 py-1.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-primary-400 mb-1 block">Notas</label>
                      <input
                        type="text"
                        value={valor(p, 'notas')}
                        onChange={(e) => marcar(p.dni, { notas: e.target.value })}
                        placeholder="Observaciones…"
                        className="w-full px-3 py-1.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    {tieneCambios && (
                      <button
                        onClick={() => guardar(p)}
                        disabled={guardandoDni === p.dni}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-electric/20 text-accent-electric hover:bg-accent-electric/30 text-xs disabled:opacity-60"
                      >
                        {guardandoDni === p.dni ? <FaSpinner className="animate-spin" /> : <FaSave />} Guardar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
