import type { DesktopApi } from '@shared/ipc'
import type { AppRouteId } from './routing'
import { SettingsPage } from '@/features/settings/SettingsPage'
import NewTranscription from '@/features/new-transcription'
import Studio from '@/features/studio'
import { captions } from '@/captions'

interface AppRouteViewProps {
  activeRoute: AppRouteId
  desktop: DesktopApi
}

function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="grid h-full min-h-0 place-items-center px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold tracking-normal text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{captions.routes.overview.placeholder}</p>
      </div>
    </div>
  )
}

export function AppRouteView({ activeRoute, desktop }: AppRouteViewProps): JSX.Element {
  void desktop

  switch (activeRoute) {
    case 'new':
      return <NewTranscription />
    case 'settings':
      return <SettingsPage />
    case 'studio':
      return <Studio />
    case 'overview':
    default:
      return <PlaceholderPage title={captions.routes.overview.title} />
  }
}
