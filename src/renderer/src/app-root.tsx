import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AppRouteView } from './app/app-route-view'
import { useAppRoute } from './app/use-app-route'
import { useDesktopShell } from './app/use-desktop-shell'
import { AppSidebar } from './components/app-sidebar'
import { SystemStatusBar } from './components/system-status-bar'
import { TitleBar } from './components/title-bar'
import { captions } from './lib/strings'
import { StudioProvider } from './lib/studio-context'

// ---------------------------------------------------------------------------
// Error boundary — catches render-time and lifecycle errors in route views.
// Hand-rolled to avoid adding a dependency on react-error-boundary.
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <p className="text-sm font-medium text-destructive">Something went wrong</p>
          <p className="text-xs text-muted-foreground max-w-sm">{this.state.error.message}</p>
          <button
            onClick={this.reset}
            className="text-xs underline text-muted-foreground hover:text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ---------------------------------------------------------------------------

export function App(): JSX.Element {
  const { appInfo, desktop, isWindowMaximized, platform, systemStatus } = useDesktopShell()
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
          <StudioProvider>
            <ErrorBoundary>
              <AppRouteView activeRoute={activeRoute} desktop={desktop} />
            </ErrorBoundary>
          </StudioProvider>
        </main>
      </div>

      <SystemStatusBar status={systemStatus} />
    </div>
  )
}
