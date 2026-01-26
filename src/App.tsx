import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import NotFoundPage from './pages/NotFoundPage'

// Paginas publicas adicionales
import ConsultaPostulacionPage from './pages/ConsultaPostulacionPage'
import AsistenciaPage from './pages/AsistenciaPage'

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

function App() {
  return (
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

      {/* Admin Routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<DashboardPage />} />
      <Route path="/admin/empleados" element={<EmployeesPage />} />
      <Route path="/admin/proyectos" element={<ProjectsPage />} />
      <Route path="/admin/bolsa-trabajo" element={<JobsManagementPage />} />
      <Route path="/admin/postulaciones" element={<ApplicationsPage />} />
      <Route path="/admin/mensajes" element={<MessagesPage />} />
      <Route path="/admin/asistencias" element={<AttendancePage />} />
      <Route path="/admin/reportes" element={<ReportsPage />} />
      <Route path="/admin/api-test" element={<ApiTestPage />} />

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
  )
}

export default App
