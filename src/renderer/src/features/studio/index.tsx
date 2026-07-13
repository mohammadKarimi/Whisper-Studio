import { useMemo } from 'react'
import { Link } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { captions } from '@/lib/strings'
import { Search, Replace, Download, Check, FileAudio, Clock, Loader2, Save, X } from 'lucide-react'
import AudioPlayer from '@/features/studio/components/audio-player'
import SpeakerPanel from '@/features/studio/components/speaker-panel'
import TranscriptSegment from '@/features/studio/components/transcript-segment'
import type { DesktopApi } from '@shared/ipc'
import { useStudioContext } from '@/lib/studio-context'
import { useAppRoute } from '@/app/use-app-route'
import { useTranscriptEditor } from './hooks/use-transcript-editor'

interface StudioProps {
  desktop: DesktopApi
}

export default function Studio({ desktop }: StudioProps) {
  const { record, setRecord } = useStudioContext()
  const { navigateTo } = useAppRoute()
  const {
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
    audioSrc,
    fileName,
    modelDisplay,
    effectiveDurationSeconds,
    durationDisplay,
    panelStats
  } = useTranscriptEditor(record, setRecord, desktop)

  function handleExport(): void {
    if (record) {
      setRecord({
        ...record,
        segments: segments.map((s) => ({
          id: s.id,
          start: s.startSeconds,
          end: s.endSeconds,
          text: s.text,
          ...(s.speaker ? { speaker: s.speaker } : {})
        }))
      })
    }
    navigateTo('export')
  }

  const speakers = useMemo(() => {
    const map = new Map<string, { speaker: string; name: string; segments: number }>()
    for (const seg of segments) {
      if (!seg.speaker) continue
      if (!map.has(seg.speaker)) {
        map.set(seg.speaker, { speaker: seg.speaker, name: seg.name, segments: 0 })
      }
      map.get(seg.speaker)!.segments++
    }
    return Array.from(map.values())
  }, [segments])

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
          <div className="shrink-0 px-6 py-2.5 border-b border-border/50 flex items-center justify-between gap-2">
            <div className="flex-1 flex gap-2 items-center min-w-0">
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
            </div>
            <Button
              variant={followPlayback ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFollowPlayback((value) => !value)}
              className="text-xs text-muted-foreground"
            >
              {followPlayback
                ? captions.studio.actions.followOn
                : captions.studio.actions.followOff}
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
          <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Loading transcript…</span>
                </div>
              ) : !record ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No transcription selected. Go to the{' '}
                  <Link to="dashboard" className="text-primary underline">
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
                  <div key={seg.id} data-segment-id={seg.id}>
                    <TranscriptSegment
                      seg={seg}
                      isActive={activeSegment === seg.id}
                      searchQuery={searchQuery}
                      onActivate={(id) => {
                        isPlaybackDrivenSelectionRef.current = false
                        setActiveSegment(id)
                      }}
                      onTextChange={handleSegmentTextChange}
                      onTimeClick={() => {
                        isPlaybackDrivenSelectionRef.current = true
                        seekToRef.current?.(seg.startSeconds)
                      }}
                    />
                  </div>
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
          speakers={speakers}
          onRename={renameSpeaker}
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
