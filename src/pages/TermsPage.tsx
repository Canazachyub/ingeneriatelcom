import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaBolt } from 'react-icons/fa'
import Breadcrumb from '../components/common/Breadcrumb'

export default function TermsPage() {
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
            <FaBolt className="text-white text-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white">
            Términos y Condiciones
          </h1>
        </div>
        <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Términos y Condiciones' }]} />
        <p className="text-primary-400 mb-12">
          Última actualización: mayo de 2025 — Telcom EIRL
        </p>

        <div className="space-y-10">
          {/* 1 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              1. Aceptación de los Términos
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Al acceder y utilizar el sitio web de <strong className="text-white">Telcom EIRL</strong> (en adelante
              "el Sitio"), usted acepta estar sujeto a los presentes Términos y Condiciones de Uso, así como a
              todas las leyes y regulaciones aplicables. Si no está de acuerdo con alguno de estos términos, le
              solicitamos que no utilice el Sitio.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              2. Uso del Sitio
            </h2>
            <p className="text-primary-200 leading-relaxed mb-3">
              El Sitio es operado por Telcom EIRL con el propósito de brindar información sobre nuestros servicios
              de telecomunicaciones, gestión de empleo y comunicación con clientes y postulantes. Usted se compromete a:
            </p>
            <ul className="list-disc list-inside text-primary-200 space-y-2 pl-2">
              <li>Utilizar el Sitio únicamente para fines lícitos y de acuerdo con los presentes Términos.</li>
              <li>No reproducir, duplicar, copiar o explotar ninguna parte del Sitio sin autorización expresa.</li>
              <li>No introducir virus, troyanos u otro material tecnológico malicioso.</li>
              <li>No intentar acceder sin autorización a ninguna parte del Sitio, servidor o base de datos conectada.</li>
              <li>Proporcionar información veraz y actualizada al completar formularios o postulaciones.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              3. Propiedad Intelectual
            </h2>
            <p className="text-primary-200 leading-relaxed mb-3">
              Todo el contenido publicado en el Sitio — incluyendo, sin limitación, textos, gráficos, logotipos,
              íconos, imágenes, clips de audio, descargas digitales y compilaciones de datos — es propiedad de
              <strong className="text-white"> Telcom EIRL</strong> o de sus proveedores de contenido, y está
              protegido por las leyes peruanas e internacionales de derechos de autor.
            </p>
            <p className="text-primary-200 leading-relaxed">
              Queda expresamente prohibida la reproducción total o parcial, distribución, modificación, cesión o
              comunicación pública del contenido del Sitio sin contar con la autorización previa y por escrito de
              Telcom EIRL, salvo para uso personal y no comercial.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              4. Limitación de Responsabilidad
            </h2>
            <p className="text-primary-200 leading-relaxed mb-3">
              Telcom EIRL no garantiza que el Sitio esté libre de errores, interrupciones o virus. En la medida
              permitida por la ley, Telcom EIRL no será responsable por:
            </p>
            <ul className="list-disc list-inside text-primary-200 space-y-2 pl-2">
              <li>Pérdidas o daños causados por la indisponibilidad o interrupción del Sitio.</li>
              <li>Pérdidas de datos o lucro cesante derivadas del uso o imposibilidad de uso del Sitio.</li>
              <li>Contenido de sitios web de terceros a los que el Sitio pueda enlazar.</li>
              <li>Acciones de terceros que puedan afectar la seguridad o integridad del Sitio.</li>
            </ul>
            <p className="text-primary-200 leading-relaxed mt-3">
              El usuario asume la plena responsabilidad por el uso que realice del Sitio y por los datos que
              proporcione a través del mismo.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              5. Modificaciones
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Telcom EIRL se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier
              momento. Las modificaciones entrarán en vigor en el momento de su publicación en el Sitio. El uso
              continuado del Sitio tras la publicación de cambios constituye la aceptación de dichos cambios.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              6. Jurisdicción y Ley Aplicable
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Los presentes Términos y Condiciones se rigen e interpretan conforme a las leyes vigentes de la
              <strong className="text-white"> República del Perú</strong>. Para cualquier controversia derivada
              del uso del Sitio, las partes se someten a la competencia de los juzgados y tribunales de la ciudad
              de <strong className="text-white">Tacna, Perú</strong>, renunciando expresamente a cualquier otro
              fuero que pudiera corresponderles.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4 border-b border-primary-700 pb-2">
              7. Contacto
            </h2>
            <p className="text-primary-200 leading-relaxed">
              Para cualquier consulta relacionada con estos Términos y Condiciones, puede contactarnos a través
              de los canales oficiales disponibles en la sección de contacto de nuestro sitio web o escribirnos
              directamente a nuestras oficinas en Tacna, Perú.
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
