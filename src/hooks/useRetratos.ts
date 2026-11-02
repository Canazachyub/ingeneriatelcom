import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/appScriptApi'

// ── Retratos del personal ────────────────────────────────────────────────────
// Lo que se ve en el panel junto a cada trabajador. Orden de preferencia:
//   1. La foto de su ficha (Drive: Personal/<dni>/foto.jpg).
//   2. Su selfie de marcación más reciente que se vea bien (kiosko).
//   3. Sus iniciales.
// Los archivos son privados: solo se leen con getArchivo (nivel auth). Cada
// retrato se recorta a 256 px y se guarda en el navegador para no volver a
// descargarlo; por eso abrir el panel no agrega carga a Apps Script salvo una
// vez al día. Se borra al cerrar sesión (ver borrarRetratos).

export interface Retrato {
  url: string
  id: string
  origen: 'ficha' | 'selfie'
  fecha: string
}

export interface MapaRetratos {
  porDni: Record<string, Retrato>
  // nombre normalizado → dni: varias pantallas solo traen el nombre
  dniDe: Record<string, string>
  // Cuándo se actualizó: al recargar la página sigue vigente lo guardado
  cuando?: number
}

const CLAVE = 'telcom_retratos_v1'
const LADO = 256
const SELFIES_A_PROBAR = 5
const DIAS_SELFIE = 45
const VIGENCIA_SELFIE_MS = 30 * 24 * 3600e3
const SIMULTANEAS = 2

export const CLAVE_RETRATOS = ['retratos'] as const

export const normalizarNombre = (n: unknown) =>
  String(n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z ]/g, ' ').toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ')

function leerGuardado(): MapaRetratos {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (raw) return JSON.parse(raw) as MapaRetratos
  } catch { /* sin almacenamiento: se reconstruye */ }
  return { porDni: {}, dniDe: {} }
}

function guardar(m: MapaRetratos) {
  try { localStorage.setItem(CLAVE, JSON.stringify(m)) } catch { /* lleno: queda en memoria */ }
}

export function borrarRetratos() {
  try { localStorage.removeItem(CLAVE) } catch { /* nada que borrar */ }
}

// En una selfie apaisada la cara no siempre está al centro: se ubica el centro
// de los tonos de piel y el recorte cuadrado se corre hacia ahí.
function centrarEnRostro(img: HTMLImageElement, lado: number) {
  const centro = (img.width - lado) / 2
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 48
  const ctx = c.getContext('2d')
  if (!ctx) return centro
  ctx.drawImage(img, 0, 0, 64, 48)
  const px = ctx.getImageData(0, 0, 64, 48).data
  let suma = 0
  let n = 0
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]]
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && r - b > 15) { suma += (i / 4) % 64; n++ }
  }
  if (n < 40) return centro
  const x = (suma / n / 64) * img.width
  return Math.max(0, Math.min(img.width - lado, x - lado / 2))
}

// Recorta en cuadrado y mide la imagen: una foto casi negra o plana no sirve
// de retrato.
function recortar(dataUri: string, exigente: boolean): Promise<string | null> {
  return new Promise((resolver) => {
    const img = new Image()
    img.onerror = () => resolver(null)
    img.onload = () => {
      const lado = Math.min(img.width, img.height)
      const sx = exigente ? centrarEnRostro(img, lado) : (img.width - lado) / 2
      const sy = (img.height - lado) / 2
      const c = document.createElement('canvas')
      c.width = LADO
      c.height = LADO
      const ctx = c.getContext('2d')
      if (!ctx) return resolver(null)
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO)
      if (exigente) {
        const px = ctx.getImageData(0, 0, LADO, LADO).data
        let suma = 0
        let suma2 = 0
        const n = px.length / 16
        for (let i = 0; i < px.length; i += 16) {
          const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
          suma += l
          suma2 += l * l
        }
        const media = suma / n
        const desviacion = Math.sqrt(Math.max(0, suma2 / n - media * media))
        if (media < 60 || desviacion < 22) return resolver(null)
      }
      resolver(c.toDataURL('image/jpeg', 0.82))
    }
    img.src = dataUri
  })
}

async function descargar(idOUrl: string, exigente: boolean): Promise<string | null> {
  const r = await api.getArchivo(idOUrl)
  if (!r.success || !r.data || !/^image\//.test(r.data.mimeType)) return null
  return recortar(`data:${r.data.mimeType};base64,${r.data.base64}`, exigente)
}

interface Permisos { asistencias: boolean; personal: boolean }

async function cargar(previo: MapaRetratos, permisos: Permisos): Promise<MapaRetratos> {
  const hoy = new Date()
  const desde = new Date(hoy.getTime() - DIAS_SELFIE * 86400e3).toISOString().slice(0, 10)
  const [resumen, marcas, roster] = await Promise.all([
    permisos.personal ? api.rrhhResumen() : Promise.resolve(null),
    permisos.asistencias ? api.getAsistenciasV2({ desde, hasta: hoy.toISOString().slice(0, 10) }) : Promise.resolve(null),
    api.getTrabajadores(true),
  ])

  // Si el servidor falla se lanza error: React Query conserva los retratos que ya hay
  if (marcas && !marcas.success) throw new Error(marcas.error || 'No se pudieron leer las marcas')
  if (resumen && !resumen.success) throw new Error(resumen.error || 'No se pudo leer el personal')

  const dniDe: Record<string, string> = { ...previo.dniDe }
  ;(roster.data || []).forEach((t) => { dniDe[normalizarNombre(t.nombre)] = t.dni })

  const selfies: Record<string, string[]> = {}
  const filas = ((marcas?.data || []) as unknown as { dni: unknown; foto_url?: string; fecha?: string; hora?: unknown }[])
    .filter((m) => m.foto_url)
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`))
  filas.forEach((m) => {
    const d = String(m.dni)
    if (!selfies[d]) selfies[d] = []
    if (selfies[d].length < SELFIES_A_PROBAR) selfies[d].push(String(m.foto_url))
  })

  const fichas = (resumen?.data || {}) as Record<string, { foto?: string | null }>
  const dnis = [...new Set([...Object.keys(selfies), ...Object.keys(fichas)])]
  const porDni: Record<string, Retrato> = { ...previo.porDni }
  const hoyISO = hoy.toISOString().slice(0, 10)

  const resolver = async (dni: string) => {
    const antes = previo.porDni[dni]
    const fotoFicha = fichas[dni]?.foto
    if (fotoFicha) {
      if (antes?.origen === 'ficha' && antes.id === fotoFicha) { porDni[dni] = antes; return }
      const url = await descargar(fotoFicha, false)
      if (url) { porDni[dni] = { url, id: fotoFicha, origen: 'ficha', fecha: hoyISO }; return }
    }
    if (antes?.origen === 'selfie' && Date.now() - new Date(antes.fecha).getTime() < VIGENCIA_SELFIE_MS) {
      porDni[dni] = antes
      return
    }
    for (const u of selfies[dni] || []) {
      const url = await descargar(u, true)
      if (url) { porDni[dni] = { url, id: u, origen: 'selfie', fecha: hoyISO }; return }
    }
  }

  // De a dos: Apps Script se pone lento con muchas consultas simultáneas
  const cola = [...dnis]
  await Promise.all(Array.from({ length: SIMULTANEAS }, async () => {
    while (cola.length) await resolver(cola.shift() as string)
  }))

  const mapa = { porDni, dniDe, cuando: Date.now() }
  guardar(mapa)
  return mapa
}

/** Lo monta AdminLayout una sola vez: es quien dispara la carga. */
export function useCargarRetratos(activo: boolean, permisos: Permisos) {
  return useQuery({
    queryKey: CLAVE_RETRATOS,
    queryFn: () => cargar(leerGuardado(), permisos),
    enabled: activo,
    initialData: leerGuardado,
    initialDataUpdatedAt: () => leerGuardado().cuando || 0,
    staleTime: 12 * 3600e3,
    gcTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

/** Lee los retratos sin disparar consultas. */
export function useRetratos(): MapaRetratos {
  const { data } = useQuery({
    queryKey: CLAVE_RETRATOS,
    queryFn: () => leerGuardado(),
    enabled: false,
    initialData: leerGuardado,
    initialDataUpdatedAt: () => leerGuardado().cuando || 0,
  })
  return data || { porDni: {}, dniDe: {} }
}

export function useRefrescarRetratos() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: CLAVE_RETRATOS })
}
