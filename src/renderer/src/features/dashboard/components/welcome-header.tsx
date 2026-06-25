import { Plus, Sparkles, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from '@/lib/motion'
import { Link } from '@/app/navigation'

export default function WelcomeHeader() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card to-card p-8"
    >
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-20 w-64 h-64 rounded-full bg-chart-2/5 blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
              Whisper Studio
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{greeting} 👋</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Transcribe, edit, and enhance your audio with AI-powered accuracy. Pick up where you
            left off or start something new.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-3">
          <Link to="/new">
            <Button className="gap-2 glow-primary">
              <Plus className="w-4 h-4" />
              New Transcription
            </Button>
          </Link>
          <Link
            to="/ai"
            className="group flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore AI Features
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
