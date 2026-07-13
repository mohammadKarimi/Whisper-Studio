import { useCallback, useEffect, useState } from 'react'
import type { AppApi, PrerequisiteCheckId, PrerequisiteInstallProgress } from '@shared/ipc'
import { captions } from '@/lib/strings'
import type { PrerequisiteItem } from './prerequisite-card'

const prerequisitesCaptions = captions.models.prerequisites

const initialItems: PrerequisiteItem[] = prerequisitesCaptions.items.map((item) => ({
  ...item,
  error: null,
  installed: null,
  detail: null,
  status: 'checking'
}))

export function usePrerequisites(desktop: AppApi) {
  const [items, setItems] = useState<PrerequisiteItem[]>(() =>
    initialItems.map((item) => ({ ...item }))
  )
  const [isChecking, setIsChecking] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [installProgress, setInstallProgress] = useState<
    Record<string, PrerequisiteInstallProgress>
  >({})

  const refreshPrerequisites = useCallback(async (): Promise<void> => {
    setIsChecking(true)
    setItems((prev) => prev.map((item) => ({ ...item, error: null, status: 'checking' })))

    try {
      const checks = await desktop.getPrerequisites()

      setItems((prev) =>
        prev.map((item) => {
          const check = checks.find((c) => c.id === item.id)

          return {
            ...item,
            error: null,
            installed: check?.installed ?? null,
            detail: check?.detail ?? null,
            status: check?.status ?? 'missing'
          }
        })
      )
    } finally {
      setIsChecking(false)
    }
  }, [desktop])

  const handleInstall = useCallback(
    async (id: PrerequisiteCheckId): Promise<void> => {
      setInstallProgress((prev) => ({ ...prev, [id]: { id, line: '' } }))
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, error: null, status: 'installing' } : item))
      )

      const result = await desktop.installPrerequisite(id)

      setInstallProgress((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      // Always refresh to restore the actual system status regardless of outcome.
      // This prevents stale 'missing' status after a partial success (e.g. CUDA packages
      // installed but GPU not yet accessible) or after 'action: opened' (browser launched).
      await refreshPrerequisites()

      // Overlay the error message on top of the refreshed status so the user
      // can read what went wrong while the card still reflects the real state.
      // Exception: if the refreshed item already has a `detail` that explains
      // the current situation (e.g. CUDA detected but torch is CPU-only), skip
      // setting the stale install error — it would only duplicate/contradict it.
      if (!result.ok) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item
            if (item.detail) return item
            return { ...item, error: result.stderr || prerequisitesCaptions.installFailed }
          })
        )
      }
    },
    [desktop, refreshPrerequisites]
  )

  useEffect(() => {
    void refreshPrerequisites()
  }, [refreshPrerequisites])

  useEffect(() => {
    return desktop.onPrerequisiteInstallProgress((progress) => {
      setInstallProgress((prev) => ({ ...prev, [progress.id]: progress }))
    })
  }, [desktop])

  // Unsupported items (e.g. CUDA on macOS) are excluded from the visible grid.
  // When CUDA is detected (ok or attention) the CUDA installer manages torch;
  // showing a separate plain-CPU torch card would be confusing and misleading.
  const cudaItem = items.find((item) => item.id === 'cuda')
  const cudaSupported =
    cudaItem?.status === 'ok' ||
    cudaItem?.status === 'attention' ||
    cudaItem?.status === 'installing'
  const visibleItems = items.filter(
    (item) => item.status !== 'unsupported' && !(item.id === 'torch' && cudaSupported)
  )
  const installedCount = visibleItems.filter((p) => p.status === 'ok').length
  const isInstalling = items.some((item) => item.status === 'installing')
  const isBusy = isChecking || isInstalling
  const pythonOk = items.find((item) => item.id === 'python')?.status === 'ok'
  const whisperOk = items.find((item) => item.id === 'whisperx')?.status === 'ok'
  const torchOk = items.find((item) => item.id === 'torch')?.status === 'ok'
  const fixableItems = visibleItems.filter(
    (item) => item.status === 'missing' || item.status === 'attention'
  )
  const hasProblems = fixableItems.length > 0
  const showDetails = expanded || hasProblems || isBusy

  // Install all fixable items in dependency order. When CUDA will be installed
  // its installer also handles torch (with CUDA index URL), so torch is skipped.
  const handleFixAll = useCallback(async (): Promise<void> => {
    const order: PrerequisiteCheckId[] = ['python', 'ffmpeg', 'torch', 'whisperx', 'cuda']
    const cudaItem = items.find((c) => c.id === 'cuda')
    const cudaWillBeInstalled =
      cudaItem &&
      cudaItem.status !== 'unsupported' &&
      (cudaItem.status === 'missing' || cudaItem.status === 'attention')

    for (const id of order) {
      if (id === 'torch' && cudaWillBeInstalled) continue

      const item = items.find((c) => c.id === id)

      if (item && (item.status === 'missing' || item.status === 'attention')) {
        await handleInstall(id)
      }
    }
  }, [items, handleInstall])

  return {
    items,
    visibleItems,
    isChecking,
    isBusy,
    expanded,
    setExpanded,
    installProgress,
    installedCount,
    pythonOk,
    whisperOk,
    torchOk,
    hasProblems,
    showDetails,
    refreshPrerequisites,
    handleInstall,
    handleFixAll
  }
}
