import { NavItem } from '../types/common.types'

export type { NavItem }

export const mainNavigation: NavItem[] = [
  { label: 'Inicio', href: '#inicio' },
  {
    label: 'Nosotros',
    href: '#quienes-somos',
    children: [
      // Mismo orden que la página (data/empresa.ts → SECCIONES)
      { label: 'Quiénes Somos', href: '#quienes-somos' },
      { label: 'Servicios', href: '#servicios' },
      { label: 'Operaciones', href: '#operaciones' },
      { label: 'Clientes', href: '#clientes' },
      { label: 'Misión y Visión', href: '#mision-vision' },
      { label: 'Código de Ética', href: '#codigo-etica' },
      { label: 'Organización', href: '#estructura-organizacional' },
    ],
  },
  { label: 'Bolsa de trabajo', href: '/bolsa-trabajo' },
  { label: 'Contacto', href: '#contacto' },
  {
    label: 'Portal de empleados',
    href: '#',
    children: [
      { label: 'Marcar asistencia', href: '/asistencia' },
      { label: 'Capacitaciones', href: '/capacitaciones' },
      { label: 'Consultar postulación', href: '/mi-postulacion' },
      { label: 'Área de trabajo', href: 'https://canazachyub.github.io/Telcomdashboard', isExternal: true },
    ],
  },
]

export const footerNavigation = {
  quickLinks: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Bolsa de trabajo', href: '/bolsa-trabajo' },
    { label: 'Consultar postulación', href: '/mi-postulacion' },
    { label: 'Contacto', href: '#contacto' },
  ],
  empleados: [
    { label: 'Marcar asistencia', href: '/asistencia' },
    { label: 'Capacitaciones', href: '/capacitaciones' },
  ],
  legal: [
    { label: 'Términos y condiciones', href: '/terminos' },
    { label: 'Política de privacidad', href: '/privacidad' },
  ],
}
