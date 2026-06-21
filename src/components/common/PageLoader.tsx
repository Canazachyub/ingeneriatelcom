import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function PageLoader() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setLoading(true)
    setProgress(20)

    const t1 = setTimeout(() => setProgress(60), 100)
    const t2 = setTimeout(() => setProgress(90), 300)
    const t3 = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }, 500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [location.pathname])

  if (!loading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-0.5 bg-accent-electric transition-all duration-300 ease-out shadow-[0_0_8px_#00d4ff]"
      style={{ width: `${progress}%`, opacity: loading ? 1 : 0 }}
    />
  )
}
