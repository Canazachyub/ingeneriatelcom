import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaBolt, FaBriefcase, FaChevronDown } from 'react-icons/fa'
import AnimatedCounter from '../common/AnimatedCounter'
import { statistics } from '../../data/services'

const heroImages = [
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1920&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1920&q=80',
  'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1920&q=80',
]

const statIcons: Record<string, React.ReactNode> = {
  folder: <FaBolt className="text-accent-electric" />,
  users: <FaBolt className="text-accent-electric" />,
  clock: <FaBolt className="text-accent-electric" />,
  star: <FaBolt className="text-accent-electric" />,
}

export default function HeroSection() {
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.querySelector(id)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Images */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImages[currentImage]})` }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-950/80 via-primary-950/70 to-primary-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800/50 backdrop-blur-sm rounded-full border border-primary-700/50 mb-6"
          >
            <FaBolt className="text-accent-electric animate-pulse" />
            <span className="text-sm text-primary-200">Líderes en Soluciones de Ingeniería</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6"
          >
            <span className="block">INGENIERÍA</span>
            <span className="block text-gradient glow-text">TELCOM EIRL</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-xl md:text-2xl text-primary-200 max-w-3xl mx-auto mb-8"
          >
            "Software, Ingeniería Eléctrica, Minería y Soluciones TIC para el Perú"
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <button
              onClick={() => scrollToSection('#servicios')}
              className="btn-primary flex items-center gap-2 text-lg"
            >
              <FaBolt />
              Ver Servicios
            </button>
            <button
              onClick={() => scrollToSection('#bolsa-trabajo')}
              className="btn-secondary flex items-center gap-2 text-lg"
            >
              <FaBriefcase />
              Bolsa de Trabajo
            </button>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center gap-2 text-primary-400"
          >
            <span className="text-sm">Descubre más</span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <FaChevronDown />
            </motion.div>
          </motion.div>
        </div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {statistics.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-700/50"
            >
              <div className="flex justify-center mb-2">
                {statIcons[stat.icon]}
              </div>
              <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-primary-300 text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Image Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentImage
                ? 'bg-accent-electric w-8'
                : 'bg-primary-600 hover:bg-primary-500'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
