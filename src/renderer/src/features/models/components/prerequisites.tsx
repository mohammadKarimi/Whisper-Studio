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
  Zap,
  Package,
  Download,
  ExternalLink
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DesktopApi, PrerequisiteCheckStatus } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { motion } from '@/lib/motion'
import { captions } from '@/captions'

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
  desc: string
}

interface PrerequisitesProps {
  desktop: DesktopApi
}

const prerequisiteIcons: Record<PrerequisiteId, LucideIcon> = {
  python: Code2,
  ffmpeg: Video,
  cuda: Cpu,
  'faster-whisper': Package,
  ctranslate2: Zap,
  torch: Terminal
}
const externalInstallerIds = new Set<PrerequisiteId>(['python', 'ffmpeg', 'cuda'])

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
  }
} satisfies Record<
  PrerequisiteUiStatus,
  { icon: LucideIcon; color: string; bg: string; label: string }
>

const initialItems = prerequisitesCaptions.items.map((item) => ({
  ...item,
  error: null,
  installed: null,
  status: 'checking'
})) satisfies PrerequisiteItem[]

export default function Prerequisites({ desktop }: PrerequisitesProps) {
  const [items, setItems] = useState<PrerequisiteItem[]>(() =>
    initialItems.map((item) => ({ ...item }))
  )
  const [isChecking, setIsChecking] = useState(true)

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
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, error: null, status: 'installing' } : item
        )
      )

      const result = await desktop.installPrerequisite(id)

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

  const installedCount = items.filter((p) => p.status === 'ok').length
  const isInstalling = items.some((item) => item.status === 'installing')
  const isBusy = isChecking || isInstalling

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{prerequisitesCaptions.title}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {installedCount} {prerequisitesCaptions.summary.of} {items.length}{' '}
            {prerequisitesCaptions.summary.suffix}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refreshPrerequisites()}
          disabled={isBusy}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />{' '}
          {prerequisitesCaptions.actions.checkAll}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const cfg = statusConfig[item.status]
          const StatusIcon = cfg.icon
          const ItemIcon = prerequisiteIcons[item.id]
          const isExternalInstaller = externalInstallerIds.has(item.id)
          const ActionIcon = isExternalInstaller ? ExternalLink : Download
          const actionLabel = isExternalInstaller
            ? prerequisitesCaptions.actions.openInstaller
            : prerequisitesCaptions.actions.install
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}
                >
                  <ItemIcon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium font-mono truncate">{item.name}</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-[11px] font-medium ${cfg.color}`}>
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
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {prerequisitesCaptions.versionPrefix}
                      {item.installed}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">
                      {prerequisitesCaptions.requiredPrefix}
                      {item.required}
                    </span>
                  )}
                </div>
              </div>

              {item.error && (
                <p className="mt-2 text-[11px] leading-snug text-destructive">{item.error}</p>
              )}

              {(item.status === 'missing' || item.status === 'installing') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleInstall(item.id)}
                  disabled={isBusy}
                  className="mt-3 h-7 w-full gap-1.5 text-xs"
                >
                  {item.status === 'installing' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ActionIcon className="w-3 h-3" />
                  )}
                  {item.status === 'installing'
                    ? prerequisitesCaptions.actions.installing
                    : actionLabel}
                </Button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
