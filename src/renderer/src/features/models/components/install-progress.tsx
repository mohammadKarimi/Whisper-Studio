import type { PrerequisiteInstallProgress } from '@shared/ipc'
import { formatBytes, secondsToDisplay } from '@/lib/utils'

interface InstallProgressProps {
  progress: PrerequisiteInstallProgress | undefined
}

export default function InstallProgress({ progress }: InstallProgressProps) {
  const total = progress?.totalBytes ?? 0
  const downloaded = progress?.downloadedBytes ?? 0
  const hasBytesData = total > 0
  // downloadedBytes === 0 means the "Downloading X (N MB)" header was parsed but
  // the file hasn't finished yet — show indeterminate bar + file size hint.
  const isStarting = hasBytesData && downloaded === 0
  const pct = hasBytesData ? Math.min(Math.round((downloaded / total) * 100), 100) : 0

  return (
    <div className="mt-3">
      {hasBytesData && !isStarting ? (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono text-primary">
              {formatBytes(downloaded)} / {formatBytes(total)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full transition-[width] duration-300"
              style={{ width: `${Math.max(pct, downloaded > 0 ? 4 : 0)}%` }}
            />
          </div>
          {(progress?.speedBytesPerSec ?? 0) > 0 && (
            <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-muted-foreground">
              <span>{formatBytes(progress!.speedBytesPerSec!)}/s</span>
              {(progress?.etaSeconds ?? 0) > 0 && (
                <span>ETA {secondsToDisplay(progress!.etaSeconds!)}</span>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full animate-[progress-indeterminate_1.4s_ease-in-out_infinite]" />
          </div>
          {isStarting ? (
            <p className="mt-1.5 text-[11px] font-mono text-muted-foreground truncate leading-tight">
              {progress?.line} — {formatBytes(total)}
            </p>
          ) : (
            progress?.line && (
              <p className="mt-1.5 text-[11px] font-mono text-muted-foreground truncate leading-tight">
                {progress.line}
              </p>
            )
          )}
        </>
      )}
    </div>
  )
}
