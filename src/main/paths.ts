import { app } from 'electron'
import { join } from 'node:path'

export function getOutputDirectory(): string {
  return join(app.getPath('documents'), 'Whisper Studio', 'transcriptions')
}

/** Root path of the app-managed Python virtual environment. */
export function getVenvPath(): string {
  return join(app.getPath('userData'), 'whisper-studio-venv')
}

/**
 * Absolute path to the Python executable inside the app venv.
 * Used by findPython() to prefer the venv over any system Python.
 */
export function getVenvPythonPath(): string {
  const venvPath = getVenvPath()
  return process.platform === 'win32'
    ? join(venvPath, 'Scripts', 'python.exe')
    : join(venvPath, 'bin', 'python')
}

/**
 * Directory that contains the venv's executables (python, pip, whisper …).
 * Prepending this to PATH lets child processes resolve venv binaries without
 * knowing the venv's exact location.
 */
export function getVenvBinPath(): string {
  const venvPath = getVenvPath()
  return process.platform === 'win32' ? join(venvPath, 'Scripts') : join(venvPath, 'bin')
}
