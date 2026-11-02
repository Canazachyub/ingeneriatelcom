import { useEffect, useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaSatelliteDish, FaChartArea, FaBook,
  FaHome,
  FaUsers,
  FaProjectDiagram,
  FaBriefcase,
  FaFileAlt,
  FaEnvelope,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaServer,
  FaClock,
  FaChartLine,
  FaGraduationCap,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaGlobe,
  FaLock,
  FaSearch,
  FaUserShield,
  FaHistory,
  FaGavel,
  FaListAlt,
  FaUserFriends,
  FaFolderOpen,
  FaHardHat,
  FaFileArchive,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { MODULOS, Modulo, puede, nombreDe, rolDe } from '../../utils/roles'
import { LIC_LOCAL } from '../../api/appScriptApi'
import { useCargarRetratos } from '../../hooks/useRetratos'
import Retrato from './Retrato'
import RelojTerran from './RelojTerran'
import Buscador, { EntradaMenu } from './Buscador'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  // Módulo que exige el backend (MODULO_POR_ACCION_ / nivel admin en
  // backend/01_router.gs). Solo se muestra a quien `puede` usarlo, así nadie
  // ve una sección que al usarla responde "Permisos insuficientes".
  // Sin módulo = visible para cualquier sesión (Centro de actividades).
  modulo?: Modulo | 'soloAdmin'
  // Otras rutas que también resaltan este ítem (p. ej. las pestañas de
  // "Carpeta de la empresa": personal, documentos, contratos, experiencia)
  tambienActivo?: string[]
}

// true si el ítem requiere rol de administración (candado en el menú)
const requiereAdmin = (m?: Modulo | 'soloAdmin') =>
  m === 'soloAdmin' || !!MODULOS.find((x) => x.clave === m && x.soloAdmin)

const navigationSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Centro de actividades', href: '/admin', icon: FaHome },
      { name: 'Asistencias', href: '/admin/asistencias', icon: FaClock, modulo: 'asistencias' },
      { name: 'Planilla', href: '/admin/planilla', icon: FaFileInvoiceDollar, modulo: 'planilla' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { name: 'Empleados', href: '/admin/empleados', icon: FaUsers, modulo: 'personal' },
      { name: 'Proyectos', href: '/admin/proyectos', icon: FaProjectDiagram, modulo: 'proyectos' },
    ],
  },
  {
    title: 'Reclutamiento',
    items: [
      { name: 'Bolsa de trabajo', href: '/admin/bolsa-trabajo', icon: FaBriefcase, modulo: 'bolsa' },
      { name: 'Postulaciones', href: '/admin/postulaciones', icon: FaFileAlt, modulo: 'bolsa' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { name: 'Mensajes', href: '/admin/mensajes', icon: FaEnvelope, modulo: 'mensajes' },
      { name: 'Libro de Reclamaciones', href: '/admin/reclamaciones', icon: FaBook, modulo: 'mensajes' },
    ],
  },
  {
    title: 'Capacitaciones',
    items: [
      { name: 'Gestión de cursos', href: '/admin/capacitaciones', icon: FaGraduationCap, modulo: 'capacitaciones' },
      { name: 'Evaluaciones', href: '/admin/evaluaciones', icon: FaClipboardList, modulo: 'capacitaciones' },
    ],
  },
  {
    title: 'Licitaciones',
    items: [
      { name: 'Inicio', href: '/admin/licitaciones', icon: FaGavel, modulo: 'licitaciones' },
      { name: 'Servicios en ejecución', href: '/admin/licitaciones/servicios', icon: FaHardHat, modulo: 'licitaciones' },
      { name: 'Buscar licitaciones', href: '/admin/licitaciones/radar', icon: FaSatelliteDish, modulo: 'licitaciones' },
      { name: 'Mis licitaciones', href: '/admin/licitaciones/procesos', icon: FaListAlt, modulo: 'licitaciones', tambienActivo: ['/admin/licitaciones/estadisticas'] },
      { name: 'Carpeta de la empresa', href: '/admin/licitaciones/personal', icon: FaFolderOpen, modulo: 'licitaciones', tambienActivo: ['/admin/licitaciones/documentos', '/admin/licitaciones/contratos', '/admin/licitaciones/experiencia'] },
      { name: 'Competencia', href: '/admin/licitaciones/competidores', icon: FaUserFriends, modulo: 'licitaciones' },
      { name: 'Armar propuesta', href: '/admin/licitaciones/armar', icon: FaFileArchive, modulo: 'licitaciones' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Reportes', href: '/admin/reportes', icon: FaChartLine, modulo: 'reportes' },
      { name: 'Analítica web', href: '/admin/analitica', icon: FaChartArea, modulo: 'reportes' },
      { name: 'Usuarios', href: '/admin/usuarios', icon: FaUserShield, modulo: 'usuarios' },
      { name: 'Auditoría', href: '/admin/auditoria', icon: FaHistory, modulo: 'auditoria' },
      { name: 'Test API', href: '/admin/api-test', icon: FaServer, modulo: 'soloAdmin' },
    ],
  },
]

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  administrador: 'Administrador',
  manager: 'Gerencia',
  supervisor: 'Supervisor',
  rrhh: 'RR. HH.',
  empleado: 'Empleado',
  employee: 'Empleado',
}

// Estado de la conexión del navegador (sin llamadas extra al backend).
function useEnLinea() {
  const [enLinea, setEnLinea] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setEnLinea(true)
    const off = () => setEnLinea(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return enLinea
}

// Imagen de fondo de cada módulo (primera coincidencia: las rutas más largas van antes)
const FONDOS: [string, string][] = [
  ['/admin/licitaciones/servicios', 'b-proyectos'],
  ['/admin/licitaciones', 'b-licitaciones'],
  ['/admin/asistencias', 'b-asistencia'],
  ['/admin/planilla', 'b-planilla'],
  ['/admin/empleados', 'b-personal'],
  ['/admin/proyectos', 'b-proyectos'],
  ['/admin/bolsa-trabajo', 'b-reclutamiento'],
  ['/admin/postulaciones', 'b-reclutamiento'],
  ['/admin/mensajes', 'b-comunicacion'],
  ['/admin/reclamaciones', 'b-comunicacion'],
  ['/admin/capacitaciones', 'b-capacitaciones'],
  ['/admin/evaluaciones', 'b-capacitaciones'],
  ['/admin/reportes', 'b-reportes'],
  ['/admin/analitica', 'b-reportes'],
  ['/admin/usuarios', 'b-sistema'],
  ['/admin/auditoria', 'b-sistema'],
  ['/admin/api-test', 'b-sistema'],
  ['/admin', 'b-inicio'],
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const location = useLocation()
  const enLinea = useEnLinea()

  // Cerrar el menú móvil al navegar
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscando(true) }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  // Los retratos se piden unos segundos después de entrar: las cifras de la
  // pantalla tienen prioridad y Apps Script se pone lento con muchas consultas.
  const [cargarRetratos, setCargarRetratos] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setCargarRetratos(true), 6000)
    return () => clearTimeout(t)
  }, [])
  useCargarRetratos(cargarRetratos && isAuthenticated, { asistencias: puede(user, 'asistencias'), personal: puede(user, 'personal') })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-electric" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  const nombre = nombreDe(user) || 'Usuario'
  const rol = rolDe(user)
  const etiquetaRol = ETIQUETA_ROL[rol] || (rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : 'Usuario')

  const secciones = navigationSections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.modulo || puede(user, i.modulo)) }))
    .filter((s) => s.items.length > 0)

  // '/admin' y '/admin/licitaciones' son, ademas de un item de menu, el PREFIJO
  // de subrutas propias (licitaciones/procesos, /competidores...): sin el
  // match exacto, "Indicadores" quedaria resaltado tambien en esas subrutas.
  const esActivo = (href: string, tambien: string[] = []) =>
    href === '/admin' || href === '/admin/licitaciones'
      ? location.pathname === href
      : [href, ...tambien].some((h) => location.pathname.startsWith(h))

  const menu: EntradaMenu[] = secciones.flatMap((s) => s.items.map((i) => ({ nombre: i.name, href: i.href, icono: <i.icon />, grupo: s.title })))
  const fondo = FONDOS.find(([r]) => location.pathname.startsWith(r))?.[1]

  return (
    <div className="min-h-screen">
      {/* Fondo del menú móvil */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Menú lateral ── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-primary-950 border-r border-primary-800 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú del panel"
      >
        <div className="flex flex-col h-full">
          {/* Marca */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-primary-800">
            <Link to="/admin" className="flex items-center gap-3 min-w-0 flex-1">
              <img src="/assets/images/admin/isotipo.webp" alt="" className="h-10 w-10 drop-shadow-[0_4px_12px_rgba(0,212,255,0.25)]" />
              <span className="min-w-0">
                <span className="block font-display text-[15px] font-bold tracking-[0.14em] text-white">TELCOM</span>
                <span className="block text-[11px] text-primary-400">Centro de mando</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-primary-400 hover:text-white hover:bg-slate-800"
            >
              <FaTimes />
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {secciones.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 px-3 font-display text-[9px] font-bold uppercase tracking-[0.24em] text-primary-500">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const activo = esActivo(item.href, item.tambienActivo)
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        aria-current={activo ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          activo
                            ? 'bg-gradient-to-r from-blue-600/25 to-blue-600/5 text-white shadow-[inset_2px_0_0_#00d4ff]'
                            : 'text-primary-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <item.icon className={`text-[15px] shrink-0 ${activo ? 'text-accent-electric' : ''}`} />
                        <span className="truncate">{item.name}</span>
                        {requiereAdmin(item.modulo) && <FaLock className="ml-auto text-[10px] text-accent-energy/70" title="Solo administradores" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sitio web y salida */}
          <div className="grid grid-cols-2 gap-2 p-3 border-t border-primary-800">
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-300 hover:bg-slate-800 hover:text-accent-electric transition-colors"
            >
              <FaGlobe /> Sitio web
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-300 hover:bg-rose-600/15 hover:text-rose-300 transition-colors"
            >
              <FaSignOutAlt /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-30 bg-primary-900/85 backdrop-blur-md border-b border-primary-800">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-primary-300 hover:text-white hover:bg-slate-800"
            >
              <FaBars />
            </button>

            <button
              onClick={() => setBuscando(true)}
              aria-label="Buscar pantalla o trabajador"
              className="flex items-center gap-2.5 rounded-xl border border-primary-700 bg-slate-800/60 px-3 py-2 text-sm text-primary-400 hover:border-accent-electric/60 hover:text-white transition-colors sm:min-w-[260px]"
            >
              <FaSearch className="text-accent-electric" />
              <span className="hidden sm:inline">Buscar pantalla o trabajador</span>
              <kbd className="ml-auto hidden sm:inline font-mono text-[10px] border border-primary-700 rounded px-1.5 py-0.5">Ctrl K</kbd>
            </button>

            <div className="flex-1" />

            <div
              className={`hidden md:flex items-center gap-2 text-xs ${enLinea ? 'text-emerald-400' : 'text-rose-300'}`}
              title={enLinea ? 'Conexión a internet activa' : 'Sin conexión a internet'}
            >
              <span className={`h-2 w-2 rounded-full ${enLinea ? 'bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.15)]' : 'bg-rose-500'}`} />
              {enLinea ? 'En línea' : 'Sin conexión'}
            </div>
            <RelojTerran />

            <div className="flex items-center gap-3 border-l border-primary-800 pl-3">
              <div className="hidden sm:block text-right">
                <p className="max-w-[170px] truncate text-sm font-semibold text-white">{nombre}</p>
                <p className="text-[11px] font-semibold text-accent-energy">{etiquetaRol}</p>
              </div>
              <Retrato nombre={nombre} size={38} />
            </div>
          </div>
        </header>

        {/* Distintivo de modo local (VITE_LIC_LOCAL=1): solo en Licitaciones, para
            que quede clarísimo que estos datos NO tocan Apps Script de producción. */}
        {LIC_LOCAL && location.pathname.startsWith('/admin/licitaciones') && (
          <div className="sticky top-[59px] z-20 flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/40 text-amber-300 font-mono text-[10px] tracking-[0.2em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Modo local — leyendo JSON del vault, sin tocar producción
          </div>
        )}

        <div className="relative">
          {fondo && (
            <div className="fondo-modulo" aria-hidden="true">
              <img key={fondo} src={`/assets/images/admin/${fondo}.webp`} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </div>
          )}
          <main className="relative p-4 lg:p-6">{children}</main>
        </div>
      </div>

      <Buscador abierto={buscando} onCerrar={() => setBuscando(false)} menu={menu} verPersonal={puede(user, 'personal')} />
    </div>
  )
}
