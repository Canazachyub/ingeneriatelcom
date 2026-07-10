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

// Capacitaciones (lazy: pesadas por webcam/proctoring)
const CapacitacionesPage = lazy(() => import('./pages/CapacitacionesPage'))
const EvaluacionPage = lazy(() => import('./pages/EvaluacionPage'))

// Admin Pages (lazy: code-splitting para reducir bundle publico)
const LoginPage = lazy(() => import('./pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const EmployeesPage = lazy(() => import('./pages/admin/EmployeesPage'))
const ProjectsPage = lazy(() => import('./pages/admin/ProjectsPage'))
const JobsManagementPage = lazy(() => import('./pages/admin/JobsManagementPage'))
const ApplicationsPage = lazy(() => import('./pages/admin/ApplicationsPage'))
const MessagesPage = lazy(() => import('./pages/admin/MessagesPage'))
const AttendancePage = lazy(() => import('./pages/admin/AttendancePage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const ApiTestPage = lazy(() => import('./pages/admin/ApiTestPage'))
const CapacitacionesManagementPage = lazy(() => import('./pages/admin/CapacitacionesManagementPage'))
const EvaluacionesAdminPage = lazy(() => import('./pages/admin/EvaluacionesPage'))
const PlanillaPage = lazy(() => import('./pages/admin/PlanillaPage'))

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

function PageLoader() {
  return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-accent-electric border-t-transparent rounded-full animate-spin" />
    </div>
  )
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

      {/* Asistencia - Sin Layout (pagina tipo kiosko) */}
      <Route path="/asistencia" element={<AsistenciaPage />} />

      {/* Paginas legales (lazy) */}
      <Route
        path="/terminos"
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <TermsPage />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/privacidad"
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <PrivacyPage />
            </Suspense>
          </Layout>
        }
      />

      {/* Capacitaciones - pública con Layout (lazy) */}
      <Route
        path="/capacitaciones"
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <CapacitacionesPage />
            </Suspense>
          </Layout>
        }
      />
      {/* Evaluación - Sin Layout (pantalla completa de examen) (lazy) */}
      <Route
        path="/evaluacion/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <EvaluacionPage />
          </Suspense>
        }
      />

      {/* Admin Routes (lazy) */}
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/empleados"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/proyectos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/bolsa-trabajo"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <JobsManagementPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/postulaciones"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <ApplicationsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/mensajes"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/asistencias"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/api-test"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <ApiTestPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/capacitaciones"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <CapacitacionesManagementPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/evaluaciones"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <EvaluacionesAdminPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/planilla"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <PlanillaPage />
            </ProtectedRoute>
          </Suspense>
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
