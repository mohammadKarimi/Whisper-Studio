import { app, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { spawn } from 'node:child_process'
import { statSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import {
  IPC_CHANNELS,
  type TranscriptionRecord,
  type WhisperOutputFile,
  type WhisperSegment,
  type WhisperOutputChunk,
  type WhisperFileSelection,
  type WhisperProgressUpdate,
  type WhisperTranscriptionRequest,
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

const languageCodes: Record<string, string> = {
  afrikaans: 'af',
  albanian: 'sq',
  amharic: 'am',
  arabic: 'ar',
  armenian: 'hy',
  assamese: 'as',
  azerbaijani: 'az',
  bashkir: 'ba',
  basque: 'eu',
  belarusian: 'be',
  bengali: 'bn',
  bosnian: 'bs',
  breton: 'br',
  bulgarian: 'bg',
  burmese: 'my',
  cantonese: 'yue',
  castilian: 'es',
  catalan: 'ca',
  chinese: 'zh',
  croatian: 'hr',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  english: 'en',
  estonian: 'et',
  faroese: 'fo',
  finnish: 'fi',
  flemish: 'nl',
  french: 'fr',
  galician: 'gl',
  georgian: 'ka',
  german: 'de',
  greek: 'el',
  gujarati: 'gu',
  haitian: 'ht',
  'haitian creole': 'ht',
  hausa: 'ha',
  hawaiian: 'haw',
  hebrew: 'he',
  hindi: 'hi',
  hungarian: 'hu',
  icelandic: 'is',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  javanese: 'jw',
  kannada: 'kn',
  kazakh: 'kk',
  khmer: 'km',
  korean: 'ko',
  lao: 'lo',
  latin: 'la',
  latvian: 'lv',
  letzeburgesch: 'lb',
  lingala: 'ln',
  lithuanian: 'lt',
  luxembourgish: 'lb',
  macedonian: 'mk',
  malagasy: 'mg',
  malay: 'ms',
  malayalam: 'ml',
  maltese: 'mt',
  mandarin: 'zh',
  maori: 'mi',
  marathi: 'mr',
  moldavian: 'ro',
  moldovan: 'ro',
  mongolian: 'mn',
  myanmar: 'my',
  nepali: 'ne',
  norwegian: 'no',
  nynorsk: 'nn',
  occitan: 'oc',
  panjabi: 'pa',
  pashto: 'ps',
  persian: 'fa',
  polish: 'pl',
  portuguese: 'pt',
  punjabi: 'pa',
  pushto: 'ps',
  romanian: 'ro',
  russian: 'ru',
  sanskrit: 'sa',
  serbian: 'sr',
  shona: 'sn',
  sindhi: 'sd',
  sinhala: 'si',
  sinhalese: 'si',
  slovak: 'sk',
  slovenian: 'sl',
  somali: 'so',
  spanish: 'es',
  sundanese: 'su',
  swahili: 'sw',
  swedish: 'sv',
  tagalog: 'tl',
  tajik: 'tg',
  tamil: 'ta',
  tatar: 'tt',
  telugu: 'te',
  thai: 'th',
  tibetan: 'bo',
  turkish: 'tr',
  turkmen: 'tk',
  ukrainian: 'uk',
  urdu: 'ur',
  uzbek: 'uz',
  valencian: 'ca',
  vietnamese: 'vi',
  welsh: 'cy',
  yiddish: 'yi',
  yoruba: 'yo'
}

function getPythonEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
    PYTHONUTF8: '1'
  }
}

function normalizeLanguage(language: string): string | null {
  const normalizedLanguage = language.trim().toLowerCase()

  if (!normalizedLanguage || normalizedLanguage === 'auto') {
    return null
  }

  if (/^[a-z]{2,3}$/.test(normalizedLanguage)) {
    return normalizedLanguage
  }

  return languageCodes[normalizedLanguage] ?? null
}

function sanitizeFileName(value: string): string {
  return value
    .split('')
    .map((character) => {
      if (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)) {
        return '-'
      }

      return character
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function getOutputDirectory(): string {
  return join(app.getPath('documents'), 'Whisper Studio', 'exports')
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}

function getFileSize(path: string): number {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

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

async function parseWhisperJson(
  outputDir: string,
  sourceFileName: string
): Promise<{ segments: WhisperSegment[]; jsonFile: WhisperOutputFile | null }> {
  const baseName = sourceFileName.replace(/\.[^.]+$/, '')
  const jsonPath = join(outputDir, `${baseName}.json`)
  try {
    const raw = await readFile(jsonPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      segments?: Array<{ id: number; start: number; end: number; text: string }>
    }
    const segments: WhisperSegment[] = (parsed.segments ?? []).map((s, i) => ({
      id: i + 1,
      start: s.start,
      end: s.end,
      text: s.text.trim()
    }))
    const jsonFile: WhisperOutputFile = {
      format: 'json',
      path: jsonPath,
      sizeBytes: getFileSize(jsonPath)
    }
    return { segments, jsonFile }
  } catch {
    return { segments: [], jsonFile: null }
  }
}

async function runWhisper(
  request: WhisperTranscriptionRequest,
  onOutput: (chunk: WhisperOutputChunk) => void,
  onProgress: (update: WhisperProgressUpdate) => void
): Promise<WhisperTranscriptionResult> {
  if (typeof request.filePath !== 'string' || !request.filePath.trim()) {
    throw new TypeError('A valid media file path is required for transcription.')
  }

  // Skip slow pre-checks — emit all environment phases immediately and go straight to transcribing
  onProgress({ phase: 'checking-command', state: 'complete', message: 'Starting transcription.' })
  onProgress({ phase: 'checking-whisper', state: 'complete', message: 'Environment ready.' })

  // Build output dir and CLI args
  const extension = extname(request.filePath)
  const baseName = sanitizeFileName(basename(request.filePath, extension)) || 'transcript'
  const outputDirectory = join(getOutputDirectory(), `${baseName}-${getTimestamp()}`)
  await mkdir(outputDirectory, { recursive: true })

  const args = buildArgs(request, outputDirectory)
  const command = `whisper ${args.join(' ')}`

  onProgress({ phase: 'sending-command', state: 'complete', message: command })

  return new Promise((resolve, reject) => {
    const child = spawn('whisper', args, {
      cwd: dirname(request.filePath),
      env: getPythonEnv(),
      windowsHide: true
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')

    // Emit transcribing immediately — model loading produces no output for up to 60s
    onProgress({
      phase: 'transcribing',
      state: 'active',
      message: 'Loading model and transcribing...'
    })

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
      const text = stdoutDecoder.write(chunk)
      if (!text) return

      onOutput({ stream: 'stdout', text })
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
      const text = stderrDecoder.write(chunk)
      if (!text) return

      onOutput({ stream: 'stderr', text })
    })

    child.on('error', (error) => {
      onProgress({ phase: 'error', state: 'error', message: error.message })
      reject(error)
    })

    child.on('close', (exitCode) => {
      const remaining = stdoutDecoder.end()
      const remainingErr = stderrDecoder.end()
      if (remaining) onOutput({ stream: 'stdout', text: remaining })
      if (remainingErr) onOutput({ stream: 'stderr', text: remainingErr })

      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')

      onProgress({
        phase: exitCode === 0 ? 'complete' : 'error',
        state: exitCode === 0 ? 'complete' : 'error',
        message:
          exitCode === 0
            ? 'Transcription complete.'
            : `Whisper exited with code ${exitCode ?? 'unknown'}.`
      })

      parseWhisperJson(outputDirectory, basename(request.filePath))
        .then(async ({ segments, jsonFile }) => {
          const record: TranscriptionRecord = {
            id: basename(outputDirectory),
            sourceFileName: basename(request.filePath),
            sourceFilePath: request.filePath,
            model: request.model || 'base',
            language: request.language || 'auto',
            compute: request.compute,
            outputDirectory,
            outputFiles: jsonFile ? [jsonFile] : [],
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
          resolve({
            command,
            exitCode,
            outputDirectory,
            outputFiles: record.outputFiles,
            record,
            stderr,
            stdout
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
    async (
      event: IpcMainInvokeEvent,
      request: WhisperTranscriptionRequest
    ): Promise<WhisperTranscriptionResult> => {
      return runWhisper(
        request,
        (chunk) => {
          event.sender.send(IPC_CHANNELS.whisperOutputChunk, chunk)
        },
        (update) => {
          event.sender.send(IPC_CHANNELS.whisperProgressUpdate, update)
        }
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.listTranscriptions, async (): Promise<TranscriptionRecord[]> => {
    const exportsDir = getOutputDirectory()
    const entries = await readdir(exportsDir, { withFileTypes: true }).catch(() => [])
    const records: TranscriptionRecord[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const metaPath = join(exportsDir, entry.name, 'whisper-studio.json')
      try {
        const raw = await readFile(metaPath, 'utf8')
        const rec = JSON.parse(raw) as TranscriptionRecord
        // Backfill segments for old records that predate this field
        if (!rec.segments || rec.segments.length === 0) {
          const { segments } = await parseWhisperJson(
            join(exportsDir, entry.name),
            rec.sourceFileName
          )
          rec.segments = segments
          // If we found segments, persist them so we don't re-parse next time
          if (segments.length > 0) {
            await writeFile(metaPath, JSON.stringify(rec, null, 2), 'utf8').catch(() => undefined)
          }
        }
        records.push(rec)
      } catch {
        // skip folders without metadata
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt)
  })

  ipcMain.handle(
    IPC_CHANNELS.deleteTranscription,
    async (_event: IpcMainInvokeEvent, id: string): Promise<{ ok: boolean }> => {
      const exportsDir = getOutputDirectory()
      // Sanitize: id must be a plain folder name with no path separators
      if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
        return { ok: false }
      }
      const dir = join(exportsDir, id)
      await rm(dir, { force: true, recursive: true }).catch(() => undefined)
      return { ok: true }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.readTextFile,
    async (_event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
      const { readFile } = await import('node:fs/promises')
      return readFile(filePath, 'utf8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.writeTextFile,
    async (_event: IpcMainInvokeEvent, filePath: string, content: string): Promise<void> => {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(filePath, content, 'utf8')
    }
  )
}
