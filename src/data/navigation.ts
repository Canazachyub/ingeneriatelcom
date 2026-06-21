import { NavItem } from '../types/common.types'

export type { NavItem }

export const mainNavigation: NavItem[] = [
  { label: 'Inicio', href: '#inicio' },
  {
    label: 'Nosotros',
    href: '#quienes-somos',
    children: [
      { label: 'Quiénes Somos', href: '#quienes-somos' },
      { label: 'Servicios', href: '#servicios' },
      { label: 'Misión y Visión', href: '#mision-vision' },
      { label: 'Código de Ética', href: '#codigo-etica' },
      { label: 'Clientes', href: '#clientes' },
    ],
  },
  { label: 'Bolsa de Trabajo', href: '/bolsa-trabajo' },
  { label: 'Contacto', href: '#contacto' },
  {
    label: 'Portal Empleados',
    href: '#',
    children: [
      { label: 'Marcar Asistencia', href: '/asistencia' },
      { label: 'Capacitaciones', href: '/capacitaciones' },
      { label: 'Consultar Postulación', href: '/mi-postulacion' },
      { label: 'Dashboard', href: 'https://canazachyub.github.io/Telcomdashboard', isExternal: true },
    ],
  },
]

export const footerNavigation = {
  quickLinks: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Bolsa de Trabajo', href: '/bolsa-trabajo' },
    { label: 'Consultar Postulación', href: '/mi-postulacion' },
    { label: 'Contacto', href: '#contacto' },
  ],
  empleados: [
    { label: 'Marcar Asistencia', href: '/asistencia' },
    { label: 'Capacitaciones', href: '/capacitaciones' },
    { label: 'Consultar mi Postulación', href: '/mi-postulacion' },
    { label: 'Dashboard', href: 'https://canazachyub.github.io/Telcomdashboard' },
  ],
  legal: [
    { label: 'Términos y Condiciones', href: '/terminos' },
    { label: 'Política de Privacidad', href: '/privacidad' },
  ],
}
