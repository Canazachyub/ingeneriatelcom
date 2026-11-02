import { ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  FaUsers,
  FaProjectDiagram,
  FaFileAlt,
  FaMapMarkerAlt,
  FaClock,
  FaBriefcase,
  FaUserCheck,
  FaExclamationTriangle,
  FaEnvelope,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaPaperclip,
  FaRedo,
  FaArrowRight,
  FaTabletAlt,
  FaIdBadge,
  FaGavel,
  FaGraduationCap,
  FaChartLine,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import Retrato, { PilaRetratos } from '../../components/admin/Retrato'
import { Anillo, CifraCard, Seccion, TituloGrupo } from '../../components/admin/ui'
import { useAuth } from '../../context/AuthContext'
import { nombreDe, puede, Modulo } from '../../utils/roles'
import {
  useDashboardStats,
  useAttendanceToday,
  useIncidenciasMes,
  useEstadoPlanilla,
  useApplicationsAdmin,
  useContacts,
  useJustificacionesRecientes,
  useJobsAdmin,
  useEvaluacionesAdmin,
  useProjects,
} from '../../hooks/queries'

// ── Centro de actividades ────────────────────────────────────────────────────
// Lo primero que ve el equipo al entrar: quién está trabajando hoy, qué requiere
// atención y con qué equipo avanza cada proyecto. Cada bloque carga por su
// cuenta; si uno falla muestra "no se pudo cargar" (nunca un 0 que parezca "no
// hay nada").

// Fecha local en formato ISO (yyyy-mm-dd), no UTC: a las 19:00 de Lima el UTC
// ya es el día siguiente.
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const saludo = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const texto = (v: unknown) => String(v ?? '').toLowerCase().trim()
const nombrePila = (n: string) => (n.includes(',') ? n.split(',')[1] : n).trim().split(/\s+/)[0] || n

interface EstadoConsulta {
  isLoading: boolean
  isError: boolean
  error?: unknown
  refetch: () => unknown
}

// Fila de "requiere atención": una cifra, qué significa y a dónde ir.
function Pendiente({ titulo, icono, href, consulta, valor, detalle, alerta }: {
  titulo: string
  icono: ReactNode
  href: string
  consulta: EstadoConsulta
  valor?: number | string
  detalle?: ReactNode
  alerta?: boolean
}) {
  return (
    <Link to={href} className={`tarjeta tarjeta-pulsable flex items-center gap-3 p-3.5 ${alerta && !consulta.isError ? 'border-accent-energy/50' : ''}`}>
      <span className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl ${alerta ? 'text-accent-energy bg-accent-energy/10' : 'text-accent-electric bg-accent-electric/10'}`}>
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white truncate">{titulo}</span>
        <span className="block text-xs text-primary-400 truncate">
          {consulta.isLoading ? 'Cargando…' : consulta.isError ? 'No se pudo cargar' : detalle}
        </span>
      </span>
      {consulta.isError ? (
        <button
          onClick={(e) => { e.preventDefault(); consulta.refetch() }}
          aria-label={`Reintentar ${titulo}`}
          className="text-rose-300 p-2"
        >
          <FaRedo />
        </button>
      ) : consulta.isLoading ? (
        <span className="h-6 w-8 rounded bg-primary-800 animate-pulse" />
      ) : (
        <span className={`font-mono text-2xl font-semibold tabular-nums ${alerta ? 'text-accent-energy' : 'text-white'}`}>{valor}</span>
      )}
    </Link>
  )
}

const ACCESOS: { nombre: string; href: string; icono: ReactNode; ayuda: string; modulo?: Modulo }[] = [
  { nombre: 'Asistencias', href: '/admin/asistencias', icono: <FaClock />, ayuda: 'Marcas, informes y justificaciones', modulo: 'asistencias' },
  { nombre: 'Planilla', href: '/admin/planilla', icono: <FaFileInvoiceDollar />, ayuda: 'Sueldos, tardanzas y descuentos', modulo: 'planilla' },
  { nombre: 'Personal', href: '/admin/empleados', icono: <FaUsers />, ayuda: 'Fichas, documentos y altas', modulo: 'personal' },
  { nombre: 'Proyectos', href: '/admin/proyectos', icono: <FaProjectDiagram />, ayuda: 'Obras y equipos', modulo: 'proyectos' },
  { nombre: 'Licitaciones', href: '/admin/licitaciones', icono: <FaGavel />, ayuda: 'Procesos y propuestas', modulo: 'licitaciones' },
  { nombre: 'Bolsa de trabajo', href: '/admin/bolsa-trabajo', icono: <FaBriefcase />, ayuda: 'Convocatorias y postulantes', modulo: 'bolsa' },
  { nombre: 'Mensajes', href: '/admin/mensajes', icono: <FaEnvelope />, ayuda: 'Contacto y reclamaciones', modulo: 'mensajes' },
  { nombre: 'Cursos', href: '/admin/capacitaciones', icono: <FaGraduationCap />, ayuda: 'Capacitaciones del personal', modulo: 'capacitaciones' },
  { nombre: 'Evaluaciones', href: '/admin/evaluaciones', icono: <FaClipboardList />, ayuda: 'Exámenes por calificar', modulo: 'capacitaciones' },
  { nombre: 'Reportes', href: '/admin/reportes', icono: <FaChartLine />, ayuda: 'Indicadores de la empresa', modulo: 'reportes' },
]

const ESTADO_PROYECTO: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'text-sky-300' },
  in_progress: { label: 'En progreso', color: 'text-emerald-300' },
  activo: { label: 'En progreso', color: 'text-emerald-300' },
  completed: { label: 'Completado', color: 'text-violet-300' },
  on_hold: { label: 'En espera', color: 'text-amber-300' },
}

export default function DashboardPage() {
  const { user } = useAuth()

  // Cada bloque solo se consulta y se muestra si el usuario tiene su módulo
  // (mismo criterio que el backend: MODULO_POR_ACCION_). Así no se lanzan
  // consultas que el servidor rechazaría con "Permisos insuficientes".
  const verAsistencias = puede(user, 'asistencias')
  const verBolsa = puede(user, 'bolsa')
  const verMensajes = puede(user, 'mensajes')
  const verCapacitaciones = puede(user, 'capacitaciones')
  const verPlanilla = puede(user, 'planilla')
  const verProyectos = puede(user, 'proyectos')
  const reducir = useReducedMotion()

  const hoy = new Date()
  const inicioMes = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const hace7 = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7))
  const hoyISO = isoLocal(hoy)

  const stats = useDashboardStats()
  const asistencia = useAttendanceToday(verAsistencias)
  // Carga escalonada: primero los indicadores y la asistencia de hoy; los
  // pendientes se piden cuando esa primera tanda terminó. Apps Script se pone
  // lento (y falla de a ratos) con 8+ consultas simultáneas del mismo usuario.
  const segundaTanda = !stats.isLoading && !asistencia.isLoading
  const incidencias = useIncidenciasMes(inicioMes, hoyISO, verPlanilla && segundaTanda)
  const estadoPlanilla = useEstadoPlanilla(verPlanilla && segundaTanda)
  // Sin sincronizar hace más de 2 días (o nunca registrado): las incidencias
  // del mes NO están calculadas y "0 pendientes" sería engañoso.
  const ultimaSync = estadoPlanilla.data?.cuando ? new Date(estadoPlanilla.data.cuando) : null
  const diasSinSync = ultimaSync ? Math.floor((Date.now() - ultimaSync.getTime()) / 86400000) : null
  const syncAtrasada = estadoPlanilla.isSuccess && (diasSinSync === null || diasSinSync > 2)
  const postulaciones = useApplicationsAdmin(verBolsa && segundaTanda)
  const mensajes = useContacts(verMensajes && segundaTanda)
  const justificaciones = useJustificacionesRecientes(hace7, verAsistencias && segundaTanda)
  const convocatorias = useJobsAdmin(verBolsa && segundaTanda)
  const evaluaciones = useEvaluacionesAdmin(verCapacitaciones && segundaTanda)
  const proyectos = useProjects()
  const roster = useQuery({
    queryKey: ['rosterDashboard'],
    queryFn: async () => (await api.getTrabajadores(false)).data || [],
    staleTime: 10 * 60 * 1000,
  })
  const asignaciones = useQuery({
    queryKey: ['asignacionesDashboard'],
    queryFn: async () => { const r = await api.getAssignments(); if (!r.success) throw new Error(r.error); return r.data || [] },
    enabled: verProyectos && segundaTanda,
    staleTime: 5 * 60 * 1000,
  })

  // ── Cálculos por bloque ──
  const totalHoy = asistencia.data?.totalEmpleados ?? 0
  const presentesHoy = asistencia.data?.presentes ?? 0
  const ausentesHoy = Math.max(0, totalHoy - presentesHoy)

  // Pase de lista: cada persona del roster con lo que marcó hoy
  const paseLista = useMemo(() => {
    const marcas = new Map((asistencia.data?.registros || []).map((r) => [String(r.dni), r]))
    return (roster.data || [])
      .map((t) => ({ ...t, marca: marcas.get(t.dni) }))
      .sort((a, b) => Number(!!b.marca) - Number(!!a.marca) || a.nombre.localeCompare(b.nombre))
  }, [roster.data, asistencia.data])
  const dentroHoy = paseLista.filter((p) => p.marca?.estado === 'dentro').length
  const salieronHoy = paseLista.filter((p) => p.marca?.estado === 'fuera').length

  const incPend = (incidencias.data || []).filter((i) => texto(i.estado) === 'pendiente')
  const incGraves = incPend.filter((i) => i.grave === true || texto(i.grave) === 'true').length

  // Postulaciones "sin revisar": pendiente, o sin estado (filas afectadas por el
  // antiguo fallo que guardaba el estado vacío).
  const postSinRevisar = (postulaciones.data || []).filter((p) => {
    const e = texto(p.status ?? p.estado)
    return e === '' || e === 'pendiente' || e === 'pending'
  }).length

  const msgPend = (mensajes.data || []).filter((m) => texto(m.estado) === 'pendiente').length
  const justRecientes = justificaciones.data || []
  const convActivas = (convocatorias.data || []).filter((c) => ['activo', 'active'].includes(texto(c.estado ?? c.status))).length
  const convTotal = (convocatorias.data || []).length
  const evalPorRevisar = (evaluaciones.data || []).filter((e) => texto(e.estado) === 'pendiente_revision').length

  // Proyectos vivos con su equipo (el id del trabajador es SUE-<dni>)
  const proyectosVivos = useMemo(() => {
    const equipo = new Map<string, { dni: string; nombre: string }[]>()
    ;(asignaciones.data || []).filter((a) => String(a.status) === 'active').forEach((a) => {
      equipo.set(a.projectId, [...(equipo.get(a.projectId) || []), { dni: String(a.employeeId).replace('SUE-', ''), nombre: a.employeeName }])
    })
    return (proyectos.data || [])
      .filter((p) => p.status !== 'completed')
      .map((p) => ({ ...p, equipo: equipo.get(p.id) || [] }))
      .sort((a, b) => b.equipo.length - a.equipo.length)
      .slice(0, 6)
  }, [proyectos.data, asignaciones.data])

  const s = stats.data
  const aparecer = (i: number) =>
    reducir ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.04 * i, duration: 0.3 } }
  const sedes = Object.entries(s?.employeesByCity || {}).sort((a, b) => b[1] - a[1])

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-[1500px]">
        {/* Encabezado */}
        <header className="pt-2 pb-1">
          <p className="marca-rotulo">Centro de mando</p>
          <h1 className="mt-1.5 text-2xl md:text-[32px] md:leading-tight font-bold text-white">
            {saludo()}, {nombreDe(user).split(' ')[0] || 'equipo'}
          </h1>
          <p className="text-primary-300 mt-1 text-sm first-letter:uppercase">
            {hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {verAsistencias && !asistencia.isLoading && !asistencia.isError && ` · ${presentesHoy} de ${totalHoy} marcaron hoy`}
          </p>
        </header>

        {/* Indicadores */}
        <section aria-label="Indicadores" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <CifraCard etiqueta="Trabajadores activos" valor={s?.totalEmployees ?? 0} icono={<FaUsers />} tono="cian" cargando={stats.isLoading} error={stats.isError} />
          {verAsistencias && <CifraCard etiqueta="Presentes hoy" valor={presentesHoy} ayuda={`${ausentesHoy} sin marcar`} icono={<FaUserCheck />} tono="verde" cargando={asistencia.isLoading} error={asistencia.isError} />}
          <CifraCard etiqueta="Proyectos activos" valor={s?.activeProjects ?? 0} icono={<FaProjectDiagram />} tono="azul" cargando={stats.isLoading} error={stats.isError} />
          {verBolsa && <CifraCard etiqueta="Convocatorias activas" valor={convActivas} ayuda={convActivas === 0 ? 'La web no muestra ofertas' : 'Visibles en la web'} icono={<FaBriefcase />} tono="ambar" cargando={convocatorias.isLoading} error={convocatorias.isError} />}
        </section>

        {/* Pase de lista: la pantalla empieza por las personas */}
        {verAsistencias && (
          <section className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
            <Seccion titulo="Asistencia de hoy" icono={<FaClock />} className="esquinas-hud">
              <div className="flex flex-col items-center gap-4">
                <Anillo
                  size={176}
                  grosor={20}
                  total={Math.max(1, totalHoy)}
                  tramos={[
                    { valor: dentroHoy, color: '#10b981', etiqueta: 'Trabajando' },
                    { valor: salieronHoy, color: '#3b82f6', etiqueta: 'Ya salieron' },
                  ]}
                >
                  <span className="font-mono text-4xl font-semibold leading-none text-accent-electric">
                    {totalHoy ? Math.round((presentesHoy / totalHoy) * 100) : 0}%
                  </span>
                  <span className="mt-1 text-xs text-primary-400">{presentesHoy} de {totalHoy}</span>
                </Anillo>
                <div className="grid w-full grid-cols-3 gap-2 text-center">
                  {[
                    { t: 'Trabajando', v: dentroHoy, c: 'text-emerald-400' },
                    { t: 'Salieron', v: salieronHoy, c: 'text-sky-300' },
                    { t: 'Sin marcar', v: ausentesHoy, c: 'text-amber-400' },
                  ].map((x) => (
                    <div key={x.t} className="rounded-xl border border-primary-800 bg-slate-800 px-1 py-2">
                      <p className="text-[11px] text-primary-400">{x.t}</p>
                      <p className={`font-mono text-lg font-semibold ${x.c}`}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Seccion>

            <Seccion
              titulo="Pase de lista"
              icono={<FaIdBadge />}
              className="min-w-0"
              acciones={<Link to="/admin/asistencias" className="text-xs font-medium text-accent-electric inline-flex items-center gap-1.5">Ver marcas <FaArrowRight className="text-[10px]" /></Link>}
            >
              {roster.isLoading || asistencia.isLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-slate-800 animate-pulse" />)}
                </div>
              ) : asistencia.isError ? (
                <button onClick={() => asistencia.refetch()} className="text-sm text-rose-300 inline-flex items-center gap-2"><FaExclamationTriangle /> No se pudo cargar — reintentar</button>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 2xl:grid-cols-8 gap-x-3 gap-y-4">
                  {paseLista.map((p, i) => (
                    <motion.div key={p.dni} {...aparecer(Math.min(i, 12))} className="text-center min-w-0">
                      <span className={`inline-block ${p.marca ? '' : 'opacity-55'}`}>
                        <Retrato
                          dni={p.dni}
                          nombre={p.nombre}
                          size={68}
                          estado={p.marca ? (p.marca.estado === 'fuera' ? 'fuera' : 'presente') : 'pendiente'}
                          titulo={`${p.nombre} · ${p.cargo}`}
                        />
                      </span>
                      <p className="mt-1.5 text-xs font-medium text-white truncate">{nombrePila(p.nombre)}</p>
                      <p className={`text-[11px] font-mono truncate ${p.marca ? (p.marca.estado === 'fuera' ? 'text-sky-300' : 'text-emerald-400') : 'text-amber-400/80'}`}>
                        {p.marca ? (p.marca.estado === 'fuera' ? `salió ${p.marca.checkOut}` : p.marca.checkIn) : 'sin marcar'}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </Seccion>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Requieren atención */}
          <section aria-labelledby="titulo-pendientes" className="min-w-0">
            <TituloGrupo id="titulo-pendientes" icono={<FaExclamationTriangle className="text-accent-energy" />}>Requieren atención</TituloGrupo>
            <div className="space-y-2.5">
              {verPlanilla && (
                <Pendiente
                  titulo="Incidencias de planilla"
                  icono={<FaFileInvoiceDollar />}
                  href="/admin/planilla"
                  consulta={incidencias}
                  valor={incPend.length}
                  alerta={incPend.length > 0 || syncAtrasada}
                  detalle={syncAtrasada
                    ? `Sin sincronizar ${diasSinSync === null ? 'desde el cambio de sistema' : `hace ${diasSinSync} días`}: pulsa Sincronizar`
                    : incPend.length ? `${incGraves} grave${incGraves === 1 ? '' : 's'} · injustificadas a las 48 h` : `Al día${ultimaSync ? ` · ${ultimaSync.toLocaleDateString('es-PE')}` : ''}`}
                />
              )}
              {verAsistencias && (
                <Pendiente
                  titulo="Justificaciones (7 días)"
                  icono={<FaPaperclip />}
                  href="/admin/asistencias"
                  consulta={justificaciones}
                  valor={justRecientes.length}
                  alerta={justRecientes.length > 0}
                  detalle={justRecientes.length ? justRecientes.slice(-3).map((j) => nombrePila(String(j.nombre || j.dni))).join(' · ') : 'Ninguna esta semana'}
                />
              )}
              {verBolsa && (
                <Pendiente
                  titulo="Postulaciones sin revisar"
                  icono={<FaFileAlt />}
                  href="/admin/postulaciones"
                  consulta={postulaciones}
                  valor={postSinRevisar}
                  alerta={postSinRevisar > 0}
                  detalle={postSinRevisar ? `De ${(postulaciones.data || []).length} recibidas` : 'Todas revisadas'}
                />
              )}
              {verMensajes && (
                <Pendiente
                  titulo="Mensajes pendientes"
                  icono={<FaEnvelope />}
                  href="/admin/mensajes"
                  consulta={mensajes}
                  valor={msgPend}
                  alerta={msgPend > 0}
                  detalle={msgPend ? 'Formulario de contacto' : 'Bandeja al día'}
                />
              )}
              {verCapacitaciones && (
                <Pendiente
                  titulo="Evaluaciones por calificar"
                  icono={<FaClipboardList />}
                  href="/admin/evaluaciones"
                  consulta={evaluaciones}
                  valor={evalPorRevisar}
                  alerta={evalPorRevisar > 0}
                  detalle={evalPorRevisar ? 'Esperan nota' : 'Sin exámenes pendientes'}
                />
              )}
              {verBolsa && (
                <Pendiente
                  titulo="Bolsa de trabajo"
                  icono={<FaBriefcase />}
                  href="/admin/bolsa-trabajo"
                  consulta={convocatorias}
                  valor={convActivas}
                  alerta={convActivas === 0}
                  detalle={`Activas de ${convTotal}`}
                />
              )}
            </div>
          </section>

          {/* Proyectos con su equipo */}
          <section aria-labelledby="titulo-proyectos" className="xl:col-span-2 min-w-0">
            <TituloGrupo id="titulo-proyectos" icono={<FaProjectDiagram />}>Proyectos y equipos</TituloGrupo>
            {proyectos.isLoading ? (
              <div className="grid md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 tarjeta animate-pulse" />)}</div>
            ) : proyectos.isError ? (
              <button onClick={() => proyectos.refetch()} className="text-sm text-rose-300 inline-flex items-center gap-2"><FaExclamationTriangle /> No se pudo cargar — reintentar</button>
            ) : !proyectosVivos.length ? (
              <p className="text-sm text-primary-400">No hay proyectos en marcha.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {proyectosVivos.map((p) => {
                  const est = ESTADO_PROYECTO[p.status] || { label: p.status, color: 'text-primary-300' }
                  return (
                    <Link key={p.id} to="/admin/proyectos" className="tarjeta tarjeta-pulsable block p-4">
                      <p className="text-sm font-semibold text-white line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                      <p className="mt-0.5 text-xs text-primary-400 flex items-center gap-1.5 truncate">
                        <FaMapMarkerAlt className="shrink-0" /> {p.city || 'Sin ciudad'} · <span className={est.color}>{est.label}</span>
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 min-h-[34px]">
                        <PilaRetratos personas={p.equipo} />
                        <span className="text-xs text-primary-400">{p.equipo.length ? `${p.equipo.length} persona${p.equipo.length === 1 ? '' : 's'}` : 'Sin equipo'}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {sedes.length > 0 && (
              <div className="mt-4 tarjeta p-4">
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><FaMapMarkerAlt className="text-accent-electric" /> Personal por sede</p>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {sedes.map(([sede, n]) => (
                    <div key={sede}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-primary-200">{sede}</span>
                        <span className="text-white font-semibold tabular-nums">{n}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-primary-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-accent-electric" style={{ width: `${s && s.totalEmployees > 0 ? (n / s.totalEmployees) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Módulos */}
        <section aria-labelledby="titulo-accesos">
          <TituloGrupo id="titulo-accesos">Módulos</TituloGrupo>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {ACCESOS.filter((a) => !a.modulo || puede(user, a.modulo)).map((a) => (
              <Link key={a.href} to={a.href} className="tarjeta tarjeta-pulsable flex items-center gap-3 p-3.5">
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-accent-electric/10 text-accent-electric">{a.icono}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white truncate">{a.nombre}</span>
                  <span className="block text-xs text-primary-400 truncate">{a.ayuda}</span>
                </span>
                <FaArrowRight className="shrink-0 text-[10px] text-primary-500" />
              </Link>
            ))}
            <a href="/asistencia" target="_blank" rel="noopener noreferrer" className="tarjeta tarjeta-pulsable flex items-center gap-3 p-3.5">
              <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-accent-electric/10 text-accent-electric"><FaTabletAlt /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white truncate">Kiosko</span>
                <span className="block text-xs text-primary-400 truncate">Abrir la pantalla de marcación</span>
              </span>
              <FaArrowRight className="shrink-0 text-[10px] text-primary-500" />
            </a>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
