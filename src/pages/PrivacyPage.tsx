import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaShieldAlt } from 'react-icons/fa'
import Breadcrumb from '../components/common/Breadcrumb'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-primary-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Back Button */}
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
          className="inline-flex items-center gap-2 text-primary-300 hover:text-accent-electric transition-colors mb-10"
        >
          <FaArrowLeft />
          <span>Volver</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-electric to-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaShieldAlt className="text-white text-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white">
            Política de Privacidad
          </h1>
        </div>
        <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Política de Privacidad' }]} />
        <p className="text-primary-400 mb-12">
          Última actualización: mayo de 2025 — Telcom EIRL
        </p>

        <div className="space-y-10">
          {/* 1 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              1. Responsable del Tratamiento
            </h2>
            <p className="text-primary-200 leading-relaxed">
              <strong className="text-white">Telcom EIRL</strong>, con domicilio en la ciudad de Tacna, Perú,
              es la empresa responsable del tratamiento de sus datos personales recopilados a través de este
              sitio web, en cumplimiento de la{' '}
              <strong className="text-white">
                Ley N.° 29733 — Ley de Protección de Datos Personales del Perú
              </strong>{' '}
              y su Reglamento aprobado por Decreto Supremo N.° 003-2013-JUS.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              2. Datos Personales Recolectados
            </h2>
            <p className="text-primary-200 leading-relaxed mb-3">
              Dependiendo de la funcionalidad utilizada, podemos recopilar los siguientes datos:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-primary-200 border border-primary-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-primary-800 text-white">
                    <th className="text-left px-4 py-3 font-semibold">Categoría</th>
                    <th className="text-left px-4 py-3 font-semibold">Datos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-700">
                  <tr className="bg-primary-850">
                    <td className="px-4 py-3 font-medium text-primary-100">Identificación</td>
                    <td className="px-4 py-3">Nombre completo, DNI / documento de identidad</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary-100">Contacto</td>
                    <td className="px-4 py-3">Correo electrónico, número de teléfono, dirección</td>
                  </tr>
                  <tr className="bg-primary-850">
                    <td className="px-4 py-3 font-medium text-primary-100">Postulación</td>
                    <td className="px-4 py-3">CV, experiencia laboral, historial educativo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary-100">Asistencia</td>
                    <td className="px-4 py-3">Coordenadas GPS (solo durante el registro de asistencia)</td>
                  </tr>
                  <tr className="bg-primary-850">
                    <td className="px-4 py-3 font-medium text-primary-100">Técnicos</td>
                    <td className="px-4 py-3">Dirección IP, tipo de navegador, páginas visitadas</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              3. Finalidad del Tratamiento
            </h2>
            <p className="text-primary-200 leading-relaxed mb-3">
              Sus datos personales son tratados con las siguientes finalidades:
            </p>
            <ul className="list-disc list-inside text-primary-200 space-y-2 pl-2">
              <li>Gestionar y evaluar su postulación a puestos de trabajo ofrecidos por Telcom EIRL.</li>
              <li>Registrar y controlar la asistencia del personal en los proyectos asignados.</li>
              <li>Responder consultas y solicitudes enviadas a través del formulario de contacto.</li>
              <li>Mejorar la funcionalidad, seguridad y experiencia de uso del Sitio.</li>
              <li>Cumplir con obligaciones legales y regulatorias aplicables.</li>
            </ul>
            <p className="text-primary-200 leading-relaxed mt-3">
              Sus datos no serán utilizados para fines distintos a los indicados sin su previo consentimiento,
              salvo en los casos previstos por la Ley N.° 29733.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              4. Base Legal del Tratamiento
            </h2>
            <p className="text-primary-200 leading-relaxed">
              El tratamiento de sus datos personales se realiza sobre la base de:
            </p>
            <ul className="list-disc list-inside text-primary-200 space-y-2 pl-2 mt-3">
              <li>Su <strong className="text-white">consentimiento expreso</strong> al completar formularios en el Sitio.</li>
              <li>La <strong className="text-white">ejecución de una relación laboral o precontractual</strong> (postulaciones y asistencia).</li>
              <li>El cumplimiento de <strong className="text-white">obligaciones legales</strong> a cargo de Telcom EIRL.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              5. Transferencia de Datos
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Telcom EIRL no vende, alquila ni cede sus datos personales a terceros con fines comerciales.
              Únicamente podremos compartir sus datos con proveedores de servicios tecnológicos que actúen
              como encargados del tratamiento bajo estrictas obligaciones de confidencialidad, o cuando sea
              requerido por autoridad competente en virtud de mandato legal o judicial.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              6. Conservación de Datos
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Sus datos personales serán conservados durante el tiempo necesario para cumplir con la finalidad
              para la que fueron recopilados, o durante el plazo exigido por la legislación peruana aplicable.
              Una vez cumplida dicha finalidad, los datos serán eliminados o anonimizados de forma segura.
            </p>
          </section>

          {/* 7 — ARCO */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              7. Derechos ARCO
            </h2>
            <p className="text-primary-200 leading-relaxed mb-3">
              De conformidad con la Ley N.° 29733, usted tiene derecho a:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  letra: 'A',
                  titulo: 'Acceso',
                  desc: 'Conocer qué datos personales suyos tratamos y las condiciones del tratamiento.',
                },
                {
                  letra: 'R',
                  titulo: 'Rectificación',
                  desc: 'Solicitar la corrección de datos inexactos o incompletos.',
                },
                {
                  letra: 'C',
                  titulo: 'Cancelación',
                  desc: 'Pedir la supresión de sus datos cuando ya no sean necesarios o cuando retire su consentimiento.',
                },
                {
                  letra: 'O',
                  titulo: 'Oposición',
                  desc: 'Oponerse al tratamiento de sus datos en determinadas circunstancias.',
                },
              ].map(({ letra, titulo, desc }) => (
                <div
                  key={letra}
                  className="bg-primary-800 rounded-xl p-5 border border-primary-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 bg-accent-electric text-primary-950 font-bold rounded-full flex items-center justify-center text-sm">
                      {letra}
                    </span>
                    <h3 className="font-semibold text-white">{titulo}</h3>
                  </div>
                  <p className="text-primary-300 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-primary-200 leading-relaxed mt-4">
              Para ejercer cualquiera de estos derechos, comuníquese con nosotros a través de los datos de
              contacto indicados en la sección siguiente. Atenderemos su solicitud en los plazos establecidos
              por la legislación peruana.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              8. Seguridad
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Telcom EIRL adopta medidas técnicas y organizativas adecuadas para proteger sus datos personales
              contra pérdida, acceso no autorizado, divulgación, alteración o destrucción accidental o ilícita.
              No obstante, ninguna transmisión de datos por Internet puede garantizarse como absolutamente segura.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              9. Contacto
            </h2>
            <p className="text-primary-200 leading-relaxed mb-4">
              Para consultas, ejercicio de derechos ARCO o cualquier asunto relacionado con el tratamiento de
              sus datos personales, puede contactarnos en:
            </p>
            <div className="bg-primary-800 rounded-xl p-6 border border-primary-700 space-y-2 text-primary-200">
              <p>
                <span className="text-primary-400">Empresa:</span>{' '}
                <strong className="text-white">Telcom EIRL</strong>
              </p>
              <p>
                <span className="text-primary-400">Ubicación:</span>{' '}
                <span>Tacna, Perú</span>
              </p>
              <p>
                <span className="text-primary-400">Contacto:</span>{' '}
                <span>Disponible en la sección de Contacto del sitio web</span>
              </p>
            </div>
            <p className="text-primary-400 text-sm mt-4">
              Asimismo, si considera que el tratamiento de sus datos vulnera la normativa vigente, tiene
              derecho a presentar una reclamación ante la{' '}
              <strong className="text-primary-200">
                Autoridad Nacional de Protección de Datos Personales (ANPDP)
              </strong>{' '}
              del Ministerio de Justicia y Derechos Humanos del Perú.
            </p>
          </section>
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-primary-700 text-primary-400 text-sm text-center">
          &copy; {new Date().getFullYear()} Telcom EIRL — Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}
