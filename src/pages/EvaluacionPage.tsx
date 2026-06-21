import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaCamera, FaShieldAlt, FaClock, FaChevronRight,
  FaExclamationTriangle, FaCheckCircle, FaLock
} from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import { PreguntaExamen, IniciarEvaluacionConfig } from '../types/capacitacion.types'

type EstadoExamen = 'identificacion' | 'permisos' | 'examen' | 'enviado' | 'error'

export default function EvaluacionPage() {
  const { id: capacitacion_id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Estado de flujo
  const [estado, setEstado] = useState<EstadoExamen>('identificacion')
  const [errorMsg, setErrorMsg] = useState('')

  // Formulario identificacion
  const [dni, setDni] = useState('')
  const [nombres, setNombres] = useState('')
  const [email, setEmail] = useState('')
  const [loadingInicio, setLoadingInicio] = useState(false)

  // Datos del examen
  const [evaluacionId, setEvaluacionId] = useState('')
  const [preguntas, setPreguntas] = useState<PreguntaExamen[]>([])
  const [config, setConfig] = useState<IniciarEvaluacionConfig | null>(null)
  const [indicePregunta, setIndicePregunta] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})

  // Proctoring
  const [salidasPestana, setSalidasPestana] = useState(0)
  const [, setFotosUrl] = useState<string[]>([])
  const salidasRef = useRef(0)
  const fotosRef = useRef<string[]>([])

  // Timer
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inicioRef = useRef<number>(0)

  // Webcam
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fotoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [camaraOk, setCamaraOk] = useState(false)
  const [camaraError, setCamaraError] = useState('')

  // ── Captura de foto ──────────────────────────────────────────────
  const capturarFoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !evaluacionId) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, 320, 240)
    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
    const fileName = `foto_${Date.now()}.jpg`
    api.guardarFotoWebcam({
      evaluacion_id: evaluacionId,
      capacitacion_id: capacitacion_id!,
      dni,
      fileContent: base64,
      fileName,
      mimeType: 'image/jpeg',
    }).then(res => {
      if (res.success && res.data?.foto_url) {
        fotosRef.current = [...fotosRef.current, res.data!.foto_url]
        setFotosUrl([...fotosRef.current])
      }
    })
  }, [evaluacionId, capacitacion_id, dni])

  // ── Iniciar cámara ───────────────────────────────────────────────
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamaraOk(true)
    } catch {
      setCamaraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }

  // ── Proctoring: detección de salida de pestaña ───────────────────
  useEffect(() => {
    if (estado !== 'examen') return
    const handleBlur = () => {
      salidasRef.current += 1
      setSalidasPestana(salidasRef.current)
      api.registrarEventoLog({
        evaluacion_id: evaluacionId,
        tipo_evento: 'salida_pestana',
        detalle: `Salida #${salidasRef.current}`,
      })
    }
    const handleVisibility = () => {
      if (document.hidden) handleBlur()
    }
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [estado, evaluacionId])

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (estado !== 'examen' || !config) return
    const totalSeg = config.tiempo_limite_min * 60
    setSegundosRestantes(totalSeg)
    inicioRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          enviarEvaluacion(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [estado, config])

  // ── Reconectar stream al video del examen ────────────────────────
  // El estado 'permisos' y 'examen' tienen cada uno su propio <video ref={videoRef}>.
  // Cuando React monta el video del examen, el ref apunta al nuevo elemento
  // sin srcObject → negro. Este efecto lo reconecta.
  useEffect(() => {
    if (estado !== 'examen') return
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [estado])

  // ── Fotos periódicas ─────────────────────────────────────────────
  useEffect(() => {
    if (estado !== 'examen' || !config) return
    fotoIntervalRef.current = setInterval(capturarFoto, config.foto_intervalo_seg * 1000)
    return () => { if (fotoIntervalRef.current) clearInterval(fotoIntervalRef.current) }
  }, [estado, config, capturarFoto])

  // ── Cleanup al salir ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      if (fotoIntervalRef.current) clearInterval(fotoIntervalRef.current)
    }
  }, [])

  // ── Funciones de flujo ───────────────────────────────────────────
  const handleIdentificacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dni.match(/^\d{8}$/)) { setErrorMsg('El DNI debe tener 8 dígitos'); return }
    if (!nombres.trim()) { setErrorMsg('Ingresa tus nombres completos'); return }
    if (!email.includes('@')) { setErrorMsg('Ingresa un correo válido'); return }
    setErrorMsg('')
    setLoadingInicio(true)
    const res = await api.iniciarEvaluacion({ capacitacion_id: capacitacion_id!, dni, nombres, email })
    setLoadingInicio(false)
    if (!res.success || !res.data) {
      setErrorMsg(res.error || 'No se pudo iniciar la evaluación')
      return
    }
    setEvaluacionId(res.data.evaluacion_id)
    setPreguntas(res.data.preguntas)
    setConfig(res.data.config)
    setEstado('permisos')
    iniciarCamara()
  }

  const handleComenzarExamen = () => {
    if (!camaraOk) { setCamaraError('Debes permitir el acceso a la cámara para continuar'); return }
    setEstado('examen')
  }

  const enviarEvaluacion = async (autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (fotoIntervalRef.current) clearInterval(fotoIntervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())

    const duracion = Math.round((Date.now() - inicioRef.current) / 1000)
    if (autoSubmit) {
      capturarFoto()
    }

    await api.submitEvaluacion({
      evaluacion_id: evaluacionId,
      respuestas,
      salidas_pestana: salidasRef.current,
      fotos_url: fotosRef.current,
      duracion_seg: duracion,
    })
    setEstado('enviado')
  }

  const handleRespuesta = (preguntaId: string, valor: string) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }))
  }

  const handleSiguiente = () => {
    if (indicePregunta < preguntas.length - 1) {
      setIndicePregunta(prev => prev + 1)
    } else {
      enviarEvaluacion(false)
    }
  }

  const formatTimer = (seg: number) => {
    const m = Math.floor(seg / 60).toString().padStart(2, '0')
    const s = (seg % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const preguntaActual = preguntas[indicePregunta]
  const respuestaActual = preguntaActual ? respuestas[preguntaActual.id] : ''
  const esUltima = indicePregunta === preguntas.length - 1

  // ── Renders de estado ────────────────────────────────────────────
  if (estado === 'enviado') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-md shadow-2xl"
        >
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Evaluación enviada!</h2>
          <p className="text-gray-500 mb-6">
            Tu evaluación fue recibida correctamente. El resultado llegará a <strong>{email}</strong> tras la revisión del administrador.
          </p>
          <button
            onClick={() => navigate('/capacitaciones')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Volver a Capacitaciones
          </button>
        </motion.div>
      </div>
    )
  }

  if (estado === 'identificacion') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
        >
          <div className="text-center mb-6">
            <FaLock className="text-4xl text-blue-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900">Identificación</h2>
            <p className="text-gray-500 text-sm mt-1">Ingresa tus datos para comenzar</p>
          </div>

          <form onSubmit={handleIdentificacion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI (8 dígitos)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={dni}
                onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono text-gray-900 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres completos</label>
              <input
                type="text"
                value={nombres}
                onChange={e => setNombres(e.target.value)}
                placeholder="Juan Pérez García"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                required
                onPaste={() => api.registrarEventoLog({ evaluacion_id: evaluacionId || 'pre', tipo_evento: 'pegado_detectado', detalle: 'campo nombres' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                required
              />
            </div>

            {/* Advertencias previas al examen */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5"><FaExclamationTriangle className="text-amber-500" /> Antes de continuar, ten en cuenta:</p>
              <ul className="space-y-1 pl-1">
                <li className="flex items-start gap-2"><FaCamera className="mt-0.5 shrink-0 text-amber-600" /><span>Se <strong>activará tu cámara</strong> y se monitorizará durante toda la evaluación.</span></li>
                <li className="flex items-start gap-2"><FaShieldAlt className="mt-0.5 shrink-0 text-amber-600" /><span><strong>Serás monitoreado.</strong> Cambiar de pestaña o minimizar la ventana queda registrado.</span></li>
                <li className="flex items-start gap-2"><FaChevronRight className="mt-0.5 shrink-0 text-amber-600" /><span><strong>No podrás retroceder</strong> entre preguntas. Responde con cuidado antes de avanzar.</span></li>
              </ul>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <FaExclamationTriangle />
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingInicio}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingInicio ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</>
              ) : (
                <>Continuar <FaChevronRight /></>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/capacitaciones')}
              className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
            >
              ← Volver al listado
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  if (estado === 'permisos') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
        >
          <div className="text-center mb-5">
            <FaCamera className="text-4xl text-blue-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900">Activar cámara</h2>
            <p className="text-gray-500 text-sm mt-1">
              Es obligatorio para iniciar la evaluación
            </p>
          </div>

          {/* Preview cámara */}
          <div className="rounded-2xl overflow-hidden bg-slate-900 mb-4 aspect-video relative">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            {camaraOk && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                EN VIVO
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {camaraError && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-2">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              {camaraError}
            </div>
          )}

          {/* Condiciones del examen */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 mb-4 space-y-2">
            <p className="font-semibold text-slate-800">Condiciones de la evaluación:</p>
            <div className="flex items-start gap-2"><FaCamera className="mt-0.5 shrink-0 text-blue-500" /><span>La cámara es <strong>indispensable</strong> para el monitoreo de la evaluación.</span></div>
            <div className="flex items-start gap-2"><FaShieldAlt className="mt-0.5 shrink-0 text-red-500" /><span><strong>Estás siendo monitoreado.</strong> Cambiar de pestaña, minimizar o salir de la ventana queda registrado y es reportado al evaluador.</span></div>
            <div className="flex items-start gap-2"><FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-500" /><span><strong>No podrás retroceder</strong> entre preguntas. Una vez que avances, no hay vuelta atrás.</span></div>
            <div className="flex items-start gap-2"><FaClock className="mt-0.5 shrink-0 text-green-600" /><span>Tienes <strong>{config?.tiempo_limite_min} minutos</strong> para completar las {preguntas.length} preguntas. Al vencer el tiempo se enviará automáticamente.</span></div>
          </div>

          {!camaraOk && !camaraError && (
            <button
              onClick={iniciarCamara}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mb-3 flex items-center justify-center gap-2"
            >
              <FaCamera /> Permitir acceso a cámara
            </button>
          )}

          {camaraError && (
            <button
              onClick={iniciarCamara}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
            >
              Reintentar
            </button>
          )}

          <button
            onClick={handleComenzarExamen}
            disabled={!camaraOk}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <FaShieldAlt /> Entiendo y comienzo el examen
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            <strong>{config?.titulo}</strong> · {config?.tiempo_limite_min} min · {preguntas.length} preguntas
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Estado: examen ───────────────────────────────────────────────
  if (estado === 'examen' && preguntaActual) {
    const progreso = ((indicePregunta + 1) / preguntas.length) * 100
    const timerWarning = segundosRestantes <= 120

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex flex-col">
        {/* Header fijo */}
        <div className="bg-slate-900/80 backdrop-blur border-b border-white/10 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-white/70">
              Pregunta <span className="text-white font-bold">{indicePregunta + 1}</span> / {preguntas.length}
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerWarning ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              <FaClock className="text-sm" />
              {formatTimer(segundosRestantes)}
            </div>

            {/* Indicador de salidas */}
            {salidasPestana > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <FaExclamationTriangle />
                {salidasPestana} salida{salidasPestana !== 1 ? 's' : ''}
              </div>
            )}

            {/* Badge monitorizado + cámara mini */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                MONITORIZADO
              </div>
              <div className="w-12 h-9 rounded-lg overflow-hidden border border-white/20 relative">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="max-w-2xl mx-auto mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-400 rounded-full"
              animate={{ width: `${progreso}%` }}
              transition={{ type: 'spring', stiffness: 50 }}
            />
          </div>
        </div>

        {/* Contenido de pregunta */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={indicePregunta}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl"
              >
                <p className="text-xs font-medium text-blue-500 mb-2 uppercase tracking-wide">
                  {preguntaActual.tipo === 'multiple' ? 'Selección múltiple' : 'Respuesta libre'}
                  {' · '}{preguntaActual.puntaje} punto{preguntaActual.puntaje !== 1 ? 's' : ''}
                </p>
                <p className="text-gray-900 font-medium text-lg leading-relaxed mb-6">
                  {preguntaActual.pregunta}
                </p>

                {preguntaActual.tipo === 'multiple' ? (
                  <div className="space-y-3">
                    {preguntaActual.opciones.map((op, idx) => {
                      const letra = ['A', 'B', 'C', 'D'][idx] ?? String(idx + 1)
                      const seleccionada = respuestaActual === op.key
                      return (
                        <button
                          key={op.key}
                          onClick={() => handleRespuesta(preguntaActual.id, op.key)}
                          className={`w-full text-left px-5 py-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                            seleccionada
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-blue-200 text-gray-700'
                          }`}
                        >
                          <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5 ${
                            seleccionada ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-400'
                          }`}>
                            {letra}
                          </span>
                          <span className="leading-snug">{op.texto}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <textarea
                    value={respuestaActual || ''}
                    onChange={e => handleRespuesta(preguntaActual.id, e.target.value)}
                    onPaste={() => api.registrarEventoLog({ evaluacion_id: evaluacionId, tipo_evento: 'pegado_detectado', detalle: `pregunta ${indicePregunta + 1}` })}
                    placeholder="Escribe tu respuesta aquí..."
                    rows={4}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-400 resize-none text-gray-800"
                  />
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSiguiente}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3 rounded-2xl transition-colors flex items-center gap-2"
                  >
                    {esUltima ? 'Enviar evaluación' : 'Siguiente'}
                    <FaChevronRight />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  return null
}
