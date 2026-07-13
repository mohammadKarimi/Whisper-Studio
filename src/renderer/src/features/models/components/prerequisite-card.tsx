import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  Cpu,
  Code2,
  Video,
  Package,
  Download,
  Ban
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  PrerequisiteCheckId,
  PrerequisiteCheckStatus,
  PrerequisiteInstallProgress
} from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { captions } from '@/lib/strings'
import InstallProgress from './install-progress'

const prerequisitesCaptions = captions.models.prerequisites

export type PrerequisiteUiStatus = PrerequisiteCheckStatus | 'checking' | 'installing'

export interface PrerequisiteItem {
  error: string | null
  id: PrerequisiteCheckId
  name: string
  required: string
  installed: string | null
  status: PrerequisiteUiStatus
  detail: string | null
  desc: string
}

const prerequisiteIcons: Record<PrerequisiteCheckId, LucideIcon> = {
  python: Code2,
  ffmpeg: Video,
  cuda: Cpu,
  'whisperx': Package,
  torch: Terminal
}

// Prerequisites that require a working Python installation before they can be installed.
const pythonDependentIds = new Set<PrerequisiteCheckId>(['whisperx', 'torch', 'cuda'])

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

interface PrerequisiteCardProps {
  item: PrerequisiteItem
  isBusy: boolean
  pythonOk: boolean
  installProgress: PrerequisiteInstallProgress | undefined
  onInstall: (id: PrerequisiteCheckId) => void
}

export default function PrerequisiteCard({
  item,
  isBusy,
  pythonOk,
  installProgress,
  onInstall
}: PrerequisiteCardProps) {
  const cfg = statusConfig[item.status]
  const StatusIcon = cfg.icon
  const ItemIcon = prerequisiteIcons[item.id]
  const dependencyMissing = pythonDependentIds.has(item.id) && !pythonOk

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
          <ItemIcon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium font-mono truncate">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
          <StatusIcon
            className={`w-3 h-3 ${item.status === 'checking' || item.status === 'installing' ? 'animate-spin' : ''}`}
          />
          {cfg.label}
        </span>
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
        <p className="mt-2 text-xs leading-snug text-destructive break-words line-clamp-4 overflow-hidden">
          {item.error}
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

      {item.status === 'installing' && <InstallProgress progress={installProgress} />}

      {(item.status === 'missing' || item.status === 'attention') && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onInstall(item.id)}
          disabled={isBusy || dependencyMissing}
          className="mt-3 h-7 w-full gap-1.5 text-xs"
        >
          <Download className="w-3 h-3" />
          {prerequisitesCaptions.actions.install}
        </Button>
      )}
    </div>
  )
}
