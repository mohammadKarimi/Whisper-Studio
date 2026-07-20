import { execFile } from 'node:child_process'

export async function getNvidiaDriverVersion(): Promise<string | null> {
  if (process.platform === 'darwin') return null
  return new Promise((resolve) => {
    execFile(
      'nvidia-smi',
      ['--query-gpu=driver_version', '--format=csv,noheader'],
      { timeout: 3000 },
      (error, stdout) => resolve(error ? null : stdout.trim().split(/\r?\n/)[0] || null)
    )
  })
}
