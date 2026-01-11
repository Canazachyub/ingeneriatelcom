import { Service } from '../types/common.types'

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

export const statistics = [
  { value: 24, suffix: '', label: 'Proyectos Ejecutados', icon: 'folder' },
  { value: 15, suffix: '+', label: 'Clientes', icon: 'users' },
  { value: 9, suffix: '', label: 'Años de Experiencia', icon: 'clock' },
  { value: 100, suffix: '%', label: 'Satisfacción', icon: 'star' },
]
