import { useState } from 'react'
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Loader2 } from 'lucide-react'
import type { RuntimeArtifact, RuntimeStatus } from '@shared/ipc'
import { captions } from '@/lib/strings'

export function artifactLabel(artifact: RuntimeArtifact): string {
  return `${artifact.platform} ${artifact.arch} · ${artifact.accelerator.toUpperCase()}`
}

function joinPath(...parts: string[]): string {
  // simple cross-platform join for display only
  const sep = parts[0]?.includes('\\') ? '\\' : '/'
  return parts.join(sep)
}

function shellEscapePath(p: string): string {
  if (!p || p.includes('\\')) return p
  return p.replace(/ /g, '\\ ')
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
      {n}
    </div>
  )
}

export function ManualInstallGuide({
  status,
  userDataPath,
  activating,
  activateError,
  onActivate
}: {
  status: RuntimeStatus
  userDataPath: string
  activating: boolean
  activateError: string
  onActivate: () => void
}) {
  const [copiedPath, setCopiedPath] = useState(false)
  const [copiedFolder, setCopiedFolder] = useState(false)

  const artifact = status.recommended ?? status.available[0] ?? null
  const folder = userDataPath ? shellEscapePath(joinPath(userDataPath, 'runtimes')) : '…'

  const copy = (text: string, setCopied: (v: boolean) => void): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const {
    steps,
    copyPath,
    noArtifact,
    folderHint,
    expectedFolder,
    activate,
    activating: activatingLabel
  } = captions.runtimeSetup.manualInstall

  return (
    <div className="mt-4 space-y-4 text-xs">
      {/* Step 1 — Download */}
      <div className="flex gap-3">
        <StepBadge n={1} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{steps[0].title}</p>
          {artifact ? (
            <>
              <button
                type="button"
                onClick={() => void window.desktop?.openExternal(artifact.url)}
                className="mt-1 flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate font-mono">{artifact.id}.zip</span>
              </button>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{artifactLabel(artifact)}</p>
            </>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{noArtifact}</p>
          )}
        </div>
      </div>

      {/* Step 2 — Runtimes folder */}
      <div className="flex gap-3">
        <StepBadge n={2} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{steps[1].title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{steps[1].detail}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary/60 px-2 py-1 font-mono text-[11px]">
              {folder}
            </code>
            <button
              type="button"
              title={copyPath}
              onClick={() => copy(folder, setCopiedPath)}
              className="shrink-0 rounded-lg bg-secondary/60 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {copiedPath ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3 — Extract */}
      <div className="flex gap-3">
        <StepBadge n={3} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{steps[2].title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{folderHint}</p>
          {artifact && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {expectedFolder}:
                </span>
                <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary/60 px-2 py-1 font-mono text-[11px] text-primary">
                  {artifact.id}
                </code>
              </div>
              <button
                type="button"
                title={copyPath}
                onClick={() => copy(artifact.id, setCopiedFolder)}
                className="shrink-0 rounded-lg bg-secondary/60 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {copiedFolder ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step 4 — Activate */}
      <div className="flex gap-3">
        <StepBadge n={4} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{steps[3].title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{steps[3].detail}</p>
          {activateError && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              <AlertCircle className="mt-px h-3 w-3 shrink-0" />
              <span className="break-all leading-4">{activateError}</span>
            </div>
          )}
          {artifact && (
            <div className="mt-4 flex items-center justify-end gap-1.5">
              <button
                type="button"
                disabled={activating}
                onClick={onActivate}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
              >
                {activating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {activating ? activatingLabel : activate}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
