import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, User } from '../api/appScriptApi'

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
