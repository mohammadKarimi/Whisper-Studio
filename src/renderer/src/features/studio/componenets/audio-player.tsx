import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { Play, Pause, Volume2, VolumeX, Repeat, Rewind, FastForward } from 'lucide-react'
import { captions } from '@/lib/strings'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { secondsToDisplay } from '@/lib/utils'

interface AudioPlayerProps {
  src?: string
  knownDuration?: number
  onTimeUpdate?: (seconds: number) => void
  seekToRef?: React.MutableRefObject<((seconds: number) => void) | null>
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function AudioPlayer({
  src,
  knownDuration,
  onTimeUpdate,
  seekToRef
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentTimeRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSeconds, setCurrentSeconds] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [volume, setVolume] = useState(0.75)
  const [isMuted, setIsMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [isLooping, setIsLooping] = useState(false)

  useEffect(() => {
    setIsPlaying(false)
    setCurrentSeconds(0)
    setDurationSeconds(0)
  }, [src])

  useEffect(() => {
    if (seekToRef) {
      seekToRef.current = (seconds: number) => {
        const audio = audioRef.current
        if (audio) audio.currentTime = seconds
      }
    }
  }, [seekToRef])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = speed
  }, [speed])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.loop = isLooping
  }, [isLooping])

  function handleTogglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((err) => console.error('[AudioPlayer] play() failed:', err))
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    const totalDuration = durationSeconds || knownDuration || 0
    if (!audio || !totalDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * totalDuration
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
  }

  function handleCycleSpeed() {
    const idx = SPEED_OPTIONS.indexOf(speed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    setSpeed(next)
  }

  function skip(e: React.MouseEvent, delta: number) {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    const total = isFinite(audio.duration) ? audio.duration : (knownDuration ?? Infinity)
    audio.currentTime = Math.max(0, Math.min(total, currentTimeRef.current + delta))
  }

  const effectiveDuration = durationSeconds || knownDuration || 0
  const progress = effectiveDuration > 0 ? (currentSeconds / effectiveDuration) * 100 : 0

  return (
    <div className="shrink-0 border-t border-border/50 bg-card/60 backdrop-blur-xl px-6 py-3">
      {src && (
        <audio
          ref={audioRef}
          src={(() => {
            if (!src) return undefined
            if (src.startsWith('local-file://')) return src
            return 'local-file:///' + src.replace(/\\/g, '/')
          })()}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            const t = audioRef.current?.currentTime ?? 0
            currentTimeRef.current = t
            setCurrentSeconds(t)
            onTimeUpdate?.(t)
          }}
          onLoadedMetadata={() => {
            const audio = audioRef.current
            if (!audio) return
            setDurationSeconds(audio.duration ?? 0)
            audio.volume = isMuted ? 0 : volume
            audio.playbackRate = speed
            audio.loop = isLooping
          }}
        />
      )}
      <div className="flex items-center gap-5">
        {/* Transport */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              onClick={(e) => skip(e, -10)}
            >
              <Rewind className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">{captions.audioPlayer.tooltips.back10s}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={(e) => {
                e.stopPropagation()
                handleTogglePlay()
              }}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </TooltipTrigger>
            <TooltipContent side="top">
              {isPlaying ? captions.audioPlayer.tooltips.pause : captions.audioPlayer.tooltips.play}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              onClick={(e) => skip(e, 10)}
            >
              <FastForward className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">{captions.audioPlayer.tooltips.forward10s}</TooltipContent>
          </Tooltip>
        </div>

        {/* Time + Waveform seek */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-16">
            {secondsToDisplay(currentSeconds)}
          </span>
          <div className="flex-1 group cursor-pointer" onClick={handleSeek}>
            <div className="relative h-8 flex items-center">
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
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary rounded-full shadow-[0_0_8px] shadow-primary/50"
                style={{ left: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-16 text-right">
            {effectiveDuration > 0
              ? secondsToDisplay(effectiveDuration)
              : captions.audioPlayer.defaultDuration}
          </span>
        </div>

        {/* Volume + speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setIsMuted((m) => !m)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </TooltipTrigger>
              <TooltipContent side="top">
                {isMuted ? captions.audioPlayer.tooltips.unmute : captions.audioPlayer.tooltips.mute}
              </TooltipContent>
            </Tooltip>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 accent-primary cursor-pointer"
            />
          </div>
          <Tooltip>
            <TooltipTrigger
              onClick={handleCycleSpeed}
              className="text-[11px] text-muted-foreground hover:text-foreground font-mono px-2.5 py-1 rounded-md bg-secondary/50 hover:bg-secondary transition-colors min-w-[3rem] text-center"
            >
              {speed === 1 ? '1×' : `${speed}×`}
            </TooltipTrigger>
            <TooltipContent side="top">{captions.audioPlayer.tooltips.playbackSpeed}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={() => setIsLooping((l) => !l)}
              className={`p-1.5 rounded-lg transition-colors ${isLooping ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">
              {isLooping ? captions.audioPlayer.tooltips.loopOn : captions.audioPlayer.tooltips.loopOff}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
