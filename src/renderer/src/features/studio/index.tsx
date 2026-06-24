import { useState, useMemo } from 'react'
import { Link } from '@/app/navigation'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { captions } from '@/captions'
import {
  Search,
  Replace,
  Download,
  Check,
  Languages,
  Tag,
  MessageSquare,
  MoreHorizontal,
  FileAudio,
  Clock
} from 'lucide-react'
import AudioPlayer from '@/components/editor/AudioPlayer'
import SpeakerPanel from '@/components/editor/SpeakerPanel'
import TranscriptSegment from '@/components/editor/TranscriptSegment'

const TRANSCRIPT = captions.studio.transcript

export default function Studio() {
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [activeSegment, setActiveSegment] = useState(1)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(captions.studio.defaultCurrentTime)

  const filteredTranscript = useMemo(
    () =>
      TRANSCRIPT.filter((seg) => {
        const matchSearch = searchQuery
          ? seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            seg.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
        const matchSpeaker = activeSpeaker ? seg.speaker === activeSpeaker : true
        return matchSearch && matchSpeaker
      }),
    [searchQuery, activeSpeaker]
  )

  const matchCount = searchQuery
    ? TRANSCRIPT.filter((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0

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
                <h1 className="text-[15px] font-semibold truncate">
                  {captions.studio.header.title}
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/10 text-success text-[10px] font-medium">
                  <Check className="w-2.5 h-2.5" /> {captions.studio.header.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {captions.studio.header.duration}
                </span>
                <span className="text-muted-foreground/30">{captions.studio.header.separator}</span>
                <span>{captions.studio.header.speakers}</span>
                <span className="text-muted-foreground/30">{captions.studio.header.separator}</span>
                <span>{captions.studio.header.model}</span>
                <span className="text-muted-foreground/30">{captions.studio.header.separator}</span>
                <span>{captions.studio.header.confidence}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <Languages className="w-3.5 h-3.5" /> {captions.studio.actions.language}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <Tag className="w-3.5 h-3.5" /> {captions.studio.actions.label}
            </Button>

            <Link to="/export">
              <Button size="sm" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> {captions.studio.actions.export}
              </Button>
            </Link>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                  {matchCount} {captions.studio.matchesLabel}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplace(!showReplace)}
              className="text-xs text-muted-foreground gap-1"
            >
              <Replace className="w-3.5 h-3.5" /> {captions.studio.actions.replace}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> {captions.studio.actions.comments}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </div>

          {showReplace && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="shrink-0 px-6 py-2.5 border-b border-border/50 flex items-center gap-2 bg-secondary/20"
            >
              <Input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder={captions.studio.placeholders.replace}
                className="flex-1 max-w-sm h-8 text-[13px] bg-secondary/40 border-border/40"
              />
              <Button variant="outline" size="sm" className="text-xs">
                {captions.studio.actions.replace}
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                {captions.studio.actions.replaceAll}
              </Button>
            </motion.div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto space-y-1">
              {filteredTranscript.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  {captions.studio.emptyState}
                </div>
              ) : (
                filteredTranscript.map((seg) => (
                  <TranscriptSegment
                    key={seg.id}
                    seg={seg}
                    isActive={activeSegment === seg.id}
                    searchQuery={searchQuery}
                    onActivate={setActiveSegment}
                    onTimeClick={(t) => setCurrentTime(t)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <SpeakerPanel activeSpeaker={activeSpeaker} onSelectSpeaker={setActiveSpeaker} />
      </div>

      {/* Player */}
      <AudioPlayer
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        currentTime={currentTime}
        progress={18}
      />
    </div>
  )
}
