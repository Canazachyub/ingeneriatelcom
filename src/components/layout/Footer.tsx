import { Link } from 'react-router-dom'
import { FaFacebook, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'
import { config } from '../../config/env'
import { footerNavigation } from '../../data/navigation'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-primary-950 border-t border-primary-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img
                src="/assets/images/logo/logo-square.png"
                alt="Ingenieria Telcom EIRL"
                className="h-16 w-auto object-contain"
              />
            </Link>
            <p className="text-primary-300 text-sm mb-4">
              Software, Ingenieria Electrica y Soluciones Tecnologicas para empresas estatales y privadas desde 2017.
            </p>
            <div className="flex gap-3">
              <a
                href={config.companyInfo.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-primary-800 hover:bg-accent-electric rounded-lg flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
              >
                <FaFacebook className="text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4">
              Enlaces Rapidos
            </h3>
            <ul className="space-y-2">
              {footerNavigation.quickLinks.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-primary-300 hover:text-accent-electric transition-colors duration-200 text-sm"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={config.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-300 hover:text-accent-electric transition-colors duration-200 text-sm"
                >
                  Area de Trabajo
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4">
              Servicios
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-primary-300 text-sm">Desarrollo de Software</span>
              </li>
              <li>
                <span className="text-primary-300 text-sm">Ingenieria Electrica</span>
              </li>
              <li>
                <span className="text-primary-300 text-sm">Proyectos de Mineria</span>
              </li>
              <li>
                <span className="text-primary-300 text-sm">Consultoria Tecnologica</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-semibold text-white mb-4">
              Contacto
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <FaPhone className="text-accent-electric mt-1 flex-shrink-0" />
                <span className="text-primary-300 text-sm">{config.companyInfo.phone}</span>
              </li>
              <li className="flex items-start gap-3">
                <FaEnvelope className="text-accent-electric mt-1 flex-shrink-0" />
                <span className="text-primary-300 text-sm">{config.companyInfo.email}</span>
              </li>
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-accent-electric mt-1 flex-shrink-0" />
                <span className="text-primary-300 text-sm">{config.companyInfo.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-400 text-sm">
              {currentYear} {config.companyInfo.name}. Todos los derechos reservados.
            </p>
            <p className="text-primary-500 text-xs">
              Desarrollado con energia por el equipo de Ingenieria Telcom EIRL
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
