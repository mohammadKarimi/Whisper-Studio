import { execFile } from 'node:child_process'
import { access, chmod } from 'node:fs/promises'
import type { RuntimeArtifact } from '../../shared/ipc'
import { getRuntimeFfmpegPath, getRuntimePythonPath } from './paths'

function run(command: string, args: readonly string[], timeout = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, [...args], { timeout, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        // Prefer actual Python output over the generic Node "Command failed: ..." message
        const detail = stderr.trim() || stdout.trim()
        reject(new Error(detail || error.message))
      } else {
        resolve(`${stdout}${stderr}`.trim())
      }
    })
  })
}

export async function checkRuntime(root: string, artifact: RuntimeArtifact): Promise<void> {
  const python = getRuntimePythonPath(root)
  const ffmpeg = getRuntimeFfmpegPath(root)
  await Promise.all([access(python), access(ffmpeg)])

  if (process.platform !== 'win32') {
    await Promise.all([chmod(python, 0o755), chmod(ffmpeg, 0o755)])
  }

  // Always exit 0 so Node doesn't swallow stdout as "Command failed".
  // We parse the JSON result ourselves and throw a human-readable error when
  // CUDA is required but unavailable.
  const probe = [
    'import sys, json, torch, torchaudio, whisperx, ctranslate2',
    `cuda_ok = torch.cuda.is_available() if ${JSON.stringify(artifact.accelerator)} == "cuda" else True`,
    'print(json.dumps({"ok": bool(cuda_ok), "torch": torch.__version__}))',
    'sys.exit(0)'
  ].join('; ')

  const raw = await run(python, ['-c', probe])
  let result: { ok: boolean; torch: string }
  try {
    result = JSON.parse(raw) as { ok: boolean; torch: string }
  } catch {
    throw new Error(`Runtime check returned unexpected output: ${raw}`)
  }

  if (!result.ok) {
    const minDriver = artifact.minimumNvidiaDriver ?? '570'
    throw new Error(
      `CUDA is not available on this machine. ` +
        `Ensure your NVIDIA driver is version ${minDriver} or newer, ` +
        `or switch to the CPU Runtime.`
    )
  }

  await run(ffmpeg, ['-version'], 10_000)
}

export async function checkRuntimeFiles(root: string): Promise<void> {
  await Promise.all([access(getRuntimePythonPath(root)), access(getRuntimeFfmpegPath(root))])
}
