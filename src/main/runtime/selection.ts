import type { RuntimeAccelerator, RuntimeArtifact, RuntimeManifest } from '../../shared/ipc'
import { getNvidiaDriverVersion } from './hardware'

export interface RuntimeTarget {
  accelerator: RuntimeAccelerator
  arch: NodeJS.Architecture
  platform: NodeJS.Platform
}

export function compareNumericVersions(actual: string, required: string): number {
  const actualParts = actual.split('.').map(Number)
  const requiredParts = required.split('.').map(Number)
  const length = Math.max(actualParts.length, requiredParts.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (actualParts[index] ?? 0) - (requiredParts[index] ?? 0)
    if (difference !== 0) return difference > 0 ? 1 : -1
  }
  return 0
}

export function selectRuntimeArtifact(
  artifacts: readonly RuntimeArtifact[],
  target: RuntimeTarget
): RuntimeArtifact | null {
  return (
    artifacts.find(
      (artifact) =>
        artifact.platform === target.platform &&
        artifact.arch === target.arch &&
        artifact.accelerator === target.accelerator
    ) ?? null
  )
}

export function getCompatibleRuntimeArtifacts(
  artifacts: readonly RuntimeArtifact[],
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture
): RuntimeArtifact[] {
  return artifacts.filter((artifact) => artifact.platform === platform && artifact.arch === arch)
}

export async function getSelection(manifest: RuntimeManifest): Promise<{
  available: RuntimeArtifact[]
  recommended: RuntimeArtifact | null
}> {
  const available = getCompatibleRuntimeArtifacts(
    manifest.artifacts,
    process.platform,
    process.arch
  )
  const driverVersion = await getNvidiaDriverVersion()
  const cuda = driverVersion
    ? selectRuntimeArtifact(manifest.artifacts, {
        accelerator: 'cuda',
        arch: process.arch,
        platform: process.platform
      })
    : null
  const cudaCompatible =
    cuda &&
    (!cuda.minimumNvidiaDriver ||
      compareNumericVersions(driverVersion!, cuda.minimumNvidiaDriver) >= 0)
  const recommended = cudaCompatible
    ? cuda
    : selectRuntimeArtifact(manifest.artifacts, {
        accelerator: 'cpu',
        arch: process.arch,
        platform: process.platform
      })
  return { available, recommended }
}
