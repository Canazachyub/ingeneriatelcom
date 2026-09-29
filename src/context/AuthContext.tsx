import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { api, User, ApiResponse } from '../api/appScriptApi'

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

// Solo se cierra sesión si el backend RECHAZÓ el token. Un fallo de transporte
// (sin red, timeout, 404 de la URL intermedia de Apps Script) o "Servidor
// ocupado" no dice nada sobre la validez de la sesión: expulsar al admin por
// eso era un falso cierre de sesión en horas de carga.
function esRechazoDeSesion(result: ApiResponse<unknown>): boolean {
  if (result.success || result.transporte) return false
  return !/ocupado|servidor|conexi[oó]n/i.test(result.error || '')
}

// ── Inicio optimista ────────────────────────────────────────
// Antes, al abrir cualquier URL del admin, toda la app esperaba a verifyToken
// (10-30 s con Apps Script lento) mostrando solo un spinner. Ahora, si hay
// token vigente y un usuario guardado, el panel se muestra al instante y la
// verificación corre por detrás. Es seguro: el backend valida el token en
// CADA consulta; esto solo evita la pantalla vacía.
const CLAVE_USUARIO = 'auth_user'
const VIGENCIA_TOKEN_MS = 24 * 60 * 60 * 1000 // igual que parseToken_ (backend)

// El token es base64url("userId|timestamp").firma — la parte legible dice
// cuándo se emitió; si ya pasó la vigencia no tiene sentido mostrar el panel.
function tokenVigente(token: string | null): boolean {
  if (!token) return false
  try {
    const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    const ts = parseInt(atob(b64).split('|')[1], 10)
    return !!ts && Date.now() - ts < VIGENCIA_TOKEN_MS
  } catch {
    return true // formato desconocido: que decida el backend
  }
}

function leerUsuarioGuardado(): User | null {
  try {
    if (!tokenVigente(api.getToken())) return null
    const raw = localStorage.getItem(CLAVE_USUARIO)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function guardarUsuario(u: User | null) {
  try {
    if (u) localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u))
    else localStorage.removeItem(CLAVE_USUARIO)
  } catch { /* sin almacenamiento: solo en memoria */ }
}

// Vista previa SOLO en `npm run dev`: con VITE_PREVIEW_ADMIN=1 en
// .env.development.local (no se sube a git) el panel abre sin login para
// revisar diseño. import.meta.env.DEV es false en `npm run build`, así que
// esta rama desaparece del sitio publicado. Sin token, las pantallas que
// consultan producción responden "No autorizado": úsese para Licitaciones en
// modo local (que no llama al backend).
const PREVIEW_ADMIN = import.meta.env.DEV && import.meta.env.VITE_PREVIEW_ADMIN === '1'
const USUARIO_PREVIEW: User = { id: 'preview', email: 'preview@local', name: 'Vista previa (local)', role: 'admin' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => (PREVIEW_ADMIN ? USUARIO_PREVIEW : leerUsuarioGuardado()))
  // Solo se espera a verifyToken si NO hay usuario guardado que mostrar
  const [isLoading, setIsLoading] = useState(() => !!api.getToken() && !leerUsuarioGuardado())
  const setUser = (u: User | null) => { guardarUsuario(u); setUserState(u) }
  const lastRevalidateRef = useRef(0)

  useEffect(() => {
    const verifyAuth = async () => {
      const token = api.getToken()
      if (token && !tokenVigente(token)) {
        api.setToken(null) // expirado: ni siquiera se consulta al backend
        setUser(null)
      } else if (token) {
        const result = await api.verifyToken()
        if (result.success && result.data?.user) {
          setUser(result.data.user)
        } else if (esRechazoDeSesion(result)) {
          api.setToken(null)
          setUser(null)
        }
        // Fallo pasajero (red, Apps Script lento): se conserva el token y la
        // próxima revalidación decide. Antes cualquier fallo cerraba la sesión.
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
      if (esRechazoDeSesion(result)) {
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
