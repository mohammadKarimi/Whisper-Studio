import { useState } from 'react'
import { Download, Loader2, Cpu, Zap, Star, Boxes, Languages } from 'lucide-react'
import type { DownloadedWhisperModel, WhisperModelDownloadProgress } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/utils'
import { captions } from '@/lib/strings'

const availableCaptions = captions.models.available
type AvailableModel = (typeof availableCaptions.items)[number]
type AvailableModelId = AvailableModel['id']

const speedColor: Record<AvailableModel['speed'], string> = {
  Fastest: 'text-success',
  'Very Fast': 'text-success',
  Fast: 'text-chart-2',
  Medium: 'text-warning',
  Slow: 'text-muted-foreground'
}

interface AvailableModelsProps {
  canDownload: boolean
  downloadProgress: Record<string, WhisperModelDownloadProgress>
  downloadedModels: DownloadedWhisperModel[]
  onDownload: (repoId: string) => Promise<void>
}

function normalizeModelName(value: string): string {
  return value.toLowerCase()
}

function parseSize(size: string): number {
  const match = size.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i)

  if (!match) {
    return 0
  }

  const value = Number(match[1])
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4
  }

  return value * multipliers[unit]
}

export default function AvailableModels({
  canDownload,
  downloadProgress,
  downloadedModels,
  onDownload
}: AvailableModelsProps) {
  const [downloading, setDownloading] = useState<Set<AvailableModelId>>(() => new Set())
  const [errorByModelId, setErrorByModelId] = useState<Partial<Record<AvailableModelId, string>>>(
    {}
  )
  const downloadedModelNames = new Set(
    downloadedModels.flatMap((model) => [
      normalizeModelName(model.name),
      normalizeModelName(model.source.split('/').at(-1) ?? model.source)
    ])
  )
  const availableModels = availableCaptions.items.filter(
    (model) => !downloadedModelNames.has(normalizeModelName(model.name))
  )

  const handleDownload = async (model: AvailableModel): Promise<void> => {
    setDownloading((prev) => new Set([...prev, model.id]))
    setErrorByModelId((prev) => {
      const { [model.id]: _removed, ...rest } = prev
      void _removed
      return rest
    })

    try {
      await onDownload(model.repoId)
    } catch (error) {
      setErrorByModelId((prev) => ({
        ...prev,
        [model.id]: error instanceof Error ? error.message : String(error)
      }))
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(model.id)
        return next
      })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{availableCaptions.title}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{availableCaptions.subtitle}</p>
        </div>
      </div>

      {!canDownload && (
        <p className="mb-4 text-[11px] leading-snug text-warning">{availableCaptions.blockedHint}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModels.length === 0 ? (
          <div className="glass-panel col-span-full rounded-2xl p-10 text-center">
            <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{availableCaptions.empty.title}</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              {availableCaptions.empty.subtitle}
            </p>
          </div>
        ) : (
          availableModels.map((model) => {
            const isDownloading = downloading.has(model.id)
            const progress = downloadProgress[model.repoId]
            const expectedSizeBytes = parseSize(model.size)
            const downloadedBytes = progress?.downloadedBytes ?? 0
            const progressPercent =
              expectedSizeBytes > 0
                ? Math.min(Math.round((downloadedBytes / expectedSizeBytes) * 100), 100)
                : 0
            return (
              <div
                key={model.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-5 transition-all ${
                  model.recommended
                    ? 'border-primary/30'
                    : 'border-border/40 hover:border-border/70'
                }`}
              >
                {model.recommended && (
                  <div className="absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                    <Star className="w-2.5 h-2.5" /> {availableCaptions.recommended}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[14px] font-semibold font-mono">{model.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{model.size}</p>
                  </div>
                  <span className={`text-[10px] font-medium ${speedColor[model.speed]}`}>
                    {model.speed}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1">
                  {model.desc}
                </p>

                <div className="flex items-center gap-3 mb-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {model.params}
                  </span>
                  <span className="flex items-center gap-1">
                    <Languages className="w-3 h-3" /> {availableCaptions.languageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {model.accuracy}
                  </span>
                </div>

                {isDownloading ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] text-primary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {availableCaptions.actions.downloading}
                      </span>
                      <span className="text-[11px] font-mono text-primary">
                        {formatBytes(downloadedBytes)} / {model.size}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full"
                        style={{ width: `${Math.max(progressPercent, downloadedBytes ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant={model.recommended ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => void handleDownload(model)}
                    disabled={!canDownload}
                    className="w-full gap-1.5 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {availableCaptions.actions.download}
                  </Button>
                )}
                {errorByModelId[model.id] && (
                  <p className="mt-2 text-[11px] leading-snug text-destructive">
                    {availableCaptions.actions.downloadFailed}: {errorByModelId[model.id]}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
