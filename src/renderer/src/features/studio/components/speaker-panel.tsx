import { useState } from 'react'
import { Clock, Gauge, Hash, TrendingUp, Pencil, Check } from 'lucide-react'
import { captions } from '@/lib/strings'

interface SpeakerInfo {
  speaker: string
  name: string
  segments: number
}

interface SpeakerPanelProps {
  activeSpeaker: string | null
  onSelectSpeaker: (speaker: string | null) => void
  onRename?: (speakerId: string, newName: string) => void
  speakers?: SpeakerInfo[]
  stats?: { label: string; value: string }[]
}

const STAT_ICONS = [Hash, Clock, Gauge, TrendingUp]

const DEFAULT_STATS = [
  { icon: Hash, ...captions.studio.speakerPanel.stats[0] },
  { icon: Clock, ...captions.studio.speakerPanel.stats[1] },
  { icon: Gauge, ...captions.studio.speakerPanel.stats[2] },
  { icon: TrendingUp, ...captions.studio.speakerPanel.stats[3] }
]

const SPEAKER_BADGE_COLORS = [
  'bg-primary/10 text-primary border-primary/20',
  'bg-chart-2/10 text-chart-2 border-chart-2/20',
  'bg-chart-3/10 text-chart-3 border-chart-3/20',
  'bg-chart-4/10 text-chart-4 border-chart-4/20',
  'bg-success/10 text-success border-success/20'
]

function getSpeakerBadgeColor(speakerId: string): string {
  const match = speakerId.match(/(\d+)$/)
  const index = match ? parseInt(match[1]) % SPEAKER_BADGE_COLORS.length : 0
  return SPEAKER_BADGE_COLORS[index]
}

function SpeakerRow({
  speaker,
  isActive,
  onSelect,
  onRename
}: {
  speaker: SpeakerInfo
  isActive: boolean
  onSelect: () => void
  onRename?: (speakerId: string, newName: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(speaker.name)
  const badgeColor = getSpeakerBadgeColor(speaker.speaker)

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== speaker.name) {
      onRename?.(speaker.speaker, trimmed)
    } else {
      setDraft(speaker.name)
    }
    setEditing(false)
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
        isActive ? 'bg-primary/5 border-primary/20' : 'border-border/30 bg-secondary/10'
      }`}
    >
      <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 text-[11px] font-bold ${badgeColor}`}
        >
          {speaker.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setDraft(speaker.name)
                  setEditing(false)
                }
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-b border-primary/50 outline-none text-[13px] font-medium pb-0.5"
            />
          ) : (
            <p className="text-[13px] font-medium truncate">{speaker.name}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {speaker.segments} {captions.studio.speakerPanel.segmentsLabel}
          </p>
        </div>
      </button>
      {onRename && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (editing) {
              commitRename()
            } else {
              setDraft(speaker.name)
              setEditing(true)
            }
          }}
          className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {editing ? <Check className="w-3 h-3 text-success" /> : <Pencil className="w-3 h-3" />}
        </button>
      )}
    </div>
  )
}

export default function SpeakerPanel({
  activeSpeaker,
  onSelectSpeaker,
  onRename,
  speakers,
  stats
}: SpeakerPanelProps): JSX.Element {
  const resolvedStats = stats
    ? stats.map((s, i) => ({ ...s, icon: STAT_ICONS[i] ?? Hash }))
    : DEFAULT_STATS

  return (
    <aside className="w-[300px] border-l border-border/50 bg-card/30 p-4 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {captions.studio.speakerPanel.headings.speakers}
        </h3>
        {activeSpeaker && (
          <button
            onClick={() => onSelectSpeaker(null)}
            className="text-[10px] text-primary hover:text-foreground transition-colors"
          >
            {captions.studio.speakerPanel.clear}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {speakers && speakers.length > 0 ? (
          speakers.map((s) => (
            <SpeakerRow
              key={s.speaker}
              speaker={s}
              isActive={activeSpeaker === s.speaker}
              onSelect={() => onSelectSpeaker(activeSpeaker === s.speaker ? null : s.speaker)}
              onRename={onRename}
            />
          ))
        ) : (
          <p className="text-[12px] text-muted-foreground px-1">
            No speaker data. Enable diarization when transcribing.
          </p>
        )}
      </div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
        {captions.studio.speakerPanel.headings.statistics}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {resolvedStats.map((stat) => (
          <div key={stat.label} className="p-3 rounded-xl bg-secondary/20 border border-border/30">
            <stat.icon className="w-3.5 h-3.5 text-muted-foreground mb-2" />
            <p className="text-[10px] text-muted-foreground mb-0.5">{stat.label}</p>
            <p className="text-[13px] font-mono font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
