import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { registrarVista } from './utils/analytics'
import { lazy as lazyReact, Suspense, useEffect, useRef, ComponentType } from 'react'

// Carga diferida con recuperación tras un deploy. GitHub Pages deja el
// index.html en caché ~10 min; si ese HTML viejo pide un archivo de la versión
// anterior (ya borrado), la pantalla quedaba EN BLANCO. Ahora, si falla la
// carga, se recarga la página una sola vez (marca en sessionStorage) y el
// navegador toma la versión nueva. Además el deploy usa --add (no borra
// archivos viejos). Ver docs/ADMIN.md §7.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazy<T extends ComponentType<any>>(cargar: () => Promise<{ default: T }>) {
  return lazyReact(() =>
    cargar().catch((err) => {
      const CLAVE = 'recarga_tras_deploy'
      let yaRecargo = false
      try { yaRecargo = sessionStorage.getItem(CLAVE) === '1' } catch { /* sin storage */ }
      if (!yaRecargo) {
        try { sessionStorage.setItem(CLAVE, '1') } catch { /* sin storage */ }
        window.location.reload()
        return new Promise<{ default: T }>(() => { /* la página se recarga */ })
      }
      throw err
    }).then((m) => {
      try { sessionStorage.removeItem('recarga_tras_deploy') } catch { /* sin storage */ }
      return m
    })
  )
}
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
const LibroReclamacionesPage = lazy(() => import('./pages/LibroReclamacionesPage'))

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
const UsuariosPage = lazy(() => import('./pages/admin/UsuariosPage'))
const AuditoriaPage = lazy(() => import('./pages/admin/AuditoriaPage'))
const ReclamacionesPage = lazy(() => import('./pages/admin/ReclamacionesPage'))
const AnaliticaPage = lazy(() => import('./pages/admin/AnaliticaPage'))
const LicResumenPage = lazy(() => import('./pages/admin/licitaciones/ResumenPage'))
const LicInicioPage = lazy(() => import('./pages/admin/licitaciones/InicioPage'))
const LicProcesosPage = lazy(() => import('./pages/admin/licitaciones/ProcesosPage'))
const LicProcesoDetallePage = lazy(() => import('./pages/admin/licitaciones/ProcesoDetallePage'))
const LicCompetidoresPage = lazy(() => import('./pages/admin/licitaciones/CompetidoresPage'))
const LicExperienciaPage = lazy(() => import('./pages/admin/licitaciones/ExperienciaPage'))
const LicPersonalPage = lazy(() => import('./pages/admin/licitaciones/PersonalPage'))
const LicContratosPage = lazy(() => import('./pages/admin/licitaciones/ContratosPage'))
const LicDocumentosPage = lazy(() => import('./pages/admin/licitaciones/DocumentosPage'))
const LicRadarPage = lazy(() => import('./pages/admin/licitaciones/RadarPage'))
const LicServiciosPage = lazy(() => import('./pages/admin/licitaciones/ServiciosPage'))
const LicArmarPropuestaPage = lazy(() => import('./pages/admin/licitaciones/ArmarPropuestaPage'))

import { useAuth } from './context/AuthContext'
import { ToastProvider, useToast } from './context/ToastContext'

/**
 * Conecta los errores de transporte del cliente API al sistema de toasts,
 * para que un fallo de red o una respuesta HTML de Apps Script nunca quede
 * silencioso (antes se tragaban como listas vacías).
 */
// Acciones del kiosko de asistencia: la pantalla ya reintenta y explica cada
// caso con su propio mensaje. Un toast rojo "El servidor tardó demasiado"
// mientras el registro sigue reintentando hacía creer al trabajador que había
// fallado (y volvía a marcar), aunque la marca sí se guardaba.
const ACCIONES_SIN_TOAST = new Set(['registrarAsistenciaFoto', 'getTrabajadores', 'subirJustificacion', 'registrarReclamo'])

function ApiErrorBridge() {
  const toast = useToast()
  const lastRef = useRef<{ message: string; at: number }>({ message: '', at: 0 })

  useEffect(() => {
    api.onTransportError((message, action) => {
      if (ACCIONES_SIN_TOAST.has(action)) return
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

// Envía una vista a Google Analytics en cada cambio de ruta (SPA)
function AnalyticsRutas() {
  const { pathname } = useLocation()
  useEffect(() => { registrarVista(pathname) }, [pathname])
  return null
}

function App() {
  return (
    <ToastProvider>
    <ApiErrorBridge />
    <AnalyticsRutas />
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
        path="/libro-reclamaciones"
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <LibroReclamacionesPage />
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
        path="/admin/analitica"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <AnaliticaPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/reclamaciones"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <ReclamacionesPage />
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
      <Route
        path="/admin/usuarios"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <UsuariosPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/auditoria"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <AuditoriaPage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Licitaciones (lazy) */}
      <Route
        path="/admin/licitaciones/armar"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicArmarPropuestaPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/servicios"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicServiciosPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicInicioPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/estadisticas"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicResumenPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/procesos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicProcesosPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/procesos/:nom"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicProcesoDetallePage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/competidores"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicCompetidoresPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/experiencia"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicExperienciaPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/personal"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicPersonalPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/contratos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicContratosPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/radar"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicRadarPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/licitaciones/documentos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <LicDocumentosPage />
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
