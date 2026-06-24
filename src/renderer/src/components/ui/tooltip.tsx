import * as React from 'react'

import { captions } from '@/captions'
import { cn } from '@/lib/utils'

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function TooltipProvider({ children }: { children: React.ReactNode }): JSX.Element {
  return <>{children}</>
}

function Tooltip({ children }: { children: React.ReactNode }): JSX.Element {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  )
}

function useTooltip(): TooltipContextValue {
  const context = React.useContext(TooltipContext)

  if (!context) {
    throw new Error(captions.errors.tooltipContext)
  }

  return context
}

function TooltipTrigger({ children, ...props }: React.ComponentProps<'button'>): JSX.Element {
  const { setOpen } = useTooltip()

  return (
    <button
      type="button"
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  )
}

interface TooltipContentProps extends React.ComponentProps<'div'> {
  side?: 'top' | 'right' | 'bottom' | 'left'
}

function TooltipContent({
  children,
  className,
  side = 'top',
  ...props
}: TooltipContentProps): JSX.Element | null {
  const { open } = useTooltip()

  if (!open) {
    return null
  }

  const sideClass = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
    bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2'
  }[side]

  return (
    <div
      className={cn(
        'absolute z-50 rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md',
        sideClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
