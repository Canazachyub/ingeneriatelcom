import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebookF, FaPaperPlane, FaSpinner,
  FaCheckCircle, FaExclamationTriangle, FaArrowRight,
} from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import SectionHeader from '../common/SectionHeader'
import TiltCard from '../common/TiltCard'
import HudFrame from '../effects/HudFrame'
import { config } from '../../config/env'
import { api } from '../../api/appScriptApi'

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

type ContactFormData = z.infer<typeof contactSchema>

// Input estilo terminal: fondo oscuro, borde tenue, foco cian con halo
const inputHud =
  'w-full px-4 py-3 bg-primary-950/70 border border-primary-700/70 text-white placeholder-primary-500 ' +
  'focus:outline-none focus:border-accent-electric focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all'
const labelHud = 'block font-mono text-[11px] tracking-[0.2em] uppercase text-primary-300 mb-2'

export default function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const result = await api.submitContact({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        subject: data.subject || 'Consulta desde la web',
        message: data.message,
      })

      if (result.success) {
        setIsSuccess(true)
        reset()
        setTimeout(() => setIsSuccess(false), 5000)
      } else {
        setErrorMessage(result.error || 'Error al enviar el mensaje')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      setErrorMessage('Error de conexión. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Canales accionables: cada tarjeta es un enlace directo
  const canales = [
    {
      icon: <FaPhone />,
      label: 'Llámanos',
      value: config.companyInfo.phone,
      href: `tel:${config.companyInfo.phone.replace(/\s/g, '')}`,
      accion: 'Llamar ahora',
    },
    {
      icon: <FaEnvelope />,
      label: 'Escríbenos',
      value: config.companyInfo.email,
      href: `mailto:${config.companyInfo.email}`,
      accion: 'Enviar correo',
    },
    {
      icon: <FaFacebookF />,
      label: 'Facebook',
      value: 'Ingeniería Telcom EIRL',
      href: config.companyInfo.facebook,
      accion: 'Ver página',
      externo: true,
    },
  ]

  return (
    <SectionWrapper id="contacto">
      <div ref={ref}>
        <SectionHeader
          id="contacto"
          eyebrow="Canal abierto"
          title="Contáctanos"
          subtitle="¿Tienes un proyecto o una consulta? Elige el canal que prefieras o déjanos un mensaje."
        />

        {/* Canales directos */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {canales.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            >
              <TiltCard max={5}>
                <a
                  href={c.href}
                  target={c.externo ? '_blank' : undefined}
                  rel={c.externo ? 'noopener noreferrer' : undefined}
                  className="panel-hud group h-full flex items-center gap-4 p-4 md:p-5"
                >
                  <span className="w-12 h-12 shrink-0 flex items-center justify-center text-lg border border-accent-electric/40 bg-accent-electric/10 text-accent-electric group-hover:bg-accent-electric group-hover:text-primary-950 transition-colors duration-300">
                    {c.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] tracking-[0.25em] uppercase text-primary-400">{c.label}</span>
                    <span className="block text-white text-sm font-semibold truncate">{c.value}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-accent-electric">
                      {c.accion}
                      <FaArrowRight className="text-[10px] group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </span>
                </a>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Ubicación y horario */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            <div className="panel-hud p-5 flex items-start gap-4">
              <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-accent-energy/40 bg-accent-energy/10 text-accent-energy">
                <FaClock />
              </span>
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary-400 mb-1">Horario de atención</p>
                <p className="text-white text-sm">{config.companyInfo.schedule}</p>
              </div>
            </div>

            <HudFrame className="flex-1" color="border-accent-electric/50">
              <div className="m-1.5 h-[calc(100%-0.75rem)] min-h-[18rem] flex flex-col bg-primary-950/80 border border-primary-700/50">
                <div className="flex items-start gap-3 p-4 border-b border-primary-700/50">
                  <FaMapMarkerAlt className="text-accent-electric mt-1 shrink-0" />
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary-400 mb-1">Base de operaciones</p>
                    <p className="text-primary-100 text-sm leading-snug">{config.companyInfo.address}</p>
                  </div>
                </div>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d120757.35!2d-70.0635!3d-18.0146!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915006cc5ec6d3e7%3A0x42948a7d2e65d0da!2sTacna%2C%20Per%C3%BA!5e0!3m2!1ses!2spe!4v1"
                  className="w-full flex-1 min-h-[14rem] grayscale-[35%] contrast-110"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Ingeniería Telcom EIRL - Tacna, Perú"
                />
              </div>
            </HudFrame>
          </motion.div>

          {/* Formulario */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="panel-hud p-5 md:p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <FaPaperPlane className="text-accent-electric" />
                <h3 className="text-xl font-display font-semibold text-white">Envíanos un mensaje</h3>
                <span className="ml-auto font-mono text-[10px] tracking-[0.25em] text-primary-500 hidden sm:inline">
                  * CAMPOS OBLIGATORIOS
                </span>
              </div>

              {isSuccess && (
                <div role="status" className="mb-6 p-4 bg-accent-success/15 border border-accent-success/50 flex items-start gap-3">
                  <FaCheckCircle className="text-accent-success mt-0.5 shrink-0" />
                  <p className="text-accent-success text-sm">
                    ¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div role="alert" className="mb-6 p-4 bg-red-500/15 border border-red-500/50 flex items-start gap-3">
                  <FaExclamationTriangle className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-sm">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="c-name" className={labelHud}>Nombre completo *</label>
                    <input id="c-name" {...register('name')} type="text" autoComplete="name" className={inputHud} placeholder="Tu nombre" />
                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="c-email" className={labelHud}>Correo electrónico *</label>
                    <input id="c-email" {...register('email')} type="email" autoComplete="email" className={inputHud} placeholder="tu@email.com" />
                    {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="c-phone" className={labelHud}>Teléfono (opcional)</label>
                    <input id="c-phone" {...register('phone')} type="tel" autoComplete="tel" className={inputHud} placeholder="+51 999 999 999" />
                  </div>
                  <div>
                    <label htmlFor="c-subject" className={labelHud}>Asunto (opcional)</label>
                    <input id="c-subject" {...register('subject')} type="text" className={inputHud} placeholder="Ej: Consulta sobre servicios" />
                  </div>
                </div>

                <div>
                  <label htmlFor="c-message" className={labelHud}>Mensaje *</label>
                  <textarea id="c-message" {...register('message')} rows={5} className={`${inputHud} resize-none`} placeholder="Cuéntanos sobre tu proyecto o consulta..." />
                  {errors.message && <p className="mt-1 text-sm text-red-400">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary btn-hud w-full text-lg gap-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  {isSubmitting ? 'Enviando…' : 'Enviar mensaje'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}
