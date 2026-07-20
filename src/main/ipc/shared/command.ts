// Shared Python discovery for system checks and model management.
// Prefers the pinned target version (e.g. python3.12 / py -3.12) so that an installed

import { execFile } from 'node:child_process'
import { parseVersion } from './utils'
import { getActiveRuntime } from '../../runtime/manager'
import { getRuntimePythonPath } from '../../runtime/paths'

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
  const runtime = await getActiveRuntime()
  if (!runtime) return null
  const command = getRuntimePythonPath(runtime.root)
  const output = await runCommand(command, ['--version'], 2500)
  return output && parseVersion(output) ? { command, output, prefixArgs: [] } : null
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
