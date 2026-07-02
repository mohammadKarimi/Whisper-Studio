import type { ReactNode } from 'react'

interface SettingsCardProps {
  icon: ReactNode
  title: string
  children: ReactNode
}

export function SettingsCard({ icon, title, children }: SettingsCardProps): JSX.Element {
  return (
    <div className="overflow-visible rounded-2xl border border-border/40 bg-card">
      <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-4">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  )
}
