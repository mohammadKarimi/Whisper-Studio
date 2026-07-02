import type { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  description?: ReactNode
  badge?: string
  last?: boolean
  children: ReactNode
}

export function SettingRow({
  label,
  description,
  badge,
  last = false,
  children
}: SettingRowProps): JSX.Element {
  return (
    <div
      className={`flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
        !last ? 'border-b border-border/40' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {badge && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
