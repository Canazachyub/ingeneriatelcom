import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './styles/globals.css'

// Tras publicar una versión nueva, una pestaña abierta con la anterior puede
// pedir un fragmento que ya no existe: se recarga UNA vez para tomar la nueva.
window.addEventListener('vite:preloadError', (e) => {
  try {
    const clave = 'recarga-por-version'
    const ultima = Number(sessionStorage.getItem(clave) || 0)
    if (Date.now() - ultima < 60000) return // evita bucles si el fallo es otro
    sessionStorage.setItem(clave, String(Date.now()))
    e.preventDefault()
    window.location.reload()
  } catch { /* sin sessionStorage: se deja el error visible */ }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
