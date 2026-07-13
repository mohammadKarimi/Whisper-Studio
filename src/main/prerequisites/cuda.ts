import type { PrerequisiteCheck } from '../../shared/ipc'
import type { CommandResult } from '../ipc/command'
import { runCommand } from '../ipc/command'
import { TORCH_PROBE_TIMEOUT_MS } from './config'

type CudaToolkitInfo = {
  version: string | null
}

const CUDA_TORCH_INDEX_URLS: [minMajor: number, minMinor: number, url: string][] = [
  [12, 8, 'https://download.pytorch.org/whl/cu128'],
  [12, 4, 'https://download.pytorch.org/whl/cu124'],
  [12, 1, 'https://download.pytorch.org/whl/cu121'],
  [11, 8, 'https://download.pytorch.org/whl/cu118']
]
const CUDA_TORCH_INDEX_URL_FALLBACK = 'https://download.pytorch.org/whl/cu128'

export function getCudaTorchIndexUrl(cudaVersion: string | null): string {
  if (!cudaVersion) return CUDA_TORCH_INDEX_URL_FALLBACK
  const parts = cudaVersion.split('.').map(Number)
  const major = parts[0] ?? 0
  const minor = parts[1] ?? 0
  for (const [minMajor, minMinor, url] of CUDA_TORCH_INDEX_URLS) {
    if (major > minMajor || (major === minMajor && minor >= minMinor)) return url
  }
  return CUDA_TORCH_INDEX_URL_FALLBACK
}

export async function detectCudaToolkit(): Promise<CudaToolkitInfo | null> {
  if (process.platform === 'darwin') {
    return null
  }

  const smi = await runCommand('nvidia-smi', [], 4000)

  if (smi) {
    return { version: smi.match(/CUDA Version:\s*([\d.]+)/i)?.[1] ?? null }
  }

  const nvcc = await runCommand('nvcc', ['--version'], 4000)

  if (nvcc) {
    return { version: nvcc.match(/release\s*([\d.]+)/i)?.[1] ?? null }
  }

  return null
}

function cudaResultFromToolkit(toolkit: CudaToolkitInfo | null): PrerequisiteCheck {
  if (!toolkit) {
    return { id: 'cuda', installed: null, status: 'missing' }
  }

  return {
    id: 'cuda',
    installed: toolkit.version ?? 'detected',
    status: 'attention',
    detail:
      'CUDA detected, but PyTorch is CPU-only. Reinstall the CUDA build of PyTorch to enable GPU acceleration.'
  }
}

export async function checkCudaWithTorch(
  python: CommandResult | null,
  torchProbeTimeoutMs = TORCH_PROBE_TIMEOUT_MS
): Promise<PrerequisiteCheck> {
  const toolkit = await detectCudaToolkit()

  if (!python) {
    return cudaResultFromToolkit(toolkit)
  }

  const code = [
    'import json',
    'result = {"available": False, "cuda": None}',
    'try:',
    '    import torch',
    '    result["available"] = bool(torch.cuda.is_available())',
    '    result["cuda"] = getattr(torch.version, "cuda", None)',
    'except Exception:',
    '    pass',
    'print(json.dumps(result))'
  ].join('\n')

  const output = await runCommand(
    python.command,
    [...python.prefixArgs, '-c', code],
    torchProbeTimeoutMs
  )
  const jsonLine =
    output
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith('{') && line.endsWith('}')) ?? null

  if (!jsonLine) {
    return cudaResultFromToolkit(toolkit)
  }

  try {
    const parsed = JSON.parse(jsonLine) as { available?: boolean; cuda?: string | null }

    if (!parsed.available) {
      return cudaResultFromToolkit(toolkit)
    }

    return {
      id: 'cuda',
      installed: parsed.cuda ?? toolkit?.version ?? 'detected',
      status: 'ok'
    }
  } catch {
    return cudaResultFromToolkit(toolkit)
  }
}
