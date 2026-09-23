import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import HeroSection from '../components/sections/HeroSection'
import AboutSection from '../components/sections/AboutSection'
import ServicesSection from '../components/sections/ServicesSection'
import OperacionesSection from '../components/sections/OperacionesSection'
import MissionVisionSection from '../components/sections/MissionVisionSection'
import EthicsSection from '../components/sections/EthicsSection'
import OrganizationSection from '../components/sections/OrganizationSection'
import ClientsSection from '../components/sections/ClientsSection'
import FacebookSection from '../components/sections/FacebookSection'
import JobsSection from '../components/sections/JobsSection'
import ContactSection from '../components/sections/ContactSection'
import CursorSpotlight from '../components/effects/CursorSpotlight'
import SectionRail from '../components/layout/SectionRail'
import SeccionSegura from '../components/common/SeccionSegura'

export default function HomePage() {
  const location = useLocation()

  useEffect(() => {
    const hash = location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) {
          const offset = 80
          const top = el.getBoundingClientRect().top + window.pageYOffset - offset
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 150)
    }
  }, [location.hash])

  return (
    <>
      <CursorSpotlight />
      <SectionRail />
      <SeccionSegura nombre="HeroSection"><HeroSection /></SeccionSegura>
      <SeccionSegura nombre="AboutSection"><AboutSection /></SeccionSegura>
      <SeccionSegura nombre="ServicesSection"><ServicesSection /></SeccionSegura>
      <SeccionSegura nombre="OperacionesSection"><OperacionesSection /></SeccionSegura>
      {/* Clientes justo después de las obras: primero la prueba, luego la filosofía */}
      <SeccionSegura nombre="ClientsSection"><ClientsSection /></SeccionSegura>
      <SeccionSegura nombre="MissionVisionSection"><MissionVisionSection /></SeccionSegura>
      <SeccionSegura nombre="EthicsSection"><EthicsSection /></SeccionSegura>
      <SeccionSegura nombre="OrganizationSection"><OrganizationSection /></SeccionSegura>
      <SeccionSegura nombre="JobsSection"><JobsSection /></SeccionSegura>
      <SeccionSegura nombre="FacebookSection"><FacebookSection /></SeccionSegura>
      <SeccionSegura nombre="ContactSection"><ContactSection /></SeccionSegura>
    </>
  )
}
