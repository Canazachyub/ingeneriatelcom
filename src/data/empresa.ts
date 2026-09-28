// Datos institucionales en UN solo lugar. Antes cada sección tenía su propia
// cifra y se contradecían (hero "15+ años" vs. "9 años" en Quiénes somos;
// "27 proyectos" vs. "24" en Servicios). Toda cifra pública sale de aquí.

export const ANIO_FUNDACION = 2017

// Se calcula: no hay que acordarse de actualizarlo cada enero.
export const aniosExperiencia = (hoy: Date = new Date()) => hoy.getFullYear() - ANIO_FUNDACION

export const PROYECTOS_EJECUTADOS = 27
export const CLIENTES_ATENDIDOS = 15   // total histórico; en la sección Clientes se muestran los principales
// Regiones del sur y oriente donde hemos trabajado (Tacna, Moquegua, Puno,
// Cusco, Apurímac, Madre de Dios). Reemplaza al antiguo "100 % satisfacción",
// que no tenía respaldo.
export const REGIONES_ATENDIDAS = 6

// Orden narrativo de la landing: quiénes somos → qué hacemos → prueba (obras y
// clientes) → cómo somos (filosofía, ética, organización) → súmate → contacto.
// Lo usan la navegación lateral, el scroll-spy del menú y los encabezados.
export interface SeccionLanding {
  id: string
  etiqueta: string
}

export const SECCIONES: SeccionLanding[] = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'quienes-somos', etiqueta: 'Quiénes somos' },
  { id: 'servicios', etiqueta: 'Servicios' },
  { id: 'operaciones', etiqueta: 'Operaciones' },
  { id: 'clientes', etiqueta: 'Clientes' },
  { id: 'mision-vision', etiqueta: 'Misión y visión' },
  { id: 'codigo-etica', etiqueta: 'Código de ética' },
  { id: 'estructura-organizacional', etiqueta: 'Organización' },
  { id: 'bolsa-trabajo', etiqueta: 'Bolsa de trabajo' },
  { id: 'facebook', etiqueta: 'Novedades' },
  { id: 'contacto', etiqueta: 'Contacto' },
]

// Número de sección con dos dígitos ("04") para los encabezados HUD.
export const numeroSeccion = (id: string) => {
  const i = SECCIONES.findIndex((s) => s.id === id)
  return i < 0 ? '' : String(i).padStart(2, '0')
}
