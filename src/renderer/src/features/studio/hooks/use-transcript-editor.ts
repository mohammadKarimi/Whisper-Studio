import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction
} from 'react'
import type { DesktopApi, TranscriptionRecord } from '@shared/ipc'
import type { SrtSegment } from '@/lib/srt-parser'
import { secondsToDisplay } from '@/lib/utils'
import { captions } from '@/lib/strings'
import { useSegmentSave } from './use-segment-save'
import { useSegmentSearch } from './use-segment-search'

type SaveStatus = 'idle' | 'saved' | 'error'

export interface UseTranscriptEditorResult {
  // Segment state
  segments: SrtSegment[]
  loading: boolean
  activeSegment: number
  setActiveSegment: Dispatch<SetStateAction<number>>
  activeSpeaker: string | null
  setActiveSpeaker: Dispatch<SetStateAction<string | null>>
  followPlayback: boolean
  setFollowPlayback: Dispatch<SetStateAction<boolean>>
  // Refs (passed through to child components)
  seekToRef: React.MutableRefObject<((s: number) => void) | null>
  transcriptScrollRef: React.RefObject<HTMLDivElement>
  isPlaybackDrivenSelectionRef: React.MutableRefObject<boolean>
  // Save
  isDirty: boolean
  isSaving: boolean
  saveStatus: SaveStatus
  handleSave: () => Promise<void>
  // Search / replace
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  replaceText: string
  setReplaceText: Dispatch<SetStateAction<string>>
  showReplace: boolean
  setShowReplace: Dispatch<SetStateAction<boolean>>
  filteredSegments: SrtSegment[]
  matchCount: number
  handleReplace: () => void
  handleReplaceAll: () => void
  // Actions
  handleTimeUpdate: (seconds: number) => void
  handleSegmentTextChange: (id: number, text: string) => void
  renameSpeaker: (speakerId: string, newName: string) => void
  // Derived display values
  audioSrc: string | undefined
  fileName: string
  modelDisplay: string
  effectiveDurationSeconds: number
  durationDisplay: string
  panelStats: { label: string; value: string }[] | undefined
}

export function useTranscriptEditor(
  record: TranscriptionRecord | null,
  onSaved: (updated: TranscriptionRecord) => void,
  desktop: DesktopApi
): UseTranscriptEditorResult {
  const [segments, setSegments] = useState<SrtSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSegment, setActiveSegment] = useState<number>(1)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [followPlayback, setFollowPlayback] = useState(true)

  const seekToRef = useRef<((s: number) => void) | null>(null)
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const isPlaybackDrivenSelectionRef = useRef(false)

  const { isDirty, isSaving, saveStatus, handleSave, markDirty } = useSegmentSave(
    record,
    segments,
    desktop,
    onSaved
  )

  const {
    searchQuery,
    setSearchQuery,
    replaceText,
    setReplaceText,
    showReplace,
    setShowReplace,
    filteredSegments,
    matchCount,
    handleReplace,
    handleReplaceAll
  } = useSegmentSearch({
    segments,
    setSegments,
    onMutation: markDirty,
    onActivate: setActiveSegment
  })

  // Initialize segments from record once on mount. The record is set in context
  // before navigation so it is reliably available when the component first renders.
  useEffect(() => {
    if (!record) {
      setLoading(false)
      return
    }
    const speakerOrder: string[] = []
    const segs: SrtSegment[] = (record.segments ?? []).map((s) => {
      const speakerId = s.speaker ?? ''
      if (speakerId && !speakerOrder.includes(speakerId)) {
        speakerOrder.push(speakerId)
      }
      const speakerIndex = speakerId ? speakerOrder.indexOf(speakerId) : -1
      // If the stored speaker value is already a human-readable name (not a raw
      // WhisperX SPEAKER_XX id), use it directly unless overridden in speakerNames.
      const isRawId = /^SPEAKER_\d+$/i.test(speakerId)
      const speakerName = isRawId
        ? (record.speakerNames?.[speakerId] ??
          (speakerIndex >= 0 ? `Speaker ${speakerIndex + 1}` : ''))
        : (record.speakerNames?.[speakerId] ?? speakerId)
      return {
        id: s.id,
        startSeconds: s.start,
        endSeconds: s.end,
        time: secondsToDisplay(s.start),
        endTime: secondsToDisplay(s.end),
        text: s.text,
        speaker: speakerId,
        name: speakerName
      }
    })
    setSegments(segs)
    if (segs.length > 0) setActiveSegment(segs[0].id)
    setLoading(false)
  }, [record]) // intentional: initialize once from the record present at mount

  // Scroll active segment into view when playback drives the selection change
  useEffect(() => {
    if (!followPlayback || !isPlaybackDrivenSelectionRef.current) return
    const container = transcriptScrollRef.current
    if (!container) return
    const target = container.querySelector<HTMLElement>(`[data-segment-id="${activeSegment}"]`)
    if (!target) return
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeSegment, followPlayback])

  const handleTimeUpdate = useCallback(
    (seconds: number) => {
      const active = segments.find((s) => seconds >= s.startSeconds && seconds < s.endSeconds)
      if (!active) return
      isPlaybackDrivenSelectionRef.current = true
      setActiveSegment((previous) => (previous === active.id ? previous : active.id))
    },
    [segments]
  )

  function handleSegmentTextChange(id: number, newText: string): void {
    setSegments((segs) => segs.map((s) => (s.id === id ? { ...s, text: newText } : s)))
    markDirty()
  }

  function renameSpeaker(speakerId: string, newName: string): void {
    setSegments((segs) => segs.map((s) => (s.speaker === speakerId ? { ...s, name: newName } : s)))
    markDirty()
  }

  // Derived display values
  const srtDurationSeconds = segments.length > 0 ? segments[segments.length - 1].endSeconds : 0
  const effectiveDurationSeconds = record?.durationSeconds ?? srtDurationSeconds

  const wordCount = useMemo(
    () => segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0),
    [segments]
  )
  const durationMinutes = effectiveDurationSeconds / 60
  const wpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0

  function formatDuration(s: number): string {
    if (!s) return '—'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    const sec = Math.floor(s % 60)
    return `${m}m ${sec}s`
  }

  const durationDisplay = effectiveDurationSeconds
    ? secondsToDisplay(effectiveDurationSeconds)
    : captions.studio.header.duration

  const panelStats =
    segments.length > 0
      ? [
          { label: 'Word Count', value: wordCount.toLocaleString() },
          { label: 'Duration', value: formatDuration(effectiveDurationSeconds) },
          { label: 'Confidence', value: '—' },
          { label: 'WPM', value: wpm > 0 ? String(wpm) : '—' }
        ]
      : undefined

  return {
    segments,
    loading,
    activeSegment,
    setActiveSegment,
    activeSpeaker,
    setActiveSpeaker,
    followPlayback,
    setFollowPlayback,
    seekToRef,
    transcriptScrollRef,
    isPlaybackDrivenSelectionRef,
    isDirty,
    isSaving,
    saveStatus,
    handleSave,
    searchQuery,
    setSearchQuery,
    replaceText,
    setReplaceText,
    showReplace,
    setShowReplace,
    filteredSegments,
    matchCount,
    handleReplace,
    handleReplaceAll,
    handleTimeUpdate,
    handleSegmentTextChange,
    renameSpeaker,
    audioSrc: record?.sourceFilePath,
    fileName: record?.sourceFileName ?? captions.studio.header.title,
    modelDisplay: record?.model ?? captions.studio.header.model,
    effectiveDurationSeconds,
    durationDisplay,
    panelStats
  }
}
