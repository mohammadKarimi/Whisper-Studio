import type { DesktopApi } from '@shared/ipc'
import type { AppRouteId } from './routing'
import { SettingsPage } from '@/features/settings/settings-page'
import NewTranscription from '@/features/new-transcription'
import Studio from '@/features/studio'
import Export from '@/features/export'
import Dashboard from '@/features/dashboard'

interface AppRouteViewProps {
  activeRoute: AppRouteId
  desktop: DesktopApi
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
    case 'export':
      return <Export />
    case 'dashboard':
    default:
      return <Dashboard />
  }
}
