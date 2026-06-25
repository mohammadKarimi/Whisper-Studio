import { useState } from 'react'
import {
  type LucideIcon,
  LayoutDashboard,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  AudioLines
} from 'lucide-react'

import type { AppRouteId } from '@/app/routing'
import { captions } from '@/captions'

const navIcons = {
  overview: LayoutDashboard,
  new: AudioLines,
  settings: Settings,
  studio: LayoutDashboard
} satisfies Record<AppRouteId, LucideIcon>

const navSections = captions.sidebar.sections.map((section) => ({
  ...section,
  items: section.items.map((item) => ({ ...item, icon: navIcons[item.routeId] }))
})) satisfies Array<{
  title: string
  items: Array<{ icon: LucideIcon; label: string; routeId: AppRouteId }>
}>

interface AppSidebarProps {
  activeRoute: AppRouteId
  onNavigate: (routeId: AppRouteId) => void
}

export function AppSidebar({ activeRoute, onNavigate }: AppSidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`shell-sidebar h-full flex flex-col bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border shrink-0 transition-[width] duration-200 ${
        collapsed ? 'w-[60px]' : 'w-[240px]'
      }`}
    >
      {/* Search / Command */}
      <div className="px-3 pt-3 pb-2">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full h-8 flex items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground" />
            <input
              placeholder={captions.sidebar.searchPlaceholder}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-sidebar-accent border border-sidebar-border text-[12px] text-sidebar-accent-foreground placeholder:text-sidebar-foreground/50 outline-none focus:border-sidebar-ring transition-colors"
            />
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
                return (
                  <button
                    key={item.routeId}
                    onClick={() => onNavigate(item.routeId)}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] font-medium transition-all duration-150 group
                      ${
                        isActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary'
                          : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                      }
                      ${collapsed ? 'items-center justify-center' : ''}`}
                  >
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-sidebar-primary'
                          : 'text-sidebar-foreground group-hover:text-sidebar-accent-foreground'
                      } transition-colors`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + collapse */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-0.5">
        <button
          onClick={() => onNavigate('settings')}
          title={captions.sidebar.settings}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors ${
            collapsed ? 'justify-center w-full' : 'flex-1'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{captions.sidebar.settings}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? captions.sidebar.expand : captions.sidebar.collapse}
          className="p-2 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
