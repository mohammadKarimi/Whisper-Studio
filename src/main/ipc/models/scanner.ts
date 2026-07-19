import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { Dirent } from 'original-fs'
import {
  type DownloadedWhisperModel,
  type DownloadedWhisperModelsResult,
  type WhisperModelActionResult
} from '../../../shared/ipc'
import {
  MODEL_FETCHING_CACHE_DURATION_MS,
  WHISPER_KNOWN_MODELS,
  WHISPER_MODEL_REPO_OVERRIDES,
  getWhisperModelHfRepo,
  hfRepoToCacheDirName
} from '../../../shared/constants'
import { createScopedCache } from '../../cache'
import { getWhisperModelCacheDir } from '../../paths'

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

export const downloadedModelsCache = createScopedCache(
  scanDownloadedModels,
  MODEL_FETCHING_CACHE_DURATION_MS
)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  return downloadedModelsCache.get()
}

export async function deleteModel(id: string): Promise<WhisperModelActionResult> {
  const cacheDir = getWhisperModelCacheDir()
  const modelDir = join(cacheDir, hfRepoToCacheDirName(getWhisperModelHfRepo(id)))

  try {
    await rm(modelDir, { recursive: true, force: true })
    downloadedModelsCache.invalidate()
    return { id, ok: true }
  } catch (error) {
    return {
      id,
      ok: false,
      stderr: error instanceof Error ? error.message : 'Failed to delete model directory.'
    }
  }
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

async function scanDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  const cacheDir = getWhisperModelCacheDir()
  let entries: Dirent<string>[]

  try {
    entries = await readdir(cacheDir, { withFileTypes: true })
  } catch {
    return { models: [], totalSizeBytes: 0 }
  }

  // Reverse map: HF cache dir name → { id, params, source repo }.
  // Covers both the default Systran pattern and any repo overrides.
  const dirToModel = new Map<string, { id: string; params: string; source: string }>()

  for (const [modelId, info] of Object.entries(WHISPER_KNOWN_MODELS)) {
    const repo = `Systran/faster-whisper-${modelId}`
    dirToModel.set(hfRepoToCacheDirName(repo), { id: modelId, params: info.params, source: repo })
  }
  for (const [modelId, hfRepo] of Object.entries(WHISPER_MODEL_REPO_OVERRIDES)) {
    const info = WHISPER_KNOWN_MODELS[modelId]
    dirToModel.set(hfRepoToCacheDirName(hfRepo), {
      id: modelId,
      params: info?.params ?? '-',
      source: hfRepo
    })
  }

  const modelOrder = Object.keys(WHISPER_KNOWN_MODELS)
  const orderByModel = new Map(modelOrder.map((name, index) => [name, index]))
  const models: DownloadedWhisperModel[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const known = dirToModel.get(entry.name)
    if (!known) continue

    const dirPath = join(cacheDir, entry.name)
    const dirStats = await stat(dirPath).catch(() => null)
    const sizeBytes = await sumBlobsDir(dirPath)

    models.push({
      downloadedAt: dirStats?.mtimeMs ?? 0,
      id: known.id,
      languages: '99',
      name: known.id,
      params: known.params,
      path: dirPath,
      precision: 'int8',
      sizeBytes,
      source: known.source
    })
  }

  models.sort((a, b) => {
    const aOrder = orderByModel.get(a.name) ?? 999
    const bOrder = orderByModel.get(b.name) ?? 999
    return aOrder - bOrder
  })

  return {
    models,
    totalSizeBytes: models.reduce((sum, model) => sum + model.sizeBytes, 0)
  }
}

// Sum only the blobs/ subdirectory to avoid double-counting symlinked snapshots.
async function sumBlobsDir(modelDir: string): Promise<number> {
  try {
    const blobs = await readdir(join(modelDir, 'blobs'), { withFileTypes: true })
    let total = 0
    for (const blob of blobs) {
      if (!blob.isFile()) continue
      const s = await stat(join(modelDir, 'blobs', blob.name)).catch(() => null)
      if (s) total += s.size
    }
    return total
  } catch {
    // blobs/ may not exist yet during a partial download
    return 0
  }
}
