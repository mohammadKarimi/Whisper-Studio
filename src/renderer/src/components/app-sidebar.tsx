import { useEffect, useState } from 'react'
import {
  type LucideIcon,
  LayoutDashboard,
  Settings,
  Search,
  AudioLines,
  Moon,
  Sun,
  Brain,
  PanelRight,
  PanelLeft,
  Bug
} from 'lucide-react'

import type { AppRouteId } from '@/app/routing'
import { captions } from '@/lib/strings'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const navIcons = {
  dashboard: LayoutDashboard,
  new: AudioLines,
  settings: Settings,
  studio: LayoutDashboard,
  export: LayoutDashboard,
  models: Brain
} satisfies Record<AppRouteId, LucideIcon>

const navSections = captions.sidebar.sections.map((section) => ({
  ...section,
  items: section.items.map((item) => ({ ...item, icon: navIcons[item.routeId] }))
})) satisfies Array<{
  title: string
  items: Array<{ icon: LucideIcon; label: string; routeId: AppRouteId }>
}>

type ThemeMode = 'dark' | 'light'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

interface AppSidebarProps {
  activeRoute: AppRouteId
  onNavigate: (routeId: AppRouteId) => void
}

export function AppSidebar({ activeRoute, onNavigate }: AppSidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(true)
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const isLightTheme = theme === 'light'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <aside
      className={`shell-sidebar h-full flex flex-col bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border shrink-0 transition-[width] duration-200 ${
        collapsed ? 'w-[60px]' : 'w-[240px]'
      }`}
    >
      {/* Search / Command */}
      <div className="px-3 pt-3 pb-2">
        {collapsed ? (
          <Tooltip className="w-full">
            <TooltipTrigger
              onClick={() => setCollapsed(false)}
              className="w-full h-8 flex items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </TooltipTrigger>
            <TooltipContent side="right">{captions.sidebar.expand}</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground" />
              <input
                placeholder={captions.sidebar.searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-sidebar-accent border border-sidebar-border text-[12px] text-sidebar-accent-foreground placeholder:text-sidebar-foreground/50 outline-none focus:border-sidebar-ring transition-colors"
              />
            </div>
            <Tooltip>
              <TooltipTrigger
                onClick={() => setCollapsed(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shrink-0"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom">{captions.sidebar.collapse}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-3">
            {!collapsed && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeRoute === item.routeId
                const btnClass = `relative flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] font-medium transition-all duration-150 group
                      ${
                        isActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary'
                          : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                      }
                      ${collapsed ? 'justify-center' : ''}`
                const iconClass = `w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-sidebar-primary'
                    : 'text-sidebar-foreground group-hover:text-sidebar-accent-foreground'
                } transition-colors`

                if (collapsed) {
                  return (
                    <Tooltip key={item.routeId} className="w-full">
                      <TooltipTrigger onClick={() => onNavigate(item.routeId)} className={btnClass}>
                        <item.icon className={iconClass} />
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  )
                }

                return (
                  <button
                    key={item.routeId}
                    onClick={() => onNavigate(item.routeId)}
                    className={btnClass}
                  >
                    <item.icon className={iconClass} />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme */}
      <div className="px-3 pt-1 pb-1">
        {collapsed ? (
          <Tooltip className="w-full">
            <TooltipTrigger
              onClick={() => setTheme(isLightTheme ? 'dark' : 'light')}
              aria-pressed={isLightTheme}
              className="flex w-full justify-center px-3 py-2 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
            >
              {isLightTheme ? (
                <Moon className="w-4 h-4 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 shrink-0" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {isLightTheme
                ? captions.sidebar.theme.switchToDark
                : captions.sidebar.theme.switchToLight}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setTheme(isLightTheme ? 'dark' : 'light')}
            aria-pressed={isLightTheme}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
          >
            {isLightTheme ? (
              <Moon className="w-4 h-4 shrink-0" />
            ) : (
              <Sun className="w-4 h-4 shrink-0" />
            )}
            <span>{isLightTheme ? captions.sidebar.theme.light : captions.sidebar.theme.dark}</span>
          </button>
        )}
      </div>

      {/* Settings + Report a Bug */}

      <div className="px-3 pb-1 pt-1">
        {collapsed ? (
          <Tooltip className="w-full">
            <TooltipTrigger
              onClick={() =>
                void window.desktop?.openExternal(
                  'https://github.com/mohammadKarimi/Whisper-Studio/issues'
                )
              }
              className="flex w-full justify-center px-3 py-2 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Bug className="w-4 h-4 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right">{captions.sidebar.reportBug}</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <button
              onClick={() =>
                void window.desktop?.openExternal(
                  'https://github.com/mohammadKarimi/Whisper-Studio/issues'
                )
              }
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Bug className="w-4 h-4 shrink-0" />
              <span>{captions.sidebar.reportBug}</span>
            </button>
          </>
        )}
      </div>

      <div className="px-3 pb-1 pt-1">
        {collapsed ? (
          <>
            <Tooltip className="w-full">
              <TooltipTrigger
                onClick={() => onNavigate('settings')}
                className="flex w-full justify-center px-3 py-2 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right">{captions.sidebar.settings}</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <button
              onClick={() => onNavigate('settings')}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>{captions.sidebar.settings}</span>
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
