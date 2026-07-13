import { describe, expect, it } from 'vitest'
import { normalizePipInstallError, parsePipProgressLine } from '@main/prerequisites/pip'

describe('parsePipProgressLine()', () => {
  it('parses completed pip download progress lines', () => {
    expect(parsePipProgressLine('18.7/18.7 MB 3.4 MB/s eta 0:00:05')).toEqual({
      downloadedBytes: 18.7 * 1024 ** 2,
      totalBytes: 18.7 * 1024 ** 2,
      speedBytesPerSec: 3.4 * 1024 ** 2,
      etaSeconds: 5
    })
  })

  it('parses pip download header lines', () => {
    expect(parsePipProgressLine('  Downloading faster_whisper-1.1.1.whl (18.7 MB)')).toEqual({
      downloadedBytes: 0,
      totalBytes: 18.7 * 1024 ** 2
    })
  })

  it('ignores unrelated lines', () => {
    expect(parsePipProgressLine('Installing collected packages: torch')).toBeNull()
  })
})

describe('normalizePipInstallError()', () => {
  it('compresses SSL failures into an actionable message', () => {
    expect(normalizePipInstallError('SSLError: DECRYPTION_FAILED_OR_BAD_RECORD_MAC')).toContain(
      'pip failed while downloading packages over SSL'
    )
  })

  it('filters routine pip output and keeps meaningful errors', () => {
    const stderr = [
      'Collecting torch',
      'Downloading torch.whl (2.5 GB)',
      'ERROR: Could not find a version that satisfies the requirement whisperx'
    ].join('\n')

    expect(normalizePipInstallError(stderr)).toBe(
      'ERROR: Could not find a version that satisfies the requirement whisperx'
    )
  })
})
