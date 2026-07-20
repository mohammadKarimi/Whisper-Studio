import { useEffect, useRef, useState } from 'react'
import type { TranscriptionApi, TranscriptionRecord, WhisperProgressPhase } from '@shared/ipc'
import { useStudioContext } from '@/app/studio-context'
import { useAppRoute } from '@/app/use-app-route'
import { Button } from '@/components/ui/button'
import { captions } from '@/lib/strings'
import { formatBytes, formatElapsed } from '@/lib/utils'
import {
  Loader2,
  CheckCircle2,
  Circle,
  X,
  ChevronRight,
  FileAudio,
  FileVideo,
  ChevronDown,
  Terminal,
  Timer
} from 'lucide-react'
import type { TranscriptionFile } from './files-step'
import type { TranscriptionSettings } from './settings-step'

const STAGES = captions.processing.stages
const stageIndexByPhase: Partial<Record<WhisperProgressPhase, number>> = {
  'checking-command': 0,
  'checking-whisper': 0,
  'sending-command': 0,
  transcribing: 1,
  complete: 2,
  error: 2
}
const progressByPhase: Partial<Record<WhisperProgressPhase, number>> = {
  'checking-command': 5,
  'checking-whisper': 10,
  'sending-command': 15,
  transcribing: 30,
  complete: 100,
  error: 100
}

const ASR_LOG_SEPARATOR = '\x00asr-separator'

function formatLogLine(source: string, text: string): string {
  const timestamp = new Date().toLocaleTimeString()
  return `[${timestamp}] ${source}: ${text}`
}

interface ProcessingProps {
  desktop: TranscriptionApi
  file: TranscriptionFile | null
  settings: TranscriptionSettings
}

interface StageItemProps {
  isDone: boolean
  isActive: boolean
  stage: (typeof STAGES)[number]
}

function StageItem({ stage, isDone, isActive }: StageItemProps): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-success" />
        ) : isActive ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1">
        <p
          className={`text-[13px] font-medium ${isDone || isActive ? 'text-foreground' : 'text-muted-foreground/50'}`}
        >
          {stage.label}
        </p>
        <p
          className={`text-[11px] ${isDone || isActive ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}
        >
          {stage.desc}
        </p>
      </div>
      {isDone && (
        <span className="text-[11px] text-success font-mono">
          {captions.processing.stageStatus.done}
        </span>
      )}
      {isActive && (
        <span className="text-[11px] text-primary font-mono">
          {captions.processing.stageStatus.running}
        </span>
      )}
    </div>
  )
}

export default function Processing({ desktop, file, settings }: ProcessingProps): JSX.Element {
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(0)
  const [message, setMessage] = useState<string>(captions.processing.status.inProgress)
  const [error, setError] = useState<string | null>(null)
  const [completedRecord, setCompletedRecord] = useState<TranscriptionRecord | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [logsOpen, setLogsOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const { navigateTo } = useAppRoute()
  const { setRecord } = useStudioContext()
  const hasStarted = useRef(false)
  const asrSeparatorAdded = useRef(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true

    if (!file) {
      setError(captions.processing.status.noFile)
      setMessage(captions.processing.status.failed)
      setProgress(100)
      return
    }

    let isActive = true
    setLogs([
      formatLogLine('client', captions.processing.logs.starting),
      formatLogLine('client', `${captions.processing.logs.filePath}: ${file.path}`),
      formatLogLine('client', `${captions.processing.logs.model}: ${settings.model}`),
      formatLogLine('client', `${captions.processing.logs.compute}: ${settings.compute}`)
    ])

    const removeProgressListener = desktop.onWhisperProgress((update) => {
      if (!isActive) {
        return
      }

      setMessage(update.message)
      setCurrentStage(stageIndexByPhase[update.phase] ?? 0)
      setProgress(progressByPhase[update.phase] ?? 0)
      setLogs((current) =>
        [...current, formatLogLine(update.phase, update.message)].filter(Boolean).slice(-40)
      )

      if (update.phase === 'transcribing' && !asrSeparatorAdded.current) {
        asrSeparatorAdded.current = true
        setLogs((current) => [...current, ASR_LOG_SEPARATOR])
      }

      if (update.state === 'error') {
        setError(update.message)
      }
    })
    const removeOutputListener = desktop.onWhisperOutput((chunk) => {
      if (!isActive) {
        return
      }

      setLogs((current) =>
        [...current, formatLogLine(chunk.stream, chunk.text.trim())].filter(Boolean).slice(-40)
      )
    })

    desktop
      .transcribeWithWhisper({
        compute: settings.compute,
        diarization: settings.diarization,
        filePath: file.path,
        formats: [],
        hotwords: settings.hotwords.trim() || undefined,
        initialPrompt: settings.initialPrompt.trim() || undefined,
        language: settings.language,
        model: settings.model
      })
      .then((result) => {
        if (!isActive) {
          return
        }

        if (result.record) setCompletedRecord(result.record)

        setLogs((current) =>
          [
            ...current,
            formatLogLine(
              'result',
              result.exitCode === 0
                ? captions.processing.progress.allStagesComplete
                : result.stderr || captions.processing.status.failed
            )
          ]
            .filter(Boolean)
            .slice(-40)
        )

        if (result.exitCode === 0) {
          setProgress(100)
          setCurrentStage(STAGES.length - 1)
          setMessage(captions.processing.progress.allStagesComplete)
          return
        }

        setError(result.stderr || captions.processing.status.failed)
      })
      .catch((transcriptionError) => {
        if (!isActive) {
          return
        }

        setError(
          transcriptionError instanceof Error
            ? transcriptionError.message
            : captions.processing.status.failed
        )
      })

    return () => {
      isActive = false
      removeProgressListener()
      removeOutputListener()
    }
  }, [desktop, file, settings])

  // Auto-scroll logs to bottom when new entries arrive
  useEffect(() => {
    if (logsOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, logsOpen])

  const isComplete = progress >= 100
  const isFailed = Boolean(error)
  const FileIcon = file?.type === 'video' ? FileVideo : FileAudio

  useEffect(() => {
    if (isComplete || isFailed) return
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isComplete, isFailed])

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">{captions.processing.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isFailed
            ? captions.processing.status.failed
            : isComplete
              ? captions.processing.status.complete
              : captions.processing.status.inProgress}
        </p>
      </div>

      {/* Current Job + Stages */}
      <div className="glass-panel rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <FileIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium">
              {file?.name ?? captions.processing.job.fileName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {file
                ? `${file.duration} · ${formatBytes(file.sizeBytes)} · ${settings.model} · ${settings.compute.toUpperCase()}`
                : captions.processing.job.details}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Timer
              className={`w-3.5 h-3.5 ${isComplete || isFailed ? 'text-muted-foreground' : 'text-primary'}`}
            />
            <span
              className={`font-mono text-sm tabular-nums ${isComplete || isFailed ? 'text-muted-foreground' : 'text-primary'}`}
            >
              {formatElapsed(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium">
              {isFailed
                ? captions.processing.status.failed
                : isComplete
                  ? captions.processing.progress.complete
                  : STAGES[currentStage]?.label}
            </span>
            <span
              className={`text-sm font-mono font-semibold ${isFailed ? 'text-destructive' : 'text-primary'}`}
            >
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFailed ? 'bg-destructive' : isComplete ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {isFailed
              ? error
              : isComplete
                ? captions.processing.progress.allStagesComplete
                : message || STAGES[currentStage]?.desc}
          </p>
        </div>

        {/* Stages */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {captions.processing.stagesTitle}
        </h3>
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStage && !isComplete && !isFailed
            const isDone = (i < currentStage || isComplete) && !isFailed
            return <StageItem key={stage.id} stage={stage} isDone={isDone} isActive={isActive} />
          })}
        </div>
      </div>

      {/* Diagnostic Log */}
      <div className="glass-panel rounded-2xl mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setLogsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {captions.processing.diagnosticLogTitle}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              ({logs.filter((l) => l !== ASR_LOG_SEPARATOR).length}{' '}
              {captions.processing.logs.entries})
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${logsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {logsOpen && (
          <div className="px-5 pb-4 border-t border-border/40">
            {logs.length === 0 ? (
              <p className="pt-3 font-mono text-[11px] text-muted-foreground">
                {captions.processing.logs.waiting}
              </p>
            ) : (
              <div className="pt-3 max-h-[240px] overflow-y-auto font-mono text-[11px] text-muted-foreground">
                {logs.map((line, index) =>
                  line === ASR_LOG_SEPARATOR ? (
                    <div key={index} className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                        Speech recognition output
                      </span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  ) : (
                    <p key={`${line}-${index}`} className="break-words leading-relaxed mt-4">
                      {line}
                    </p>
                  )
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isComplete && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" disabled>
              <X className="w-3.5 h-3.5" /> {captions.processing.actions.cancel}
            </Button>
          )}
        </div>
        {isComplete && !isFailed && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                if (completedRecord) setRecord(completedRecord)
                navigateTo('export')
              }}
            >
              {captions.processing.actions.export}
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                if (completedRecord) setRecord(completedRecord)
                navigateTo('studio')
              }}
            >
              {captions.processing.actions.openInStudio} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
