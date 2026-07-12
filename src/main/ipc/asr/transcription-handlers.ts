import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { basename, join } from 'node:path'
import { copyFile, writeFile } from 'node:fs/promises'
import {
  DEFAULT_TRANSCRIPTION_ENGINE_ID,
  IPC_CHANNELS,
  type TranscriptionRecord,
  type WhisperTranscriptionRequest,
  type WhisperTranscriptionResult
} from '../../../shared/ipc'
import { getTranscriptionEngine } from './engines/registry'

export function registerTranscriptionHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.whisperTranscribe,
    async (
      event: IpcMainInvokeEvent,
      request: WhisperTranscriptionRequest
    ): Promise<WhisperTranscriptionResult> => {
      const engineId = request.engine ?? DEFAULT_TRANSCRIPTION_ENGINE_ID
      const engine = getTranscriptionEngine(engineId)
      const runResult = await engine.run(request, {
        emitOutput: (chunk) => event.sender.send(IPC_CHANNELS.whisperOutputChunk, chunk),
        emitProgress: (update) => event.sender.send(IPC_CHANNELS.whisperProgressUpdate, update)
      })

      if (!runResult.ok) {
        return {
          command: '',
          exitCode: null,
          stderr: runResult.error.message,
          stdout: ''
        }
      }

      const { command, exitCode, outputDirectory, outputFiles, segments, stdout, stderr } =
        runResult.value

      const copiedFilePath = join(outputDirectory, basename(request.filePath))
      let copySucceeded = false
      await copyFile(request.filePath, copiedFilePath)
        .then(() => {
          copySucceeded = true
        })
        .catch(() => {
          console.warn(
            `[transcription] Failed to copy source file to output directory: ${request.filePath}`
          )
        })

      const record: TranscriptionRecord = {
        id: basename(outputDirectory),
        sourceFileName: basename(request.filePath),
        sourceFilePath: copySucceeded ? copiedFilePath : request.filePath,
        engine: engine.id,
        model: request.model || 'base',
        language: request.language || 'auto',
        compute: request.compute,
        outputDirectory,
        outputFiles,
        segments,
        durationSeconds: segments.length > 0 ? segments[segments.length - 1].end : null,
        createdAt: Date.now(),
        exitCode
      }

      await writeFile(
        join(outputDirectory, 'whisper-studio.json'),
        JSON.stringify(record, null, 2),
        'utf8'
      ).catch(() => undefined)

      return {
        command,
        exitCode,
        outputDirectory,
        outputFiles: record.outputFiles,
        record,
        stderr,
        stdout
      }
    }
  )
}
