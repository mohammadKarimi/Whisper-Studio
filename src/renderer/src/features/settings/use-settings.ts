import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, SettingsApi } from '@shared/ipc'

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: null,
  defaultLanguage: 'Auto',
  defaultTask: 'transcribe',
  defaultCompute: 'auto',
  defaultOutputDirectory: null,
  defaultExportFormats: ['srt', 'txt', 'vtt', 'tsv'],
  hfToken: null
}

export function useSettings(desktop: Pick<SettingsApi, 'getSettings' | 'setSettings'>) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void desktop.getSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [desktop])

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }))
      await desktop.setSettings(patch)
    },
    [desktop]
  )

  return { settings, loading, updateSettings }
}
