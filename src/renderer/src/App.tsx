import { AppRouteView } from './app/AppRouteView'
import { useAppRoute } from './app/useAppRoute'
import { useDesktopShell } from './app/useDesktopShell'
import { AppSidebar } from './components/AppSidebar'
import { SystemStatusBar } from './components/SystemStatusBar'
import { TitleBar } from './components/TitleBar'
import { captions } from './captions'

export function App(): JSX.Element {
  const { appInfo, desktop, isWindowMaximized, platform } = useDesktopShell()
  const { activeRoute, navigateTo } = useAppRoute()

  return (
    <div className="grid h-screen min-h-0 w-screen grid-rows-[2.375rem_minmax(0,1fr)_1.75rem] overflow-hidden bg-background text-foreground">
      <TitleBar
        appName={appInfo?.name ?? captions.app.defaultName}
        isMaximized={isWindowMaximized}
        platform={platform}
        onMinimize={desktop.windowControls.minimize}
        onMaximize={desktop.windowControls.maximize}
        onClose={desktop.windowControls.close}
      />

      <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] overflow-hidden">
        <AppSidebar activeRoute={activeRoute} onNavigate={navigateTo} />
        <main className="shell-main min-h-0 overflow-x-hidden overflow-y-auto bg-background">
          <AppRouteView activeRoute={activeRoute} desktop={desktop} />
        </main>
      </div>

      <SystemStatusBar />
    </div>
  )
}
