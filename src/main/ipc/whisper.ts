import { dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import {
  IPC_CHANNELS,
  type WhisperOutputChunk,
  type WhisperFileSelection,
  type WhisperProgressUpdate,
  type WhisperTranscriptionResult
} from '../../shared/ipc'

const mediaExtensions = [
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'm4a',
  'wav',
  'webm',
  'aac',
  'flac',
  'ogg',
  'wma',
  'mov',
  'mkv',
  'avi'
]

function buildCommandDisplay(filePath: string): string {
  return `python.exe -u -m whisper "${filePath}" --language fa`
}

function getPythonEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
    PYTHONUTF8: '1'
  }
}

function runPythonCheck(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('python.exe', args, {
      env: getPythonEnv(),
      windowsHide: true
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    child.on('error', reject)

    child.on('close', (exitCode) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')

      if (exitCode === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(new Error((stderr || stdout || `python.exe exited with code ${exitCode}`).trim()))
    })
  })
}

function getTranscriptPath(filePath: string): string {
  const extension = extname(filePath)
  const fileName = basename(filePath, extension)

  return join(dirname(filePath), `${fileName}.txt`)
}

async function readTranscript(filePath: string): Promise<Pick<
  WhisperTranscriptionResult,
  'transcript' | 'transcriptPath'
>> {
  const transcriptPath = getTranscriptPath(filePath)

  if (!existsSync(transcriptPath)) {
    return {}
  }

  return {
    transcriptPath,
    transcript: await readFile(transcriptPath, 'utf8')
  }
}

async function runWhisper(
  filePath: string,
  onOutput: (chunk: WhisperOutputChunk) => void,
  onProgress: (update: WhisperProgressUpdate) => void
): Promise<WhisperTranscriptionResult> {
  const command = buildCommandDisplay(filePath)

  try {
    onProgress({
      phase: 'checking-command',
      state: 'active',
      message: 'Checking python.exe command.'
    })
    const pythonVersion = await runPythonCheck(['--version'])

    onProgress({
      phase: 'checking-command',
      state: 'complete',
      message: (pythonVersion.stdout || pythonVersion.stderr || 'python.exe is available.').trim()
    })
    onProgress({
      phase: 'checking-whisper',
      state: 'active',
      message: 'Checking Whisper module.'
    })
    await runPythonCheck(['-u', '-c', 'import whisper; print("Whisper module is ready")'])
    onProgress({
      phase: 'checking-whisper',
      state: 'complete',
      message: 'Whisper module is ready.'
    })
    onProgress({
      phase: 'sending-command',
      state: 'active',
      message: 'Sending Whisper command.'
    })
  } catch (error) {
    onProgress({
      phase: 'error',
      state: 'error',
      message: error instanceof Error ? error.message : 'Unable to start Whisper.'
    })
    throw error
  }

  return new Promise((resolve, reject) => {
    const child = spawn('python.exe', ['-u', '-m', 'whisper', filePath, '--language', 'fa'], {
      cwd: dirname(filePath),
      env: getPythonEnv(),
      windowsHide: true
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')
    let hasStartedTranscribing = false

    onProgress({
      phase: 'sending-command',
      state: 'complete',
      message: command
    })
    onProgress({
      phase: 'waiting',
      state: 'active',
      message: 'Waiting for Whisper to load the model and begin transcription.'
    })

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
      const text = stdoutDecoder.write(chunk)

      if (text) {
        if (!hasStartedTranscribing && text.trim()) {
          hasStartedTranscribing = true
          onProgress({
            phase: 'waiting',
            state: 'complete',
            message: 'Whisper started printing transcript segments.'
          })
          onProgress({
            phase: 'transcribing',
            state: 'active',
            message: 'Showing transcript lines as Whisper emits them.'
          })
        }

        onOutput({ stream: 'stdout', text })
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
      const text = stderrDecoder.write(chunk)

      if (text) {
        onOutput({ stream: 'stderr', text })
      }
    })

    child.on('error', (error) => {
      onProgress({
        phase: 'error',
        state: 'error',
        message: error.message
      })
      reject(error)
    })

    child.on('close', (exitCode) => {
      const remainingStdout = stdoutDecoder.end()
      const remainingStderr = stderrDecoder.end()

      if (remainingStdout) {
        onOutput({ stream: 'stdout', text: remainingStdout })
      }

      if (remainingStderr) {
        onOutput({ stream: 'stderr', text: remainingStderr })
      }

      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')

      readTranscript(filePath)
        .then((transcriptResult) => {
          if (exitCode === 0 && hasStartedTranscribing) {
            onProgress({
              phase: 'transcribing',
              state: 'complete',
              message: 'Transcript lines received.'
            })
          }

          onProgress({
            phase: exitCode === 0 ? 'complete' : 'error',
            state: exitCode === 0 ? 'complete' : 'error',
            message:
              exitCode === 0
                ? 'Transcription complete.'
                : `Whisper exited with code ${exitCode ?? 'unknown'}.`
          })
          resolve({
            command,
            exitCode,
            stdout,
            stderr,
            ...transcriptResult
          })
        })
        .catch(reject)
    })
  })
}

export function registerWhisperHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.whisperSelectFile, async (): Promise<WhisperFileSelection> => {
    const selection = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio and video',
          extensions: mediaExtensions
        },
        {
          name: 'All files',
          extensions: ['*']
        }
      ]
    })

    if (selection.canceled || selection.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = selection.filePaths[0]

    return {
      canceled: false,
      filePath,
      fileName: basename(filePath)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.whisperTranscribe,
    async (event: IpcMainInvokeEvent, filePath: string): Promise<WhisperTranscriptionResult> => {
      return runWhisper(
        filePath,
        (chunk) => {
          event.sender.send(IPC_CHANNELS.whisperOutputChunk, chunk)
        },
        (update) => {
          event.sender.send(IPC_CHANNELS.whisperProgressUpdate, update)
        }
      )
    }
  )
}
