import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import HeroSection from '../components/sections/HeroSection'
import AboutSection from '../components/sections/AboutSection'
import ServicesSection from '../components/sections/ServicesSection'
import MissionVisionSection from '../components/sections/MissionVisionSection'
import EthicsSection from '../components/sections/EthicsSection'
import OrganizationSection from '../components/sections/OrganizationSection'
import ClientsSection from '../components/sections/ClientsSection'
import FacebookSection from '../components/sections/FacebookSection'
import JobsSection from '../components/sections/JobsSection'
import ContactSection from '../components/sections/ContactSection'

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
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <MissionVisionSection />
      <EthicsSection />
      <OrganizationSection />
      <ClientsSection />
      <FacebookSection />
      <JobsSection />
      <ContactSection />
    </>
  )
}
