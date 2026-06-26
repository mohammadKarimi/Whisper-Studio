import { useState } from 'react'
import {
  HardDrive,
  CheckCircle2,
  FileAudio,
  Cpu,
  Globe,
  RefreshCw,
  Trash2,
  Loader2
} from 'lucide-react'
import type { DownloadedWhisperModel } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/utils'
import { captions } from '@/captions'

const downloadedCaptions = captions.models.downloaded

interface DownloadedModelsProps {
  isLoading: boolean
  models: DownloadedWhisperModel[]
  onDelete: (id: string) => Promise<void>
  onRefresh: () => void
  totalSizeBytes: number
}

function formatDownloadedDate(downloadedAt: number): string {
  if (!downloadedAt) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(downloadedAt))
}

export default function DownloadedModels({
  isLoading,
  models,
  onDelete,
  onRefresh,
  totalSizeBytes
}: DownloadedModelsProps) {
  const [deletingModelIds, setDeletingModelIds] = useState<Set<string>>(() => new Set())
  const [errorByModelId, setErrorByModelId] = useState<Record<string, string>>({})

  const handleDelete = async (id: string): Promise<void> => {
    setDeletingModelIds((prev) => new Set([...prev, id]))
    setErrorByModelId((prev) => {
      const { [id]: _removed, ...rest } = prev
      void _removed
      return rest
    })

    try {
      await onDelete(id)
    } catch (error) {
      setErrorByModelId((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : String(error)
      }))
    } finally {
      setDeletingModelIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-success" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{downloadedCaptions.title}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {models.length} {downloadedCaptions.summary.suffix}{' '}
              {downloadedCaptions.summary.separator} {formatBytes(totalSizeBytes)}{' '}
              {downloadedCaptions.summary.storageSuffix}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          title={downloadedCaptions.actions.refresh}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {downloadedCaptions.actions.refresh}
        </Button>
      </div>

      <div className="space-y-2.5">
        {isLoading && models.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <FileAudio className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{downloadedCaptions.empty.loadingTitle}</p>
          </div>
        ) : models.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <FileAudio className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{downloadedCaptions.empty.title}</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              {downloadedCaptions.empty.subtitle}
            </p>
          </div>
        ) : (
          models.map((model) => (
            <div
              key={model.id}
              className="group rounded-xl border border-border/40 bg-card p-4 transition-colors hover:border-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium">{model.name}</h3>
                    <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-muted-foreground">
                      {model.precision}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> {model.params}
                    </span>
                    <span className="text-muted-foreground/30">
                      {downloadedCaptions.detailSeparator}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {model.languages}{' '}
                      {downloadedCaptions.languageSuffix}
                    </span>
                    <span className="text-muted-foreground/30">
                      {downloadedCaptions.detailSeparator}
                    </span>
                    <span>{formatBytes(model.sizeBytes)}</span>
                    <span className="text-muted-foreground/30">
                      {downloadedCaptions.detailSeparator}
                    </span>
                    <span>{formatDownloadedDate(model.downloadedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDelete(model.id)}
                    disabled={deletingModelIds.has(model.id)}
                    title={downloadedCaptions.actions.delete}
                    aria-label={downloadedCaptions.actions.delete}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    {deletingModelIds.has(model.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              {errorByModelId[model.id] && (
                <p className="mt-2 pl-14 text-[11px] leading-snug text-destructive">
                  {errorByModelId[model.id]}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
