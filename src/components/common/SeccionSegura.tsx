import { Component, ReactNode } from 'react'

// Aísla cada sección de la landing: si una lanza un error al renderizar o
// animar, se oculta ella sola en vez de desmontar la página entera (sin esto,
// un error de framer-motion en el organigrama dejaba la web en blanco).
export default class SeccionSegura extends Component<
  { nombre: string; children: ReactNode },
  { fallo: boolean }
> {
  state = { fallo: false }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[landing] La sección "${this.props.nombre}" falló y se ocultó:`, error)
  }

  render() {
    return this.state.fallo ? null : this.props.children
  }
}
