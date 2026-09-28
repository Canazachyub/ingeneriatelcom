import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaBook, FaCheckCircle, FaPrint, FaExclamationTriangle } from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import PageHeader from '../components/common/PageHeader'
import { registrarEvento } from '../utils/analytics'

// ============================================================
// Libro de Reclamaciones virtual — Ley N.° 29571 (art. 150) y D.S. N.°
// 011-2011-PCM (texto vigente, D.S. N.° 101-2022-PCM). Los campos siguen el
// formato de la Hoja de Reclamación (Anexo I). El backend asigna el número
// correlativo, envía la constancia al correo y fija el plazo de respuesta.
// Ver docs/LIBRO_RECLAMACIONES.md
// ============================================================

const PROVEEDOR = {
  razonSocial: 'INGENIERIA TELCOM E.I.R.L.',
  ruc: '20602277900',
  domicilio: 'Mz. 550 Lote 05, A. V. Paseo de los Héroes, Crnl. Gregorio Albarracín Lanchipa, Tacna, Perú',
}

const input =
  'w-full px-4 py-3 bg-primary-950/70 border border-primary-700/70 text-white placeholder-primary-500 ' +
  'focus:outline-none focus:border-accent-electric focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all'
const label = 'block font-mono text-[11px] tracking-[0.2em] uppercase text-primary-300 mb-2'

const VACIO = {
  nombre: '', tipoDocumento: 'DNI', numeroDocumento: '', domicilio: '', telefono: '', email: '',
  menorEdad: false, apoderado: '',
  bien: 'servicio', descripcionBien: '', monto: '',
  tipo: 'reclamo', detalle: '', pedido: '',
  aceptaTerminos: false,
}

type Constancia = { id: string; fecha: string; fechaLimite: string; constanciaEnviada: boolean }

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

function Bloque({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="placa-acero p-5 md:p-7">
      <legend className="sr-only">{titulo}</legend>
      <div className="flex items-center gap-3 mb-5">
        <span className="rotulo-estencil">{numero}</span>
        <h2 className="font-display font-semibold text-lg text-white">{titulo}</h2>
      </div>
      {children}
    </fieldset>
  )
}

export default function LibroReclamacionesPage() {
  const [f, setF] = useState(VACIO)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [constancia, setConstancia] = useState<Constancia | null>(null)

  const set = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const t = e.target as HTMLInputElement
    setF((prev) => ({ ...prev, [campo]: t.type === 'checkbox' ? t.checked : t.value }))
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const r = await api.registrarReclamo(f)
      if (r.success && r.data) {
        setConstancia(r.data)
        registrarEvento('libro_reclamaciones', { tipo: f.tipo })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setError(r.error || 'No se pudo registrar. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-950 pb-16">
      <PageHeader
        eyebrow="Atención al cliente"
        title="Libro de Reclamaciones"
        subtitle="Conforme al Código de Protección y Defensa del Consumidor, puedes registrar aquí un reclamo o una queja. Te enviaremos la constancia a tu correo."
        migas={[{ label: 'Inicio', to: '/' }, { label: 'Libro de Reclamaciones' }]}
        metrica={
          <div className="text-center">
            <FaBook className="text-4xl text-accent-energy mx-auto" />
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mt-2">Hoja virtual</div>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Datos del proveedor (obligatorios en la hoja) */}
        <div className="placa-acero p-5 md:p-6 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className={label}>Proveedor</p>
            <p className="text-white font-semibold">{PROVEEDOR.razonSocial}</p>
          </div>
          <div>
            <p className={label}>RUC</p>
            <p className="text-white font-semibold">{PROVEEDOR.ruc}</p>
          </div>
          <div>
            <p className={label}>Domicilio</p>
            <p className="text-slate-200">{PROVEEDOR.domicilio}</p>
          </div>
        </div>

        {constancia ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="placa-acero p-6 md:p-8">
            <div className="flex items-start gap-4">
              <FaCheckCircle className="text-3xl text-accent-success shrink-0 mt-1" />
              <div>
                <p className="rotulo-estencil mb-3">Hoja registrada</p>
                <h2 className="text-2xl font-display font-bold text-white mb-2">N.° {constancia.id}</h2>
                <p className="text-slate-200 mb-4">
                  Registramos tu {f.tipo === 'queja' ? 'queja' : 'reclamo'} el {fechaCorta(constancia.fecha)}.
                  Te responderemos a más tardar el <b className="text-white">{fechaCorta(constancia.fechaLimite)}</b>{' '}
                  (15 días hábiles).
                </p>
                <p className="text-sm text-slate-300 mb-6">
                  {constancia.constanciaEnviada
                    ? <>Enviamos la constancia con el detalle a <b className="text-white">{f.email}</b>. Revisa también tu carpeta de spam.</>
                    : <>No pudimos enviar la constancia a tu correo. Guarda o imprime esta página; te contactaremos por teléfono.</>}
                </p>
                <button onClick={() => window.print()} className="btn-secondary btn-hud inline-flex items-center gap-2">
                  <FaPrint /> Imprimir constancia
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={enviar} className="space-y-6">
            <Bloque numero="1" titulo="Identificación del consumidor reclamante">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="lr-nombre">Nombres y apellidos *</label>
                  <input id="lr-nombre" className={input} value={f.nombre} onChange={set('nombre')} required maxLength={150} autoComplete="name" />
                </div>
                <div>
                  <label className={label} htmlFor="lr-tdoc">Tipo de documento *</label>
                  <select id="lr-tdoc" className={input} value={f.tipoDocumento} onChange={set('tipoDocumento')}>
                    <option>DNI</option>
                    <option>Carné de extranjería</option>
                    <option>Pasaporte</option>
                    <option>RUC</option>
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="lr-ndoc">N.° de documento *</label>
                  <input id="lr-ndoc" className={input} value={f.numeroDocumento} onChange={set('numeroDocumento')} required maxLength={20} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="lr-dom">Domicilio *</label>
                  <input id="lr-dom" className={input} value={f.domicilio} onChange={set('domicilio')} required maxLength={250} autoComplete="street-address" />
                </div>
                <div>
                  <label className={label} htmlFor="lr-tel">Teléfono</label>
                  <input id="lr-tel" className={input} value={f.telefono} onChange={set('telefono')} maxLength={30} type="tel" autoComplete="tel" />
                </div>
                <div>
                  <label className={label} htmlFor="lr-email">Correo electrónico *</label>
                  <input id="lr-email" className={input} value={f.email} onChange={set('email')} required maxLength={150} type="email" autoComplete="email" />
                </div>
                <label className="sm:col-span-2 flex items-center gap-3 text-sm text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={f.menorEdad} onChange={set('menorEdad')} className="w-4 h-4 accent-cyan-400" />
                  Soy menor de edad
                </label>
                {f.menorEdad && (
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="lr-apod">Nombre del padre, madre o apoderado *</label>
                    <input id="lr-apod" className={input} value={f.apoderado} onChange={set('apoderado')} required maxLength={150} />
                  </div>
                )}
              </div>
            </Bloque>

            <Bloque numero="2" titulo="Identificación del bien contratado">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <span className={label}>Tipo *</span>
                  <div className="flex gap-4 py-3">
                    {['servicio', 'producto'].map((b) => (
                      <label key={b} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer capitalize">
                        <input type="radio" name="bien" value={b} checked={f.bien === b} onChange={set('bien')} className="accent-cyan-400" />
                        {b}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="lr-monto">Monto reclamado (S/)</label>
                  <input id="lr-monto" className={input} value={f.monto} onChange={set('monto')} maxLength={30} inputMode="decimal" placeholder="Opcional" />
                </div>
                <div className="sm:col-span-3">
                  <label className={label} htmlFor="lr-desc">Descripción *</label>
                  <input id="lr-desc" className={input} value={f.descripcionBien} onChange={set('descripcionBien')} required maxLength={500} placeholder="Ej.: servicio de instalación eléctrica en…" />
                </div>
              </div>
            </Bloque>

            <Bloque numero="3" titulo="Detalle de la reclamación y pedido del consumidor">
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                {[
                  { v: 'reclamo', t: 'Reclamo', d: 'Disconformidad relacionada a los productos o servicios.' },
                  { v: 'queja', t: 'Queja', d: 'Disconformidad no relacionada a los productos o servicios, o malestar o descontento respecto a la atención al público.' },
                ].map((o) => (
                  <label
                    key={o.v}
                    className={`p-4 border cursor-pointer transition-colors ${f.tipo === o.v ? 'border-accent-energy bg-accent-energy/10' : 'border-slate-600/60 hover:border-slate-400'}`}
                  >
                    <span className="flex items-center gap-2 mb-1">
                      <input type="radio" name="tipo" value={o.v} checked={f.tipo === o.v} onChange={set('tipo')} className="accent-amber-400" />
                      <b className="text-white">{o.t}</b>
                    </span>
                    <span className="block text-xs text-slate-300 leading-snug">{o.d}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-4">
                <div>
                  <label className={label} htmlFor="lr-det">Detalle *</label>
                  <textarea id="lr-det" className={`${input} resize-y`} rows={5} value={f.detalle} onChange={set('detalle')} required maxLength={3000} />
                </div>
                <div>
                  <label className={label} htmlFor="lr-ped">Pedido *</label>
                  <textarea id="lr-ped" className={`${input} resize-y`} rows={3} value={f.pedido} onChange={set('pedido')} required maxLength={1500} placeholder="¿Qué solución esperas?" />
                </div>
              </div>
            </Bloque>

            <div className="placa-acero p-5 md:p-6 space-y-4 text-sm text-slate-300">
              <p>
                La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es
                requisito previo para interponer una denuncia ante el INDECOPI.
              </p>
              <p>
                El proveedor deberá dar respuesta al reclamo o queja en un plazo no mayor a quince (15) días
                hábiles improrrogables. Tus datos se tratan conforme a nuestra{' '}
                <a href="/privacidad" className="text-accent-electric hover:underline">Política de privacidad</a>.
              </p>
              <label className="flex items-start gap-3 text-slate-100 cursor-pointer">
                <input type="checkbox" checked={f.aceptaTerminos} onChange={set('aceptaTerminos')} required className="w-4 h-4 mt-0.5 accent-cyan-400" />
                Declaro que los datos consignados son verdaderos y acepto el envío de la constancia y la respuesta a mi correo electrónico.
              </label>
            </div>

            {error && (
              <p className="flex items-center gap-2 p-4 border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
                <FaExclamationTriangle className="shrink-0" /> {error}
              </p>
            )}

            <button type="submit" disabled={enviando} className="btn-primary btn-hud w-full sm:w-auto inline-flex items-center justify-center gap-2 text-lg disabled:opacity-60">
              <FaBook />
              {enviando ? 'Registrando…' : 'Registrar hoja de reclamación'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
