import { execFile, spawn } from 'node:child_process'
import { stripAnsi } from '../ipc/utils'

export type DetailedCommandResult = {
  exitCode: number | null
  stderr: string
  stdout: string
}

export function runDetailedCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 10 * 60 * 1000
): Promise<DetailedCommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        const exitCode =
          typeof error === 'object' && error && 'code' in error && typeof error.code === 'number'
            ? error.code
            : error
              ? 1
              : 0

        resolve({
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
      }
    )
  })
}

export function runStreamingCommand(
  command: string,
  args: readonly string[],
  onLine: (line: string) => void,
  timeoutMs = 10 * 60 * 1000
): Promise<DetailedCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {
      timeout: timeoutMs,
      windowsHide: true,
      shell: false
    })

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []
    let stdoutBuf = ''
    let stderrBuf = ''

    const flushLines = (buf: string, store: string[]): string => {
      const parts = buf.split(/[\r\n]/)
      for (let i = 0; i < parts.length - 1; i++) {
        const line = stripAnsi(parts[i]).trim()
        if (line) {
          store.push(line)
          onLine(line)
        }
      }
      return parts[parts.length - 1] ?? ''
    }

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8')
      stdoutBuf = flushLines(stdoutBuf, stdoutChunks)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8')
      stderrBuf = flushLines(stderrBuf, stderrChunks)
    })

    child.on('close', (code) => {
      const remainingOut = stripAnsi(stdoutBuf).trim()
      if (remainingOut) {
        stdoutChunks.push(remainingOut)
        onLine(remainingOut)
      }
      const remainingErr = stripAnsi(stderrBuf).trim()
      if (remainingErr) {
        stderrChunks.push(remainingErr)
        onLine(remainingErr)
      }

      resolve({
        exitCode: code,
        stdout: stdoutChunks.join('\n'),
        stderr: stderrChunks.join('\n')
      })
    })

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: stdoutChunks.join('\n'),
        stderr: err.message
      })
    })
  })
}
