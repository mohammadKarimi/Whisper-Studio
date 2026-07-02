import type { ReactNode } from 'react'

interface AboutLinkCardProps {
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
}

export function AboutLinkCard({
  icon,
  label,
  description,
  onClick
}: AboutLinkCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-4 text-center transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
    >
      <span className="text-muted-foreground transition-colors group-hover:text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground/70">{description}</p>
      </div>
    </button>
  )
}
