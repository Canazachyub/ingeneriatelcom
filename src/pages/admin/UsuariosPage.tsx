import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  FaUserShield,
  FaPlus,
  FaEdit,
  FaKey,
  FaSpinner,
  FaCopy,
  FaTimes,
  FaInfoCircle,
  FaToggleOn,
  FaToggleOff,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import ErrorCarga from '../../components/admin/ErrorCarga'
import TableSkeleton from '../../components/common/TableSkeleton'
import { api, UsuarioPanel } from '../../api/appScriptApi'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

// Pantalla Usuarios (nivel admin). Backend: backend/13_usuarios.gs.
// Permisos por módulo: con rol de administración se tiene TODO; el resto de
// roles necesita marcar cada módulo. Planilla, Usuarios y Auditoría son solo
// para roles de administración (no se conceden por permiso).

interface ModuloInfo { clave: string; etiqueta: string; soloAdmin: boolean }

interface Formulario {
  id?: string
  nombre: string
  email: string
  rol: string
  rolOtro: string
  permisos: string[]
}

const FORM_VACIO: Formulario = { nombre: '', email: '', rol: 'operador', rolOtro: '', permisos: [] }

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  administrador: 'Administrador',
  manager: 'Gerencia',
  supervisor: 'Supervisor',
  rrhh: 'RR. HH.',
  operador: 'Operador',
  empleado: 'Empleado',
}

const etiquetaRol = (r: string) => ETIQUETA_ROL[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : '—')

function fechaLegible(v: string): string {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const inputCls =
  'w-full px-3 py-2.5 bg-primary-950/70 border border-primary-700/70 text-white placeholder-primary-500 text-sm focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric/40'

export default function UsuariosPage() {
  const toast = useToast()
  const { user } = useAuth()
  const reducir = useReducedMotion()

  const [usuarios, setUsuarios] = useState<UsuarioPanel[]>([])
  const [modulos, setModulos] = useState<ModuloInfo[]>([])
  const [rolesAdmin, setRolesAdmin] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  // Falló la carga ≠ no hay usuarios (ver ErrorCarga)
  const [errorCarga, setErrorCarga] = useState('')

  const [form, setForm] = useState<Formulario | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null)
  // Contraseña temporal: se muestra UNA vez
  const [credenciales, setCredenciales] = useState<{ nombre: string; email: string; tempPassword: string; motivo: string } | null>(null)

  const cargar = async () => {
    setCargando(true)
    setErrorCarga('')
    const r = await api.listarUsuarios()
    setCargando(false)
    if (r.success && r.data) {
      setUsuarios(r.data.usuarios || [])
      setModulos(r.data.modulos || [])
      setRolesAdmin(r.data.rolesAdmin || [])
    } else {
      setUsuarios([])
      setErrorCarga(r.error || 'Error desconocido')
    }
  }

  useEffect(() => { cargar() }, [])

  const modulosConcedibles = modulos.filter((m) => !m.soloAdmin)
  const opcionesRol = Array.from(new Set([...rolesAdmin, 'operador']))
  const rolFinal = (f: Formulario) => (f.rol === '__otro' ? f.rolOtro.trim().toLowerCase() : f.rol)
  const rolEsAdmin = (r: string) => rolesAdmin.includes(r)
  const miId = String((user as { id?: unknown } | null)?.id ?? '')

  const abrirNuevo = () => { setErrorForm(''); setForm({ ...FORM_VACIO }) }
  const abrirEdicion = (u: UsuarioPanel) => {
    setErrorForm('')
    const conocido = opcionesRol.includes(u.rol)
    setForm({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: conocido ? u.rol : '__otro',
      rolOtro: conocido ? '' : u.rol,
      permisos: u.permisos.filter((p) => p !== 'all'),
    })
  }

  const alternarPermiso = (clave: string) => {
    if (!form) return
    setForm({
      ...form,
      permisos: form.permisos.includes(clave) ? form.permisos.filter((p) => p !== clave) : [...form.permisos, clave],
    })
  }

  const guardar = async () => {
    if (!form) return
    const rol = rolFinal(form)
    if (!form.nombre.trim()) return setErrorForm('El nombre es obligatorio')
    if (!form.id && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setErrorForm('Correo no válido')
    if (!rol) return setErrorForm('El rol es obligatorio')
    setGuardando(true)
    setErrorForm('')
    if (form.id) {
      const r = await api.actualizarUsuario({ id: form.id, nombre: form.nombre.trim(), rol, permisos: form.permisos })
      setGuardando(false)
      if (!r.success) return setErrorForm(r.error || 'No se pudo guardar')
      toast.success('Usuario actualizado')
    } else {
      const r = await api.crearUsuario({ nombre: form.nombre.trim(), email: form.email.trim(), rol, permisos: form.permisos })
      setGuardando(false)
      if (!r.success || !r.data) return setErrorForm(r.error || 'No se pudo crear el usuario')
      setCredenciales({ nombre: form.nombre.trim(), email: r.data.email, tempPassword: r.data.tempPassword, motivo: 'Usuario creado' })
    }
    setForm(null)
    cargar()
  }

  const alternarEstado = async (u: UsuarioPanel) => {
    const nuevo = u.activo ? 'inactivo' : 'activo'
    const pregunta = u.activo
      ? `¿Desactivar a ${u.nombre || u.email}? No podrá entrar al panel (su sesión deja de funcionar en ~2 minutos).`
      : `¿Reactivar a ${u.nombre || u.email}?`
    if (!confirm(pregunta)) return
    setAccionEnCurso(u.id)
    const r = await api.actualizarUsuario({ id: u.id, estado: nuevo })
    setAccionEnCurso(null)
    if (!r.success) return toast.error(r.error || 'No se pudo cambiar el estado')
    toast.success(nuevo === 'activo' ? 'Usuario reactivado' : 'Usuario desactivado')
    cargar()
  }

  const restablecer = async (u: UsuarioPanel) => {
    if (!confirm(`¿Restablecer la contraseña de ${u.nombre || u.email}? Se generará una temporal y se enviará a ${u.email}. La actual dejará de funcionar.`)) return
    setAccionEnCurso(u.id)
    const r = await api.restablecerContrasena(u.id)
    setAccionEnCurso(null)
    if (!r.success || !r.data) return toast.error(r.error || 'No se pudo restablecer la contraseña')
    setCredenciales({ nombre: u.nombre || u.email, email: r.data.email, tempPassword: r.data.tempPassword, motivo: 'Contraseña restablecida' })
  }

  const copiar = async () => {
    if (!credenciales) return
    try {
      await navigator.clipboard.writeText(`Usuario: ${credenciales.email}\nContraseña temporal: ${credenciales.tempPassword}`)
      toast.success('Credenciales copiadas')
    } catch {
      toast.error('No se pudo copiar; selecciona el texto manualmente')
    }
  }

  const animModal = reducir
    ? {}
    : { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Encabezado */}
        <header className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent-electric/80">Sistema</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <FaUserShield className="text-accent-electric" /> Usuarios y permisos
            </h1>
            <p className="text-primary-400 text-sm mt-1">Quién entra al panel y qué módulos puede usar.</p>
          </div>
          <button onClick={abrirNuevo} className="btn-primary btn-hud inline-flex items-center gap-2 self-start sm:self-auto">
            <FaPlus /> Nuevo usuario
          </button>
        </header>

        <p className="text-xs text-primary-400 flex items-start gap-2 border border-primary-700/50 bg-primary-900/40 px-3 py-2">
          <FaInfoCircle className="mt-0.5 text-accent-electric shrink-0" />
          <span>
            Con rol de administración ({rolesAdmin.map(etiquetaRol).join(', ') || '—'}) se accede a todo. Los demás roles
            solo ven los módulos marcados. Los cambios de permisos se aplican en ~2 minutos (caché).
          </span>
        </p>

        {cargando ? (
          <TableSkeleton rows={5} cols={6} />
        ) : errorCarga ? (
          <ErrorCarga que="los usuarios" error={errorCarga} onReintentar={cargar} />
        ) : usuarios.length === 0 ? (
          <p className="text-primary-400 text-sm py-10 text-center">No hay usuarios registrados.</p>
        ) : (
          <div className="panel-hud overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-800 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-primary-400">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Módulos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Último acceso</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const soyYo = u.id === miId
                  return (
                    <tr key={u.id} className={`border-b border-primary-800/60 ${u.activo ? '' : 'opacity-50'}`}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{u.nombre || '—'} {soyYo && <span className="text-[10px] text-accent-electric font-mono">(tú)</span>}</p>
                        <p className="text-primary-400 text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-primary-200">{etiquetaRol(u.rol)}</span>
                        {u.esAdmin && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-accent-energy border border-accent-energy/40 bg-accent-energy/10">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.esAdmin ? (
                          <span className="text-xs text-primary-300">Todos los módulos</span>
                        ) : u.permisos.length === 0 ? (
                          <span className="text-xs text-amber-300">Sin módulos (solo ve el Centro de actividades)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.permisos.map((p) => (
                              <span key={p} className="px-1.5 py-0.5 text-[10px] font-mono text-accent-electric border border-accent-electric/30 bg-accent-electric/5">
                                {modulos.find((m) => m.clave === p)?.etiqueta || p}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${u.activo ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-primary-300 whitespace-nowrap">{fechaLegible(u.ultimo_acceso)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => abrirEdicion(u)} aria-label={`Editar a ${u.nombre || u.email}`} title="Editar rol y módulos"
                            className="w-9 h-9 flex items-center justify-center text-primary-300 hover:text-accent-electric hover:bg-primary-800/60">
                            <FaEdit />
                          </button>
                          <button onClick={() => restablecer(u)} disabled={accionEnCurso === u.id} aria-label={`Restablecer contraseña de ${u.nombre || u.email}`} title="Restablecer contraseña"
                            className="w-9 h-9 flex items-center justify-center text-primary-300 hover:text-accent-energy hover:bg-primary-800/60 disabled:opacity-40">
                            {accionEnCurso === u.id ? <FaSpinner className="animate-spin" /> : <FaKey />}
                          </button>
                          <button onClick={() => alternarEstado(u)} disabled={accionEnCurso === u.id || soyYo}
                            aria-label={u.activo ? `Desactivar a ${u.nombre || u.email}` : `Reactivar a ${u.nombre || u.email}`}
                            title={soyYo ? 'No puedes desactivarte a ti mismo' : u.activo ? 'Desactivar' : 'Reactivar'}
                            className={`w-9 h-9 flex items-center justify-center hover:bg-primary-800/60 disabled:opacity-30 ${u.activo ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {u.activo ? <FaToggleOn /> : <FaToggleOff />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Crear / editar ── */}
      <AnimatePresence>
        {form && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={reducir ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div {...animModal} role="dialog" aria-modal="true" aria-labelledby="titulo-form-usuario"
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0b1a30] border border-primary-700/70 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="titulo-form-usuario" className="text-lg font-display font-semibold text-white">
                  {form.id ? 'Editar usuario' : 'Nuevo usuario'}
                </h2>
                <button onClick={() => setForm(null)} aria-label="Cerrar" className="w-9 h-9 flex items-center justify-center text-primary-400 hover:text-white">
                  <FaTimes />
                </button>
              </div>

              <div>
                <label htmlFor="u-nombre" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Nombre</label>
                <input id="u-nombre" className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label htmlFor="u-email" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Correo</label>
                <input id="u-email" type="email" className={`${inputCls} ${form.id ? 'opacity-60' : ''}`} value={form.email} disabled={!!form.id}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@empresa.com" />
                {!form.id && <p className="text-[11px] text-primary-500 mt-1">Se enviará una contraseña temporal a este correo.</p>}
              </div>
              <div>
                <label htmlFor="u-rol" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Rol</label>
                <select id="u-rol" className={inputCls} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  {opcionesRol.map((r) => (
                    <option key={r} value={r}>{etiquetaRol(r)}{rolEsAdmin(r) ? ' — acceso total' : ''}</option>
                  ))}
                  <option value="__otro">Otro…</option>
                </select>
                {form.rol === '__otro' && (
                  <input className={`${inputCls} mt-2`} value={form.rolOtro} onChange={(e) => setForm({ ...form, rolOtro: e.target.value })} placeholder="Ej. contabilidad" aria-label="Nombre del rol" />
                )}
              </div>

              <fieldset>
                <legend className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-2">Módulos</legend>
                {rolEsAdmin(rolFinal(form)) ? (
                  <p className="text-sm text-primary-300 border border-accent-energy/30 bg-accent-energy/5 px-3 py-2">
                    Con este rol tiene acceso a <strong className="text-white">todos</strong> los módulos, incluidos Planilla, Usuarios y Auditoría.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {modulosConcedibles.map((m) => (
                        <label key={m.clave} className="flex items-center gap-2 px-3 py-2 border border-primary-700/60 hover:border-accent-electric/40 cursor-pointer text-sm text-primary-200">
                          <input type="checkbox" className="accent-cyan-400" checked={form.permisos.includes(m.clave)} onChange={() => alternarPermiso(m.clave)} />
                          {m.etiqueta}
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] text-primary-500 mt-2">Planilla, Usuarios y Auditoría requieren un rol de administración.</p>
                  </>
                )}
              </fieldset>

              {errorForm && <p role="alert" className="text-sm text-rose-300 border border-rose-500/40 bg-rose-500/10 px-3 py-2">{errorForm}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-primary-300 hover:text-white">Cancelar</button>
                <button onClick={guardar} disabled={guardando} className="btn-primary btn-hud inline-flex items-center gap-2 disabled:opacity-50">
                  {guardando && <FaSpinner className="animate-spin" />}
                  {form.id ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Credenciales (se muestran una sola vez) ── */}
      <AnimatePresence>
        {credenciales && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={reducir ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div {...animModal} role="dialog" aria-modal="true" aria-labelledby="titulo-cred-usuario"
              className="w-full max-w-md bg-[#0b1a30] border border-accent-energy/50 p-6 space-y-4">
              <h2 id="titulo-cred-usuario" className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <FaKey className="text-accent-energy" /> {credenciales.motivo}
              </h2>
              <p className="text-sm text-primary-300">Credenciales de <strong className="text-white">{credenciales.nombre}</strong>:</p>
              <div className="bg-primary-950 border border-primary-700/70 p-3 font-mono text-sm space-y-1 select-all">
                <p><span className="text-primary-500">Usuario:</span> <span className="text-white">{credenciales.email}</span></p>
                <p><span className="text-primary-500">Contraseña temporal:</span> <span className="text-accent-energy">{credenciales.tempPassword}</span></p>
              </div>
              <p className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                También se envió por correo. No se volverá a mostrar: cópiala ahora si la necesitas.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={copiar} className="px-4 py-2 text-sm border border-accent-electric/50 text-accent-electric hover:bg-accent-electric/10 inline-flex items-center gap-2">
                  <FaCopy /> Copiar
                </button>
                <button onClick={() => setCredenciales(null)} className="btn-primary btn-hud">Entendido</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
