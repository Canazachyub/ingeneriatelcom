import { Link } from 'react-router-dom'
import { FaTiktok,
  FaFacebook, FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaUserCheck, FaExternalLinkAlt, FaBook, FaArrowRight,
} from 'react-icons/fa'
import { config } from '../../config/env'
import { footerNavigation } from '../../data/navigation'
import { ANIO_FUNDACION } from '../../data/empresa'

// Pie de página en estilo "Terran": franja de peligro, placas de acero y
// rótulos esténcil. Incluye el acceso al Libro de Reclamaciones, que por
// norma (D.S. 011-2011-PCM) debe estar visible en la página principal.

const RUC = '20602277900'
const tel = config.companyInfo.phone.replace(/\s/g, '')

const enlace = 'text-slate-300 hover:text-accent-energy transition-colors duration-200 text-sm'

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 mb-5">
      <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-accent-energy" />
      <span className="font-mono text-[11px] font-bold tracking-[0.3em] uppercase text-slate-200">{children}</span>
    </h3>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-[#070d17] overflow-hidden">
      {/* Franja de peligro superior */}
      <div aria-hidden="true" className="franja-peligro h-1.5 opacity-90" />

      {/* Llamado a la acción */}
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-primary-950 via-[#0b1524] to-primary-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="rotulo-estencil mb-2">Propuestas y cotizaciones</p>
            <p className="text-xl md:text-2xl font-display font-bold text-white">¿Tienes un proyecto en el sur del Perú?</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/#contacto" className="btn-primary btn-hud inline-flex items-center justify-center gap-2">
              Solicitar propuesta <FaArrowRight className="text-sm" />
            </Link>
            <a href={`tel:${tel}`} className="btn-secondary btn-hud inline-flex items-center justify-center gap-2">
              <FaPhone className="text-sm" /> {config.companyInfo.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr] gap-10">
          {/* Empresa */}
          <div>
            <Link to="/" className="inline-block mb-4">
              <img
                src="/assets/images/logo/logo-square-transparente.webp"
                alt="Ingeniería Telcom EIRL"
                className="h-16 w-auto object-contain"
              />
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Ingeniería eléctrica, construcción, minería y software. Especialistas en supervisión del sector eléctrico desde {ANIO_FUNDACION}.
            </p>
            <dl className="font-mono text-[11px] tracking-wider text-slate-400 space-y-1 mb-5">
              <div><dt className="inline text-slate-500">RUC · </dt><dd className="inline text-slate-200">{RUC}</dd></div>
              <div><dt className="inline text-slate-500">SEDE · </dt><dd className="inline text-slate-200">TACNA, PERÚ</dd></div>
            </dl>
            <a
              href={config.companyInfo.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook de Ingeniería Telcom EIRL"
              className="placa-acero inline-flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:text-accent-energy transition-colors"
            >
              <FaFacebook /> Facebook
            </a>
            <a
              href={config.companyInfo.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok de Ingeniería Telcom EIRL"
              className="placa-acero inline-flex items-center gap-2 px-4 py-2.5 ml-2 text-sm text-white hover:text-accent-energy transition-colors"
            >
              <FaTiktok /> TikTok
            </a>
          </div>

          {/* Enlaces */}
          <div>
            <Titulo>Enlaces</Titulo>
            <ul className="space-y-2.5">
              {footerNavigation.quickLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href.startsWith('#') ? '/' + item.href : item.href} className={enlace}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portal de empleados */}
          <div>
            <Titulo>Empleados</Titulo>
            <ul className="space-y-2.5">
              {footerNavigation.empleados.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className={`${enlace} inline-flex items-center gap-2`}>
                    {item.href === '/asistencia' ? <FaClock className="text-xs text-accent-energy" /> : <FaUserCheck className="text-xs text-slate-500" />}
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={config.dashboardUrl} target="_blank" rel="noopener noreferrer" className={`${enlace} inline-flex items-center gap-2`}>
                  <FaExternalLinkAlt className="text-[10px] text-slate-500" />
                  Área de trabajo
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto + Libro de Reclamaciones */}
          <div>
            <Titulo>Contacto</Titulo>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <FaPhone className="text-accent-energy mt-1 flex-shrink-0" />
                <a href={`tel:${tel}`} className={enlace}>{config.companyInfo.phone}</a>
              </li>
              <li className="flex items-start gap-3">
                <FaEnvelope className="text-accent-energy mt-1 flex-shrink-0" />
                <a href={`mailto:${config.companyInfo.email}`} className={`${enlace} break-all`}>{config.companyInfo.email}</a>
              </li>
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-accent-energy mt-1 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{config.companyInfo.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <FaClock className="text-accent-energy mt-1 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{config.companyInfo.schedule}</span>
              </li>
            </ul>

            <Link
              to="/libro-reclamaciones"
              className="placa-acero group flex items-center gap-4 pl-4 pr-5 py-3.5 hover:brightness-125 transition"
            >
              <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-accent-energy text-[#111827]">
                <FaBook className="text-xl" />
              </span>
              <span>
                <span className="block font-display font-bold text-white leading-tight">Libro de Reclamaciones</span>
                <span className="block text-xs text-slate-400">Registra un reclamo o queja en línea</span>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p className="text-slate-400 text-center md:text-left">
            © {currentYear} {config.companyInfo.name} · RUC {RUC}. Todos los derechos reservados.
          </p>
          <nav aria-label="Enlaces legales" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {footerNavigation.legal.map((item) => (
              <Link key={item.href} to={item.href} className="text-slate-400 hover:text-accent-energy transition-colors">
                {item.label}
              </Link>
            ))}
            <Link to="/libro-reclamaciones" className="text-slate-400 hover:text-accent-energy transition-colors">
              Libro de Reclamaciones
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
