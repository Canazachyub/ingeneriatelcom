import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { api, User } from '../api/appScriptApi'

// Revalidación de sesión: throttle minimo entre verificaciones al recuperar foco
const FOCUS_REVALIDATE_THROTTLE_MS = 60 * 1000
// Verificación de respaldo periódica
const BACKGROUND_REVALIDATE_INTERVAL_MS = 10 * 60 * 1000

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastRevalidateRef = useRef(0)

  useEffect(() => {
    const verifyAuth = async () => {
      const token = api.getToken()
      if (token) {
        const result = await api.verifyToken()
        if (result.success && result.data?.user) {
          setUser(result.data.user)
        } else {
          api.setToken(null)
        }
      }
      setIsLoading(false)
    }
    verifyAuth()
  }, [])

  // Revalidación de sesión en segundo plano (brecha M10): si el token expira o
  // el backend lo rechaza mientras la app ya está montada, cerramos sesión para
  // que ProtectedRoute redirija a /admin/login en vez de dejar un panel "zombie".
  useEffect(() => {
    const revalidate = async () => {
      const token = api.getToken()
      if (!token) return

      const result = await api.verifyToken()
      if (result.success) {
        if (result.data?.user) setUser(result.data.user)
        return
      }

      // Corte de red / backend caído: no expulsar al admin, solo un internet
      // intermitente. Únicamente cerramos sesión si el backend respondió
      // explícitamente que el token no es válido.
      const errMsg = result.error || ''
      const esErrorDeRed = errMsg.includes('Sin conexión') || errMsg.includes('servidor')
      if (!esErrorDeRed) {
        api.setToken(null)
        setUser(null)
      }
    }

    const handleFocus = () => {
      const now = Date.now()
      if (now - lastRevalidateRef.current < FOCUS_REVALIDATE_THROTTLE_MS) return
      lastRevalidateRef.current = now
      revalidate()
    }

    window.addEventListener('focus', handleFocus)
    const intervalId = setInterval(() => {
      lastRevalidateRef.current = Date.now()
      revalidate()
    }, BACKGROUND_REVALIDATE_INTERVAL_MS)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(intervalId)
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    const result = await api.login(email, password)
    setIsLoading(false)

    if (result.success && result.data?.user) {
      setUser(result.data.user)
      return { success: true }
    }
    return { success: false, error: result.error || 'Error de autenticacion' }
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
