import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HiMenu, HiX, HiChevronDown, HiExternalLink } from 'react-icons/hi'
import { mainNavigation, NavItem } from '../../data/navigation'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileOpenDropdown, setMobileOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavClick = (href: string, isExternal?: boolean) => {
    setIsMobileMenuOpen(false)
    setOpenDropdown(null)
    setMobileOpenDropdown(null)

    if (isExternal) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }

    if (href.startsWith('/')) {
      navigate(href)
      return
    }

    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        const offset = 80
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        })
      }
    }
  }

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openDropdown === item.label

    if (hasChildren) {
      return (
        <div key={item.label} className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpenDropdown(isOpen ? null : item.label)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary-200 hover:text-accent-electric transition-colors duration-200"
          >
            {item.label}
            <HiChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 mt-1 w-48 bg-primary-900/95 backdrop-blur-md rounded-lg border border-primary-700 shadow-xl overflow-hidden"
              >
                {item.children!.map((child) => (
                  <a
                    key={child.href}
                    href={child.href}
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavClick(child.href, child.isExternal)
                    }}
                    className="block px-4 py-3 text-sm text-primary-200 hover:text-accent-electric hover:bg-primary-800/50 transition-colors duration-200"
                  >
                    {child.label}
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    if (item.isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-accent-energy hover:text-accent-electric transition-colors duration-200"
        >
          {item.label}
          <HiExternalLink className="w-4 h-4" />
        </a>
      )
    }

    return (
      <a
        key={item.href}
        href={item.href}
        onClick={(e) => {
          e.preventDefault()
          handleNavClick(item.href)
        }}
        className="px-4 py-2 text-sm font-medium text-primary-200 hover:text-accent-electric transition-colors duration-200 relative group"
      >
        {item.label}
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-accent-electric group-hover:w-full transition-all duration-300" />
      </a>
    )
  }

  const renderMobileNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isOpen = mobileOpenDropdown === item.label

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => setMobileOpenDropdown(isOpen ? null : item.label)}
            className="w-full flex items-center justify-between px-4 py-3 text-primary-200 hover:text-accent-electric hover:bg-primary-800/50 rounded-lg transition-all duration-200"
          >
            {item.label}
            <HiChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pl-4 border-l-2 border-primary-700 ml-4 mt-1 mb-2">
                  {item.children!.map((child) => (
                    <a
                      key={child.href}
                      href={child.href}
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavClick(child.href, child.isExternal)
                      }}
                      className="block px-4 py-2 text-sm text-primary-300 hover:text-accent-electric transition-colors duration-200"
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    if (item.isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 text-accent-energy hover:text-accent-electric hover:bg-primary-800/50 rounded-lg transition-all duration-200"
        >
          {item.label}
          <HiExternalLink className="w-5 h-5" />
        </a>
      )
    }

    return (
      <a
        key={item.href}
        href={item.href}
        onClick={(e) => {
          e.preventDefault()
          handleNavClick(item.href)
        }}
        className="block px-4 py-3 text-primary-200 hover:text-accent-electric hover:bg-primary-800/50 rounded-lg transition-all duration-200"
      >
        {item.label}
      </a>
    )
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-primary-950/95 backdrop-blur-md shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center group"
            onClick={() => handleNavClick('#inicio')}
          >
            <img
              src="/assets/images/logo/logo-horizontal.png"
              alt="Ingenieria Telcom EIRL"
              className="h-12 md:h-14 w-auto object-contain group-hover:opacity-90 transition-opacity duration-300"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainNavigation.map((item) => renderNavItem(item))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white hover:text-accent-electric transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-primary-900/95 backdrop-blur-md border-t border-primary-800"
          >
            <div className="px-4 py-4 space-y-1">
              {mainNavigation.map((item) => renderMobileNavItem(item))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
