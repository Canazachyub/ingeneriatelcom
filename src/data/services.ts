import { Service } from '../types/common.types'

export const services: Service[] = [
  {
    id: '1',
    title: 'Desarrollo de Software',
    description: 'Creamos soluciones de software a medida, sistemas de gestion y aplicaciones empresariales. Soporte tecnico y mantenimiento continuo para garantizar el funcionamiento optimo.',
    icon: 'clipboard-check',
  },
  {
    id: '2',
    title: 'Soluciones TIC',
    description: 'Implementacion de tecnologias de informacion y comunicacion, infraestructura de redes, sistemas de telecomunicaciones y transformacion digital para empresas.',
    icon: 'chart-bar',
  },
  {
    id: '3',
    title: 'Ingenieria Electrica',
    description: 'Proyectos de ingenieria electrica, supervision de obras, diseno de sistemas electricos y consultoria tecnica para el sector publico y privado.',
    icon: 'cog',
  },
  {
    id: '4',
    title: 'Mineria y Construccion',
    description: 'Soluciones integrales para el sector minero y construccion. Gestion de proyectos, supervision tecnica y consultoria especializada.',
    icon: 'paint-brush',
  },
]

export const statistics = [
  { value: 24, suffix: '', label: 'Proyectos Ejecutados', icon: 'folder' },
  { value: 15, suffix: '+', label: 'Clientes', icon: 'users' },
  { value: 9, suffix: '', label: 'Anos de Experiencia', icon: 'clock' },
  { value: 100, suffix: '%', label: 'Satisfaccion', icon: 'star' },
]
