import type { DesktopApi } from '@shared/ipc'
import type { AppRouteId } from './routing'
import { SettingsPage } from '@/features/settings/settings-page'
import NewTranscription from '@/features/new-transcription'
import Studio from '@/features/studio'
import Export from '@/features/export'
import Dashboard from '@/features/dashboard'
import Models from '@/features/models'

interface AppRouteViewProps {
  activeRoute: AppRouteId
  desktop: DesktopApi
}

export function AppRouteView({ activeRoute, desktop }: AppRouteViewProps): JSX.Element {
  switch (activeRoute) {
    case 'new':
      return <NewTranscription desktop={desktop} />
    case 'settings':
      return <SettingsPage desktop={desktop} />
    case 'studio':
      return <Studio desktop={desktop} />
    case 'export':
      return <Export desktop={desktop} />
    case 'models':
      return <Models desktop={desktop} />
    case 'dashboard':
    default:
      return <Dashboard desktop={desktop} />
  }
}
