import React from 'react'
import { User, Edit3, Check, Copy } from 'lucide-react'
import type { SrtSegment } from '@/lib/srt-parser'

const SPEAKER_COLOR_PALETTE = [
  { badge: 'bg-chart-1/10 text-chart-1 border-chart-1/20', dot: 'bg-chart-1', bar: 'bg-chart-1' },
  { badge: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary', bar: 'bg-primary' },
  { badge: 'bg-chart-2/10 text-chart-2 border-chart-2/20', dot: 'bg-chart-2', bar: 'bg-chart-2' },
  { badge: 'bg-chart-3/10 text-chart-3 border-chart-3/20', dot: 'bg-chart-3', bar: 'bg-chart-3' },
  { badge: 'bg-chart-4/10 text-chart-4 border-chart-4/20', dot: 'bg-chart-4', bar: 'bg-chart-4' }
]

function getSpeakerColors(name: string) {
  const match = name.match(/(\d+)$/)
  const index = match ? (parseInt(match[1]) - 1) % SPEAKER_COLOR_PALETTE.length : 0
  return SPEAKER_COLOR_PALETTE[index] ?? SPEAKER_COLOR_PALETTE[0]
}

interface TranscriptSegmentProps {
  isActive: boolean
  onActivate: (id: number) => void
  onTextChange: (id: number, newText: string) => void
  onTimeClick: () => void
  searchQuery: string
  seg: SrtSegment
}

export default function TranscriptSegment({
  seg,
  isActive,
  searchQuery,
  onActivate,
  onTimeClick,
  onTextChange
}: TranscriptSegmentProps) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(seg.text)
  const colors = getSpeakerColors(seg.name)

  const renderText = (content: string) => {
    if (!searchQuery) return content
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return content.split(new RegExp(`(${escaped})`, 'gi')).map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div
      onClick={() => onActivate(seg.id)}
      className={`group relative flex gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
        isActive ? 'bg-primary/5 border-primary/15' : 'border-transparent hover:bg-secondary/30'
      }`}
    >
      {/* Active accent bar */}
      {isActive && (
        <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${colors.bar}`} />
      )}

      {/* Timestamp */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onTimeClick()
        }}
        className="shrink-0 flex flex-col items-center gap-1 pt-0.5 w-14"
      >
        <span className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors tabular-nums">
          {seg.time}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums">
          {seg.endTime}
        </span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${colors.badge}`}
          >
            <User className="w-2.5 h-2.5" />
            {seg.name}
          </span>
        </div>
        {editing ? (
          <textarea
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault()
                setEditing(false)
                if (text !== seg.text) onTextChange?.(seg.id, text)
              }
            }}
            onBlur={() => {
              setEditing(false)
              if (text !== seg.text) onTextChange?.(seg.id, text)
            }}
            className="w-full bg-secondary/40 rounded-lg p-2 text-[13px] leading-relaxed resize-none outline-none border border-primary/30 focus:border-primary/50"
            rows={3}
          />
        ) : (
          <p
            className="text-[13px] leading-relaxed text-foreground/90"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
          >
            {renderText(text)}
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (editing && text !== seg.text) onTextChange?.(seg.id, text)
            setEditing(!editing)
          }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {editing ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Edit3 className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard?.writeText(text)
          }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
