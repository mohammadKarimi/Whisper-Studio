import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileAudio,
  FolderOpen,
  Loader2,
  Play,
  Terminal
} from 'lucide-react'
import type {
  AppInfo,
  DesktopPlatform,
  WhisperProgressPhase,
  WhisperProgressUpdate,
  WhisperTranscriptionResult
} from '@shared/ipc'
import { TitleBar } from './components/TitleBar'
import { Button } from './components/ui/button'
import { getDesktopApi } from './lib/desktop'

interface SelectedWhisperFile {
  path: string
  name: string
}

type ProgressByPhase = Partial<Record<WhisperProgressPhase, WhisperProgressUpdate>>

const progressSteps: Array<{ phase: WhisperProgressPhase; label: string }> = [
  { phase: 'checking-command', label: 'Checking command' },
  { phase: 'checking-whisper', label: 'Checking Whisper live' },
  { phase: 'sending-command', label: 'Sending command' },
  { phase: 'waiting', label: 'Waiting for transcription' },
  { phase: 'transcribing', label: 'Showing lines' },
  { phase: 'complete', label: 'Complete' }
]

export function App(): JSX.Element {
  const desktop = useMemo(() => getDesktopApi(), [])
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const [isWindowMaximized, setIsWindowMaximized] = useState(false)
  const [platform, setPlatform] = useState<DesktopPlatform>('win32')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [selectedFile, setSelectedFile] = useState<SelectedWhisperFile | null>(null)
  const [transcription, setTranscription] = useState<WhisperTranscriptionResult | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [liveDiagnostics, setLiveDiagnostics] = useState('')
  const [progressByPhase, setProgressByPhase] = useState<ProgressByPhase>({})
  const [currentProgress, setCurrentProgress] = useState<WhisperProgressUpdate | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void desktop.getPlatform().then(setPlatform)
    void desktop.getAppInfo().then(setAppInfo)
    void desktop.windowControls.isMaximized().then(setIsWindowMaximized)

    return desktop.windowControls.onStateChange(setIsWindowMaximized)
  }, [desktop])

  useEffect(() => {
    return desktop.onWhisperOutput((chunk) => {
      if (chunk.stream === 'stdout') {
        setLiveTranscript((current) => `${current}${chunk.text}`)
      } else {
        setLiveDiagnostics((current) => `${current}${chunk.text}`)
      }
    })
  }, [desktop])

  useEffect(() => {
    return desktop.onWhisperProgress((update) => {
      setCurrentProgress(update)
      setProgressByPhase((current) => ({
        ...current,
        [update.phase]: update
      }))
    })
  }, [desktop])

  useEffect(() => {
    if (liveTranscript) {
      transcriptEndRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [liveTranscript])

  const commandPreview = selectedFile
    ? `python.exe -u -m whisper "${selectedFile.path}" --language fa`
    : 'python.exe -u -m whisper <file> --language fa'
  const outputText = transcription?.transcript ?? (liveTranscript || transcription?.stdout || '')
  const diagnosticsText = (liveDiagnostics || transcription?.stderr || '').trim()
  const statusText =
    error ?? currentProgress?.message ?? (isTranscribing ? 'Starting transcription.' : 'Transcript')

  async function selectFile(): Promise<void> {
    setError(null)
    const selection = await desktop.selectWhisperFile()

    if (selection.canceled || !selection.filePath) {
      return
    }

    setSelectedFile({
      path: selection.filePath,
      name: selection.fileName ?? selection.filePath
    })
    setTranscription(null)
    setLiveTranscript('')
    setLiveDiagnostics('')
    setProgressByPhase({})
    setCurrentProgress(null)
  }

  async function runTranscription(): Promise<void> {
    if (!selectedFile) {
      await selectFile()
      return
    }

    setIsTranscribing(true)
    setError(null)
    setTranscription(null)
    setLiveTranscript('')
    setLiveDiagnostics('')
    setProgressByPhase({})
    setCurrentProgress({
      phase: 'checking-command',
      state: 'active',
      message: 'Starting transcription.'
    })
    setProgressByPhase({
      'checking-command': {
        phase: 'checking-command',
        state: 'active',
        message: 'Starting transcription.'
      }
    })

    try {
      const result = await desktop.transcribeWithWhisper(selectedFile.path)

      setTranscription(result)

      if (result.exitCode !== 0) {
        setError(`Whisper exited with code ${result.exitCode ?? 'unknown'}.`)
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to run Whisper.')
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className="grid h-screen min-h-0 w-screen grid-rows-[2.375rem_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
      <TitleBar
        appName={appInfo?.name ?? 'WhisperX'}
        isMaximized={isWindowMaximized}
        platform={platform}
        onMinimize={desktop.windowControls.minimize}
        onMaximize={desktop.windowControls.maximize}
        onClose={desktop.windowControls.close}
      />

      <main className="min-h-0 overflow-hidden">
        <div className="mx-auto grid h-full max-w-5xl grid-rows-[auto_auto_minmax(0,1fr)] gap-4 px-6 py-6">
          <section className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                Persian transcription
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Run Whisper locally with language set to fa.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="secondary" onClick={selectFile} disabled={isTranscribing}>
                <FolderOpen className="size-4" />
                Choose file
              </Button>
              <Button
                type="button"
                onClick={() => void runTranscription()}
                disabled={isTranscribing || !selectedFile}
              >
                {isTranscribing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Transcribe
              </Button>
            </div>
          </section>

          <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                <FileAudio className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {selectedFile?.name ?? 'No file selected'}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {selectedFile?.path ?? 'Choose an audio or video file from this computer.'}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              <Terminal className="size-4 shrink-0" />
              <span className="truncate">{transcription?.command ?? commandPreview}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {progressSteps.map((step) => {
                const update = progressByPhase[step.phase]
                const state = update?.state
                const isActive = state === 'active'
                const isComplete = state === 'complete'
                const isFailed = state === 'error'

                return (
                  <div
                    key={step.phase}
                    className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs"
                    title={update?.message ?? step.label}
                  >
                    {isFailed ? (
                      <AlertCircle className="size-4 shrink-0 text-destructive" />
                    ) : isComplete ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-foreground" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-muted-foreground">{step.label}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                {error ? (
                  <AlertCircle className="size-4 shrink-0 text-destructive" />
                ) : transcription ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                ) : isTranscribing ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Terminal className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">
                  {statusText}
                </span>
              </div>
              {transcription?.transcriptPath ? (
                <div className="truncate text-xs text-muted-foreground">
                  {transcription.transcriptPath}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 overflow-auto p-4">
              {outputText ? (
                <div>
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                    {outputText}
                  </pre>
                  <div ref={transcriptEndRef} />
                </div>
              ) : (
                <div className="grid h-full min-h-44 place-items-center text-center text-sm text-muted-foreground">
                  {isTranscribing ? statusText : 'The transcript will appear here as Whisper prints segments.'}
                </div>
              )}

              {diagnosticsText ? (
                <details className="mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">Diagnostics</summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words">{diagnosticsText}</pre>
                </details>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
