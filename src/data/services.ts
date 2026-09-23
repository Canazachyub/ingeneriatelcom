import { Service } from '../types/common.types'
import { PROYECTOS_EJECUTADOS, CLIENTES_ATENDIDOS, SATISFACCION, aniosExperiencia } from './empresa'

export const services: Service[] = [
  {
    id: '1',
    title: 'Desarrollo de Software',
    description: 'Creamos soluciones de software a medida, sistemas de gestión y aplicaciones empresariales. Soporte técnico y mantenimiento continuo para garantizar el funcionamiento óptimo.',
    icon: 'clipboard-check',
  },
  {
    id: '2',
    title: 'Soluciones TIC',
    description: 'Implementación de tecnologías de información y comunicación, infraestructura de redes, sistemas de telecomunicaciones y transformación digital para empresas.',
    icon: 'chart-bar',
  },
  {
    id: '3',
    title: 'Ingeniería Eléctrica',
    description: 'Proyectos de ingeniería eléctrica, supervisión de obras, diseño de sistemas eléctricos y consultoría técnica para el sector público y privado.',
    icon: 'cog',
  },
  {
    id: '4',
    title: 'Minería y Construcción',
    description: 'Soluciones integrales para el sector minero y construcción. Gestión de proyectos, supervisión técnica y consultoría especializada.',
    icon: 'paint-brush',
  },
]

// Cifras del hero: salen de data/empresa.ts (fuente única), no se escriben aquí.
export const statistics = [
  { value: PROYECTOS_EJECUTADOS, suffix: '', label: 'Proyectos Ejecutados', icon: 'folder' },
  { value: CLIENTES_ATENDIDOS, suffix: '+', label: 'Clientes', icon: 'users' },
  { value: aniosExperiencia(), suffix: '', label: 'Años de Experiencia', icon: 'clock' },
  { value: SATISFACCION, suffix: '%', label: 'Satisfacción', icon: 'star' },
]
