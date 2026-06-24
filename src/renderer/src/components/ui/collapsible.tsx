import * as React from 'react'
import { captions } from '@/captions'

interface CollapsibleContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null)

interface CollapsibleProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Collapsible({ children, open = false, onOpenChange }: CollapsibleProps): JSX.Element {
  const [internalOpen, setInternalOpen] = React.useState(open)
  const isControlled = onOpenChange !== undefined
  const currentOpen = isControlled ? open : internalOpen

  function setOpen(nextOpen: boolean): void {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  return (
    <CollapsibleContext.Provider value={{ open: currentOpen, setOpen }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

function useCollapsible(): CollapsibleContextValue {
  const context = React.useContext(CollapsibleContext)

  if (!context) {
    throw new Error(captions.errors.collapsibleContext)
  }

  return context
}

function CollapsibleTrigger({
  children,
  onClick,
  ...props
}: React.ComponentProps<'button'>): JSX.Element {
  const { open, setOpen } = useCollapsible()

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          setOpen(!open)
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function CollapsibleContent({
  children,
  ...props
}: React.ComponentProps<'div'>): JSX.Element | null {
  const { open } = useCollapsible()

  if (!open) {
    return null
  }

  return <div {...props}>{children}</div>
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
