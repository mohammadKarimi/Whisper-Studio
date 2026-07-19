import { delimiter, dirname, join } from 'node:path'
import { WHISPER_LANGUAGE_CODES } from '../../../shared/constants'
import { getRuntimeBinPath } from '../../runtime/paths'
import { getRuntimePythonPath } from '../../runtime/paths'

export function getPythonEnv(runtimeRoot: string): NodeJS.ProcessEnv {
  const runtimeBin = getRuntimeBinPath(runtimeRoot)
  const ffmpegBin = join(runtimeRoot, 'ffmpeg')
  const pythonHome = dirname(getRuntimePythonPath(runtimeRoot))
  const PATH = [runtimeBin, pythonHome, ffmpegBin, process.env.PATH ?? ''].join(delimiter)
  return {
    ...process.env,
    PATH,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
    PYTHONUTF8: '1'
  }
}

export function normalizeLanguage(language: string): string | null {
  const normalized = language.trim().toLowerCase()
  if (!normalized || normalized === 'auto') return null
  if (/^[a-z]{2,3}$/.test(normalized)) return normalized
  return WHISPER_LANGUAGE_CODES[normalized] ?? null
}

export function sanitizeFileName(value: string): string {
  return value
    .split('')
    .map((character) => {
      if (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)) {
        return '-'
      }
      return character
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}

export function parseVersion(output: string): string | null {
  // Match dotted versions (3.11.0) or date versions (20231117)
  return (
    output.match(/\d+(?:\.\d+)+(?:[A-Za-z0-9.+-]*)?/)?.[0] ?? output.match(/\b\d{8}\b/)?.[0] ?? null
  )
}

// ANSI escape-code stripper (covers colour, cursor, and progress-bar sequences).
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[\d;]*[A-Za-z]|\u001b\][^\u0007]*\u0007|\r/g

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '')
}

export function compareVersions(actual: string, required: readonly number[]): number {
  const actualParts = actual
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number)

  for (let index = 0; index < required.length; index += 1) {
    const actualPart = actualParts[index] ?? 0
    const requiredPart = required[index] ?? 0

    if (actualPart > requiredPart) {
      return 1
    }

    if (actualPart < requiredPart) {
      return -1
    }
  }

  return 0
}
