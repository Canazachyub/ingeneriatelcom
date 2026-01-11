import { NavItem } from '../types/common.types'

export type { NavItem }

export const mainNavigation: NavItem[] = [
  { label: 'Inicio', href: '#inicio' },
  {
    label: 'Nosotros',
    href: '#quienes-somos',
    children: [
      { label: 'Quienes Somos', href: '#quienes-somos' },
      { label: 'Servicios', href: '#servicios' },
      { label: 'Mision y Vision', href: '#mision-vision' },
      { label: 'Codigo de Etica', href: '#codigo-etica' },
      { label: 'Clientes', href: '#clientes' },
    ],
  },
  { label: 'Bolsa de Trabajo', href: '/bolsa-trabajo' },
  { label: 'Contacto', href: '#contacto' },
  {
    label: 'Area de Trabajo',
    href: 'https://canazachyub.github.io/Telcomdashboard',
    isExternal: true,
  },
]

export const footerNavigation = {
  quickLinks: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Bolsa de Trabajo', href: '/bolsa-trabajo' },
    { label: 'Contacto', href: '#contacto' },
  ],
  legal: [
    { label: 'Terminos y Condiciones', href: '/terminos' },
    { label: 'Politica de Privacidad', href: '/privacidad' },
  ],
}
