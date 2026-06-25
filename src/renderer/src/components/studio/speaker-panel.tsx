import { Clock, Gauge, Hash, TrendingUp } from 'lucide-react'
import { captions } from '@/captions'

const speakerColors = ['bg-chart-1', 'bg-primary', 'bg-chart-2']

const SPEAKERS = captions.studio.speakerPanel.speakers.map((speaker, index) => ({
  ...speaker,
  color: speakerColors[index]
}))

interface SpeakerPanelProps {
  activeSpeaker: string | null
  onSelectSpeaker: (speaker: string | null) => void
}
const STATS = [
  { icon: Hash, ...captions.studio.speakerPanel.stats[0] },
  { icon: Clock, ...captions.studio.speakerPanel.stats[1] },
  { icon: Gauge, ...captions.studio.speakerPanel.stats[2] },
  { icon: TrendingUp, ...captions.studio.speakerPanel.stats[3] }
]

export default function SpeakerPanel({
  activeSpeaker,
  onSelectSpeaker
}: SpeakerPanelProps): JSX.Element {
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
        {SPEAKERS.map((speaker) => {
          const isActive = activeSpeaker === speaker.speaker

          return (
            <button
              key={speaker.speaker}
              onClick={() => onSelectSpeaker(isActive ? null : speaker.speaker)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-secondary/30 border-transparent hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${speaker.color}`} />
                <span className="text-[12px] font-medium text-foreground">{speaker.name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {speaker.segments} {captions.studio.speakerPanel.segmentsLabel}
              </p>
            </button>
          )
        })}
      </div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
        {captions.studio.speakerPanel.headings.statistics}
      </h3>
      <div className="">
        <div className="grid grid-cols-2 gap-2">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-xl bg-secondary/20 border border-border/30"
            >
              <stat.icon className="w-3.5 h-3.5 text-muted-foreground mb-2" />
              <p className="text-[10px] text-muted-foreground mb-0.5">{stat.label}</p>
              <p className="text-[13px] font-mono font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Quality */}{' '}
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
        {captions.studio.speakerPanel.headings.quality}
      </h3>
      <div className="">
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">
                {captions.studio.speakerPanel.quality[0].label}
              </span>
              <span className="font-mono text-foreground">
                {captions.studio.speakerPanel.quality[0].value}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: '96%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">
                {captions.studio.speakerPanel.quality[1].label}
              </span>
              <span className="font-mono text-foreground">
                {captions.studio.speakerPanel.quality[1].value}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '89%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">
                {captions.studio.speakerPanel.quality[2].label}
              </span>
              <span className="font-mono text-foreground">
                {captions.studio.speakerPanel.quality[2].value}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-warning rounded-full" style={{ width: '22%' }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
