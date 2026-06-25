import { Link } from '@/app/navigation'
import { motion } from '@/lib/motion'
import { Mic, Clock, Users, CheckCircle2, MoreHorizontal } from 'lucide-react'

const RECENT = [
  {
    id: 1,
    name: 'Product Strategy Meeting Q4',
    duration: '1h 23m',
    date: '2 hours ago',
    format: 'MP4',
    speakers: 3,
    confidence: 96,
    accent: 'from-primary/20 to-primary/5'
  },
  {
    id: 2,
    name: 'User Interview — Sarah Chen',
    duration: '42m',
    date: 'Yesterday',
    format: 'WAV',
    speakers: 2,
    confidence: 98,
    accent: 'from-chart-1/20 to-chart-1/5'
  },
  {
    id: 3,
    name: 'Podcast Episode 47 — AI in Healthcare',
    duration: '1h 05m',
    date: '2 days ago',
    format: 'MP3',
    speakers: 2,
    confidence: 94,
    accent: 'from-chart-2/20 to-chart-2/5'
  },
  {
    id: 4,
    name: 'Sprint Retrospective — Week 48',
    duration: '35m',
    date: '3 days ago',
    format: 'WEBM',
    speakers: 5,
    confidence: 91,
    accent: 'from-warning/20 to-warning/5'
  },
  {
    id: 5,
    name: 'Customer Onboarding — Acme Corp',
    duration: '58m',
    date: '4 days ago',
    format: 'M4A',
    speakers: 2,
    confidence: 97,
    accent: 'from-chart-4/20 to-chart-4/5'
  },
  {
    id: 6,
    name: 'Investor Pitch — Series B',
    duration: '1h 12m',
    date: '5 days ago',
    format: 'MP4',
    speakers: 4,
    confidence: 95,
    accent: 'from-chart-5/20 to-chart-5/5'
  },
  {
    id: 7,
    name: 'Design Review — Mobile App',
    duration: '47m',
    date: '6 days ago',
    format: 'WEBM',
    speakers: 3,
    confidence: 93,
    accent: 'from-primary/20 to-primary/5'
  },
  {
    id: 8,
    name: 'Weekly Standup — Engineering',
    duration: '22m',
    date: '1 week ago',
    format: 'M4A',
    speakers: 6,
    confidence: 90,
    accent: 'from-chart-2/20 to-chart-2/5'
  }
]

export default function TranscriptionGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recent Transcriptions</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pick up where you left off</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {RECENT.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to="/editor"
              className="group relative block overflow-hidden rounded-2xl border border-border/40 bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all"
            >
              {/* Gradient header */}
              <div className={`h-20 bg-gradient-to-br ${item.accent} relative overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-end pr-4">
                  <Mic className="w-12 h-12 text-foreground/5 group-hover:text-primary/10 transition-colors" />
                </div>
                <div className="absolute top-3 left-4 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 backdrop-blur-sm">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span className="text-[10px] font-mono text-success">{item.confidence}%</span>
                </div>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4">
                <h3 className="text-[13px] font-medium truncate group-hover:text-primary transition-colors mb-2">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.duration}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {item.speakers}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{item.format}</span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-2">{item.date}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
