import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaMapMarkerAlt,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaUser,
  FaBackspace,
  FaRedo,
  FaWifi,
  FaArrowLeft,
  FaCamera,
  FaSun,
  FaMoon,
  FaFileAlt,
  FaPaperclip,
  FaSyncAlt,
  FaSignInAlt,
  FaSignOutAlt,
  FaWhatsapp,
} from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { api } from '../api/appScriptApi'
import { useGeolocation } from '../hooks/useGeolocation'
import {
  buscarTrabajador,
  TrabajadorFijo,
  EVENTOS,
  EventoRegistro,
  EVENTO_LABELS,
  tipoEvento,
  sugerirEvento,
} from '../data/trabajadores'

type ViewState = 'input' | 'menu' | 'camara' | 'justificacion' | 'success' | 'error'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MOTIVOS_JUSTIFICACION = [
  'Tardanza',
  'Inasistencia',
  'Salida anticipada',
  'Permiso médico',
  'Comisión de trabajo',
  'Otro',
]

export default function AsistenciaPage() {
  const [dni, setDni] = useState('')
  const [viewState, setViewState] = useState<ViewState>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [trabajador, setTrabajador] = useState<TrabajadorFijo | null>(null)
  const [eventoSel, setEventoSel] = useState<EventoRegistro | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [horaRegistro, setHoraRegistro] = useState('')
  const [countdown, setCountdown] = useState(6)
  const [successTipo, setSuccessTipo] = useState<'asistencia' | 'justificacion'>('asistencia')

  // Cámara
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camaraOk, setCamaraOk] = useState(false)
  const [camaraError, setCamaraError] = useState('')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  // Justificación
  const [motivo, setMotivo] = useState(MOTIVOS_JUSTIFICACION[0])
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)

  const { location, error: geoError, loading: geoLoading, getLocation } = useGeolocation()

  // Lista de trabajadores desde el backend (hoja sueldos, sin montos).
  // Los nuevos trabajadores creados en el panel aparecen aquí sin redeploy.
  const [listaTrabajadores, setListaTrabajadores] = useState<TrabajadorFijo[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [errorLista, setErrorLista] = useState(false)

  const cargarTrabajadores = useCallback(() => {
    setCargandoLista(true)
    setErrorLista(false)
    // Reintentos con espera creciente: a la hora de ingreso varios trabajadores
    // abren el kiosko a la vez y el backend (Apps Script) puede responder un
    // error transitorio. Solo si los 5 intentos fallan se muestra error.
    const ESPERAS = [1500, 3000, 5000, 8000]
    const intentar = async (intento: number): Promise<boolean> => {
      try {
        const res = await api.getTrabajadores()
        if (res.success && res.data && res.data.length > 0) {
          setListaTrabajadores(res.data)
          return true
        }
      } catch { /* se reintenta abajo */ }
      if (intento < ESPERAS.length) {
        await sleep(ESPERAS[intento])
        return intentar(intento + 1)
      }
      return false
    }
    intentar(0).then((ok) => {
      if (!ok) setErrorLista(true)
      setCargandoLista(false)
    })
  }, [])

  useEffect(() => {
    getLocation()
    cargarTrabajadores()
  }, [getLocation, cargarTrabajadores])

  // Countdown de reinicio en success/error
  useEffect(() => {
    if (viewState === 'success' || viewState === 'error') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReset()
            return 6
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [viewState])

  // ── Cámara ─────────────────────────────────────────────────
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamaraOk(true)
      setCamaraError('')
    } catch {
      setCamaraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
      setCamaraOk(false)
    }
  }

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamaraOk(false)
  }, [])

  // Reconectar stream si React remonta el <video> al cambiar de vista
  useEffect(() => {
    if (viewState !== 'camara') return
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [viewState, fotoPreview])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capturarFoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !camaraOk) return
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, 640, 480)
    setFotoPreview(canvas.toDataURL('image/jpeg', 0.8))
  }

  // ── Flujo ──────────────────────────────────────────────────
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setDni((prev) => prev.slice(0, -1))
    } else if (key === 'enter') {
      if (dni.length === 8) handleVerificarDni()
    } else if (dni.length < 8) {
      setDni((prev) => prev + key)
    }
  }

  const handleVerificarDni = () => {
    if (dni.length !== 8) return
    if (errorLista || cargandoLista) {
      setMensaje('No se pudo cargar la lista de trabajadores. Verifica tu conexión e intenta de nuevo.')
      setViewState('error')
      return
    }
    const t = buscarTrabajador(dni, listaTrabajadores)
    if (t) {
      setTrabajador(t)
      // Campo (sin correo): sin evento sugerido, el trabajador elige Ingreso/Salida.
      setEventoSel(t.registro_simple ? null : sugerirEvento())
      setViewState('menu')
    } else {
      setMensaje('DNI no registrado. Contacta al Coordinador General.')
      setViewState('error')
    }
  }

  const handleSeleccionEvento = (evento: EventoRegistro) => {
    setEventoSel(evento)
    setFotoPreview(null)
    setViewState('camara')
    getLocation()
    iniciarCamara()
  }

  const handleRegistrar = async () => {
    if (!trabajador || !eventoSel || !fotoPreview) return
    if (!location) {
      setMensaje('Se requiere GPS activo para registrar. Habilita la ubicación.')
      return
    }
    setIsLoading(true)
    const payload = {
      dni: trabajador.dni,
      nombre: trabajador.nombre,
      cargo: trabajador.cargo,
      evento: eventoSel,
      gps_lat: location.lat,
      gps_lng: location.lng,
      gps_accuracy: location.accuracy,
      fileContent: fotoPreview.split(',')[1],
      mimeType: 'image/jpeg',
    }
    try {
      let res = await api.registrarAsistenciaFoto(payload)
      // Reintentos ante CUALQUIER fallo transitorio (red caida, timeout,
      // "Sistema ocupado"). Caso clave: si el intento anterior SI escribio
      // en la hoja pero la respuesta se perdio en el camino, el reintento
      // responde "Ya registraste este evento hoy" — eso confirma el registro
      // y se muestra como exito (la hora exacta quedo guardada en el servidor).
      for (let intento = 1; !res.success && intento < 3; intento++) {
        await sleep(2500 * intento)
        res = await api.registrarAsistenciaFoto(payload)
        if (!res.success && res.error && res.error.indexOf('Ya registraste este evento hoy') !== -1) {
          res = {
            success: true,
            data: {
              evento: eventoSel,
              fecha: '',
              hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
              foto_url: '',
            },
          }
        }
      }
      if (res.success && res.data) {
        detenerCamara()
        setHoraRegistro(res.data.hora)
        setSuccessTipo('asistencia')
        setViewState('success')
      } else {
        setMensaje(res.error || 'Error al registrar asistencia')
        detenerCamara()
        setViewState('error')
      }
    } catch {
      setMensaje('Error de conexión. Intenta de nuevo.')
      detenerCamara()
      setViewState('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnviarJustificacion = async () => {
    if (!trabajador || !motivo) return
    setIsLoading(true)
    try {
      let fileContent: string | undefined
      let fileName: string | undefined
      let mimeType: string | undefined

      if (archivo) {
        if (archivo.size > 5 * 1024 * 1024) {
          setMensaje('El archivo no debe superar 5 MB')
          setIsLoading(false)
          return
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(archivo)
        })
        fileContent = dataUrl.split(',')[1]
        fileName = `just_${Date.now()}_${archivo.name}`
        mimeType = archivo.type || 'application/octet-stream'
      }

      const res = await api.subirJustificacion({
        dni: trabajador.dni,
        nombre: trabajador.nombre,
        cargo: trabajador.cargo,
        motivo,
        descripcion,
        fileContent,
        fileName,
        mimeType,
      })
      if (res.success) {
        setSuccessTipo('justificacion')
        setHoraRegistro(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }))
        setViewState('success')
      } else {
        setMensaje(res.error || 'Error al enviar justificación')
        setViewState('error')
      }
    } catch {
      setMensaje('Error de conexión. Intenta de nuevo.')
      setViewState('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = useCallback(() => {
    detenerCamara()
    setDni('')
    setViewState('input')
    setTrabajador(null)
    setEventoSel(null)
    setMensaje('')
    setHoraRegistro('')
    setCountdown(6)
    setFotoPreview(null)
    setMotivo(MOTIVOS_JUSTIFICACION[0])
    setDescripcion('')
    setArchivo(null)
  }, [detenerCamara])

  // Info de display del evento seleccionado (sirve para oficina y campo).
  const eventoInfo = eventoSel
    ? {
        label: EVENTO_LABELS[eventoSel] || 'Registro',
        horaRef: EVENTOS.find((e) => e.key === eventoSel)?.horaRef || '',
        tipo: tipoEvento(eventoSel),
      }
    : null

  return (
    <div className="flex flex-col bg-[#060d1f]" style={{ minHeight: '100dvh' }}>
      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-blue-800/10 blur-3xl" />
      </div>

      {/* Header compacto */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Volver al inicio"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <FaArrowLeft className="text-xs" />
          </Link>
          <div>
            <p className="text-[10px] font-mono text-cyan-400/70 tracking-widest uppercase">Ingeniería Telcom</p>
            <h1 className="text-base font-display font-bold text-white leading-tight">Control de Asistencia</h1>
          </div>
        </div>
        <GpsIndicator loading={geoLoading} location={location} error={geoError} />
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 flex flex-col px-4 pb-4 max-w-md w-full mx-auto">
        <AnimatePresence mode="wait">

          {/* ── Vista: Ingreso de DNI ── */}
          {viewState === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1"
            >
              <RelojTiempoReal />

              <div className="mb-5">
                <p className="text-center text-xs text-primary-400 mb-3 tracking-widest uppercase">
                  Ingresa tu DNI
                </p>
                <div className="flex justify-center gap-2.5">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const char = dni[i]
                    const isActive = i === dni.length
                    return (
                      <motion.div
                        key={i}
                        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-9 h-11 rounded-lg flex items-center justify-center text-lg font-bold font-mono transition-all duration-200 ${
                          char
                            ? 'bg-blue-600/30 border border-blue-500/60 text-white'
                            : isActive
                            ? 'bg-cyan-500/10 border-2 border-cyan-400/70 text-transparent'
                            : 'bg-white/5 border border-white/10 text-transparent'
                        }`}
                      >
                        {char || (isActive ? (
                          <span className="w-0.5 h-5 bg-cyan-400 rounded-full animate-pulse" />
                        ) : null)}
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {errorLista && (
                <p className="text-center text-xs text-rose-400 mb-4">
                  <FaExclamationTriangle className="inline mr-1" />
                  No se pudo cargar la lista de trabajadores.
                  <button
                    onClick={cargarTrabajadores}
                    className="ml-2 inline-flex items-center min-h-[44px] px-2 text-cyan-400 underline align-middle"
                  >
                    Reintentar
                  </button>
                </p>
              )}
              {cargandoLista && !errorLista && (
                <p className="text-center text-xs text-primary-500 mb-4">
                  <FaSpinner className="inline mr-1 animate-spin" />
                  Cargando lista de trabajadores...
                </p>
              )}

              <TecladoNumerico
                onKeyPress={handleKeyPress}
                onSubmit={handleVerificarDni}
                disabled={dni.length !== 8}
                isLoading={false}
              />
            </motion.div>
          )}

          {/* ── Vista: Menú de eventos ── */}
          {viewState === 'menu' && trabajador && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1 justify-center"
            >
              {/* Card trabajador */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-2xl text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white leading-tight">
                      {trabajador.nombre}
                    </h2>
                    <p className="text-sm text-cyan-400/90">{trabajador.cargo}</p>
                    <p className="text-xs text-primary-500 font-mono">DNI {trabajador.dni}</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-primary-400 mb-3 tracking-widest uppercase">
                {trabajador.registro_simple ? 'Registra tu asistencia' : '¿Qué deseas registrar?'}
              </p>

              {trabajador.registro_simple ? (
                /* CAMPO: Ingreso / Salida por turnos (sin horario fijo) */
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleSeleccionEvento('ingreso_campo')}
                    className="py-8 rounded-2xl font-bold bg-emerald-500/90 border border-emerald-400 text-white shadow-lg shadow-emerald-500/25 flex flex-col items-center gap-2.5 hover:bg-emerald-500 transition-all"
                  >
                    <FaSignInAlt className="text-3xl" />
                    <span className="text-base tracking-widest">INGRESO</span>
                  </button>
                  <button
                    onClick={() => handleSeleccionEvento('salida_campo')}
                    className="py-8 rounded-2xl font-bold bg-rose-500/90 border border-rose-400 text-white shadow-lg shadow-rose-500/25 flex flex-col items-center gap-2.5 hover:bg-rose-500 transition-all"
                  >
                    <FaSignOutAlt className="text-3xl" />
                    <span className="text-base tracking-widest">SALIDA</span>
                  </button>
                </div>
              ) : (
                /* OFICINA: 4 eventos */
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {EVENTOS.map((ev) => {
                    const sugerido = ev.key === eventoSel
                    const esManana = ev.key.includes('manana')
                    const esIngreso = ev.tipo === 'ingreso'
                    return (
                      <button
                        key={ev.key}
                        onClick={() => handleSeleccionEvento(ev.key)}
                        className={`relative py-5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center gap-1.5 overflow-hidden border ${
                          sugerido
                            ? esIngreso
                              ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                              : 'bg-rose-500/90 border-rose-400 text-white shadow-lg shadow-rose-500/25'
                            : 'bg-white/5 border-white/10 text-primary-200 hover:bg-white/10'
                        }`}
                      >
                        {esManana ? (
                          <FaSun className={`text-xl ${sugerido ? 'text-yellow-200' : 'text-yellow-400/70'}`} />
                        ) : (
                          <FaMoon className={`text-xl ${sugerido ? 'text-blue-100' : 'text-blue-300/70'}`} />
                        )}
                        <span className="text-sm leading-tight text-center">{ev.label}</span>
                        <span className={`text-xs font-mono font-normal ${sugerido ? 'text-white/80' : 'text-primary-500'}`}>
                          {ev.horaRef}
                        </span>
                        {sugerido && (
                          <span className="text-[10px] font-normal opacity-80">Sugerido</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Botón justificaciones */}
              <button
                onClick={() => { setViewState('justificacion') }}
                className="w-full py-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-400/20 transition-all mb-3"
              >
                <FaFileAlt />
                Presentar justificación
              </button>

              <button
                onClick={handleReset}
                className="w-full min-h-[44px] text-center text-sm text-primary-500 hover:text-primary-300 transition-colors py-2"
              >
                Cancelar
              </button>
            </motion.div>
          )}

          {/* ── Vista: Cámara ── */}
          {viewState === 'camara' && trabajador && eventoInfo && (
            <motion.div
              key="camara"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-3">
                <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest ${
                  eventoInfo.tipo === 'ingreso'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {eventoInfo.label.toUpperCase()}{eventoInfo.horaRef ? ` · ${eventoInfo.horaRef}` : ''}
                </span>
                <p className="text-xs text-primary-400 mt-2">
                  Toma una foto para confirmar tu registro
                </p>
              </div>

              {/* Preview cámara / foto */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 mb-4" style={{ aspectRatio: '4/3' }}>
                {!fotoPreview ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {camaraOk && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        EN VIVO
                      </div>
                    )}
                    {!camaraOk && !camaraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-400 gap-2">
                        <FaSpinner className="text-2xl animate-spin" />
                        <span className="text-xs">Iniciando cámara...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <img src={fotoPreview} alt="Foto capturada" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {camaraError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-2">
                  <FaExclamationTriangle className="mt-0.5 shrink-0" />
                  <div>
                    {camaraError}
                    <button
                      onClick={iniciarCamara}
                      className="inline-flex items-center min-h-[44px] mt-1 px-2 -ml-2 text-cyan-400 underline text-xs"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}

              {/* GPS status */}
              {location ? (
                <p className="text-center text-xs text-primary-500 mb-3">
                  <FaMapMarkerAlt className="inline mr-1 text-cyan-500/60" />
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)} · ±{Math.round(location.accuracy)}m
                </p>
              ) : (
                <p className="text-center text-xs text-rose-400/80 mb-3">
                  <FaExclamationTriangle className="inline mr-1" />
                  GPS requerido — habilita la ubicación
                  <button
                    onClick={getLocation}
                    className="ml-2 inline-flex items-center min-h-[44px] px-2 text-cyan-400 underline align-middle"
                  >
                    Reintentar
                  </button>
                </p>
              )}

              {mensaje && (
                <p className="text-center text-xs text-rose-400 mb-3">{mensaje}</p>
              )}

              {/* Acciones */}
              {!fotoPreview ? (
                <button
                  onClick={capturarFoto}
                  disabled={!camaraOk}
                  className="w-full py-4 rounded-2xl bg-gradient-to-b from-cyan-400 to-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-40 mb-3"
                >
                  <FaCamera className="text-lg" />
                  Tomar foto
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => setFotoPreview(null)}
                    disabled={isLoading}
                    className="py-4 rounded-2xl bg-white/5 border border-white/10 text-primary-200 font-semibold flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-40"
                  >
                    <FaSyncAlt />
                    Repetir
                  </button>
                  <button
                    onClick={handleRegistrar}
                    disabled={isLoading || !location}
                    className="py-4 rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-40"
                  >
                    {isLoading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    Registrar
                  </button>
                </div>
              )}

              <button
                onClick={() => { detenerCamara(); setFotoPreview(null); setMensaje(''); setViewState('menu') }}
                disabled={isLoading}
                className="w-full min-h-[44px] text-center text-sm text-primary-500 hover:text-primary-300 transition-colors py-2"
              >
                Volver
              </button>
            </motion.div>
          )}

          {/* ── Vista: Justificación ── */}
          {viewState === 'justificacion' && trabajador && (
            <motion.div
              key="justificacion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-4">
                <span className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  JUSTIFICACIÓN
                </span>
                <p className="text-xs text-primary-400 mt-2">{trabajador.nombre}</p>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs text-primary-400 uppercase tracking-wider mb-1.5">Motivo *</label>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400/60 appearance-none"
                  >
                    {MOTIVOS_JUSTIFICACION.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-primary-400 uppercase tracking-wider mb-1.5">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    placeholder="Explica brevemente el motivo..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-primary-500 focus:outline-none focus:border-cyan-400/60 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-primary-400 uppercase tracking-wider mb-1.5">
                    Evidencia (foto o documento, opcional)
                  </label>
                  <label className="w-full flex items-center gap-3 bg-white/5 border border-dashed border-white/20 rounded-xl px-4 py-3.5 text-sm cursor-pointer hover:bg-white/10 transition-all">
                    <FaPaperclip className="text-cyan-400 shrink-0" />
                    <span className={archivo ? 'text-white truncate' : 'text-primary-500'}>
                      {archivo ? archivo.name : 'Tomar foto o adjuntar archivo (máx 5MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                {mensaje && (
                  <p className="text-center text-xs text-rose-400">{mensaje}</p>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <button
                  onClick={handleEnviarJustificacion}
                  disabled={isLoading || !motivo}
                  className="w-full py-4 rounded-2xl bg-amber-400 text-slate-900 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 disabled:opacity-40"
                >
                  {isLoading ? <FaSpinner className="animate-spin" /> : <FaFileAlt />}
                  Enviar justificación
                </button>
                <button
                  onClick={() => { setMensaje(''); setViewState('menu') }}
                  disabled={isLoading}
                  className="w-full min-h-[44px] text-center text-sm text-primary-500 hover:text-primary-300 transition-colors py-2"
                >
                  Volver
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Vista: Éxito ── */}
          {viewState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col flex-1 justify-center items-center text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-28 h-28 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-6"
              >
                <FaCheckCircle className="text-5xl text-emerald-400" />
              </motion.div>

              <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest mb-4 ${
                successTipo === 'asistencia'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              }`}>
                {successTipo === 'asistencia'
                  ? `${EVENTO_LABELS[eventoSel || ''] || 'REGISTRO'} REGISTRADO`.toUpperCase()
                  : 'JUSTIFICACIÓN ENVIADA'}
              </span>

              <h2 className="text-xl font-bold text-white mb-1">
                {trabajador?.nombre}
              </h2>
              <p className="text-4xl font-mono font-bold text-white mb-1">{horaRegistro}</p>
              {successTipo === 'asistencia' && location && (
                <p className="text-xs text-primary-500 mb-6">
                  <FaMapMarkerAlt className="inline mr-1" />
                  GPS registrado · ±{Math.round(location.accuracy)}m de precisión
                </p>
              )}
              {successTipo === 'justificacion' && (
                <p className="text-xs text-primary-500 mb-6">
                  Tu justificación será revisada por el Coordinador General
                </p>
              )}

              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-emerald-400 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                />
              </div>
              <p className="text-xs text-primary-500">Reiniciando en {countdown}s...</p>
            </motion.div>
          )}

          {/* ── Vista: Error ── */}
          {viewState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col flex-1 justify-center items-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-28 h-28 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center mb-6"
              >
                <FaTimesCircle className="text-5xl text-rose-400" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">Error</h2>
              <p className="text-rose-400 text-sm mb-6 max-w-xs">{mensaje}</p>

              <button
                onClick={handleReset}
                className="px-8 py-3 min-h-[44px] bg-rose-500 text-white font-semibold rounded-2xl hover:bg-rose-600 transition-colors inline-flex items-center gap-2 mb-4"
              >
                <FaRedo /> Intentar de nuevo
              </button>

              {/* Contacto directo: útil sobre todo si su DNI no está registrado */}
              <a
                href={`https://wa.me/51984300510?text=${encodeURIComponent(
                  `Hola, tuve un problema con el registro de asistencia${dni ? ` (DNI ${dni})` : ''}: ${mensaje}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
              >
                <FaWhatsapp className="text-lg" />
                ¿Hubo un error? Escríbenos: 984 300 510
              </a>

              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-rose-400 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                />
              </div>
              <p className="text-xs text-primary-500">Reiniciando en {countdown}s...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}

/* ─── GPS Indicator ─── */
function GpsIndicator({
  loading,
  location,
}: {
  loading: boolean
  location: { accuracy: number } | null
  error?: string | null
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <FaSpinner className="text-yellow-400 text-xs animate-spin" />
        <span className="text-yellow-400/80 text-xs">GPS...</span>
      </div>
    )
  }
  if (location) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <FaWifi className="text-emerald-400 text-xs" />
        <span className="text-emerald-400 text-xs">±{Math.round(location.accuracy)}m</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
      <FaMapMarkerAlt className="text-rose-400 text-xs" />
      <span className="text-rose-400 text-xs">Sin GPS</span>
    </div>
  )
}

/* ─── Reloj ─── */
function RelojTiempoReal() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hhmm = time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  const ss = time.getSeconds().toString().padStart(2, '0')
  const ampm = hhmm.slice(-4)
  const hoursMinutes = hhmm.slice(0, -5)

  const fecha = time.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="text-center py-4">
      <div className="flex items-end justify-center gap-1">
        <span className="text-5xl font-mono font-bold text-white leading-none tracking-tight">
          {hoursMinutes}
        </span>
        <span className="text-2xl font-mono font-bold text-cyan-400/60 leading-none mb-0.5">
          :{ss}
        </span>
        <span className="text-sm font-mono text-primary-400 leading-none mb-1 ml-1">
          {ampm}
        </span>
      </div>
      <p className="text-xs text-primary-400 mt-2 capitalize">{fecha}</p>
    </div>
  )
}

/* ─── Teclado Numérico ─── */
interface TecladoNumericoProps {
  onKeyPress: (key: string) => void
  onSubmit: () => void
  disabled: boolean
  isLoading: boolean
}

function TecladoNumerico({ onKeyPress, onSubmit, disabled, isLoading }: TecladoNumericoProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'enter'],
  ]

  return (
    <div className="flex-1 flex flex-col justify-end">
      <div className="grid grid-cols-3 gap-2.5">
        {keys.flat().map((key) => {
          const isBackspace = key === 'backspace'
          const isEnter = key === 'enter'

          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.92 }}
              onClick={() => (isEnter ? onSubmit() : onKeyPress(key))}
              disabled={isEnter && disabled}
              className={`
                h-16 rounded-2xl text-xl font-bold transition-all duration-150 relative overflow-hidden
                active:brightness-90
                ${isEnter
                  ? disabled
                    ? 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
                    : 'bg-gradient-to-b from-cyan-400 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : isBackspace
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-white/8 border border-white/10 text-white hover:bg-white/14'
                }
              `}
            >
              {isBackspace ? (
                <FaBackspace className="mx-auto text-lg" />
              ) : isEnter ? (
                isLoading ? (
                  <FaSpinner className="mx-auto animate-spin" />
                ) : (
                  <FaCheckCircle className="mx-auto" />
                )
              ) : (
                key
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
