import type { PrerequisiteInstallProgress } from '../../shared/ipc'

export function normalizePipInstallError(stderr: string): string {
  if (/DECRYPTION_FAILED_OR_BAD_RECORD_MAC|SSLError|ssl/i.test(stderr)) {
    return [
      'pip failed while downloading packages over SSL.',
      'Check your network/VPN/proxy and retry; the installer now retries and bypasses pip cache.'
    ].join(' ')
  }

  const informationalPrefixes =
    /^\s*(WARNING:|Collecting |Downloading |Requirement already satisfied:|Looking in indexes:|Defaulting to user installation|Installing collected packages:|Successfully installed|Preparing metadata|Building wheel|Using cached |Obtaining |Note:|DEPRECATION:)/i
  const progressBar = /^\s*[-\s]*$/
  const downloadProgress = /[\d.]+\s*\/\s*[\d.]+ ?(TB|GB|MB|kB|B)/i

  return stderr
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim() &&
        !informationalPrefixes.test(line) &&
        !progressBar.test(line) &&
        !downloadProgress.test(line)
    )
    .join('\n')
    .trim()
}

export function parsePipProgressLine(
  line: string
): Pick<
  PrerequisiteInstallProgress,
  'downloadedBytes' | 'totalBytes' | 'speedBytesPerSec' | 'etaSeconds'
> | null {
  const toBytes = (value: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      case 'tb':
        return value * 1024 ** 4
      case 'gb':
        return value * 1024 ** 3
      case 'mb':
        return value * 1024 ** 2
      case 'kb':
        return value * 1024
      default:
        return value
    }
  }

  const progressMatch = line.match(
    /([\d.]+)\s*\/\s*([\d.]+)\s*(TB|GB|MB|kB|B)\s+([\d.]+)\s*(TB|GB|MB|kB|B)\/s\s+eta\s+([\d:]+)/i
  )
  if (progressMatch) {
    const etaParts = (progressMatch[6] ?? '0').split(':').map(Number)
    const etaSeconds =
      etaParts.length === 3
        ? (etaParts[0] ?? 0) * 3600 + (etaParts[1] ?? 0) * 60 + (etaParts[2] ?? 0)
        : etaParts.length === 2
          ? (etaParts[0] ?? 0) * 60 + (etaParts[1] ?? 0)
          : (etaParts[0] ?? 0)

    return {
      downloadedBytes: toBytes(parseFloat(progressMatch[1] ?? '0'), progressMatch[3] ?? 'B'),
      totalBytes: toBytes(parseFloat(progressMatch[2] ?? '0'), progressMatch[3] ?? 'B'),
      speedBytesPerSec: toBytes(parseFloat(progressMatch[4] ?? '0'), progressMatch[5] ?? 'B'),
      etaSeconds
    }
  }

  const headerMatch = line.match(/^\s*Downloading\s+\S+\s+\((\d+\.?\d*)\s*(TB|GB|MB|kB|B)\)/i)
  if (headerMatch) {
    return {
      downloadedBytes: 0,
      totalBytes: toBytes(parseFloat(headerMatch[1] ?? '0'), headerMatch[2] ?? 'B')
    }
  }

  return null
}
