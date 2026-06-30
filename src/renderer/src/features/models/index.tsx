import { useCallback, useEffect, useState } from 'react'
import { Boxes, HardDrive, Cpu } from 'lucide-react'
import type {
  AppApi,
  ModelApi,
  DownloadedWhisperModelsResult,
  WhisperModelDownloadProgress
} from '@shared/ipc'
import { formatBytes } from '@/lib/utils'
import { captions } from '@/lib/strings'
import ModelsCatalog from './components/models-catalog'
import Prerequisites from './components/prerequisites'

interface ModelsProps {
  desktop: AppApi & ModelApi
}

export default function Models({ desktop }: ModelsProps) {
  const modelsCaptions = captions.models
  const [prerequisitesReady, setPrerequisitesReady] = useState(false)
  const [downloadedModels, setDownloadedModels] = useState<DownloadedWhisperModelsResult>({
    models: [],
    totalSizeBytes: 0
  })
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, WhisperModelDownloadProgress>
  >({})
  const [isLoadingDownloadedModels, setIsLoadingDownloadedModels] = useState(true)

  const refreshDownloadedModels = useCallback(async (): Promise<void> => {
    setIsLoadingDownloadedModels(true)

    try {
      setDownloadedModels(await desktop.getDownloadedModels())
    } finally {
      setIsLoadingDownloadedModels(false)
    }
  }, [desktop])

  const deleteDownloadedModel = useCallback(
    async (id: string): Promise<void> => {
      const result = await desktop.deleteModel(id)

      if (!result.ok) {
        throw new Error(result.stderr || 'Failed to delete model')
      }

      await refreshDownloadedModels()
    },
    [desktop, refreshDownloadedModels]
  )

  const downloadAvailableModel = useCallback(
    async (repoId: string): Promise<void> => {
      const result = await desktop.downloadModel(repoId)

      if (!result.ok) {
        throw new Error(result.stderr || 'Failed to download model')
      }

      await refreshDownloadedModels()
    },
    [desktop, refreshDownloadedModels]
  )

  useEffect(() => {
    void refreshDownloadedModels()
  }, [refreshDownloadedModels])

  useEffect(() => {
    return desktop.onModelDownloadProgress((progress) => {
      setDownloadProgress((prev) => ({ ...prev, [progress.repoId]: progress }))
    })
  }, [desktop])

  const downloadedCount = downloadedModels.models.length

  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              {modelsCaptions.header.eyebrow}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{modelsCaptions.header.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{modelsCaptions.header.subtitle}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-card">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {modelsCaptions.header.modelsLabel}
              </p>
              <p className="text-xs font-mono font-semibold">
                {downloadedCount} {modelsCaptions.header.modelCountSuffix}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-card">
            <HardDrive className="w-3.5 h-3.5 text-success" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {modelsCaptions.header.storageLabel}
              </p>
              <p className="text-xs font-mono font-semibold">
                {downloadedModels.totalSizeBytes === 0
                  ? captions.models.header.emptyStorageValue
                  : formatBytes(downloadedModels.totalSizeBytes)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Prerequisites desktop={desktop} onReadyChange={setPrerequisitesReady} />
      <ModelsCatalog
        canDownload={prerequisitesReady}
        downloadProgress={downloadProgress}
        downloadedModels={downloadedModels.models}
        isLoading={isLoadingDownloadedModels}
        onDelete={deleteDownloadedModel}
        onDownload={downloadAvailableModel}
        onRefresh={() => void refreshDownloadedModels()}
        totalSizeBytes={downloadedModels.totalSizeBytes}
      />
    </div>
  )
}
