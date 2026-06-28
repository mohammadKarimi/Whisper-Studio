import { Clock, Gauge, Hash, TrendingUp } from 'lucide-react'
import { captions } from '@/lib/strings'
import { Banner } from '../../../components/banner'

interface SpeakerPanelProps {
  activeSpeaker: string | null
  onSelectSpeaker: (speaker: string | null) => void
  stats?: { label: string; value: string }[]
}

const STAT_ICONS = [Hash, Clock, Gauge, TrendingUp]

const DEFAULT_STATS = [
  { icon: Hash, ...captions.studio.speakerPanel.stats[0] },
  { icon: Clock, ...captions.studio.speakerPanel.stats[1] },
  { icon: Gauge, ...captions.studio.speakerPanel.stats[2] },
  { icon: TrendingUp, ...captions.studio.speakerPanel.stats[3] }
]

export default function SpeakerPanel({
  activeSpeaker,
  onSelectSpeaker,
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
        {/* TODO: Speaker diarization — re-enable once the upstream model bug is resolved */}
        <Banner
          emphasis=" Note: The speaker list is currently disabled"
          detail="due to a bug in the speaker diarization model that causes it to produce inconsistent results. This will be fixed in a future update."
          className="text-[11px]"
        />
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
