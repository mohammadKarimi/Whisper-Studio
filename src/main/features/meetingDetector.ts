/**
 * Detects whether the user appears to be in an online meeting
 * (Teams, Google Meet, Zoom, Webex...) running in Chrome or a native
 * desktop client.
 *
 * This runs in the Electron main process because it needs Node APIs.
 */

import activeWin from 'active-win'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type MeetingPlatform = 'teams' | 'meet' | 'zoom' | 'webex' | 'unknown'

export interface MeetingStatus {
  inMeeting: boolean
  platform: MeetingPlatform
  confidence: 'high' | 'medium' | 'low'
  source: string[]
}

const NOT_IN_MEETING: MeetingStatus = {
  inMeeting: false,
  platform: 'unknown',
  confidence: 'low',
  source: []
}

const TITLE_PATTERNS: Array<{ platform: MeetingPlatform; regex: RegExp }> = [
  { platform: 'teams', regex: /Microsoft Teams/i },
  { platform: 'meet', regex: /Meet\s*-\s*|meet\.google\.com|Google Meet/i },
  { platform: 'zoom', regex: /Zoom Meeting|Zoom Workplace/i },
  { platform: 'webex', regex: /Webex Meeting/i }
]

const NATIVE_CALL_WINDOW_TITLES = [/Meeting|Call with|In a call/i]

async function checkActiveWindowSignal(): Promise<{
  hit: boolean
  platform: MeetingPlatform
}> {
  const win = await activeWin()
  if (!win) return { hit: false, platform: 'unknown' }

  const title = win.title ?? ''
  const owner = win.owner?.name?.toLowerCase() ?? ''

  if (owner.includes('chrome')) {
    for (const { platform, regex } of TITLE_PATTERNS) {
      if (regex.test(title)) {
        return { hit: true, platform }
      }
    }
  }

  if (owner.includes('teams') && NATIVE_CALL_WINDOW_TITLES.some((regex) => regex.test(title))) {
    return { hit: true, platform: 'teams' }
  }

  if (owner.includes('zoom') && title.toLowerCase().includes('zoom meeting')) {
    return { hit: true, platform: 'zoom' }
  }

  return { hit: false, platform: 'unknown' }
}

async function getAppsUsingMicrophone(): Promise<string[]> {
  const base =
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone'

  const inUse: string[] = []

  for (const subKey of [base, `${base}\\NonPackaged`]) {
    try {
      const { stdout } = await execFileAsync('reg', ['query', subKey])
      const appKeys = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('HKEY_CURRENT_USER'))

      for (const appKey of appKeys) {
        try {
          const { stdout: valOut } = await execFileAsync('reg', ['query', appKey])
          const stopMatch = valOut.match(/LastUsedTimeStop\s+REG_QWORD\s+0x([0-9a-fA-F]+)/)

          if (stopMatch && parseInt(stopMatch[1], 16) === 0) {
            const appName = appKey.split('\\').pop() ?? appKey
            inUse.push(appName)
          }
        } catch {
          // Ignore unreadable subkeys.
        }
      }
    } catch {
      // The key may not exist on this machine/OS version.
    }
  }

  return inUse
}

async function checkMicrophoneSignal(): Promise<boolean> {
  if (process.platform !== 'win32') return false

  const apps = await getAppsUsingMicrophone()
  return apps.some((appName) => /chrome|teams|zoom|webex|slack/i.test(appName))
}

export async function detectMeeting(): Promise<MeetingStatus> {
  if (!['win32', 'darwin', 'linux'].includes(process.platform)) {
    return NOT_IN_MEETING
  }

  const [windowSignal, micSignal] = await Promise.all([
    checkActiveWindowSignal(),
    checkMicrophoneSignal()
  ])

  const source: string[] = []
  if (windowSignal.hit) source.push('window-title')
  if (micSignal) source.push('microphone')

  const inMeeting = windowSignal.hit || micSignal
  let confidence: MeetingStatus['confidence'] = 'low'

  if (windowSignal.hit && micSignal) {
    confidence = 'high'
  } else if (windowSignal.hit || micSignal) {
    confidence = 'medium'
  }

  return {
    inMeeting,
    platform: windowSignal.platform,
    confidence,
    source
  }
}

function hasMeetingStatusChanged(previous: MeetingStatus | null, next: MeetingStatus): boolean {
  if (!previous) return true

  return (
    previous.inMeeting !== next.inMeeting ||
    previous.platform !== next.platform ||
    previous.confidence !== next.confidence ||
    previous.source.join('|') !== next.source.join('|')
  )
}

export function startMeetingWatcher(
  onChange: (status: MeetingStatus) => void,
  intervalMs = 7000
): () => void {
  let lastStatus: MeetingStatus | null = null
  let stopped = false

  const poll = async (): Promise<void> => {
    try {
      const status = await detectMeeting()

      if (!stopped && hasMeetingStatusChanged(lastStatus, status)) {
        lastStatus = status
        onChange(status)
      }
    } catch (error) {
      console.error('[meetingDetector] Failed to detect meeting status', error)
    }
  }

  void poll()
  const timer = setInterval(() => void poll(), intervalMs)

  return () => {
    stopped = true
    clearInterval(timer)
  }
}
