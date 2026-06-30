import { describe, it, expect } from 'vitest'
import {
  resolveFallbackInstallerUrl,
  resolveSystemInstallCandidates
} from '@main/ipc/system/prerequisites'

describe('resolveSystemInstallCandidates()', () => {
  it('uses winget for ffmpeg on Windows', () => {
    const [candidate] = resolveSystemInstallCandidates('win32', 'ffmpeg')

    expect(candidate.command).toBe('winget')
    expect(candidate.args).toContain('Gyan.FFmpeg')
  })

  it('uses winget for python on Windows', () => {
    const [candidate] = resolveSystemInstallCandidates('win32', 'python')

    expect(candidate.command).toBe('winget')
    expect(candidate.args).toContain('Python.Python.3.12')
  })

  it('uses Homebrew for ffmpeg on macOS', () => {
    const [candidate] = resolveSystemInstallCandidates('darwin', 'ffmpeg')

    expect(candidate.command).toBe('brew')
    expect(candidate.args).toEqual(['install', 'ffmpeg'])
  })

  it('uses Homebrew for python on macOS', () => {
    const [candidate] = resolveSystemInstallCandidates('darwin', 'python')

    expect(candidate.command).toBe('brew')
    expect(candidate.args).toEqual(['install', 'python'])
  })

  it('offers apt-get then dnf for ffmpeg on Linux', () => {
    const candidates = resolveSystemInstallCandidates('linux', 'ffmpeg')

    expect(candidates.map((candidate) => candidate.probe)).toEqual(['apt-get', 'dnf'])
    expect(candidates[0].command).toBe('sudo')
    expect(candidates[0].args).toEqual(['apt-get', 'install', '-y', 'ffmpeg'])
  })

  it('returns no candidates for unsupported platforms', () => {
    expect(resolveSystemInstallCandidates('freebsd', 'ffmpeg')).toEqual([])
  })

  it('returns no candidates for pip-managed prerequisites', () => {
    expect(resolveSystemInstallCandidates('win32', 'openai-whisper')).toEqual([])
    expect(resolveSystemInstallCandidates('linux', 'torch')).toEqual([])
  })
})

describe('resolveFallbackInstallerUrl()', () => {
  it('returns the platform-specific ffmpeg page', () => {
    expect(resolveFallbackInstallerUrl('darwin', 'ffmpeg')).toContain('ffmpeg.org')
    expect(resolveFallbackInstallerUrl('win32', 'ffmpeg')).toContain('gyan.dev')
  })

  it('falls back to the generic url for unsupported platforms', () => {
    expect(resolveFallbackInstallerUrl('freebsd', 'cuda')).toContain('nvidia.com')
  })

  it('returns null when no url is known', () => {
    expect(resolveFallbackInstallerUrl('freebsd', 'torch')).toBeNull()
  })
})
