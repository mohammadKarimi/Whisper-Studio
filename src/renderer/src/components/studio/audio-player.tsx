import { Play, Pause, Volume2, Repeat, Rewind, FastForward } from 'lucide-react'
import { captions } from '@/captions'

export default function AudioPlayer({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration = captions.audioPlayer.defaultDuration,
  progress = 18
}) {
  return (
    <div className="shrink-0 border-t border-border/50 bg-card/60 backdrop-blur-xl px-6 py-3">
      <div className="flex items-center gap-5">
        {/* Transport */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            <Rewind className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time + Waveform seek */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-16">
            {currentTime}
          </span>
          <div className="flex-1 group cursor-pointer">
            <div className="relative h-8 flex items-center">
              {/* Waveform bars */}
              <div className="absolute inset-0 flex items-center gap-[2px] overflow-hidden">
                {Array.from({ length: 120 }).map((_, i) => {
                  const h = 20 + Math.abs(Math.sin(i * 0.4) * 60) + Math.abs(Math.cos(i * 0.7) * 20)
                  const played = (i / 120) * 100 < progress
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${played ? 'bg-primary' : 'bg-muted-foreground/25'}`}
                      style={{ height: `${Math.min(100, h)}%` }}
                    />
                  )
                })}
              </div>
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary rounded-full shadow-[0_0_8px] shadow-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-16 text-right">
            {duration}
          </span>
        </div>

        {/* Volume + speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <div className="w-20 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/50 rounded-full"
                style={{ width: '75%' }}
              />
            </div>
          </div>
          <button className="text-[11px] text-muted-foreground hover:text-foreground font-mono px-2.5 py-1 rounded-md bg-secondary/50 hover:bg-secondary transition-colors">
            {captions.audioPlayer.speed}
          </button>
          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
