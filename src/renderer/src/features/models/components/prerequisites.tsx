import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  RefreshCw,
  Cpu,
  Code2,
  Video,
  Package,
  Download,
  Ban,
  ChevronDown,
  Wrench
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  AppApi,
  PrerequisiteCheckId,
  PrerequisiteCheckStatus,
  PrerequisiteInstallProgress
} from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { formatBytes, secondsToDisplay } from '@/lib/utils'
import { captions } from '@/lib/strings'

const prerequisitesCaptions = captions.models.prerequisites
type PrerequisiteId = (typeof prerequisitesCaptions.items)[number]['id']
type PrerequisiteStatus = PrerequisiteCheckStatus | 'checking'
type PrerequisiteUiStatus = PrerequisiteStatus | 'installing'
type PrerequisiteItem = {
  error: string | null
  id: PrerequisiteId
  name: string
  required: string
  installed: string | null
  status: PrerequisiteUiStatus
  detail: string | null
  desc: string
}

interface PrerequisitesProps {
  desktop: AppApi
  onReadyChange?: (ready: boolean) => void
}

const prerequisiteIcons: Record<PrerequisiteId, LucideIcon> = {
  python: Code2,
  ffmpeg: Video,
  cuda: Cpu,
  'openai-whisper': Package,
  torch: Terminal
}
// Prerequisites that require a working Python installation before they can be installed.
const pythonDependentIds = new Set<PrerequisiteId>(['openai-whisper', 'torch', 'cuda'])

const statusConfig = {
  ok: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    label: prerequisitesCaptions.status.ok
  },
  missing: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: prerequisitesCaptions.status.missing
  },
  checking: {
    icon: Loader2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: prerequisitesCaptions.status.checking
  },
  installing: {
    icon: Loader2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: prerequisitesCaptions.status.installing
  },
  unsupported: {
    icon: Ban,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    label: prerequisitesCaptions.status.unsupported
  },
  attention: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: prerequisitesCaptions.status.attention
  }
} satisfies Record<
  PrerequisiteUiStatus,
  { icon: LucideIcon; color: string; bg: string; label: string }
>

const initialItems = prerequisitesCaptions.items.map((item) => ({
  ...item,
  error: null,
  installed: null,
  detail: null,
  status: 'checking'
})) satisfies PrerequisiteItem[]

export default function Prerequisites({ desktop, onReadyChange }: PrerequisitesProps) {
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
          const check = checks.find((candidate) => candidate.id === item.id)

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
    async (id: PrerequisiteId): Promise<void> => {
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

      if (result.ok && result.action === 'installed') {
        await refreshPrerequisites()
        return
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                error: result.ok ? null : result.stderr || prerequisitesCaptions.installFailed,
                status: 'missing'
              }
            : item
        )
      )
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

  const installedCount = items.filter((p) => p.status === 'ok').length
  const isInstalling = items.some((item) => item.status === 'installing')
  const isBusy = isChecking || isInstalling
  const pythonOk = items.find((item) => item.id === 'python')?.status === 'ok'
  const whisperOk = items.find((item) => item.id === 'openai-whisper')?.status === 'ok'
  // An item needs attention when it is missing or flagged, but not when it is
  // simply unsupported on this platform (e.g. CUDA on macOS).
  const fixableItems = items.filter(
    (item) => item.status === 'missing' || item.status === 'attention'
  )
  const hasProblems = fixableItems.length > 0
  // Show the detailed grid when the user opted in, while busy, or when something
  // needs attention so problems are never hidden behind a collapsed bar.
  const showDetails = expanded || hasProblems || isBusy

  // Install everything that needs attention. Python is installed first so that
  // Python-dependent packages can succeed in the same pass.
  const handleFixAll = useCallback(async (): Promise<void> => {
    const order: PrerequisiteId[] = ['python', 'ffmpeg', 'torch', 'openai-whisper', 'cuda']

    for (const id of order) {
      const item = items.find((candidate) => candidate.id === id)

      if (item && (item.status === 'missing' || item.status === 'attention')) {
        await handleInstall(id)
      }
    }
  }, [items, handleInstall])

  useEffect(() => {
    onReadyChange?.(pythonOk && whisperOk)
  }, [onReadyChange, pythonOk, whisperOk])

  const StatusBarIcon = isChecking ? Loader2 : hasProblems ? AlertCircle : CheckCircle2
  const statusBarColor = isChecking ? 'text-primary' : hasProblems ? 'text-warning' : 'text-success'

  return (
    <div className="rounded-xl border border-border/40 bg-card">
      {/* Smart status bar */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              hasProblems ? 'bg-warning/10' : 'bg-success/10'
            }`}
          >
            <StatusBarIcon
              className={`w-4 h-4 ${statusBarColor} ${isChecking ? 'animate-spin' : ''}`}
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">
              {hasProblems ? prerequisitesCaptions.title : prerequisitesCaptions.ready.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {hasProblems
                ? `${installedCount} ${prerequisitesCaptions.summary.of} ${items.length} ${prerequisitesCaptions.summary.suffix}`
                : prerequisitesCaptions.ready.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasProblems && (
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleFixAll()}
              disabled={isBusy}
              className="gap-1.5 text-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              {prerequisitesCaptions.actions.fixAll}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshPrerequisites()}
            disabled={isBusy}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{prerequisitesCaptions.actions.checkAll}</span>
          </Button>
          {!hasProblems && !isBusy && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded((value) => !value)}
              aria-label={
                expanded
                  ? prerequisitesCaptions.actions.collapse
                  : prerequisitesCaptions.actions.expand
              }
              className="h-8 w-8 text-muted-foreground"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </Button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-border/40 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const cfg = statusConfig[item.status]
              const StatusIcon = cfg.icon
              const ItemIcon = prerequisiteIcons[item.id]
              const dependencyMissing = pythonDependentIds.has(item.id) && !pythonOk
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/40 bg-secondary/20 p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <ItemIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium font-mono truncate">{item.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        <StatusIcon
                          className={`w-3 h-3 ${
                            item.status === 'checking' || item.status === 'installing'
                              ? 'animate-spin'
                              : ''
                          }`}
                        />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-right">
                      {item.installed ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          {prerequisitesCaptions.versionPrefix}
                          {item.installed}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">
                          {prerequisitesCaptions.requiredPrefix}
                          {item.required}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.error && (
                    <p className="mt-2 text-xs leading-snug text-destructive">{item.error}</p>
                  )}

                  {item.status === 'unsupported' && (
                    <p className="mt-2 text-xs leading-snug text-muted-foreground">
                      {prerequisitesCaptions.unsupportedHint}
                    </p>
                  )}

                  {dependencyMissing && item.status !== 'unsupported' && (
                    <p className="mt-2 text-xs leading-snug text-muted-foreground">
                      {prerequisitesCaptions.dependencyHint}
                    </p>
                  )}

                  {item.detail && item.status === 'attention' && (
                    <p className="mt-2 text-xs leading-snug text-warning">{item.detail}</p>
                  )}

                  {item.status === 'installing' &&
                    (() => {
                      const prog = installProgress[item.id as PrerequisiteCheckId]
                      const hasBytes = prog?.totalBytes && prog.totalBytes > 0
                      const progressPercent = hasBytes
                        ? Math.min(
                            Math.round(((prog.downloadedBytes ?? 0) / prog.totalBytes!) * 100),
                            100
                          )
                        : 0

                      return (
                        <div className="mt-3 space-y-1.5">
                          {hasBytes ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs text-primary">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  {prerequisitesCaptions.actions.installing}
                                </span>
                                <span className="text-xs font-mono text-primary">
                                  {formatBytes(prog.downloadedBytes ?? 0)} /{' '}
                                  {formatBytes(prog.totalBytes!)}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full transition-[width] duration-300"
                                  style={{
                                    width: `${Math.max(progressPercent, (prog.downloadedBytes ?? 0) > 0 ? 4 : 0)}%`
                                  }}
                                />
                              </div>
                              {(prog.speedBytesPerSec ?? 0) > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {formatBytes(prog.speedBytesPerSec!)}/s
                                  </span>
                                  {(prog.etaSeconds ?? 0) > 0 && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      ETA {secondsToDisplay(prog.etaSeconds!)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full animate-[progress-indeterminate_1.4s_ease-in-out_infinite]" />
                              </div>
                              {prog?.line && (
                                <p className="text-[10px] font-mono text-muted-foreground truncate leading-tight">
                                  {prog.line}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })()}

                  {(item.status === 'missing' ||
                    item.status === 'attention' ||
                    item.status === 'installing') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleInstall(item.id)}
                      disabled={isBusy || dependencyMissing}
                      className="mt-3 h-7 w-full gap-1.5 text-xs"
                    >
                      {item.status === 'installing' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      {item.status === 'installing'
                        ? prerequisitesCaptions.actions.installing
                        : item.status === 'attention'
                          ? prerequisitesCaptions.actions.fix
                          : prerequisitesCaptions.actions.install}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
