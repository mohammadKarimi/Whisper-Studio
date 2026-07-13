import type { PrerequisiteCheck } from '../../shared/ipc'
import { MODEL_FETCHING_CACHE_DURATION_MS } from '../../shared/constants'
import { createScopedCache } from '../cache'
import { checkPrerequisites } from './checks'

const prerequisitesCache = createScopedCache(checkPrerequisites, MODEL_FETCHING_CACHE_DURATION_MS)

export function clearPrerequisiteCache(): void {
  prerequisitesCache.invalidate()
}

export async function getCachedPrerequisites(): Promise<PrerequisiteCheck[]> {
  return prerequisitesCache.get()
}
