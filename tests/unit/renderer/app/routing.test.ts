import { describe, it, expect } from 'vitest'
import {
  getRouteFromPath,
  getRouteFromHash,
  getRoutePath,
  isAppRouteId,
  type AppRouteId
} from '@/app/routing'

const ALL_ROUTES: AppRouteId[] = ['dashboard', 'new', 'studio', 'settings', 'export', 'models']

describe('getRouteFromPath()', () => {
  it('resolves "/" to dashboard', () => {
    expect(getRouteFromPath('/')).toBe('dashboard')
  })

  it('resolves all known paths correctly', () => {
    expect(getRouteFromPath('/new')).toBe('new')
    expect(getRouteFromPath('/studio')).toBe('studio')
    expect(getRouteFromPath('/settings')).toBe('settings')
    expect(getRouteFromPath('/export')).toBe('export')
    expect(getRouteFromPath('/models')).toBe('models')
  })

  it('falls back to dashboard for unknown paths', () => {
    expect(getRouteFromPath('/unknown')).toBe('dashboard')
    expect(getRouteFromPath('/foo/bar')).toBe('dashboard')
  })

  it('resolves "/model" alias to models', () => {
    expect(getRouteFromPath('/model')).toBe('models')
  })

  it('adds leading slash when missing', () => {
    expect(getRouteFromPath('new')).toBe('new')
    expect(getRouteFromPath('studio')).toBe('studio')
  })
})

describe('getRouteFromHash()', () => {
  it('resolves hash with # prefix', () => {
    expect(getRouteFromHash('#/new')).toBe('new')
    expect(getRouteFromHash('#/studio')).toBe('studio')
  })

  it('resolves empty hash to dashboard', () => {
    expect(getRouteFromHash('')).toBe('dashboard')
    expect(getRouteFromHash('#')).toBe('dashboard')
  })

  it('resolves "#/" to dashboard', () => {
    expect(getRouteFromHash('#/')).toBe('dashboard')
  })

  it('falls back to dashboard for unknown hash', () => {
    expect(getRouteFromHash('#/unknown')).toBe('dashboard')
  })
})

describe('getRoutePath()', () => {
  it('returns "/" for dashboard', () => {
    expect(getRoutePath('dashboard')).toBe('/')
  })

  it('returns the correct path for each route', () => {
    expect(getRoutePath('new')).toBe('/new')
    expect(getRoutePath('studio')).toBe('/studio')
    expect(getRoutePath('settings')).toBe('/settings')
    expect(getRoutePath('export')).toBe('/export')
    expect(getRoutePath('models')).toBe('/models')
  })

  it('round-trips with getRouteFromPath for all routes', () => {
    for (const route of ALL_ROUTES) {
      expect(getRouteFromPath(getRoutePath(route))).toBe(route)
    }
  })
})

describe('isAppRouteId()', () => {
  it('returns true for all valid route ids', () => {
    for (const route of ALL_ROUTES) {
      expect(isAppRouteId(route)).toBe(true)
    }
  })

  it('returns false for unknown strings', () => {
    expect(isAppRouteId('unknown')).toBe(false)
    expect(isAppRouteId('')).toBe(false)
    expect(isAppRouteId('Dashboard')).toBe(false)
  })

  it('acts as a type guard (narrows to AppRouteId)', () => {
    const val: string = 'studio'
    if (isAppRouteId(val)) {
      const _typed: AppRouteId = val
      expect(_typed).toBe('studio')
    }
  })
})
