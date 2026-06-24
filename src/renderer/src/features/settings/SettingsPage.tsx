import { captions } from '@/captions'

export function SettingsPage(): JSX.Element {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      {captions.settingsPage.title}
    </div>
  )
}
