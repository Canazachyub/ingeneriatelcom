import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  FaUsers,
  FaProjectDiagram,
  FaFileAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaClock,
  FaBriefcase,
  FaUserCheck,
  FaExclamationTriangle,
  FaChartLine,
  FaEnvelope,
  FaGraduationCap,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaPaperclip,
  FaRedo,
  FaArrowRight,
  FaTabletAlt,
  FaCalendarAlt,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
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
} from '../../hooks/queries'

// ── Centro de actividades ────────────────────────────────────────────────────
// Lo primero que ve el equipo al entrar: qué requiere atención HOY, con un
// enlace directo a donde se resuelve. Cada bloque carga por su cuenta; si uno
// falla muestra "no se pudo cargar" (nunca un 0 que parezca "no hay nada").

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

interface EstadoConsulta {
  isLoading: boolean
  isError: boolean
  error?: unknown
  refetch: () => unknown
}

// Tarjeta de "requiere atención". `valor` es la cifra principal; `alerta`
// resalta la tarjeta cuando hay algo pendiente.
function Pendiente({
  titulo,
  icono,
  href,
  consulta,
  valor,
  unidad,
  detalle,
  alerta,
  accion,
}: {
  titulo: string
  icono: ReactNode
  href: string
  consulta: EstadoConsulta
  valor?: number | string
  unidad?: string
  detalle?: ReactNode
  alerta?: boolean
  accion: string
}) {
  const borde = consulta.isError
    ? 'border-rose-500/30'
    : alerta
    ? 'border-accent-energy/50 shadow-[0_0_24px_rgba(251,191,36,0.08)]'
    : 'border-primary-700/50'

  return (
    <div className={`relative flex flex-col bg-primary-900/40 backdrop-blur-sm border ${borde} p-5 transition-colors hover:border-accent-electric/40`}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`w-9 h-9 flex items-center justify-center border ${alerta ? 'text-accent-energy border-accent-energy/40 bg-accent-energy/10' : 'text-accent-electric border-accent-electric/30 bg-accent-electric/10'}`}>
          {icono}
        </span>
        <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-primary-300">{titulo}</h3>
        {alerta && !consulta.isError && !consulta.isLoading && (
          <span className="ml-auto w-2 h-2 rounded-full bg-accent-energy animate-pulse" aria-label="Requiere atención" />
        )}
      </div>

      {consulta.isLoading ? (
        <div className="space-y-2 animate-pulse" aria-busy="true">
          <div className="h-8 w-16 bg-primary-800/70" />
          <div className="h-3 w-3/4 bg-primary-800/50" />
        </div>
      ) : consulta.isError ? (
        <div className="text-sm">
          <p className="text-rose-300 flex items-center gap-1.5">
            <FaExclamationTriangle /> No se pudo cargar
          </p>
          <p className="text-primary-500 text-xs mt-1">Los datos siguen en el servidor.</p>
          <button
            onClick={() => consulta.refetch()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent-electric hover:underline"
          >
            <FaRedo /> Reintentar
          </button>
        </div>
      ) : (
        <>
          <p className="text-3xl font-display font-bold text-white tabular-nums">
            {valor}
            {unidad && <span className="ml-1.5 text-sm font-body font-normal text-primary-400">{unidad}</span>}
          </p>
          {detalle && <div className="mt-1.5 text-xs text-primary-400 leading-relaxed">{detalle}</div>}
        </>
      )}

      <Link
        to={href}
        className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent-electric hover:gap-2.5 transition-all"
      >
        {accion} <FaArrowRight className="text-[10px]" />
      </Link>
    </div>
  )
}

function Kpi({ etiqueta, valor, icono, cargando, error }: { etiqueta: string; valor?: number; icono: ReactNode; cargando: boolean; error: boolean }) {
  return (
    <div className="panel-hud p-4 md:p-5">
      <div className="flex items-center justify-between mb-2 text-accent-electric">{icono}</div>
      <p className="text-2xl md:text-3xl font-display font-bold text-white tabular-nums">
        {cargando ? <span className="inline-block h-7 w-10 bg-primary-800/70 animate-pulse align-middle" /> : error ? '—' : valor ?? 0}
      </p>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary-400 mt-1">{etiqueta}</p>
    </div>
  )
}

const ACCESOS: { nombre: string; href: string; icono: ReactNode; externo?: boolean; modulo?: Modulo }[] = [
  { nombre: 'Asistencias', href: '/admin/asistencias', icono: <FaClock />, modulo: 'asistencias' },
  { nombre: 'Planilla', href: '/admin/planilla', icono: <FaFileInvoiceDollar />, modulo: 'planilla' },
  { nombre: 'Empleados', href: '/admin/empleados', icono: <FaUsers />, modulo: 'personal' },
  { nombre: 'Proyectos', href: '/admin/proyectos', icono: <FaProjectDiagram />, modulo: 'proyectos' },
  { nombre: 'Bolsa de trabajo', href: '/admin/bolsa-trabajo', icono: <FaBriefcase />, modulo: 'bolsa' },
  { nombre: 'Postulaciones', href: '/admin/postulaciones', icono: <FaFileAlt />, modulo: 'bolsa' },
  { nombre: 'Mensajes', href: '/admin/mensajes', icono: <FaEnvelope />, modulo: 'mensajes' },
  { nombre: 'Cursos', href: '/admin/capacitaciones', icono: <FaGraduationCap />, modulo: 'capacitaciones' },
  { nombre: 'Evaluaciones', href: '/admin/evaluaciones', icono: <FaClipboardList />, modulo: 'capacitaciones' },
  { nombre: 'Reportes', href: '/admin/reportes', icono: <FaChartLine />, modulo: 'reportes' },
  { nombre: 'Kiosko', href: '/asistencia', icono: <FaTabletAlt />, externo: true },
]

const ESTADO_PROYECTO: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: 'text-sky-300' },
  in_progress: { label: 'En progreso', color: 'text-emerald-300' },
  completed: { label: 'Completados', color: 'text-violet-300' },
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

  // ── Cálculos por bloque ──
  const totalHoy = asistencia.data?.totalEmpleados ?? 0
  const presentesHoy = asistencia.data?.presentes ?? 0
  const ausentesHoy = Math.max(0, totalHoy - presentesHoy)

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

  const s = stats.data
  const aparecer = (i: number) =>
    reducir ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 * i, duration: 0.35 } }

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl">
        {/* Encabezado */}
        <header>
          <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent-electric/80 flex items-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-accent-electric/0 to-accent-electric/70" />
            Centro de actividades
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-display font-bold text-white">
            {saludo()}, {nombreDe(user).split(' ')[0] || 'equipo'}
          </h1>
          <p className="text-primary-400 mt-1 text-sm capitalize">
            {hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        {/* KPIs */}
        <section aria-label="Indicadores" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi etiqueta="Empleados activos" valor={s?.totalEmployees} icono={<FaUsers />} cargando={stats.isLoading} error={stats.isError} />
          {verAsistencias && <Kpi etiqueta="Presentes hoy" valor={presentesHoy} icono={<FaUserCheck />} cargando={asistencia.isLoading} error={asistencia.isError} />}
          <Kpi etiqueta="Proyectos activos" valor={s?.activeProjects} icono={<FaProjectDiagram />} cargando={stats.isLoading} error={stats.isError} />
          {verBolsa && <Kpi etiqueta="Convocatorias activas" valor={convActivas} icono={<FaBriefcase />} cargando={convocatorias.isLoading} error={convocatorias.isError} />}
        </section>

        {/* Requieren atención */}
        <section aria-labelledby="titulo-pendientes">
          <h2 id="titulo-pendientes" className="font-mono text-xs tracking-[0.25em] uppercase text-primary-300 mb-4 flex items-center gap-3">
            <FaExclamationTriangle className="text-accent-energy" />
            Requieren atención
            <span className="flex-1 h-px bg-gradient-to-r from-primary-700/70 to-transparent" />
          </h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {verAsistencias && (
              <motion.div {...aparecer(0)}>
                <Pendiente
                  titulo="Asistencia de hoy"
                  icono={<FaClock />}
                  href="/admin/asistencias"
                  consulta={asistencia}
                  valor={`${presentesHoy}/${totalHoy}`}
                  unidad="presentes"
                  alerta={ausentesHoy > 0}
                  detalle={ausentesHoy > 0 ? `${ausentesHoy} sin marcar aún` : 'Todo el personal marcó'}
                  accion="Ver marcas"
                />
              </motion.div>
            )}

            {verPlanilla && (
              <motion.div {...aparecer(1)}>
                <Pendiente
                  titulo="Incidencias pendientes"
                  icono={<FaFileInvoiceDollar />}
                  href="/admin/planilla"
                  consulta={incidencias}
                  valor={incPend.length}
                  unidad="del mes"
                  alerta={incPend.length > 0 || syncAtrasada}
                  detalle={syncAtrasada
                    ? `⚠ Sin sincronizar ${diasSinSync === null ? 'desde el cambio de sistema' : `hace ${diasSinSync} días`}: las incidencias del mes no están calculadas. Pulsa "Sincronizar incidencias" en Planilla.`
                    : incPend.length
                      ? `${incGraves} grave${incGraves === 1 ? '' : 's'} · se vuelven injustificadas a las 48 h`
                      : `Sin incidencias por revisar${ultimaSync ? ` · sincronizado ${ultimaSync.toLocaleDateString('es-PE')}` : ''}`}
                  accion="Revisar en planilla"
                />
              </motion.div>
            )}

            {verAsistencias && (
              <motion.div {...aparecer(2)}>
                <Pendiente
                  titulo="Justificaciones (7 días)"
                  icono={<FaPaperclip />}
                  href="/admin/asistencias"
                  consulta={justificaciones}
                  valor={justRecientes.length}
                  unidad="recibidas"
                  alerta={justRecientes.length > 0}
                  detalle={
                    justRecientes.length
                      ? justRecientes.slice(-3).map((j) => String(j.nombre || j.dni)).join(' · ')
                      : 'Ninguna en la última semana'
                  }
                  accion="Ver justificaciones"
                />
              </motion.div>
            )}

            {verBolsa && (
              <motion.div {...aparecer(3)}>
                <Pendiente
                  titulo="Postulaciones sin revisar"
                  icono={<FaFileAlt />}
                  href="/admin/postulaciones"
                  consulta={postulaciones}
                  valor={postSinRevisar}
                  unidad={`de ${(postulaciones.data || []).length}`}
                  alerta={postSinRevisar > 0}
                  detalle={postSinRevisar ? 'Pendientes o sin estado asignado' : 'Todas revisadas'}
                  accion="Revisar postulaciones"
                />
              </motion.div>
            )}

            {verMensajes && (
              <motion.div {...aparecer(4)}>
                <Pendiente
                  titulo="Mensajes pendientes"
                  icono={<FaEnvelope />}
                  href="/admin/mensajes"
                  consulta={mensajes}
                  valor={msgPend}
                  unidad={`de ${(mensajes.data || []).length}`}
                  alerta={msgPend > 0}
                  detalle={msgPend ? 'Formulario de contacto sin responder' : 'Bandeja al día'}
                  accion="Abrir mensajes"
                />
              </motion.div>
            )}

            {verCapacitaciones && (
              <motion.div {...aparecer(5)}>
                <Pendiente
                  titulo="Evaluaciones por calificar"
                  icono={<FaClipboardList />}
                  href="/admin/evaluaciones"
                  consulta={evaluaciones}
                  valor={evalPorRevisar}
                  unidad="enviadas"
                  alerta={evalPorRevisar > 0}
                  detalle={evalPorRevisar ? 'Exámenes esperando nota y retroalimentación' : 'Sin exámenes por calificar'}
                  accion="Calificar"
                />
              </motion.div>
            )}

            {verBolsa && (
              <motion.div {...aparecer(6)}>
                <Pendiente
                  titulo="Bolsa de trabajo"
                  icono={<FaBriefcase />}
                  href="/admin/bolsa-trabajo"
                  consulta={convocatorias}
                  valor={convActivas}
                  unidad={`activas de ${convTotal}`}
                  alerta={convActivas === 0}
                  detalle={convActivas === 0 ? 'La web pública no muestra ninguna oferta' : 'Visibles en la web pública'}
                  accion="Gestionar convocatorias"
                />
              </motion.div>
            )}
          </div>
        </section>

        {/* Personal y proyectos */}
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="bg-primary-900/40 border border-primary-700/50 p-5">
            <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-primary-300 mb-4 flex items-center gap-2">
              <FaMapMarkerAlt className="text-accent-electric" /> Personal por sede
            </h3>
            {stats.isLoading ? (
              <div className="h-24 bg-primary-800/40 animate-pulse" />
            ) : stats.isError ? (
              <button onClick={() => stats.refetch()} className="text-sm text-rose-300 flex items-center gap-1.5">
                <FaExclamationTriangle /> No se pudo cargar — <span className="text-accent-electric underline">reintentar</span>
              </button>
            ) : (
              <div className="space-y-3">
                {Object.entries(s?.employeesByCity || {}).map(([sede, n]) => (
                  <div key={sede}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-primary-200">{sede}</span>
                      <span className="text-white font-semibold tabular-nums">{n}</span>
                    </div>
                    <div className="h-1.5 bg-primary-800">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-electric"
                        style={{ width: `${s && s.totalEmployees > 0 ? (n / s.totalEmployees) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(s?.employeesByCity || {}).length === 0 && <p className="text-sm text-primary-500">Sin datos de sede</p>}
              </div>
            )}
          </div>

          <div className="bg-primary-900/40 border border-primary-700/50 p-5">
            <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-primary-300 mb-4 flex items-center gap-2">
              <FaProjectDiagram className="text-accent-electric" /> Proyectos por estado
            </h3>
            {stats.isLoading ? (
              <div className="h-24 bg-primary-800/40 animate-pulse" />
            ) : stats.isError ? (
              <button onClick={() => stats.refetch()} className="text-sm text-rose-300 flex items-center gap-1.5">
                <FaExclamationTriangle /> No se pudo cargar — <span className="text-accent-electric underline">reintentar</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(s?.projectsByStatus || {}).map(([estado, n]) => {
                  const cfg = ESTADO_PROYECTO[estado] || { label: estado, color: 'text-primary-300' }
                  return (
                    <div key={estado} className="border border-primary-700/40 bg-primary-950/40 p-3">
                      <p className="text-2xl font-display font-bold text-white tabular-nums">{n}</p>
                      <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
                    </div>
                  )
                })}
                {Object.keys(s?.projectsByStatus || {}).length === 0 && <p className="text-sm text-primary-500">Sin proyectos</p>}
              </div>
            )}
          </div>
        </section>

        {/* Accesos rápidos */}
        <section aria-labelledby="titulo-accesos">
          <h2 id="titulo-accesos" className="font-mono text-xs tracking-[0.25em] uppercase text-primary-300 mb-4 flex items-center gap-3">
            <FaCheckCircle className="text-accent-electric" />
            Accesos rápidos
            <span className="flex-1 h-px bg-gradient-to-r from-primary-700/70 to-transparent" />
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {ACCESOS.filter((a) => !a.modulo || puede(user, a.modulo)).map((a) => {
              const clase = 'group flex flex-col items-center gap-2 p-4 bg-primary-900/40 border border-primary-700/50 hover:border-accent-electric/50 hover:bg-accent-electric/5 transition-colors text-center'
              const contenido = (
                <>
                  <span className="text-xl text-accent-electric group-hover:scale-110 transition-transform">{a.icono}</span>
                  <span className="text-xs text-primary-200">{a.nombre}</span>
                </>
              )
              return a.externo ? (
                <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
              ) : (
                <Link key={a.href} to={a.href} className={clase}>{contenido}</Link>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-primary-500 flex items-center gap-1.5">
            <FaCalendarAlt /> Las cifras se actualizan al volver a esta pantalla (cada 2 minutos como máximo).
          </p>
        </section>
      </div>
    </AdminLayout>
  )
}
