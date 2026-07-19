import { execFile } from 'node:child_process'
import { join } from 'node:path'
import {
  type WhisperModelActionResult,
  type WhisperModelDownloadProgress
} from '../../../shared/ipc'
import {
  WHISPER_DOWNLOADABLE_IDS,
  getWhisperModelHfRepo,
  hfRepoToCacheDirName
} from '../../../shared/constants'
import { readdir, stat } from 'node:fs/promises'
import { getWhisperModelCacheDir } from '../../paths'
import { findPython } from '../shared/command'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

export type CommandResult = {
  exitCode: number
  stderr: string
  stdout: string
}

type PythonInfo = {
  command: string
  prefixArgs: string[]
}

type DownloadContext = {
  modelId: string
  result: CommandResult
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function downloadModel(
  modelId: string,
  emitProgress?: (progress: WhisperModelDownloadProgress) => void
): Promise<WhisperModelActionResult> {
  const guardResult = validateModelId(modelId)
  if (guardResult) return guardResult

  const python = await resolvePython(modelId)
  if (!isPythonInfo(python)) return python

  const hfRepo = getWhisperModelHfRepo(modelId)
  const { cacheDir, modelDir } = resolvePaths(hfRepo)

  const progress = createProgressController(modelId, modelDir, emitProgress)
  await progress.emitCurrent('pending')
  progress.start()

  try {
    const result = await executeDownload(python, hfRepo, cacheDir)
    await progress.emitCurrent(result.exitCode === 0 ? 'complete' : 'error')
    return buildResult({ modelId, result })
  } finally {
    progress.stop()
  }
}

// ---------------------------------------------------------------------------
// Pipeline steps
// ---------------------------------------------------------------------------

// Step 1: Reject unknown model IDs before touching the filesystem.
function validateModelId(modelId: string): WhisperModelActionResult | null {
  if (!WHISPER_DOWNLOADABLE_IDS.includes(modelId)) {
    return { id: modelId, ok: false, stderr: 'This model is not in the allowed download list.' }
  }
  return null
}

// Step 2: Locate the Python binary; returns a failure result if not found.
async function resolvePython(modelId: string): Promise<PythonInfo | WhisperModelActionResult> {
  const python = await findPython()
  if (!python) {
    return {
      id: modelId,
      ok: false,
      stderr:
        'Whisper Runtime is not ready. Install or repair the Runtime before downloading models.'
    }
  }
  return python
}

function isPythonInfo(value: PythonInfo | WhisperModelActionResult): value is PythonInfo {
  return 'command' in value
}

// Step 3: Derive filesystem paths from the HuggingFace repo ID.
function resolvePaths(hfRepo: string): { cacheDir: string; modelDir: string } {
  const cacheDir = getWhisperModelCacheDir()
  const modelDir = join(cacheDir, hfRepoToCacheDirName(hfRepo))
  return { cacheDir, modelDir }
}

// Step 4: Progress controller — polls blobs/ every 750 ms and emits byte counts.
function createProgressController(
  modelId: string,
  modelDir: string,
  emitProgress: ((progress: WhisperModelDownloadProgress) => void) | undefined
): {
  emitCurrent: (state?: WhisperModelDownloadProgress['state']) => Promise<void>
  start: () => void
  stop: () => void
} {
  let intervalId: ReturnType<typeof setInterval> | undefined
  let seenBytes = false

  const getDownloadedBytes = async (): Promise<number> => {
    // faster-whisper stores actual data in blobs/; summing only that folder
    // avoids double-counting symlinked snapshots.
    const blobsDir = join(modelDir, 'blobs')
    try {
      const entries = await readdir(blobsDir, { withFileTypes: true })
      let total = 0
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const s = await stat(join(blobsDir, entry.name)).catch(() => null)
        if (s) total += s.size
      }
      return total
    } catch {
      return 0
    }
  }

  const emitCurrent = async (state?: WhisperModelDownloadProgress['state']): Promise<void> => {
    const downloadedBytes = await getDownloadedBytes()
    if (downloadedBytes > 0) seenBytes = true
    emitProgress?.({
      downloadedBytes,
      repoId: modelId,
      state: state ?? (seenBytes ? 'active' : 'pending')
    })
  }

  return {
    emitCurrent,
    start: () => {
      intervalId = setInterval(() => void emitCurrent(), 750)
    },
    stop: () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        intervalId = undefined
      }
    }
  }
}

// Step 5: Run the Python download script; retries once after fixing certs.
async function executeDownload(
  python: PythonInfo,
  hfRepo: string,
  cacheDir: string
): Promise<CommandResult> {
  const code = buildDownloadScript(hfRepo, cacheDir)
  let result = await runPythonCommand(python.command, [...python.prefixArgs, '-c', code])

  if (result.exitCode !== 0 && isCertificateError(result.stderr)) {
    await runPythonCommand(python.command, [
      ...python.prefixArgs,
      '-m',
      'pip',
      'install',
      '--quiet',
      'truststore',
      'certifi'
    ])
    result = await runPythonCommand(python.command, [...python.prefixArgs, '-c', code])
  }

  return result
}

// Step 6: Map the raw command result to a typed action result.
function buildResult({ modelId, result }: DownloadContext): WhisperModelActionResult {
  const succeeded = result.exitCode === 0
  const hasCertError = isCertificateError(result.stderr)

  return {
    id: modelId,
    ok: succeeded,
    stderr:
      succeeded || !hasCertError
        ? result.stderr
        : `${result.stderr}\n\nTLS certificate verification failed. If you are on a managed or corporate network, make sure Python trusts your system certificates. The app tried to fix this by installing "truststore"; on macOS you can also run the "Install Certificates.command" bundled with your Python installation.`,
    stdout: result.stdout
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDownloadScript(hfRepo: string, cacheDir: string): string {
  return [
    'import json, logging, os',
    'logging.disable(logging.CRITICAL)',
    'os.environ["TQDM_DISABLE"] = "1"',
    'try:',
    '    import truststore',
    '    truststore.inject_into_ssl()',
    'except Exception:',
    '    try:',
    '        import certifi',
    '        os.environ.setdefault("SSL_CERT_FILE", certifi.where())',
    '    except Exception:',
    '        pass',
    'from huggingface_hub import snapshot_download',
    `snapshot_download(repo_id=${JSON.stringify(hfRepo)}, cache_dir=${JSON.stringify(cacheDir)})`,
    'print(json.dumps({"ok": True}))'
  ].join('\n')
}

// 100 MB — large models can emit substantial stderr (pip output, warnings).
const MAX_BUFFER_BYTES = 100 * 1024 * 1024

function runPythonCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 30 * 60 * 1000
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: MAX_BUFFER_BYTES },
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

function isCertificateError(stderr: string): boolean {
  return /CERTIFICATE_VERIFY_FAILED|SSLCertVerificationError|self-signed certificate|unable to get local issuer/i.test(
    stderr
  )
}

function resolveExitCode(error: unknown): number {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') {
    return error.code
  }
  return error ? 1 : 0
}
