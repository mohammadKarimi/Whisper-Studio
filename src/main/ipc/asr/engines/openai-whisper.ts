import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import type { WhisperTranscriptionRequest } from '../../../../shared/ipc'
import { TranscriptionError } from '../../../../shared/errors'
import { type Result, err, ok } from '../../../../shared/types'
import { parseWhisperJson } from '../../../parser'
import { getOutputDirectory } from '../../../paths'
import { readSettings } from '../../system/settings-handlers'
import type {
  TranscriptionEngine,
  TranscriptionEngineContext,
  TranscriptionEngineResult
} from './types'
import { getPythonEnv, getTimestamp, normalizeLanguage, sanitizeFileName } from '../../utils'

function buildArgs(request: WhisperTranscriptionRequest, outputDir: string): string[] {
  const device = request.compute === 'gpu' ? 'cuda' : 'cpu'
  const language = normalizeLanguage(request.language)
  const model = request.model || 'base'

  const args = [
    request.filePath,
    '--model',
    model,
    '--output_format',
    'json',
    '--output_dir',
    outputDir,
    '--device',
    device,
    '--verbose',
    'True'
  ]

  if (language) {
    args.push('--language', language)
  }

  if (request.translate) {
    args.push('--task', 'translate')
  }

  if (request.wordTimestamps) {
    args.push('--word_timestamps', 'True')
  }

  return args
}

async function runOpenAiWhisper(
  request: WhisperTranscriptionRequest,
  { emitOutput, emitProgress }: TranscriptionEngineContext
): Promise<Result<TranscriptionEngineResult, TranscriptionError>> {
  if (typeof request.filePath !== 'string' || !request.filePath.trim()) {
    return err(
      new TranscriptionError('A valid media file path is required for transcription.', null, '')
    )
  }

  emitProgress({ phase: 'checking-command', state: 'complete', message: 'Starting transcription.' })
  emitProgress({ phase: 'checking-whisper', state: 'complete', message: 'Environment ready.' })

  const extension = extname(request.filePath)
  const baseName = sanitizeFileName(basename(request.filePath, extension)) || 'transcript'
  const settings = await readSettings()
  const baseOutputDirectory = settings.defaultOutputDirectory ?? getOutputDirectory()
  const outputDirectory = join(baseOutputDirectory, `${baseName}-${getTimestamp()}`)
  await mkdir(outputDirectory, { recursive: true })

  const args = buildArgs(request, outputDirectory)
  const command = `whisper ${args.join(' ')}`

  emitProgress({ phase: 'sending-command', state: 'complete', message: command })

  return new Promise<Result<TranscriptionEngineResult, TranscriptionError>>((resolve) => {
    const child = spawn('whisper', args, {
      cwd: dirname(request.filePath),
      env: getPythonEnv(),
      windowsHide: true
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')

    emitProgress({
      phase: 'transcribing',
      state: 'active',
      message: 'Loading model and transcribing...'
    })

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
      const text = stdoutDecoder.write(chunk)
      if (text) emitOutput({ stream: 'stdout', text })
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
      const text = stderrDecoder.write(chunk)
      if (text) emitOutput({ stream: 'stderr', text })
    })

    child.on('error', (spawnError) => {
      emitProgress({ phase: 'error', state: 'error', message: spawnError.message })
      resolve(err(new TranscriptionError(spawnError.message, null, spawnError.message)))
    })

    child.on('close', async (exitCode) => {
      const remaining = stdoutDecoder.end()
      const remainingErr = stderrDecoder.end()
      if (remaining) emitOutput({ stream: 'stdout', text: remaining })
      if (remainingErr) emitOutput({ stream: 'stderr', text: remainingErr })

      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')
      const parseResult = await parseWhisperJson(outputDirectory, basename(request.filePath))
      const segments = parseResult.ok ? parseResult.value.segments : []
      const outputFiles =
        parseResult.ok && parseResult.value.jsonFile ? [parseResult.value.jsonFile] : []

      emitProgress({
        phase: exitCode === 0 ? 'complete' : 'error',
        state: exitCode === 0 ? 'complete' : 'error',
        message:
          exitCode === 0
            ? 'Transcription complete.'
            : `Whisper exited with code ${exitCode ?? 'unknown'}.`
      })

      resolve(
        ok({
          args,
          command,
          exitCode,
          outputDirectory,
          outputFiles,
          segments,
          stderr,
          stdout
        })
      )
    })
  })
}

export const openAiWhisperEngine: TranscriptionEngine = {
  id: 'openai-whisper',
  label: 'OpenAI Whisper',
  run: runOpenAiWhisper
}
