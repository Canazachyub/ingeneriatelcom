import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { api } from './api/appScriptApi'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import NotFoundPage from './pages/NotFoundPage'

// Paginas publicas adicionales
import ConsultaPostulacionPage from './pages/ConsultaPostulacionPage'
import AsistenciaPage from './pages/AsistenciaPage'

// Paginas legales (lazy)
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))

// Capacitaciones
import CapacitacionesPage from './pages/CapacitacionesPage'
import EvaluacionPage from './pages/EvaluacionPage'

// Admin Pages
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import ProjectsPage from './pages/admin/ProjectsPage'
import JobsManagementPage from './pages/admin/JobsManagementPage'
import ApplicationsPage from './pages/admin/ApplicationsPage'
import MessagesPage from './pages/admin/MessagesPage'
import AttendancePage from './pages/admin/AttendancePage'
import ReportsPage from './pages/admin/ReportsPage'
import ApiTestPage from './pages/admin/ApiTestPage'
import CapacitacionesManagementPage from './pages/admin/CapacitacionesManagementPage'
import EvaluacionesAdminPage from './pages/admin/EvaluacionesPage'
import PlanillaPage from './pages/admin/PlanillaPage'

import { useAuth } from './context/AuthContext'
import { ToastProvider, useToast } from './context/ToastContext'

/**
 * Conecta los errores de transporte del cliente API al sistema de toasts,
 * para que un fallo de red o una respuesta HTML de Apps Script nunca quede
 * silencioso (antes se tragaban como listas vacías).
 */
function ApiErrorBridge() {
  const toast = useToast()
  const lastRef = useRef<{ message: string; at: number }>({ message: '', at: 0 })

  useEffect(() => {
    api.onTransportError((message) => {
      // Deduplicar el mismo mensaje en ráfaga (p. ej. dashboard hace 2 llamadas en paralelo)
      const now = Date.now()
      if (lastRef.current.message === message && now - lastRef.current.at < 3000) return
      lastRef.current = { message, at: now }
      toast.error(message)
    })
    return () => api.onTransportError(null)
  }, [toast])

  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent-electric border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ToastProvider>
    <ApiErrorBridge />
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <Layout>
            <HomePage />
          </Layout>
        }
      />
      <Route
        path="/bolsa-trabajo"
        element={
          <Layout>
            <JobsPage />
          </Layout>
        }
      />
      <Route
        path="/bolsa-trabajo/:id"
        element={
          <Layout>
            <JobDetailPage />
          </Layout>
        }
      />
      <Route
        path="/mi-postulacion"
        element={
          <Layout>
            <ConsultaPostulacionPage />
          </Layout>
        }
      />

      {/* Paginas legales */}
      <Route
        path="/terminos"
        element={
          <Layout>
            <Suspense fallback={<div className="min-h-screen bg-primary-950" />}>
              <TermsPage />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/privacidad"
        element={
          <Layout>
            <Suspense fallback={<div className="min-h-screen bg-primary-950" />}>
              <PrivacyPage />
            </Suspense>
          </Layout>
        }
      />

      {/* Asistencia - Sin Layout (pagina tipo kiosko) */}
      <Route path="/asistencia" element={<AsistenciaPage />} />

      {/* Capacitaciones - pública con Layout */}
      <Route
        path="/capacitaciones"
        element={
          <Layout>
            <CapacitacionesPage />
          </Layout>
        }
      />
      {/* Evaluación - Sin Layout (pantalla completa de examen) */}
      <Route path="/evaluacion/:id" element={<EvaluacionPage />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/empleados"
        element={
          <ProtectedRoute>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/proyectos"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bolsa-trabajo"
        element={
          <ProtectedRoute>
            <JobsManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/postulaciones"
        element={
          <ProtectedRoute>
            <ApplicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/mensajes"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/asistencias"
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/api-test"
        element={
          <ProtectedRoute>
            <ApiTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/capacitaciones"
        element={
          <ProtectedRoute>
            <CapacitacionesManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/evaluaciones"
        element={
          <ProtectedRoute>
            <EvaluacionesAdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/planilla"
        element={
          <ProtectedRoute>
            <PlanillaPage />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <Layout>
            <NotFoundPage />
          </Layout>
        }
      />
    </Routes>
    </ToastProvider>
  )
}

export default App
