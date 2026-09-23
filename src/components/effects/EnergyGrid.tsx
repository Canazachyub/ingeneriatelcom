import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../hooks/useFinePointer'

// Red eléctrica viva en canvas: nodos que derivan despacio, enlaces entre
// vecinos y pulsos de energía que recorren los enlaces. El cursor actúa como
// una "subestación": ilumina y atrae a los nodos cercanos y dispara pulsos.
// Se pausa fuera de pantalla o con la pestaña oculta; con reduced-motion se
// dibuja un solo cuadro estático.

interface Nodo { x: number; y: number; vx: number; vy: number; r: number }
interface Pulso { a: number; b: number; t: number; v: number }

const CIAN = '0, 212, 255'
const AMBAR = '251, 191, 36'
const DIST_ENLACE = 150
const RADIO_CURSOR = 220

export default function EnergyGrid({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const estatico = prefersReducedMotion()
    let ancho = 0
    let alto = 0
    let nodos: Nodo[] = []
    const pulsos: Pulso[] = []
    const cursor = { x: -9999, y: -9999, activo: false }
    let raf = 0
    let visible = true
    let ultimoPulsoCursor = 0

    const crearNodos = () => {
      // Densidad proporcional al área, con tope para pantallas grandes.
      const n = Math.min(110, Math.round((ancho * alto) / 14000))
      nodos = Array.from({ length: n }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.6,
      }))
    }

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      ancho = rect.width
      alto = rect.height
      canvas.width = Math.round(ancho * dpr)
      canvas.height = Math.round(alto * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      crearNodos()
    }

    const lanzarPulso = (a: number) => {
      // Busca un vecino enlazado al nodo a y manda un pulso hacia él.
      const na = nodos[a]
      let mejor = -1
      let mejorD = Infinity
      for (let i = 0; i < nodos.length; i++) {
        if (i === a) continue
        const d = Math.hypot(nodos[i].x - na.x, nodos[i].y - na.y)
        if (d < DIST_ENLACE && d < mejorD && Math.random() > 0.3) { mejor = i; mejorD = d }
      }
      if (mejor >= 0 && pulsos.length < 40) {
        pulsos.push({ a, b: mejor, t: 0, v: 0.012 + Math.random() * 0.02 })
      }
    }

    const dibujar = (ahora: number) => {
      ctx.clearRect(0, 0, ancho, alto)

      // Movimiento + atracción suave hacia el cursor
      for (const n of nodos) {
        if (!estatico) {
          if (cursor.activo) {
            const dx = cursor.x - n.x
            const dy = cursor.y - n.y
            const d = Math.hypot(dx, dy)
            if (d < RADIO_CURSOR && d > 1) {
              n.vx += (dx / d) * 0.012
              n.vy += (dy / d) * 0.012
            }
          }
          n.vx *= 0.985
          n.vy *= 0.985
          // velocidad mínima para que la red nunca quede quieta
          if (Math.abs(n.vx) < 0.05) n.vx += (Math.random() - 0.5) * 0.04
          if (Math.abs(n.vy) < 0.05) n.vy += (Math.random() - 0.5) * 0.04
          n.x += n.vx
          n.y += n.vy
          if (n.x < -20) n.x = ancho + 20
          if (n.x > ancho + 20) n.x = -20
          if (n.y < -20) n.y = alto + 20
          if (n.y > alto + 20) n.y = -20
        }
      }

      // Enlaces
      ctx.lineWidth = 0.6
      for (let i = 0; i < nodos.length; i++) {
        const a = nodos[i]
        for (let j = i + 1; j < nodos.length; j++) {
          const b = nodos[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d > DIST_ENLACE) continue
          let alfa = (1 - d / DIST_ENLACE) * 0.18
          if (cursor.activo) {
            const mx = (a.x + b.x) / 2 - cursor.x
            const my = (a.y + b.y) / 2 - cursor.y
            const dc = Math.hypot(mx, my)
            if (dc < RADIO_CURSOR) alfa += (1 - dc / RADIO_CURSOR) * 0.45
          }
          ctx.strokeStyle = `rgba(${CIAN}, ${alfa.toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Nodos
      for (const n of nodos) {
        let brillo = 0.35
        if (cursor.activo) {
          const dc = Math.hypot(n.x - cursor.x, n.y - cursor.y)
          if (dc < RADIO_CURSOR) brillo += (1 - dc / RADIO_CURSOR) * 0.65
        }
        ctx.fillStyle = `rgba(${CIAN}, ${brillo.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + brillo, 0, Math.PI * 2)
        ctx.fill()
      }

      if (estatico) return

      // Pulsos: aleatorios por toda la red + ráfagas desde el cursor
      if (Math.random() < 0.06 && nodos.length) lanzarPulso(Math.floor(Math.random() * nodos.length))
      if (cursor.activo && ahora - ultimoPulsoCursor > 140) {
        ultimoPulsoCursor = ahora
        let cercano = -1
        let dMin = RADIO_CURSOR
        nodos.forEach((n, i) => {
          const d = Math.hypot(n.x - cursor.x, n.y - cursor.y)
          if (d < dMin) { dMin = d; cercano = i }
        })
        if (cercano >= 0) lanzarPulso(cercano)
      }

      for (let k = pulsos.length - 1; k >= 0; k--) {
        const p = pulsos[k]
        p.t += p.v
        const a = nodos[p.a]
        const b = nodos[p.b]
        if (!a || !b || p.t >= 1) {
          // Al llegar, a veces continúa por la red (efecto de cascada)
          if (b && p.t >= 1 && Math.random() < 0.5) lanzarPulso(p.b)
          pulsos.splice(k, 1)
          continue
        }
        const x = a.x + (b.x - a.x) * p.t
        const y = a.y + (b.y - a.y) * p.t
        const color = k % 7 === 0 ? AMBAR : CIAN
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7)
        g.addColorStop(0, `rgba(${color}, 0.95)`)
        g.addColorStop(1, `rgba(${color}, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const bucle = (t: number) => {
      if (visible && !document.hidden) dibujar(t)
      raf = requestAnimationFrame(bucle)
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      cursor.x = e.clientX - rect.left
      cursor.y = e.clientY - rect.top
      cursor.activo = cursor.y >= 0 && cursor.y <= rect.height
    }
    const onLeave = () => { cursor.activo = false }
    // Táctil: un toque es una "descarga" — ilumina la zona y lanza una ráfaga
    // de pulsos desde los nodos cercanos; al levantar el dedo se apaga.
    let apagarToque = 0
    const onDown = (e: PointerEvent) => {
      onMove(e)
      if (!cursor.activo || e.pointerType === 'mouse') return
      const cercanos = nodos
        .map((n, i) => ({ i, d: Math.hypot(n.x - cursor.x, n.y - cursor.y) }))
        .filter((c) => c.d < RADIO_CURSOR)
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
      cercanos.forEach((c) => lanzarPulso(c.i))
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      clearTimeout(apagarToque)
      apagarToque = window.setTimeout(() => { cursor.activo = false }, 700)
    }

    ajustar()
    const ro = new ResizeObserver(ajustar)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)

    if (estatico) {
      dibujar(0)
    } else {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      document.addEventListener('pointerleave', onLeave)
      raf = requestAnimationFrame(bucle)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      clearTimeout(apagarToque)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={`w-full h-full ${className}`} />
}
