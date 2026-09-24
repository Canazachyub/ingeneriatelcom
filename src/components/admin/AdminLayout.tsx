import { useEffect, useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaHome,
  FaUsers,
  FaProjectDiagram,
  FaBriefcase,
  FaFileAlt,
  FaEnvelope,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaBolt,
  FaServer,
  FaClock,
  FaChartLine,
  FaGraduationCap,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaGlobe,
  FaLock,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { esAdmin, nombreDe, rolDe } from '../../utils/roles'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  // true = sus acciones son nivel 'admin' en backend/01_router.gs: solo se
  // muestra a quien el backend deja operarla (esRolAdmin_). Así nadie ve una
  // sección que al usarla responde "Permisos insuficientes".
  soloAdmin?: boolean
}

const navigationSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Centro de actividades', href: '/admin', icon: FaHome },
      { name: 'Asistencias', href: '/admin/asistencias', icon: FaClock },
      { name: 'Planilla', href: '/admin/planilla', icon: FaFileInvoiceDollar, soloAdmin: true },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { name: 'Empleados', href: '/admin/empleados', icon: FaUsers },
      { name: 'Proyectos', href: '/admin/proyectos', icon: FaProjectDiagram },
    ],
  },
  {
    title: 'Reclutamiento',
    items: [
      { name: 'Bolsa de trabajo', href: '/admin/bolsa-trabajo', icon: FaBriefcase },
      { name: 'Postulaciones', href: '/admin/postulaciones', icon: FaFileAlt },
    ],
  },
  {
    title: 'Comunicación',
    items: [{ name: 'Mensajes', href: '/admin/mensajes', icon: FaEnvelope }],
  },
  {
    title: 'Capacitaciones',
    items: [
      { name: 'Gestión de cursos', href: '/admin/capacitaciones', icon: FaGraduationCap },
      { name: 'Evaluaciones', href: '/admin/evaluaciones', icon: FaClipboardList },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Reportes', href: '/admin/reportes', icon: FaChartLine },
      { name: 'Test API', href: '/admin/api-test', icon: FaServer, soloAdmin: true },
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

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const enLinea = useEnLinea()

  // Cerrar el menú móvil al navegar
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

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

  const admin = esAdmin(user)
  const nombre = nombreDe(user) || 'Usuario'
  const rol = rolDe(user)
  const etiquetaRol = ETIQUETA_ROL[rol] || (rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : 'Usuario')

  const secciones = navigationSections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.soloAdmin || admin) }))
    .filter((s) => s.items.length > 0)

  const esActivo = (href: string) =>
    href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href)

  const fecha = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-primary-950">
      {/* Rejilla táctica de fondo (estática, solo CSS) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

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
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#081324] border-r border-primary-800/70 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú del panel"
      >
        <div className="flex flex-col h-full">
          {/* Marca */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary-800/70">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <span
                className="w-9 h-9 flex items-center justify-center bg-accent-electric/10 border border-accent-electric/40 text-accent-electric"
                style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
              >
                <FaBolt />
              </span>
              <span className="leading-tight">
                <span className="block font-display font-bold text-white text-sm">TELCOM</span>
                <span className="block font-mono text-[9px] tracking-[0.25em] text-accent-electric/80 uppercase">
                  Centro de mando
                </span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
              className="lg:hidden w-9 h-9 flex items-center justify-center text-primary-400 hover:text-white"
            >
              <FaTimes />
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {secciones.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 mb-1.5 font-mono text-[10px] tracking-[0.25em] uppercase text-primary-500">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const activo = esActivo(item.href)
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        aria-current={activo ? 'page' : undefined}
                        className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 text-sm transition-colors duration-200 ${
                          activo
                            ? 'bg-accent-electric/10 text-white'
                            : 'text-primary-300 hover:bg-primary-800/40 hover:text-white'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] transition-all ${
                            activo ? 'bg-accent-electric shadow-[0_0_10px_rgba(0,212,255,0.8)]' : 'bg-transparent'
                          }`}
                        />
                        <item.icon className={`text-base shrink-0 ${activo ? 'text-accent-electric' : 'text-primary-500'}`} />
                        <span className="truncate">{item.name}</span>
                        {item.soloAdmin && <FaLock className="ml-auto text-[10px] text-accent-energy/70" title="Solo administradores" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Usuario */}
          <div className="p-4 border-t border-primary-800/70 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-accent-electric/10 border border-accent-electric/30 flex items-center justify-center font-display font-bold text-accent-electric">
                {nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{nombre}</p>
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-400 truncate">{etiquetaRol}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-primary-300 border border-primary-700/60 hover:border-accent-electric/50 hover:text-accent-electric transition-colors"
              >
                <FaGlobe /> Sitio web
              </Link>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
              >
                <FaSignOutAlt /> Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-30 bg-primary-950/85 backdrop-blur-md border-b border-primary-800/70">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden w-10 h-10 flex items-center justify-center text-primary-300 hover:text-white border border-primary-700/60"
            >
              <FaBars />
            </button>
            <p className="hidden sm:block font-mono text-[11px] tracking-[0.15em] uppercase text-primary-400 capitalize">
              {fecha}
            </p>
            <div className="ml-auto flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase border ${
                  enLinea
                    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5'
                    : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                }`}
                title={enLinea ? 'Conexión a internet activa' : 'Sin conexión a internet'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${enLinea ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {enLinea ? 'En línea' : 'Sin conexión'}
              </span>
              <span className="hidden md:block text-sm text-primary-200 truncate max-w-[180px]">{nombre}</span>
            </div>
          </div>
        </header>

        <main className="relative p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
