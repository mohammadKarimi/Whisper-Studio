import { Box, Circle, Cpu, Dot, HardDrive } from 'lucide-react'
import { captions } from '@/captions'

const metricIcons = [Cpu, HardDrive, Box] as const

export function SystemStatusBar(): JSX.Element {
  return (
    <footer
      className="flex h-7 min-w-0 items-center justify-between gap-3 border-t border-sidebar-border bg-sidebar-background px-3 text-[11px] text-sidebar-foreground"
      aria-label={captions.statusBar.label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="relative flex size-2 shrink-0">
          <span className="size-2 rounded-full bg-success" />
          <span className="absolute inline-flex size-2 rounded-full bg-success opacity-60 animate-ping" />
        </span>
        <span className="truncate font-medium text-sidebar-accent-foreground">
          {captions.statusBar.ready}
        </span>
        <Dot className="size-4 shrink-0 text-sidebar-foreground/40 -mx-1" />
        <span className="font-mono text-sidebar-foreground">{captions.statusBar.idle}</span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-3 overflow-hidden">
        {captions.statusBar.metrics.map((metric, index) => {
          const MetricIcon = metricIcons[index] ?? Circle

          return (
            <div key={metric.label} className="flex min-w-0 items-center gap-1.5">
              <MetricIcon className="size-3.5 shrink-0 text-sidebar-foreground/70" />
              <span className="hidden text-sidebar-foreground/70 sm:inline">{metric.label}</span>
              <span className="truncate font-mono text-sidebar-accent-foreground/90">
                {metric.value}
              </span>
            </div>
          )
        })}
      </div>
    </footer>
  )
}
