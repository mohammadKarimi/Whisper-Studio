import * as React from 'react'

import { captions } from '@/captions'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange?: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps {
  children: React.ReactNode
  value: string
  onValueChange?: (value: string) => void
}

function Tabs({ children, value, onValueChange }: TabsProps): JSX.Element {
  return <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
}

function useTabs(): TabsContextValue {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error(captions.errors.tabsContext)
  }

  return context
}

function TabsList({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center rounded-lg bg-secondary p-1', className)}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ComponentProps<'button'> {
  value: string
}

function TabsTrigger({ className, value, onClick, ...props }: TabsTriggerProps): JSX.Element {
  const tabs = useTabs()
  const isActive = tabs.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          tabs.onValueChange?.(value)
        }
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground',
        className
      )}
      {...props}
    />
  )
}

interface TabsContentProps extends React.ComponentProps<'div'> {
  value: string
}

function TabsContent({ children, value, ...props }: TabsContentProps): JSX.Element | null {
  const tabs = useTabs()

  if (tabs.value !== value) {
    return null
  }

  return <div {...props}>{children}</div>
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
