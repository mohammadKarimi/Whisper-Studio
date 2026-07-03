// Shared Python discovery for system checks and model management.
// Prefers the pinned target version (e.g. python3.12 / py -3.12) so that an installed

import { PYTHON_TARGET_VERSION } from '../../shared/constants'
import { execFile } from 'node:child_process'
import { parseVersion } from './utils'

export type CommandResult = {
  command: string
  output: string
  prefixArgs: string[]
}

export type CommandCandidate = {
  args: readonly string[]
  command: string
  prefixArgs?: readonly string[]
  timeoutMs?: number
}

// supported interpreter is used even when a newer, unsupported Python is also on PATH.
export async function findPython(): Promise<CommandResult | null> {
  const candidates = [
    { command: `python${PYTHON_TARGET_VERSION}`, args: ['--version'], timeoutMs: 1500 },
    {
      command: 'py',
      prefixArgs: [`-${PYTHON_TARGET_VERSION}`],
      args: ['--version'],
      timeoutMs: 1500
    },
    { command: 'python', args: ['--version'], timeoutMs: 2500 },
    { command: 'python3', args: ['--version'], timeoutMs: 1200 },
    { command: 'py', prefixArgs: ['-3'], args: ['--version'], timeoutMs: 1200 }
  ]

  for (const candidate of candidates) {
    const result = await runCommandCandidate([candidate])

    if (result && parseVersion(result.output)) {
      return result
    }
  }

  return null
}

export async function runCommandCandidate(
  candidates: readonly CommandCandidate[]
): Promise<CommandResult | null> {
  for (const candidate of candidates) {
    const prefixArgs = [...(candidate.prefixArgs ?? [])]
    const output = await runCommand(
      candidate.command,
      [...prefixArgs, ...candidate.args],
      candidate.timeoutMs
    )

    if (output) {
      return { command: candidate.command, output, prefixArgs }
    }
  }

  return null
}

export function runCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 3000
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        const output = `${stdout}${stderr}`.trim()

        if (error && !output) {
          resolve(null)
          return
        }

        resolve(output || null)
      }
    )
  })
}
