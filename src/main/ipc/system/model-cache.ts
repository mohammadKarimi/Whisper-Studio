import { execFile } from 'node:child_process'
import type { Dirent } from 'node:fs'
import { readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  DownloadedWhisperModel,
  DownloadedWhisperModelsResult,
  WhisperModelActionResult,
  WhisperModelDownloadProgress
} from '../../../shared/ipc'
import { createScopedCache } from './cache'

// Known model metadata used to enrich local cache scan results.
const knownModelInfo: Record<string, { params: string }> = {
  tiny: { params: '39M' },
  'tiny.en': { params: '39M' },
  base: { params: '74M' },
  'base.en': { params: '74M' },
  small: { params: '244M' },
  'small.en': { params: '244M' },
  medium: { params: '769M' },
  'medium.en': { params: '769M' },
  large: { params: '1.55B' },
  'large-v1': { params: '1.55B' },
  'large-v2': { params: '1.55B' },
  'large-v3': { params: '1.55B' },
  turbo: { params: '809M' },
  'large-v3-turbo': { params: '809M' }
}

export const downloadableModelRepoIds = [
  'tiny',
  'base',
  'small',
  'medium',
  'large-v2',
  'large-v3',
  'turbo',
  'large-v3-turbo'
] as const

type CommandResult = {
  exitCode: number
  stderr: string
  stdout: string
}

const PYTHON_CANDIDATES = ['python', 'python3', 'py'] as const
const PYTHON_DISCOVERY_TIMEOUT_MS = 2500

function isKnownDownloadableModel(
  modelId: string
): modelId is (typeof downloadableModelRepoIds)[number] {
  return downloadableModelRepoIds.includes(modelId as (typeof downloadableModelRepoIds)[number])
}

function resolveExitCode(error: unknown): number {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') {
    return error.code
  }

  return error ? 1 : 0
}

function getWhisperCacheDir(): string {
  return process.env.WHISPER_CACHE_DIR ?? join(homedir(), '.cache', 'whisper')
}

// Runs a short-lived process and returns normalized output.
function runCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 30 * 60 * 1000
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        resolve({
          exitCode: resolveExitCode(error),
          stderr: stderr.trim(),
          stdout: stdout.trim()
        })
      }
    )
  })
}

// Finds any usable Python launcher available on the system.
async function findPython(): Promise<string | null> {
  for (const command of PYTHON_CANDIDATES) {
    const args = command === 'py' ? ['-3', '--version'] : ['--version']
    const result = await runCommand(command, args, PYTHON_DISCOVERY_TIMEOUT_MS)

    if (result.exitCode === 0 || result.stdout || result.stderr) {
      return command
    }
  }

  return null
}

// Scans the Whisper cache directory for downloaded model files.
async function scanDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  const cacheDir = getWhisperCacheDir()
  let entries: Dirent<string>[]

  try {
    entries = await readdir(cacheDir, { withFileTypes: true })
  } catch {
    return { models: [], totalSizeBytes: 0 }
  }

  const modelOrder = Object.keys(knownModelInfo)
  const orderByModel = new Map(modelOrder.map((name, index) => [name, index]))
  const models: DownloadedWhisperModel[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.pt')) {
      continue
    }

    const modelName = entry.name.slice(0, -3)
    const filePath = join(cacheDir, entry.name)
    const fileStats = await stat(filePath).catch(() => null)

    if (!fileStats) {
      continue
    }

    const info = knownModelInfo[modelName]

    models.push({
      downloadedAt: fileStats.mtimeMs,
      id: modelName,
      languages: '99',
      name: modelName,
      params: info?.params ?? '-',
      path: filePath,
      precision: 'fp32',
      sizeBytes: fileStats.size,
      source: `openai/whisper`
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

const CACHE_DURATION_MS = 5000
const downloadedModelsCache = createScopedCache(scanDownloadedModels, CACHE_DURATION_MS)

// Returns a short-lived cached view of downloaded models.
export async function getDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  return downloadedModelsCache.get()
}

// Downloads a model via Python whisper.load_model while emitting progress snapshots.
export async function downloadModel(
  modelId: string,
  emitProgress?: (progress: WhisperModelDownloadProgress) => void
): Promise<WhisperModelActionResult> {
  if (!isKnownDownloadableModel(modelId)) {
    return {
      id: modelId,
      ok: false,
      stderr: 'This model is not in the allowed download list.'
    }
  }

  const python = await findPython()

  if (!python) {
    return {
      id: modelId,
      ok: false,
      stderr: 'Python was not found. Install Python before downloading models.'
    }
  }

  const cacheDir = getWhisperCacheDir()
  const ptPath = join(cacheDir, `${modelId}.pt`)

  const getDownloadedBytes = async (): Promise<number> => {
    const fileStats = await stat(ptPath).catch(() => null)
    return fileStats?.size ?? 0
  }

  const emitCurrentProgress = async (
    state: WhisperModelDownloadProgress['state'] = 'active'
  ): Promise<void> => {
    emitProgress?.({
      downloadedBytes: await getDownloadedBytes(),
      repoId: modelId,
      state
    })
  }

  await emitCurrentProgress()
  const progressInterval = setInterval(() => {
    void emitCurrentProgress()
  }, 750)

  const prefixArgs = python === 'py' ? ['-3'] : []
  const code = [
    'import whisper, json',
    `whisper.load_model(${JSON.stringify(modelId)}, download_root=${JSON.stringify(cacheDir)})`,
    'print(json.dumps({"ok": True}))'
  ].join('; ')
  const result = await runCommand(python, [...prefixArgs, '-c', code])

  clearInterval(progressInterval)
  downloadedModelsCache.invalidate()
  await emitCurrentProgress(result.exitCode === 0 ? 'complete' : 'error')

  return {
    id: modelId,
    ok: result.exitCode === 0,
    stderr: result.stderr,
    stdout: result.stdout
  }
}

// Removes a downloaded model file from the local Whisper cache.
export async function deleteModel(id: string): Promise<WhisperModelActionResult> {
  const cacheDir = getWhisperCacheDir()
  const ptPath = join(cacheDir, `${id}.pt`)

  try {
    await rm(ptPath, { force: true })
    downloadedModelsCache.invalidate()
    return { id, ok: true }
  } catch (error) {
    return {
      id,
      ok: false,
      stderr: error instanceof Error ? error.message : 'Failed to delete model file.'
    }
  }
}
