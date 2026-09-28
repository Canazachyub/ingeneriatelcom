import { Service } from '../types/common.types'
import { PROYECTOS_EJECUTADOS, CLIENTES_ATENDIDOS, REGIONES_ATENDIDAS, aniosExperiencia } from './empresa'

// Especialidad: lo que más hacemos y nos diferencia. Se describe el tipo de
// servicio, nunca montos, números de contrato ni detalles que ayuden a la
// competencia en una licitación.
export const especialidad = {
  titulo: 'Supervisión técnica del sector eléctrico',
  descripcion:
    'Somos el equipo técnico en campo de empresas distribuidoras de electricidad. Verificamos que el servicio cumpla la normativa de OSINERGMIN y entregamos informes con evidencia, listos para auditoría.',
  puntos: [
    'Supervisión del contraste y reemplazo de medidores',
    'Calidad de producto y suministro (NTCSE y NTCSER)',
    'Apoyo a los procedimientos de fiscalización de OSINERGMIN',
    'Gestión y atención de reclamos de usuarios',
  ],
}

// Líneas de servicio (el orden es el de las tarjetas)
export const services: Service[] = [
  {
    id: '1',
    title: 'Ingeniería eléctrica',
    description: 'Diseño, instalación y supervisión de sistemas eléctricos en baja y media tensión. Expedientes técnicos, consultoría y puesta en marcha para el sector público y privado.',
    icon: 'cog',
  },
  {
    id: '2',
    title: 'Construcción',
    description: 'Gestión y supervisión de obras civiles y electromecánicas: planificación, control de calidad y seguridad en campo de principio a fin.',
    icon: 'paint-brush',
  },
  {
    id: '3',
    title: 'Minería',
    description: 'Instalaciones eléctricas, mantenimiento y supervisión técnica para operaciones mineras, con personal preparado para trabajar en altura y bajo estándares de seguridad minera.',
    icon: 'mineria',
  },
  {
    id: '4',
    title: 'Software y TIC',
    description: 'Sistemas de gestión, aplicaciones móviles de campo, tableros de indicadores y redes de comunicación. Tecnología hecha por ingenieros que conocen la operación.',
    icon: 'clipboard-check',
  },
]

// Cifras del hero: salen de data/empresa.ts (fuente única), no se escriben aquí.
export const statistics = [
  { value: PROYECTOS_EJECUTADOS, suffix: '', label: 'Proyectos ejecutados', icon: 'folder' },
  { value: CLIENTES_ATENDIDOS, suffix: '+', label: 'Clientes', icon: 'users' },
  { value: aniosExperiencia(), suffix: '', label: 'Años de experiencia', icon: 'clock' },
  { value: REGIONES_ATENDIDAS, suffix: '', label: 'Regiones atendidas', icon: 'map' },
]
