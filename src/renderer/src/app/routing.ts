export type AppRouteId = 'dashboard' | 'new' | 'studio' | 'settings' | 'export'

const routeIds: AppRouteId[] = ['dashboard', 'new', 'studio', 'settings', 'export']

const routePaths: Record<AppRouteId, string> = {
  dashboard: '/',
  new: '/new',
  studio: '/studio',
  settings: '/settings',
  export: '/export'
}

const pathRoutes = new Map<string, AppRouteId>(
  Object.entries(routePaths).map(([routeId, path]) => [path, routeId as AppRouteId])
)

export function getRouteFromPath(path: string): AppRouteId {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return pathRoutes.get(normalizedPath) ?? 'dashboard'
}

export function getRouteFromHash(hash: string): AppRouteId {
  const path = hash.replace(/^#/, '') || '/'

  return getRouteFromPath(path)
}

export function setRouteHash(routeId: AppRouteId): void {
  const nextHash = `#${routePaths[routeId]}`

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash
  }
}

export function getRoutePath(routeId: AppRouteId): string {
  return routePaths[routeId]
}

export function isAppRouteId(value: string): value is AppRouteId {
  return routeIds.includes(value as AppRouteId)
}
