import { useState, useCallback } from 'react'
import { GeoLocation, GeoLocationState } from '../types/postulacion.types'

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeoLocationState>({
    location: null,
    error: null,
    loading: false
  })

  const mergedOptions = { ...defaultOptions, ...options }

  const getLocation = useCallback(() => {
    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: 'Tu navegador no soporta geolocalización',
        loading: false
      })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setState({
          location,
          error: null,
          loading: false
        })
      },
      (error) => {
        let errorMessage: string

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor habilita el acceso a tu ubicación.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado. Intenta nuevamente.'
            break
          default:
            errorMessage = 'Error desconocido al obtener ubicación.'
        }

        setState({
          location: null,
          error: errorMessage,
          loading: false
        })
      },
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge
      }
    )
  }, [mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({
      location: null,
      error: null,
      loading: false
    })
  }, [])

  return {
    ...state,
    getLocation,
    clearError,
    reset,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator
  }
}

// Hook para obtener ubicación automáticamente al montar
export function useAutoGeolocation(options: UseGeolocationOptions = {}) {
  const geo = useGeolocation(options)

  // Obtener ubicación automáticamente si está soportado
  useState(() => {
    if (geo.isSupported) {
      geo.getLocation()
    }
  })

  return geo
}

export default useGeolocation
