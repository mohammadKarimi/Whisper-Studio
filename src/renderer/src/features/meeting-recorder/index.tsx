import { useEffect, useMemo, useRef, useState } from 'react'
import type { DesktopApi, DownloadedWhisperModel, Segment, TranscriptionRecord } from '@shared/ipc'
import { WHISPER_LANGUAGES } from '@shared/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatElapsed } from '@/lib/utils'
import AudioPlayer from '@/features/studio/components/audio-player'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  FileAudio,
  Hash,
  Languages,
  Loader2,
  Mic,
  MonitorSpeaker,
  Search,
  Settings2,
  Square,
  Users,
  X
} from 'lucide-react'

interface MeetingRecorderProps {
  desktop: DesktopApi
}

type RecorderState = 'idle' | 'recording' | 'transcribing' | 'complete' | 'error'
type ComputeMode = 'cpu' | 'gpu'

interface RecorderSettings {
  compute: ComputeMode
  diarization: boolean
  includeSystemAudio: boolean
  language: string
  model: string
}

interface SpeakerInfo {
  id: string
  label: string
  segments: number
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
}

const preferredMimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'video/webm;codecs=opus',
  'video/webm'
]

const SPEAKER_BADGE_COLORS = [
  'bg-primary/10 text-primary border-primary/20',
  'bg-chart-2/10 text-chart-2 border-chart-2/20',
  'bg-chart-3/10 text-chart-3 border-chart-3/20',
  'bg-chart-4/10 text-chart-4 border-chart-4/20',
  'bg-success/10 text-success border-success/20'
]

function getRecorderMimeType(): string {
  return preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getSpeakerBadgeColor(speakerId: string): string {
  const match = speakerId.match(/(\d+)$/)
  const index = match ? parseInt(match[1]) % SPEAKER_BADGE_COLORS.length : 0
  return SPEAKER_BADGE_COLORS[index]
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function buildSpeakers(segments: Segment[]): SpeakerInfo[] {
  const speakerMap = new Map<string, SpeakerInfo>()

  for (const segment of segments) {
    const speakerId = segment.speaker ?? 'Speaker'
    const current = speakerMap.get(speakerId)

    if (current) {
      current.segments += 1
    } else {
      speakerMap.set(speakerId, {
        id: speakerId,
        label: speakerId,
        segments: 1
      })
    }
  }

  return Array.from(speakerMap.values())
}

function getBrowserRecognitionLanguage(language: string): string {
  if (!language || language === 'Auto') {
    return navigator.language || 'en-US'
  }

  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language) ? language : navigator.language || 'en-US'
}

function SettingsModal({
  disabled,
  downloadedModels,
  onClose,
  onUpdate,
  settings
}: {
  disabled: boolean
  downloadedModels: DownloadedWhisperModel[]
  onClose: () => void
  onUpdate: (patch: Partial<RecorderSettings>) => void
  settings: RecorderSettings
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recording Settings</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Meeting transcription setup</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-border/50 px-5">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <FileAudio className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Model</p>
                <p className="text-[11px] text-muted-foreground">Downloaded Whisper model</p>
              </div>
            </div>
            <Select value={settings.model} onValueChange={(model) => onUpdate({ model })}>
              <SelectTrigger className="h-9 w-[190px] text-[13px]" disabled={disabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[240px]">
                {downloadedModels.length === 0 ? (
                  <div className="px-2 py-2 text-[12px] text-muted-foreground">No models found</div>
                ) : (
                  downloadedModels.map((model) => (
                    <SelectItem key={model.id} value={model.name} className="text-[13px]">
                      {model.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Languages className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Language</p>
                <p className="text-[11px] text-muted-foreground">Source meeting language</p>
              </div>
            </div>
            <Select value={settings.language} onValueChange={(language) => onUpdate({ language })}>
              <SelectTrigger className="h-9 w-[190px] text-[13px]" disabled={disabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[240px]">
                {WHISPER_LANGUAGES.map((language) => (
                  <SelectItem key={language} value={language} className="text-[13px]">
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Compute</p>
                <p className="text-[11px] text-muted-foreground">CPU or GPU processing</p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              {(['cpu', 'gpu'] as const).map((compute) => (
                <button
                  key={compute}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdate({ compute })}
                  className={`rounded-md px-4 py-1.5 text-[12px] font-medium uppercase transition-colors ${
                    settings.compute === compute
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {compute}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Speaker Detection</p>
                <p className="text-[11px] text-muted-foreground">Label different speakers</p>
              </div>
            </div>
            <Switch
              checked={settings.diarization}
              disabled={disabled}
              onCheckedChange={(diarization) => onUpdate({ diarization })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <MonitorSpeaker className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Computer Audio</p>
                <p className="text-[11px] text-muted-foreground">Meeting output audio</p>
              </div>
            </div>
            <Switch
              checked={settings.includeSystemAudio}
              disabled={disabled}
              onCheckedChange={(includeSystemAudio) => onUpdate({ includeSystemAudio })}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-border/50 px-5 py-4">
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MeetingRecorder({ desktop }: MeetingRecorderProps): JSX.Element {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [message, setMessage] = useState('Ready')
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<TranscriptionRecord | null>(null)
  const [liveSegments, setLiveSegments] = useState<Segment[]>([])
  const [liveInterimText, setLiveInterimText] = useState('')
  const [partialOutput, setPartialOutput] = useState<string[]>([])
  const [downloadedModels, setDownloadedModels] = useState<DownloadedWhisperModel[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [settings, setSettings] = useState<RecorderSettings>({
    compute: 'cpu',
    diarization: true,
    includeSystemAudio: true,
    language: 'Auto',
    model: ''
  })

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<BlobPart[]>([])
  const startedAt = useRef<number>(0)
  const micStream = useRef<MediaStream | null>(null)
  const systemStream = useRef<MediaStream | null>(null)
  const mixedStream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const recognition = useRef<BrowserSpeechRecognition | null>(null)
  const recognitionShouldRun = useRef(false)
  const liveSegmentId = useRef(1)

  useEffect(() => {
    let isActive = true

    async function loadDefaults(): Promise<void> {
      const [appSettings, modelResult] = await Promise.all([
        desktop.getSettings(),
        desktop.getDownloadedModels()
      ])

      if (!isActive) return

      setDownloadedModels(modelResult.models)
      setSettings((current) => {
        const defaultModel =
          appSettings.defaultModel &&
          modelResult.models.some((item) => item.name === appSettings.defaultModel)
            ? appSettings.defaultModel
            : (modelResult.models[0]?.name ?? '')

        return {
          ...current,
          compute: appSettings.defaultCompute === 'gpu' ? 'gpu' : 'cpu',
          language: appSettings.defaultLanguage || 'Auto',
          model: current.model || defaultModel
        }
      })
    }

    void loadDefaults().catch(() => undefined)

    return () => {
      isActive = false
    }
  }, [desktop])

  useEffect(() => {
    if (state !== 'recording') return

    const timer = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000)))
    }, 500)

    return () => clearInterval(timer)
  }, [state])

  useEffect(() => {
    return () => {
      mediaRecorder.current?.stop()
      stopLiveTranscription()
      stopStream(micStream.current)
      stopStream(systemStream.current)
      stopStream(mixedStream.current)
      void audioContext.current?.close()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const transcriptSegments = useMemo(
    () => (record?.segments && record.segments.length > 0 ? record.segments : liveSegments),
    [liveSegments, record]
  )
  const filteredSegments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return transcriptSegments
    return transcriptSegments.filter((segment) => segment.text.toLowerCase().includes(query))
  }, [searchQuery, transcriptSegments])
  const speakers = useMemo(() => buildSpeakers(transcriptSegments), [transcriptSegments])
  const wordCount = useMemo(
    () =>
      transcriptSegments.reduce((count, segment) => {
        const words = segment.text.trim().split(/\s+/).filter(Boolean)
        return count + words.length
      }, 0),
    [transcriptSegments]
  )

  async function createMeetingStream(): Promise<MediaStream> {
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false
    })
    micStream.current = mic

    if (!settings.includeSystemAudio) {
      return mic
    }

    let displayStream: MediaStream | null = null

    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true
      })
    } catch {
      setMessage('Recording microphone audio')
      return mic
    }

    systemStream.current = displayStream
    const systemAudioTracks = displayStream.getAudioTracks()

    if (systemAudioTracks.length === 0) {
      stopStream(displayStream)
      setMessage('Recording microphone audio')
      return mic
    }

    const context = new AudioContext()
    const destination = context.createMediaStreamDestination()
    context.createMediaStreamSource(mic).connect(destination)
    context.createMediaStreamSource(new MediaStream(systemAudioTracks)).connect(destination)
    audioContext.current = context

    mixedStream.current = destination.stream
    return destination.stream
  }

  function startLiveTranscription(): void {
    const Recognition =
      (window as WindowWithSpeechRecognition).SpeechRecognition ??
      (window as WindowWithSpeechRecognition).webkitSpeechRecognition

    if (!Recognition) {
      setMessage('Listening')
      return
    }

    const liveRecognition = new Recognition()
    liveRecognition.continuous = true
    liveRecognition.interimResults = true
    liveRecognition.lang = getBrowserRecognitionLanguage(settings.language)
    recognitionShouldRun.current = true

    liveRecognition.onresult = (event) => {
      let interimText = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript.trim()

        if (!text) continue

        if (result.isFinal) {
          const start = Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000))
          setLiveSegments((current) => [
            ...current,
            {
              id: liveSegmentId.current++,
              start,
              end: start + Math.max(1, Math.ceil(text.split(/\s+/).length / 2.5)),
              text,
              ...(settings.diarization ? { speaker: 'Live speaker' } : {})
            }
          ])
          setLiveInterimText('')
        } else {
          interimText = [interimText, text].filter(Boolean).join(' ')
        }
      }

      if (interimText) {
        setLiveInterimText(interimText)
      }
    }

    liveRecognition.onerror = () => {
      setLiveInterimText('')
    }

    liveRecognition.onend = () => {
      if (recognitionShouldRun.current && mediaRecorder.current?.state === 'recording') {
        try {
          liveRecognition.start()
        } catch {
          recognitionShouldRun.current = false
        }
      }
    }

    recognition.current = liveRecognition

    try {
      liveRecognition.start()
      setMessage('Listening live')
    } catch {
      recognitionShouldRun.current = false
    }
  }

  function stopLiveTranscription(): void {
    recognitionShouldRun.current = false
    const activeRecognition = recognition.current
    recognition.current = null

    if (activeRecognition) {
      activeRecognition.onend = null
      activeRecognition.onresult = null
      activeRecognition.onerror = null
      activeRecognition.stop()
    }
  }

  async function transcribeRecording(blob: Blob): Promise<void> {
    setState('transcribing')
    setMessage('Preparing transcription')
    setPartialOutput([])

    if (!settings.model) {
      throw new Error('Download a Whisper model before recording a meeting.')
    }

    const buffer = await blob.arrayBuffer()
    const savedRecording = await desktop.saveRecording(buffer, {
      mimeType: blob.type,
      startedAt: startedAt.current
    })

    const removeOutputListener = desktop.onWhisperOutput((chunk) => {
      const text = chunk.text.trim()
      if (text) setPartialOutput((current) => [...current, text].slice(-8))
    })
    const removeProgressListener = desktop.onWhisperProgress((update) => {
      setMessage(update.message)
    })

    try {
      const result = await desktop.transcribeWithWhisper({
        compute: settings.compute,
        diarization: settings.diarization,
        filePath: savedRecording.filePath,
        formats: [],
        language: settings.language,
        model: settings.model
      })

      if (result.exitCode !== 0 || !result.record) {
        throw new Error(result.stderr || 'Transcription failed.')
      }

      setRecord(result.record)
      setState('complete')
      setMessage('Transcription complete')
    } finally {
      removeOutputListener()
      removeProgressListener()
    }
  }

  async function startRecording(): Promise<void> {
    setError(null)
    setRecord(null)
    setLiveSegments([])
    setLiveInterimText('')
    setPartialOutput([])
    setElapsed(0)
    setMessage('Listening')

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }

    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        throw new Error('Recording is not supported in this environment.')
      }

      const stream = await createMeetingStream()
      const mimeType = getRecorderMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunks.current = []
      startedAt.current = Date.now()
      mediaRecorder.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        stopStream(micStream.current)
        stopStream(systemStream.current)
        stopStream(mixedStream.current)
        void audioContext.current?.close()
        micStream.current = null
        systemStream.current = null
        mixedStream.current = null
        audioContext.current = null

        void transcribeRecording(blob).catch((recordingError) => {
          setState('error')
          setError(
            recordingError instanceof Error ? recordingError.message : 'Transcription failed.'
          )
          setMessage('Transcription failed')
        })
      }

      recorder.start(1000)
      setState('recording')
      startLiveTranscription()
    } catch (recordingError) {
      stopLiveTranscription()
      stopStream(micStream.current)
      stopStream(systemStream.current)
      setState('error')
      setError(
        recordingError instanceof Error ? recordingError.message : 'Could not start recording.'
      )
      setMessage('Recording failed')
    }
  }

  function stopRecording(): void {
    if (mediaRecorder.current?.state === 'recording') {
      setMessage('Saving recording')
      stopLiveTranscription()
      mediaRecorder.current.stop()
    }
  }

  const isRecording = state === 'recording'
  const isTranscribing = state === 'transcribing'
  const isBusy = isRecording || isTranscribing
  const canStart =
    (state === 'idle' || state === 'complete' || state === 'error') && Boolean(settings.model)

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card/20">
        <div className="shrink-0 border-b border-border/50 bg-card/40 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {isRecording ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Mic className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-[15px] font-semibold">Meeting Recorder</h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      state === 'complete'
                        ? 'bg-success/10 text-success'
                        : isBusy
                          ? 'bg-primary/10 text-primary'
                          : state === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {state === 'complete' ? <Check className="h-2.5 w-2.5" /> : null}
                    {isRecording ? 'Recording' : isTranscribing ? 'Transcribing' : message}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatElapsed(elapsed)}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{settings.model || 'No model selected'}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{settings.compute.toUpperCase()}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{settings.language}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </Button>
              {isRecording ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={stopRecording}
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={!canStart || isTranscribing}
                  onClick={() => void startRecording()}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                  Start
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-6 py-2.5">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search transcript..."
                  className="h-8 border-border/40 bg-secondary/40 pl-9 text-[13px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {filteredSegments.length} segments
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto space-y-1">
                {filteredSegments.length > 0 ? (
                  filteredSegments.map((segment) => {
                    const speaker = segment.speaker ?? 'Speaker'
                    const badgeColor = getSpeakerBadgeColor(speaker)

                    return (
                      <div
                        key={segment.id}
                        className="group relative flex gap-3 rounded-xl border border-transparent px-4 py-3 transition-all hover:bg-secondary/30"
                      >
                        <span className="absolute bottom-3 left-0 top-3 w-[2px] rounded-r-full bg-primary opacity-25" />
                        <div className="flex w-14 shrink-0 flex-col items-center gap-1 pt-0.5">
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            {formatTimestamp(segment.start)}
                          </span>
                          <span className="font-mono text-[9px] tabular-nums text-muted-foreground/40">
                            {formatTimestamp(segment.end)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}
                            >
                              {speaker}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed text-foreground/90">
                            {segment.text.trim()}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    {isTranscribing ? (
                      <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                    ) : (
                      <Mic className="mb-3 h-8 w-8 opacity-50" />
                    )}
                    <p className="text-sm font-medium">
                      {isTranscribing ? 'Transcribing meeting audio' : 'No meeting transcript yet'}
                    </p>
                    {liveInterimText && (
                      <div className="mt-4 max-w-xl rounded-md bg-secondary/40 px-3 py-2 text-left text-[13px] leading-relaxed text-foreground/70">
                        {liveInterimText}
                      </div>
                    )}
                    {partialOutput.length > 0 && (
                      <div className="mt-4 max-h-36 w-full max-w-xl overflow-hidden rounded-md bg-background/60 p-3 text-left font-mono text-[11px] text-muted-foreground">
                        {partialOutput.map((line, index) => (
                          <p key={`${line}-${index}`} className="truncate">
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    {error && (
                      <div className="mt-4 flex max-w-xl gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-[12px] text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-border/50 bg-card/30 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Speakers
            </h3>
            <div className="space-y-2">
              {speakers.length > 0 ? (
                speakers.map((speaker) => (
                  <div
                    key={speaker.id}
                    className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/10 px-3 py-2.5"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold ${getSpeakerBadgeColor(
                        speaker.id
                      )}`}
                    >
                      {speaker.label.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{speaker.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {speaker.segments} segments
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-1 text-[12px] text-muted-foreground">
                  Speaker detection has no segments yet.
                </p>
              )}
            </div>

            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                <Hash className="mb-2 h-3.5 w-3.5 text-muted-foreground" />
                <p className="mb-0.5 text-[10px] text-muted-foreground">Words</p>
                <p className="font-mono text-[13px] font-semibold">{wordCount}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                <Clock className="mb-2 h-3.5 w-3.5 text-muted-foreground" />
                <p className="mb-0.5 text-[10px] text-muted-foreground">Duration</p>
                <p className="font-mono text-[13px] font-semibold">{formatElapsed(elapsed)}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                <Users className="mb-2 h-3.5 w-3.5 text-muted-foreground" />
                <p className="mb-0.5 text-[10px] text-muted-foreground">Speakers</p>
                <p className="font-mono text-[13px] font-semibold">{speakers.length}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                <CheckCircle2 className="mb-2 h-3.5 w-3.5 text-muted-foreground" />
                <p className="mb-0.5 text-[10px] text-muted-foreground">Status</p>
                <p className="font-mono text-[13px] font-semibold">{state}</p>
              </div>
            </div>
          </aside>
        </div>

        {audioUrl && <AudioPlayer src={audioUrl} knownDuration={elapsed || undefined} />}
      </div>

      {settingsOpen && (
        <SettingsModal
          disabled={isBusy}
          downloadedModels={downloadedModels}
          onClose={() => setSettingsOpen(false)}
          onUpdate={(patch) => setSettings((current) => ({ ...current, ...patch }))}
          settings={settings}
        />
      )}
    </div>
  )
}
