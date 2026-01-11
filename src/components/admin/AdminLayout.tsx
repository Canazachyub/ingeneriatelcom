import { useState } from 'react'
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
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: FaHome },
  { name: 'Empleados', href: '/admin/empleados', icon: FaUsers },
  { name: 'Proyectos', href: '/admin/proyectos', icon: FaProjectDiagram },
  { name: 'Bolsa de Trabajo', href: '/admin/bolsa-trabajo', icon: FaBriefcase },
  { name: 'Postulaciones', href: '/admin/postulaciones', icon: FaFileAlt },
  { name: 'Mensajes', href: '/admin/mensajes', icon: FaEnvelope },
  { name: 'Test API', href: '/admin/api-test', icon: FaServer },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-electric"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="min-h-screen bg-primary-950">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-primary-900 border-r border-primary-800 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-primary-800">
            <Link to="/admin" className="flex items-center gap-2">
              <FaBolt className="text-2xl text-accent-electric" />
              <span className="font-display font-bold text-white">Admin Panel</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-primary-400 hover:text-white"
            >
              <FaTimes />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-electric/20 text-accent-electric'
                      : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                  }`}
                >
                  <item.icon className="text-lg" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-primary-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent-electric/20 rounded-full flex items-center justify-center">
                <span className="text-accent-electric font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.name}</p>
                <p className="text-primary-400 text-sm truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <FaSignOutAlt />
              <span>Cerrar Sesion</span>
            </button>
          </div>

          {/* Back to site */}
          <div className="p-4 border-t border-primary-800">
            <Link
              to="/"
              className="block text-center text-primary-400 hover:text-accent-electric text-sm transition-colors"
            >
              Volver al sitio web
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-primary-950/90 backdrop-blur-sm border-b border-primary-800">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-primary-400 hover:text-white"
            >
              <FaBars className="text-xl" />
            </button>
            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-display font-semibold text-white lg:hidden">
                Admin Panel
              </h1>
            </div>
            <div className="text-sm text-primary-400">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
