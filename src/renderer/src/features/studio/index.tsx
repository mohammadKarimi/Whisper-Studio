import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { captions } from '@/lib/strings'
import { Search, Replace, Download, Check, FileAudio, Clock, Loader2, Save, X } from 'lucide-react'
import AudioPlayer from '@/features/studio/componenets/audio-player'
import SpeakerPanel from '@/features/studio/componenets/speaker-panel'
import TranscriptSegment from '@/features/studio/componenets/transcript-segment'
import type { DesktopApi, TranscriptionRecord } from '@shared/ipc'
import { takeStudioRecord, setStudioRecord } from '@/lib/studio-store'
import { useAppRoute } from '@/app/use-app-route'
import { type SrtSegment } from '@/lib/srt-parser'
import { secondsToDisplay } from '@/lib/utils'
import { useSegmentSearch } from './hooks/use-segment-search'
import { useSegmentSave } from './hooks/use-segment-save'

interface StudioProps {
  desktop: DesktopApi
}

export default function Studio({ desktop }: StudioProps) {
  const [record, setRecord] = useState<TranscriptionRecord | null>(null)
  const [segments, setSegments] = useState<SrtSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSegment, setActiveSegment] = useState<number>(1)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const { navigateTo } = useAppRoute()
  const seekToRef = useRef<((s: number) => void) | null>(null)

  const { isDirty, isSaving, saveStatus, handleSave, markDirty } = useSegmentSave(
    record,
    segments,
    desktop,
    setRecord
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

  function handleExport(): void {
    if (record) {
      setStudioRecord({
        ...record,
        segments: segments.map((s) => ({
          id: s.id,
          start: s.startSeconds,
          end: s.endSeconds,
          text: s.text
        }))
      })
    }
    navigateTo('export')
  }

  useEffect(() => {
    const rec = takeStudioRecord()
    setRecord(rec)
    if (!rec) {
      setLoading(false)
      return
    }
    const segs: SrtSegment[] = (rec.segments ?? []).map((s) => ({
      id: s.id,
      startSeconds: s.start,
      endSeconds: s.end,
      time: secondsToDisplay(s.start),
      endTime: secondsToDisplay(s.end),
      text: s.text,
      speaker: '',
      name: ''
    }))
    setSegments(segs)
    if (segs.length > 0) setActiveSegment(segs[0].id)
    setLoading(false)
  }, [])

  const handleTimeUpdate = useCallback((seconds: number) => {
    setSegments((segs) => {
      const active = segs.find((s) => seconds >= s.startSeconds && seconds < s.endSeconds)
      if (active) setActiveSegment(active.id)
      return segs
    })
  }, [])

  function handleSegmentTextChange(id: number, newText: string): void {
    setSegments((segs) => segs.map((s) => (s.id === id ? { ...s, text: newText } : s)))
    markDirty()
  }

  const audioSrc = record?.sourceFilePath
  const fileName = record?.sourceFileName ?? captions.studio.header.title
  const modelDisplay = record?.model ?? captions.studio.header.model

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-card/40 backdrop-blur-xl px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FileAudio className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold truncate">{fileName}</h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/10 text-success text-[10px] font-medium">
                  <Check className="w-2.5 h-2.5" /> {captions.studio.header.status}
                </span>
                {isDirty && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-warning/10 text-warning text-[10px] font-medium">
                    Unsaved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {durationDisplay}
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span>{modelDisplay}</span>
                {record?.language && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{record.language}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={saveStatus === 'error' ? 'destructive' : isDirty ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 text-xs"
              disabled={!isDirty || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              variant="outline"
              disabled={!record}
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" /> {captions.studio.actions.export}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="shrink-0 px-6 py-2.5 border-b border-border/50 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={captions.studio.placeholders.search}
                className="pl-9 h-8 text-[13px] bg-secondary/40 border-border/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <Button
              variant={showReplace ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowReplace(!showReplace)}
              className="text-xs text-muted-foreground gap-1"
            >
              <Replace className="w-3.5 h-3.5" /> {captions.studio.actions.replace}
            </Button>
            {searchQuery && (
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {matchCount} {captions.studio.matchesLabel}
              </span>
            )}
          </div>

          {showReplace && (
            <div className="shrink-0 px-6 py-2.5 border-b border-border/50 flex items-center gap-2 bg-secondary/20">
              <Input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder={captions.studio.placeholders.replace}
                className="flex-1 max-w-sm h-8 text-[13px] bg-secondary/40 border-border/40"
                onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!searchQuery || !replaceText || matchCount === 0}
                onClick={handleReplace}
              >
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!searchQuery || !replaceText || matchCount === 0}
                onClick={handleReplaceAll}
              >
                Replace All
                {matchCount > 0 && <span className="ml-1 opacity-60">({matchCount})</span>}
              </Button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Loading transcript…</span>
                </div>
              ) : !record ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No transcription selected. Go to the{' '}
                  <Link to="/dashboard" className="text-primary underline">
                    dashboard
                  </Link>{' '}
                  and open one.
                </div>
              ) : filteredSegments.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  {searchQuery ? `No results for "${searchQuery}"` : captions.studio.emptyState}
                </div>
              ) : (
                filteredSegments.map((seg) => (
                  <TranscriptSegment
                    key={seg.id}
                    seg={seg}
                    isActive={activeSegment === seg.id}
                    searchQuery={searchQuery}
                    onActivate={setActiveSegment}
                    onTextChange={handleSegmentTextChange}
                    onTimeClick={() => {
                      seekToRef.current?.(seg.startSeconds)
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <SpeakerPanel
          activeSpeaker={activeSpeaker}
          onSelectSpeaker={setActiveSpeaker}
          stats={panelStats}
        />
      </div>

      {/* Player */}
      <AudioPlayer
        src={audioSrc}
        knownDuration={effectiveDurationSeconds || undefined}
        onTimeUpdate={handleTimeUpdate}
        seekToRef={seekToRef}
      />
    </div>
  )
}
