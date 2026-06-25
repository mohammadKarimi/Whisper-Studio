import { useCallback, useEffect, useState } from 'react'
import type { AppRouteId } from './routing'
import { getRouteFromHash, setRouteHash } from './routing'

interface AppRouteState {
  activeRoute: AppRouteId
  navigateTo: (routeId: AppRouteId) => void
}

export function useAppRoute(): AppRouteState {
  const [activeRoute, setActiveRoute] = useState<AppRouteId>(() =>
    getRouteFromHash(window.location.hash)
  )

  useEffect(() => {
    function syncRouteFromHash(): void {
      setActiveRoute(getRouteFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', syncRouteFromHash)
    syncRouteFromHash()

    return () => window.removeEventListener('hashchange', syncRouteFromHash)
  }, [])

  const navigateTo = useCallback((routeId: AppRouteId): void => {
    setActiveRoute(routeId)
    setRouteHash(routeId)
  }, [])

  return { activeRoute, navigateTo }
}
