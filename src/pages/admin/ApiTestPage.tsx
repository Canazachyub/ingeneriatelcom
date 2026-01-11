import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaPlay,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaServer,
  FaDatabase,
  FaUsers,
  FaProjectDiagram,
  FaBriefcase,
  FaEnvelope,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import { config } from '../../config/env'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  data?: unknown
  duration?: number
}

export default function ApiTestPage() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((t) => (t.name === name ? { ...t, ...updates } : t))
    )
  }

  const runAllTests = async () => {
    setIsRunning(true)

    const testList: TestResult[] = [
      { name: 'Verificar URL del API', status: 'pending' },
      { name: 'Test de conexion (getJobs)', status: 'pending' },
      { name: 'Login de admin', status: 'pending' },
      { name: 'Verificar token', status: 'pending' },
      { name: 'Obtener empleados', status: 'pending' },
      { name: 'Obtener proyectos', status: 'pending' },
      { name: 'Obtener convocatorias (admin)', status: 'pending' },
      { name: 'Obtener postulaciones', status: 'pending' },
      { name: 'Obtener mensajes de contacto', status: 'pending' },
      { name: 'Dashboard stats', status: 'pending' },
      { name: 'Enviar mensaje de contacto (test)', status: 'pending' },
    ]

    setTests(testList)

    // Test 1: Verificar URL
    const startTime1 = Date.now()
    updateTest('Verificar URL del API', { status: 'running' })
    if (config.appsScriptUrl) {
      updateTest('Verificar URL del API', {
        status: 'success',
        message: `URL configurada: ${config.appsScriptUrl.substring(0, 50)}...`,
        duration: Date.now() - startTime1,
      })
    } else {
      updateTest('Verificar URL del API', {
        status: 'error',
        message: 'URL no configurada en .env',
        duration: Date.now() - startTime1,
      })
      setIsRunning(false)
      return
    }

    // Test 2: Conexion basica
    const startTime2 = Date.now()
    updateTest('Test de conexion (getJobs)', { status: 'running' })
    try {
      const jobsResult = await api.getJobs()
      updateTest('Test de conexion (getJobs)', {
        status: jobsResult.success ? 'success' : 'error',
        message: jobsResult.success
          ? `${(jobsResult.data as unknown[])?.length || 0} convocatorias encontradas`
          : jobsResult.error,
        data: jobsResult,
        duration: Date.now() - startTime2,
      })
    } catch (e) {
      updateTest('Test de conexion (getJobs)', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime2,
      })
    }

    // Test 3: Login
    const startTime3 = Date.now()
    updateTest('Login de admin', { status: 'running' })
    try {
      const loginResult = await api.login('admin@telcom.com', 'telcom2017')
      updateTest('Login de admin', {
        status: loginResult.success ? 'success' : 'error',
        message: loginResult.success
          ? `Usuario: ${loginResult.data?.user?.name || 'Admin'}`
          : loginResult.error,
        data: loginResult,
        duration: Date.now() - startTime3,
      })
    } catch (e) {
      updateTest('Login de admin', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime3,
      })
    }

    // Test 4: Verify Token
    const startTime4 = Date.now()
    updateTest('Verificar token', { status: 'running' })
    try {
      const verifyResult = await api.verifyToken()
      updateTest('Verificar token', {
        status: verifyResult.success ? 'success' : 'error',
        message: verifyResult.success
          ? `Token valido para: ${verifyResult.data?.user?.email}`
          : verifyResult.error,
        data: verifyResult,
        duration: Date.now() - startTime4,
      })
    } catch (e) {
      updateTest('Verificar token', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime4,
      })
    }

    // Test 5: Empleados
    const startTime5 = Date.now()
    updateTest('Obtener empleados', { status: 'running' })
    try {
      const empResult = await api.getEmployees()
      updateTest('Obtener empleados', {
        status: empResult.success ? 'success' : 'error',
        message: empResult.success
          ? `${(empResult.data as unknown[])?.length || 0} empleados encontrados`
          : empResult.error,
        data: empResult,
        duration: Date.now() - startTime5,
      })
    } catch (e) {
      updateTest('Obtener empleados', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime5,
      })
    }

    // Test 6: Proyectos
    const startTime6 = Date.now()
    updateTest('Obtener proyectos', { status: 'running' })
    try {
      const projResult = await api.getProjects()
      updateTest('Obtener proyectos', {
        status: projResult.success ? 'success' : 'error',
        message: projResult.success
          ? `${(projResult.data as unknown[])?.length || 0} proyectos encontrados`
          : projResult.error,
        data: projResult,
        duration: Date.now() - startTime6,
      })
    } catch (e) {
      updateTest('Obtener proyectos', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime6,
      })
    }

    // Test 7: Jobs Admin
    const startTime7 = Date.now()
    updateTest('Obtener convocatorias (admin)', { status: 'running' })
    try {
      const jobsAdminResult = await api.getJobsAdmin()
      updateTest('Obtener convocatorias (admin)', {
        status: jobsAdminResult.success ? 'success' : 'error',
        message: jobsAdminResult.success
          ? `${(jobsAdminResult.data as unknown[])?.length || 0} convocatorias`
          : jobsAdminResult.error,
        data: jobsAdminResult,
        duration: Date.now() - startTime7,
      })
    } catch (e) {
      updateTest('Obtener convocatorias (admin)', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime7,
      })
    }

    // Test 8: Applications
    const startTime8 = Date.now()
    updateTest('Obtener postulaciones', { status: 'running' })
    try {
      const appsResult = await api.getApplicationsAdmin()
      updateTest('Obtener postulaciones', {
        status: appsResult.success ? 'success' : 'error',
        message: appsResult.success
          ? `${(appsResult.data as unknown[])?.length || 0} postulaciones`
          : appsResult.error,
        data: appsResult,
        duration: Date.now() - startTime8,
      })
    } catch (e) {
      updateTest('Obtener postulaciones', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime8,
      })
    }

    // Test 9: Contacts
    const startTime9 = Date.now()
    updateTest('Obtener mensajes de contacto', { status: 'running' })
    try {
      const contactsResult = await api.getContacts()
      updateTest('Obtener mensajes de contacto', {
        status: contactsResult.success ? 'success' : 'error',
        message: contactsResult.success
          ? `${(contactsResult.data as unknown[])?.length || 0} mensajes`
          : contactsResult.error,
        data: contactsResult,
        duration: Date.now() - startTime9,
      })
    } catch (e) {
      updateTest('Obtener mensajes de contacto', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime9,
      })
    }

    // Test 10: Dashboard
    const startTime10 = Date.now()
    updateTest('Dashboard stats', { status: 'running' })
    try {
      const dashResult = await api.getDashboardStats()
      updateTest('Dashboard stats', {
        status: dashResult.success ? 'success' : 'error',
        message: dashResult.success
          ? `Empleados: ${dashResult.data?.totalEmployees || 0}, Proyectos activos: ${dashResult.data?.activeProjects || 0}`
          : dashResult.error,
        data: dashResult,
        duration: Date.now() - startTime10,
      })
    } catch (e) {
      updateTest('Dashboard stats', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime10,
      })
    }

    // Test 11: Submit Contact (test message)
    const startTime11 = Date.now()
    updateTest('Enviar mensaje de contacto (test)', { status: 'running' })
    try {
      const contactResult = await api.submitContact({
        name: 'Test API',
        email: 'test@test.com',
        phone: '+51 999 999 999',
        subject: 'Test automatico del API',
        message: 'Este es un mensaje de prueba enviado desde la pagina de test del API. Fecha: ' + new Date().toISOString(),
      })
      updateTest('Enviar mensaje de contacto (test)', {
        status: contactResult.success ? 'success' : 'error',
        message: contactResult.success
          ? `Mensaje enviado con ID: ${contactResult.data?.id}`
          : contactResult.error,
        data: contactResult,
        duration: Date.now() - startTime11,
      })
    } catch (e) {
      updateTest('Enviar mensaje de contacto (test)', {
        status: 'error',
        message: String(e),
        duration: Date.now() - startTime11,
      })
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full bg-primary-600" />
      case 'running':
        return <FaSpinner className="animate-spin text-accent-electric" />
      case 'success':
        return <FaCheck className="text-green-500" />
      case 'error':
        return <FaTimes className="text-red-500" />
    }
  }

  const successCount = tests.filter((t) => t.status === 'success').length
  const errorCount = tests.filter((t) => t.status === 'error').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaServer className="text-accent-electric" />
              Test del API
            </h1>
            <p className="text-primary-400">
              Verifica que todos los endpoints del backend esten funcionando
            </p>
          </div>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-3 bg-accent-electric text-white rounded-lg hover:bg-accent-electric/90 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaPlay />
            )}
            {isRunning ? 'Ejecutando...' : 'Ejecutar Tests'}
          </button>
        </div>

        {/* API Info */}
        <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-4">
          <h3 className="text-sm font-medium text-primary-300 mb-2">URL del API:</h3>
          <code className="text-xs text-accent-electric break-all">
            {config.appsScriptUrl || 'No configurada'}
          </code>
        </div>

        {/* Results Summary */}
        {tests.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-4 text-center">
              <FaDatabase className="text-2xl text-primary-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{tests.length}</p>
              <p className="text-sm text-primary-400">Total Tests</p>
            </div>
            <div className="bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/30 p-4 text-center">
              <FaCheck className="text-2xl text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-500">{successCount}</p>
              <p className="text-sm text-green-400">Exitosos</p>
            </div>
            <div className="bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/30 p-4 text-center">
              <FaTimes className="text-2xl text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-500">{errorCount}</p>
              <p className="text-sm text-red-400">Fallidos</p>
            </div>
          </div>
        )}

        {/* Test Results */}
        {tests.length > 0 && (
          <div className="space-y-3">
            {tests.map((test, index) => (
              <motion.div
                key={test.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-primary-900/50 backdrop-blur-sm rounded-xl border p-4 ${
                  test.status === 'success'
                    ? 'border-green-500/30'
                    : test.status === 'error'
                    ? 'border-red-500/30'
                    : 'border-primary-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <p className="font-medium text-white">{test.name}</p>
                      {test.message && (
                        <p
                          className={`text-sm ${
                            test.status === 'success'
                              ? 'text-green-400'
                              : test.status === 'error'
                              ? 'text-red-400'
                              : 'text-primary-400'
                          }`}
                        >
                          {test.message}
                        </p>
                      )}
                    </div>
                  </div>
                  {test.duration !== undefined && (
                    <span className="text-xs text-primary-500">
                      {test.duration}ms
                    </span>
                  )}
                </div>

                {/* Show data for debugging */}
                {test.data && test.status === 'error' ? (
                  <div className="mt-3 p-3 bg-primary-800/50 rounded-lg">
                    <pre className="text-xs text-primary-300 overflow-auto max-h-32">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {tests.length === 0 && (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-8 text-center">
            <FaServer className="text-5xl text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Test del API Backend
            </h3>
            <p className="text-primary-400 mb-6 max-w-md mx-auto">
              Esta herramienta verifica que todos los endpoints del Google Apps Script
              esten funcionando correctamente.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto text-sm text-primary-300">
              <div className="flex items-center gap-2">
                <FaUsers className="text-accent-electric" />
                Empleados
              </div>
              <div className="flex items-center gap-2">
                <FaProjectDiagram className="text-accent-electric" />
                Proyectos
              </div>
              <div className="flex items-center gap-2">
                <FaBriefcase className="text-accent-electric" />
                Convocatorias
              </div>
              <div className="flex items-center gap-2">
                <FaEnvelope className="text-accent-electric" />
                Contacto
              </div>
              <div className="flex items-center gap-2">
                <FaDatabase className="text-accent-electric" />
                Dashboard
              </div>
              <div className="flex items-center gap-2">
                <FaCheck className="text-accent-electric" />
                Autenticacion
              </div>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl border border-yellow-500/30 p-4">
          <h4 className="font-medium text-yellow-400 mb-2">Importante:</h4>
          <ul className="text-sm text-yellow-300/80 space-y-1">
            <li>
              1. Asegurate de haber desplegado el Apps Script como "Web App" con acceso "Anyone"
            </li>
            <li>
              2. Ejecuta la funcion <code className="bg-yellow-500/20 px-1 rounded">setupAllSheets()</code> en el editor de Apps Script para crear las hojas
            </li>
            <li>
              3. Si ves errores de "No autorizado", verifica que el token sea valido
            </li>
            <li>
              4. La URL del API debe estar configurada en el archivo .env
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}
