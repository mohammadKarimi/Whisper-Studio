import type { MouseEvent } from 'react'
import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import type { DesktopPlatform } from '@shared/ipc'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import logoUrl from '../logo.svg'
import { captions } from '@/lib/strings'
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
    'h-full w-full rounded-none text-muted-foreground [-webkit-app-region:no-drag] hover:bg-muted hover:text-foreground flex items-center justify-center'

  return (
    <header
      className={cn(
        'shell-titlebar flex h-[2.375rem] items-center border-b border-border bg-titlebar pl-3 [-webkit-app-region:drag]',
        platform === 'darwin' && 'pl-20'
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
        <img src={logoUrl} className="size-4 shrink-0" alt="" aria-hidden="true" />
        <span className="truncate">{appName}</span>
      </div>

      <div className="min-w-0 flex-1" />

      <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground/50 md:flex">
        <span className="rounded bg-secondary/40 px-2 py-0.5 font-mono">
          {captions.titleBar.workspace}
        </span>
      </div>

      <div className="min-w-0 flex-1" />

      <div
        className="grid h-full grid-cols-[repeat(3,2.875rem)] [-webkit-app-region:no-drag]"
        aria-label={captions.titleBar.windowControls}
      >
        <Tooltip>
          <TooltipTrigger
            className={cn(windowButtonClass, 'rounded-none')}
            onClick={(event) => runWindowAction(event, onMinimize)}
          >
            <Minus className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{captions.titleBar.minimize}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            className={cn(windowButtonClass, 'rounded-none')}
            onClick={(event) => runWindowAction(event, onMaximize)}
          >
            {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isMaximized ? captions.titleBar.restore : captions.titleBar.maximize}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            className={cn(windowButtonClass, 'rounded-none hover:bg-destructive hover:text-white')}
            onClick={(event) => runWindowAction(event, onClose)}
          >
            <X className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{captions.titleBar.close}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
