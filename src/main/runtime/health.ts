import { execFile } from 'node:child_process'
import { access, chmod } from 'node:fs/promises'
import type { RuntimeArtifact } from '../../shared/ipc'
import { getRuntimeFfmpegPath, getRuntimePythonCommand, getRuntimePythonPath } from './paths'

function run(command: string, args: readonly string[], timeout = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, [...args], { timeout, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        // Prefer actual Python output over the generic Node "Command failed: ..." message
        const detail = stderr.trim() || stdout.trim()
        reject(new Error(detail || error.message))
      } else {
        resolve(stdout.trim())
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
  // For CPU builds we never reference torch.cuda at all — on Windows, ctranslate2
  // can trigger a CUDA DLL-load failure even in CPU mode if the probe string
  // mentions torch.cuda, because the ternary branch is compiled into bytecode
  // even when it is never executed at runtime.
  const cudaCheck =
    artifact.accelerator === 'cuda' ? 'cuda_ok = torch.cuda.is_available()' : 'cuda_ok = True'
  const probe = [
    'import sys, json, logging',
    'logging.disable(logging.CRITICAL)',
    'import torch, torchaudio, whisperx, ctranslate2',
    cudaCheck,
    'print(json.dumps({"ok": bool(cuda_ok), "torch": torch.__version__}))',
    'sys.exit(0)'
  ].join('; ')

  const pythonCmd = getRuntimePythonCommand(root)
  const ffmpegCmd = process.platform === 'win32' ? ffmpeg : 'ffmpeg'

  const raw = await run(pythonCmd, ['-c', probe])
  let result: { ok: boolean; torch: string }
  try {
    const jsonLine = raw.split(/\r?\n/).find((l) => l.trimStart().startsWith('{')) ?? raw
    result = JSON.parse(jsonLine) as { ok: boolean; torch: string }
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

  await run(ffmpegCmd, ['-version'], 10_000)
}

export async function checkRuntimeFiles(root: string): Promise<void> {
  await Promise.all([access(getRuntimePythonPath(root)), access(getRuntimeFfmpegPath(root))])
}
