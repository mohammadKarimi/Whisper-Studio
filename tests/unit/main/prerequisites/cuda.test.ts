import { describe, expect, it } from 'vitest'
import { getCudaTorchIndexUrl } from '@main/prerequisites/cuda'

describe('getCudaTorchIndexUrl()', () => {
  it('maps CUDA versions to the newest compatible PyTorch wheel index', () => {
    expect(getCudaTorchIndexUrl('13.0')).toBe('https://download.pytorch.org/whl/cu128')
    expect(getCudaTorchIndexUrl('12.4')).toBe('https://download.pytorch.org/whl/cu124')
    expect(getCudaTorchIndexUrl('12.1')).toBe('https://download.pytorch.org/whl/cu121')
    expect(getCudaTorchIndexUrl('11.8')).toBe('https://download.pytorch.org/whl/cu118')
  })

  it('uses the fallback index for unknown, missing, or older versions', () => {
    expect(getCudaTorchIndexUrl(null)).toBe('https://download.pytorch.org/whl/cu128')
    expect(getCudaTorchIndexUrl('11.7')).toBe('https://download.pytorch.org/whl/cu128')
    expect(getCudaTorchIndexUrl('not-a-version')).toBe('https://download.pytorch.org/whl/cu128')
  })
})
