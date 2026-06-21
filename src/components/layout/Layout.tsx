import { ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import PageLoader from '../common/PageLoader'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  useEffect(() => {
    // Only scroll to top if there's no hash (hash navigation handles its own scroll)
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  return (
    <>
      <PageLoader />
      <div className="min-h-screen flex flex-col bg-primary-950">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
