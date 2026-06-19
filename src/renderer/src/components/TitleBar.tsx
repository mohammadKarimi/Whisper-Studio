import type { MouseEvent } from 'react'
import { AppWindow, Maximize2, Minimize2, Minus, X } from 'lucide-react'
import type { DesktopPlatform } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TitleBarProps {
  appName: string
  isMaximized: boolean
  platform: DesktopPlatform
  onMinimize: () => Promise<void>
  onMaximize: () => Promise<void>
  onClose: () => Promise<void>
}

export function TitleBar({
  appName,
  isMaximized,
  platform,
  onMinimize,
  onMaximize,
  onClose
}: TitleBarProps): JSX.Element {
  function runWindowAction(
    event: MouseEvent<HTMLButtonElement>,
    action: () => Promise<void>
  ): void {
    event.preventDefault()
    event.stopPropagation()
    void action()
  }

  const windowButtonClass =
    'h-full w-full rounded-none text-muted-foreground [-webkit-app-region:no-drag] hover:bg-accent hover:text-foreground'

  return (
    <header
      className={cn(
        'flex h-[2.375rem] items-center border-b border-border bg-card pl-3 [-webkit-app-region:drag]',
        platform === 'darwin' && 'pl-20'
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
        <AppWindow className="size-4 shrink-0" />
        <span className="truncate">{appName}</span>
      </div>

      <div className="min-w-0 flex-1" />

      <div
        className="grid h-full grid-cols-[repeat(3,2.875rem)] [-webkit-app-region:no-drag]"
        aria-label="Window controls"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={windowButtonClass}
          onClick={(event) => runWindowAction(event, onMinimize)}
          title="Minimize"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={windowButtonClass}
          onClick={(event) => runWindowAction(event, onMaximize)}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            windowButtonClass,
            'hover:bg-destructive hover:text-white'
          )}
          onClick={(event) => runWindowAction(event, onClose)}
          title="Close"
        >
          <X className="size-4" />
        </Button>
      </div>
    </header>
  )
}
