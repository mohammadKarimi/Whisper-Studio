import { Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/app/navigation'
import { captions } from '@/lib/strings'

export default function WelcomeHeader() {
  const hour = new Date().getHours()
  const greeting =
    hour < 12
      ? captions.dashboard.welcomeHeader.greetings.morning
      : hour < 18
        ? captions.dashboard.welcomeHeader.greetings.afternoon
        : captions.dashboard.welcomeHeader.greetings.evening

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card to-card p-8">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-20 w-64 h-64 rounded-full bg-chart-2/5 blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
              {captions.dashboard.welcomeHeader.appName}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{greeting} 👋</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {captions.dashboard.welcomeHeader.subtitle}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-3">
          <Link to="/new">
            <Button className="gap-2 glow-primary">
              <Plus className="w-4 h-4" />
              {captions.dashboard.welcomeHeader.actions.newTranscription}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
