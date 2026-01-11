import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebook, FaPaperPlane } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'
import Button from '../common/Button'
import { config } from '../../config/env'
import { api } from '../../api/appScriptApi'

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email valido'),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

type ContactFormData = z.infer<typeof contactSchema>

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
      setErrorMessage('Error de conexion. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: <FaClock className="text-xl text-accent-electric" />,
      label: 'Horario de Atencion',
      value: config.companyInfo.schedule,
    },
    {
      icon: <FaPhone className="text-xl text-accent-electric" />,
      label: 'Telefono',
      value: config.companyInfo.phone,
      href: `tel:${config.companyInfo.phone.replace(/\s/g, '')}`,
    },
    {
      icon: <FaEnvelope className="text-xl text-accent-electric" />,
      label: 'Correo',
      value: config.companyInfo.email,
      href: `mailto:${config.companyInfo.email}`,
    },
    {
      icon: <FaMapMarkerAlt className="text-xl text-accent-electric" />,
      label: 'Direccion',
      value: config.companyInfo.address,
    },
  ]

  return (
    <SectionWrapper id="contacto">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Estamos para Ayudarte
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Contactanos
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            ¿Tienes alguna consulta? No dudes en comunicarte con nosotros.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card hover={false} className="h-full">
              <h3 className="text-xl font-display font-semibold text-white mb-6">
                Informacion de Contacto
              </h3>
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm text-primary-400 mb-1">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-white hover:text-accent-electric transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-white">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="mt-8 pt-6 border-t border-primary-700/50">
                <p className="text-sm text-primary-400 mb-4">Siguenos en redes sociales</p>
                <div className="flex gap-3">
                  <a
                    href={config.companyInfo.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-primary-800 hover:bg-accent-electric rounded-lg flex items-center justify-center transition-all duration-300"
                  >
                    <FaFacebook className="text-white" />
                  </a>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card hover={false}>
              <h3 className="text-xl font-display font-semibold text-white mb-6">
                Envianos un Mensaje
              </h3>

              {isSuccess && (
                <div className="mb-6 p-4 bg-accent-success/20 border border-accent-success/50 rounded-lg">
                  <p className="text-accent-success text-sm">
                    ¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm text-primary-300 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric transition-colors"
                    placeholder="Tu nombre"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-primary-300 mb-2">
                    Correo electronico *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric transition-colors"
                    placeholder="tu@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-primary-300 mb-2">
                    Telefono (opcional)
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric transition-colors"
                    placeholder="+51 999 999 999"
                  />
                </div>

                <div>
                  <label className="block text-sm text-primary-300 mb-2">
                    Asunto (opcional)
                  </label>
                  <input
                    {...register('subject')}
                    type="text"
                    className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric transition-colors"
                    placeholder="Ej: Consulta sobre servicios"
                  />
                </div>

                <div>
                  <label className="block text-sm text-primary-300 mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric transition-colors resize-none"
                    placeholder="Escribe tu mensaje..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-400">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  <FaPaperPlane className="mr-2" />
                  Enviar Mensaje
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}
