import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { captions } from '@/lib/strings'
import { cn } from '@/lib/utils'

interface SelectContextValue {
  open: boolean
  selectedLabel: React.ReactNode
  setOpen: (open: boolean) => void
  setSelectedLabel: (label: React.ReactNode) => void
  onValueChange?: (value: string) => void
  value: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

interface SelectProps {
  children: React.ReactNode
  value: string
  onValueChange?: (value: string) => void
}

function Select({ children, value, onValueChange }: SelectProps): JSX.Element {
  const [open, setOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(value)

  return (
    <SelectContext.Provider
      value={{ open, selectedLabel, setOpen, setSelectedLabel, onValueChange, value }}
    >
      <div className={cn('relative inline-block', open && 'z-[9999]')}>{children}</div>
    </SelectContext.Provider>
  )
}

function useSelect(): SelectContextValue {
  const context = React.useContext(SelectContext)

  if (!context) {
    throw new Error(captions.errors.selectContext)
  }

  return context
}

function SelectTrigger({
  children,
  className,
  onClick,
  ...props
}: React.ComponentProps<'button'>): JSX.Element {
  const { open, setOpen } = useSelect()

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
      className={cn(
        'flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        className
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function SelectValue(): JSX.Element {
  const { selectedLabel } = useSelect()

  return <>{selectedLabel}</>
}

function SelectContent({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>): JSX.Element | null {
  const { open } = useSelect()

  if (!open) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute right-0 z-[9999] mt-1 max-h-72 min-w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SelectItemProps extends React.ComponentProps<'button'> {
  value: string
}

function SelectItem({
  children,
  className,
  value,
  onClick,
  ...props
}: SelectItemProps): JSX.Element {
  const select = useSelect()
  const selected = select.value === value

  React.useEffect(() => {
    if (selected) {
      select.setSelectedLabel(children)
    }
  }, [children, select, selected])

  return (
    <button
      type="button"
      data-state={selected ? 'checked' : 'unchecked'}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          select.setSelectedLabel(children)
          select.onValueChange?.(value)
          select.setOpen(false)
        }
      }}
      className={cn(
        'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-accent',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
