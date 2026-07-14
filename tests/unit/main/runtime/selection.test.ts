import { describe, expect, it } from 'vitest'
import type { RuntimeArtifact } from '@shared/ipc'
import {
  compareNumericVersions,
  getCompatibleRuntimeArtifacts,
  selectRuntimeArtifact
} from '@main/runtime/selection'

const artifacts: RuntimeArtifact[] = [
  {
    accelerator: 'cpu',
    arch: 'x64',
    format: 'zip',
    id: 'win-cpu',
    platform: 'win32',
    sha256: 'a'.repeat(64),
    sizeBytes: 100,
    url: 'https://example.test/win-cpu.zip',
    version: '1.0.0'
  },
  {
    accelerator: 'cuda',
    arch: 'x64',
    format: 'zip',
    id: 'win-cuda',
    platform: 'win32',
    sha256: 'b'.repeat(64),
    sizeBytes: 200,
    url: 'https://example.test/win-cuda.zip',
    version: '1.0.0'
  },
  {
    accelerator: 'cpu',
    arch: 'arm64',
    format: 'zip',
    id: 'mac-arm',
    platform: 'darwin',
    sha256: 'c'.repeat(64),
    sizeBytes: 100,
    url: 'https://example.test/mac-arm.zip',
    version: '1.0.0'
  }
]

describe('Runtime artifact selection', () => {
  it('selects the exact platform, architecture and accelerator variant', () => {
    expect(
      selectRuntimeArtifact(artifacts, {
        accelerator: 'cuda',
        arch: 'x64',
        platform: 'win32'
      })?.id
    ).toBe('win-cuda')
  })

  it('returns only artifacts compatible with the current platform and architecture', () => {
    expect(getCompatibleRuntimeArtifacts(artifacts, 'win32', 'x64').map((item) => item.id)).toEqual(
      ['win-cpu', 'win-cuda']
    )
  })

  it('compares NVIDIA driver versions numerically', () => {
    expect(compareNumericVersions('572.16', '570.00')).toBe(1)
    expect(compareNumericVersions('570.0', '570.00')).toBe(0)
    expect(compareNumericVersions('569.99', '570.00')).toBe(-1)
  })
})
