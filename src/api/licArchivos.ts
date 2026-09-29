// ============================================================
// Archivos de Licitaciones (PDF individuales, propuestas completas, fotos)
// con la MISMA interfaz en los dos modos:
//   · Local (VITE_LIC_LOCAL=1): los sirve el plugin de Vite desde el vault.
//   · Producción: viven en Drive, en <TELCOM PAGINA WEB>/Licitaciones/, con
//     la misma estructura del vault. El backend (licIndexarDrive) guarda
//     ruta → id en la hoja lic_archivos y aquí se traduce la ruta del vault:
//       01_GERENCIA/acervo/X                                  → acervo/X
//       01_GERENCIA/experiencia/_bruto/<P>/ofertas/<O>/<pdf>  → propuestas/<P>/<pdf>
// Un archivo que aún no está en Drive devuelve null (el botón no se muestra).
// ============================================================
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiResponse, LIC_LOCAL } from './appScriptApi'
import { licSubirFoto as subirFotoLocal, licUrlArchivo } from './licLocal'

export const CLAVE_INDICE_DRIVE = ['licArchivosDrive'] as const

export function rutaDrive(rutaVault: string): string {
  const r = String(rutaVault || '').replace(/\\/g, '/')
  const acervo = r.match(/^01_GERENCIA\/acervo\/(.+)$/)
  if (acervo) return `acervo/${acervo[1]}`
  const prop = r.match(/^01_GERENCIA\/experiencia\/_bruto\/([^/]+)\/ofertas\/[^/]+\/([^/]+)$/)
  if (prop) return `propuestas/${prop[1]}/${prop[2]}`
  return r
}

export interface ArchivosLic {
  /** true si hay de dónde abrir archivos (modo local, o índice de Drive cargado con algo) */
  disponible: boolean
  cargando: boolean
  /** cantidad de archivos conectados en Drive (null en modo local) */
  total: number | null
  ver: (ruta: string | null | undefined, pagina?: number | null) => string | null
  descargar: (ruta: string | null | undefined, nombre?: string) => string | null
  foto: (carpeta: string, version?: number) => string | null
  abrirPropuesta: (archivo: string | null | undefined, pagina?: number | null) => void
}

export function useArchivosLic(): ArchivosLic {
  const q = useQuery({
    queryKey: CLAVE_INDICE_DRIVE,
    queryFn: async () => {
      const r = await api.licArchivosDrive()
      if (!r.success) throw new Error(r.error || 'No se pudo leer el índice de Drive')
      return r.data || {}
    },
    enabled: !LIC_LOCAL,
    staleTime: 10 * 60 * 1000,
  })

  if (LIC_LOCAL) {
    return {
      disponible: true,
      cargando: false,
      total: null,
      ver: (ruta, pagina) => (ruta ? licUrlArchivo(ruta, { pagina }) : null),
      descargar: (ruta, nombre) => (ruta ? licUrlArchivo(ruta, { descargar: true, nombre }) : null),
      foto: (carpeta, version) => licUrlArchivo(`${carpeta}/foto.jpg`, { v: version }),
      abrirPropuesta: (archivo, pagina) => {
        if (archivo) window.open(licUrlArchivo(archivo, { pagina }), '_blank', 'noopener')
      },
    }
  }

  const indice = q.data || {}
  const id = (ruta: string | null | undefined) => (ruta ? indice[rutaDrive(ruta)] || null : null)
  // Drive no respeta #page: el botón ya dice en qué página está el documento.
  const ver = (ruta: string | null | undefined) => {
    const i = id(ruta)
    return i ? `https://drive.google.com/file/d/${i}/view` : null
  }
  return {
    disponible: Object.keys(indice).length > 0,
    cargando: q.isLoading,
    total: q.data ? Object.keys(q.data).length : null,
    ver,
    descargar: (ruta) => {
      const i = id(ruta)
      return i ? `https://drive.google.com/uc?export=download&id=${i}` : null
    },
    foto: (carpeta) => {
      const base = rutaDrive(carpeta)
      const i = indice[`${base}/foto.jpg`] || indice[`${base}/foto.png`] || indice[`${base}/foto.webp`]
      return i ? `https://drive.google.com/thumbnail?id=${i}&sz=w600` : null
    },
    abrirPropuesta: (archivo) => {
      const url = ver(archivo)
      if (url) window.open(url, '_blank', 'noopener')
    },
  }
}

function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Sube la foto de una persona (carpeta = ruta del vault de su carpeta en el acervo). */
export function useSubirFotoLic() {
  const qc = useQueryClient()
  return async (carpeta: string, archivo: File): Promise<ApiResponse<{ ruta: string }>> => {
    if (LIC_LOCAL) return subirFotoLocal(carpeta, archivo)
    if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return { success: false, error: 'La foto debe ser JPG, PNG o WEBP' }
    const r = await api.licSubirFoto({ carpeta: rutaDrive(carpeta), mime: archivo.type, base64: await aBase64(archivo) })
    if (r.success) await qc.invalidateQueries({ queryKey: CLAVE_INDICE_DRIVE })
    return r
  }
}
