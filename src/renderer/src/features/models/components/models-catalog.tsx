import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Loader2,
  Cpu,
  Zap,
  Star,
  Boxes,
  Languages,
  CheckCircle2,
  Trash2,
  Lock
} from 'lucide-react'
import type { DownloadedWhisperModel, WhisperModelDownloadProgress } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatBytes, secondsToDisplay } from '@/lib/utils'
import { captions } from '@/lib/strings'
import { WHISPER_CATALOG_MODELS } from '@shared/constants'

const availableCaptions = captions.models.available
const downloadedCaptions = captions.models.downloaded
const catalogCaptions = captions.models.catalog

type WhisperCatalogModel = (typeof WHISPER_CATALOG_MODELS)[number]
type ModelSpeed = WhisperCatalogModel['speed']
type FilterKey = 'all' | 'installed' | 'available'

const speedColor: Record<ModelSpeed, string> = {
  Fastest: 'text-success',
  'Very Fast': 'text-success',
  Fast: 'text-chart-2',
  Medium: 'text-warning',
  Slow: 'text-muted-foreground'
}

// A single row in the unified catalog. Catalog models and any extra downloaded
// models that are not part of the catalog are normalized into this shape.
interface CatalogEntry {
  key: string
  name: string
  repoId: string
  desc: string
  sizeLabel: string
  sizeBytes: number
  params: string
  languages: string
  speed: ModelSpeed | null
  accuracy: string | null
  recommended: boolean
  installed: DownloadedWhisperModel | null
}

interface ModelsCatalogProps {
  canDownload: boolean
  downloadProgress: Record<string, WhisperModelDownloadProgress>
  downloadedModels: DownloadedWhisperModel[]
  isCheckingRuntime: boolean
  onDelete: (id: string) => Promise<void>
  onDownload: (repoId: string) => Promise<void>
  totalSizeBytes: number
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

// Matches a downloaded model to a catalog model by name or repo segment.
function isMatch(downloaded: DownloadedWhisperModel, catalogName: string): boolean {
  const target = normalizeModelName(catalogName)
  const sourceTail = normalizeModelName(downloaded.source.split('/').at(-1) ?? downloaded.source)

  return normalizeModelName(downloaded.name) === target || sourceTail === target
}

export default function ModelsCatalog({
  canDownload,
  downloadProgress,
  downloadedModels,
  isCheckingRuntime,
  onDelete,
  onDownload,
  totalSizeBytes
}: ModelsCatalogProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [downloadingRepos, setDownloadingRepos] = useState<Set<string>>(() => new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set())
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({})
  const [speedByRepo, setSpeedByRepo] = useState<Record<string, number>>({})
  // Tracks the last reported byte count and timestamp per download so we can
  // derive an estimated transfer speed (the IPC progress payload has no rate).
  const trackerRef = useRef<Record<string, { bytes: number; time: number; speed: number }>>({})

  useEffect(() => {
    const now = Date.now()
    const next: Record<string, number> = {}
    let changed = false

    for (const [repoId, progress] of Object.entries(downloadProgress)) {
      const tracker = trackerRef.current[repoId]
      let speed = tracker?.speed ?? 0

      if (tracker && progress.downloadedBytes > tracker.bytes) {
        const deltaTime = (now - tracker.time) / 1000

        if (deltaTime > 0) {
          const instant = (progress.downloadedBytes - tracker.bytes) / deltaTime
          // Exponential smoothing keeps the displayed speed from jumping around.
          speed = tracker.speed ? tracker.speed * 0.6 + instant * 0.4 : instant
        }
      }

      trackerRef.current[repoId] = { bytes: progress.downloadedBytes, time: now, speed }

      if (progress.state === 'active' && speed > 0) {
        next[repoId] = speed
        changed = true
      }
    }

    if (changed) {
      setSpeedByRepo((prev) => ({ ...prev, ...next }))
    }
  }, [downloadProgress])

  // Build the unified catalog: every catalog model (annotated with its installed
  // state) plus any downloaded models that are not part of the catalog.
  const entries = useMemo<CatalogEntry[]>(() => {
    const matchedIds = new Set<string>()

    const fromCatalog = WHISPER_CATALOG_MODELS.map((model) => {
      const installed = downloadedModels.find((candidate) => isMatch(candidate, model.id)) ?? null

      if (installed) {
        matchedIds.add(installed.id)
      }

      return {
        key: `catalog-${model.id}`,
        name: model.id,
        repoId: model.id,
        desc: model.desc,
        sizeLabel: installed ? formatBytes(installed.sizeBytes) : model.size,
        sizeBytes: installed ? installed.sizeBytes : parseSize(model.size),
        params: installed?.params || model.params,
        languages: installed?.languages || availableCaptions.languageCount,
        speed: model.speed,
        accuracy: model.accuracy,
        recommended: model.recommended,
        installed
      } satisfies CatalogEntry
    })

    const orphans = downloadedModels
      .filter((model) => !matchedIds.has(model.id))
      .map(
        (model) =>
          ({
            key: `installed-${model.id}`,
            name: model.name,
            repoId: model.source,
            desc: '',
            sizeLabel: formatBytes(model.sizeBytes),
            sizeBytes: model.sizeBytes,
            params: model.params,
            languages: model.languages,
            speed: null,
            accuracy: null,
            recommended: false,
            installed: model
          }) satisfies CatalogEntry
      )

    return [...fromCatalog, ...orphans]
  }, [downloadedModels])

  const installedCount = entries.filter((entry) => entry.installed).length
  const availableCount = entries.length - installedCount

  const visibleEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        if (filter === 'installed') return Boolean(entry.installed)
        if (filter === 'available') return !entry.installed
        return true
      })
      .sort((a, b) => Number(b.recommended) - Number(a.recommended))
  }, [entries, filter])

  const clearError = (key: string): void => {
    setErrorByKey((prev) => {
      const { [key]: _removed, ...rest } = prev
      void _removed
      return rest
    })
  }

  const handleDownload = async (entry: CatalogEntry): Promise<void> => {
    setDownloadingRepos((prev) => new Set([...prev, entry.repoId]))
    clearError(entry.key)

    try {
      await onDownload(entry.repoId)
    } catch (error) {
      setErrorByKey((prev) => ({
        ...prev,
        [entry.key]: error instanceof Error ? error.message : String(error)
      }))
    } finally {
      setDownloadingRepos((prev) => {
        const next = new Set(prev)
        next.delete(entry.repoId)
        return next
      })
    }
  }

  const handleDelete = async (entry: CatalogEntry): Promise<void> => {
    if (!entry.installed) {
      return
    }

    const { id } = entry.installed

    setConfirmingKey(null)
    setDeletingIds((prev) => new Set([...prev, id]))
    clearError(entry.key)

    try {
      await onDelete(id)
    } catch (error) {
      setErrorByKey((prev) => ({
        ...prev,
        [entry.key]: error instanceof Error ? error.message : String(error)
      }))
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: catalogCaptions.filter.all, count: entries.length },
    { key: 'installed', label: catalogCaptions.filter.installed, count: installedCount },
    { key: 'available', label: catalogCaptions.filter.available, count: availableCount }
  ]

  const emptyMessage =
    filter === 'installed'
      ? catalogCaptions.empty.installed
      : filter === 'available'
        ? catalogCaptions.empty.available
        : catalogCaptions.empty.all

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{catalogCaptions.title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {installedCount} {downloadedCaptions.summary.suffix}{' '}
          {downloadedCaptions.summary.separator} {formatBytes(totalSizeBytes)}{' '}
          {downloadedCaptions.summary.storageSuffix}
        </p>
      </div>

      <div className="mb-4 flex w-full items-center gap-1 rounded-xl border border-border/40 bg-card p-1">
        {filterOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${
              filter === option.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            {option.label}
            <span
              className={`rounded-full px-1.5 text-[10px] font-mono ${
                filter === option.key
                  ? 'bg-primary-foreground/20'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* When the Runtime is missing, blur the catalog and overlay a hint
          instead of pushing an inline warning above the models. */}
      <div className="relative">
        {isCheckingRuntime ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/90 px-6 py-5 text-sm text-muted-foreground shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {captions.models.runtime.checking}
            </div>
          </div>
        ) : !canDownload ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/40 backdrop-blur-sm">
            <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card/90 px-6 py-5 text-center shadow-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <Lock className="h-5 w-5 text-warning" />
              </div>
              <p className="text-sm font-medium text-foreground">{availableCaptions.blockedHint}</p>
            </div>
          </div>
        ) : null}

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 ${
            canDownload && !isCheckingRuntime ? '' : 'pointer-events-none select-none'
          }`}
          aria-hidden={!canDownload || isCheckingRuntime}
        >
          {visibleEntries.length === 0 ? (
            <div className="glass-panel col-span-full rounded-2xl p-10 text-center">
              <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              {filter !== 'installed' && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {catalogCaptions.empty.subtitle}
                </p>
              )}
            </div>
          ) : (
            visibleEntries.map((entry) => {
              const isInstalled = Boolean(entry.installed)
              const isDownloading = downloadingRepos.has(entry.repoId)
              const isDeleting = entry.installed ? deletingIds.has(entry.installed.id) : false
              const progress = downloadProgress[entry.repoId]
              const downloadedBytes = progress?.downloadedBytes ?? 0
              const progressPercent =
                entry.sizeBytes > 0
                  ? Math.min(Math.round((downloadedBytes / entry.sizeBytes) * 100), 100)
                  : 0
              const speed = speedByRepo[entry.repoId] ?? 0
              const etaSeconds =
                speed > 0 && entry.sizeBytes > downloadedBytes
                  ? (entry.sizeBytes - downloadedBytes) / speed
                  : 0

              return (
                <div
                  key={entry.key}
                  className={`relative flex flex-col rounded-2xl border bg-card p-5 transition-all ${
                    isInstalled
                      ? 'border-success/30'
                      : entry.recommended
                        ? 'border-primary/30'
                        : 'border-border/40 hover:border-border/70'
                  }`}
                >
                  {entry.recommended && !isInstalled && canDownload && (
                    <div className="absolute -top-2.5 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                      <Star className="w-2.5 h-2.5" /> {availableCaptions.recommended}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold font-mono">{entry.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.sizeLabel}</p>
                    </div>
                    {isInstalled ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-success">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {catalogCaptions.installedBadge}
                      </span>
                    ) : (
                      entry.speed && (
                        <span className={`text-xs font-medium ${speedColor[entry.speed]}`}>
                          {entry.speed}
                        </span>
                      )
                    )}
                  </div>

                  {entry.desc && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                      {entry.desc}
                    </p>
                  )}

                  <div
                    className={`flex items-center gap-3 mb-4 text-xs text-muted-foreground ${
                      entry.desc ? '' : 'flex-1'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> {entry.params}
                    </span>
                    <span className="flex items-center gap-1">
                      <Languages className="w-3 h-3" /> {entry.languages}
                    </span>
                    {entry.accuracy && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {entry.accuracy}
                      </span>
                    )}
                  </div>

                  {isDownloading ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 text-xs text-primary">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {availableCaptions.actions.downloading}
                        </span>
                        {progress?.state !== 'pending' && (
                          <span className="text-xs font-mono text-primary">
                            {formatBytes(downloadedBytes)} / {entry.sizeLabel}
                          </span>
                        )}
                      </div>
                      {progress?.state === 'pending' ? (
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full w-full bg-gradient-to-r from-primary/40 to-primary rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full"
                            style={{
                              width: `${Math.max(progressPercent, downloadedBytes ? 4 : 0)}%`
                            }}
                          />
                        </div>
                      )}
                      {progress?.state !== 'pending' && speed > 0 && (
                        <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-muted-foreground">
                          <span>{formatBytes(speed)}/s</span>
                          {etaSeconds > 0 && (
                            <span>
                              {availableCaptions.etaPrefix} {secondsToDisplay(etaSeconds)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : isInstalled && entry.installed ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {entry.installed.downloadedAt
                          ? `${catalogCaptions.addedPrefix} ${formatDownloadedDate(entry.installed.downloadedAt)}`
                          : ''}
                      </span>
                      {confirmingKey === entry.key ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(entry)}
                            disabled={isDeleting}
                            className="h-8 gap-1.5 text-xs"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            {downloadedCaptions.actions.confirm}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingKey(null)}
                            disabled={isDeleting}
                            className="h-8 text-xs text-muted-foreground"
                          >
                            {downloadedCaptions.actions.cancel}
                          </Button>
                        </div>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmingKey(entry.key)}
                              disabled={isDeleting}
                              title={downloadedCaptions.actions.delete}
                              aria-label={downloadedCaptions.actions.delete}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{downloadedCaptions.actions.delete}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant={entry.recommended ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => void handleDownload(entry)}
                      disabled={!canDownload}
                      className="w-full gap-1.5 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {availableCaptions.actions.download}
                    </Button>
                  )}

                  {errorByKey[entry.key] && (
                    <p className="mt-2 text-xs leading-snug text-destructive">
                      {errorByKey[entry.key]}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
