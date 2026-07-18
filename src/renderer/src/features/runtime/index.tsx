import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Download,
  Gauge,
  Loader2,
  PackageOpen,
  RefreshCw,
  ShieldCheck
} from 'lucide-react'
import type { AppApi, RuntimeInstallProgress, RuntimeStatus } from '@shared/ipc'
import { BrandedPage } from '@/components/branded-page'
import { Button } from '@/components/ui/button'
import { captions } from '@/lib/strings'
import { formatBytes, secondsToDisplay } from '@/lib/utils'
import { ManualInstallGuide, artifactLabel } from './components/manual-install-guide'

interface RuntimeSetupProps {
  desktop: AppApi
  initialStatus: RuntimeStatus
  onReady: (status: RuntimeStatus) => void
  version?: string
}

const featureIcons = [ShieldCheck, Gauge, CheckCircle2] as const

export default function RuntimeSetup({
  desktop,
  initialStatus,
  onReady,
  version
}: RuntimeSetupProps) {
  const [status, setStatus] = useState(initialStatus)
  const [selectedId, setSelectedId] = useState(initialStatus.recommended?.id ?? '')
  const [progress, setProgress] = useState<RuntimeInstallProgress | null>(null)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState(initialStatus.message ?? '')
  const [showManual, setShowManual] = useState(false)
  const [userDataPath, setUserDataPath] = useState('')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState('')

  useEffect(() => {
    void desktop.getAppInfo().then((info) => setUserDataPath(info.userDataPath))
  }, [desktop])

  useEffect(() => desktop.onRuntimeInstallProgress((next) => setProgress(next)), [desktop])

  const selected = useMemo(
    () => status.available.find((artifact) => artifact.id === selectedId) ?? status.recommended,
    [selectedId, status]
  )

  const activate = async (): Promise<void> => {
    const artifact = status.recommended ?? status.available[0]
    if (!artifact) return
    setActivating(true)
    setActivateError('')
    try {
      const result = await desktop.activateManualRuntime(artifact.id)
      setStatus(result.status)
      if (result.ok && result.status.state === 'ready') onReady(result.status)
      else setActivateError(result.stderr ?? captions.runtimeSetup.errors.installFailed)
    } catch (err) {
      setActivateError(
        err instanceof Error ? err.message : captions.runtimeSetup.errors.installFailed
      )
    } finally {
      setActivating(false)
    }
  }

  const install = async (): Promise<void> => {
    setInstalling(true)
    setError('')
    setProgress(null)
    try {
      const result = await desktop.installRuntime(selected?.id)
      setStatus(result.status)
      setInstalling(false)
      if (result.ok && result.status.state === 'ready') onReady(result.status)
      else setError(result.stderr ?? captions.runtimeSetup.errors.installFailed)
    } catch (err) {
      setInstalling(false)
      setError(err instanceof Error ? err.message : captions.runtimeSetup.errors.installFailed)
    }
  }

  const pct =
    progress?.totalBytes && progress.downloadedBytes
      ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))
      : 0

  return (
    <BrandedPage
      className="h-full"
      contentClassName="flex min-h-0 items-center justify-center"
      version={version}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-8 py-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <section className="flex flex-col">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <PackageOpen className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {captions.runtimeSetup.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {captions.runtimeSetup.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {captions.runtimeSetup.description}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {captions.runtimeSetup.features.map((feature, index) => {
                const RuntimeIcon = featureIcons[index]
                return (
                  <div key={feature.title} className="rounded-xl bg-secondary/35 p-3">
                    <RuntimeIcon className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-xs font-medium">{feature.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{feature.detail}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <div className={!installing ? 'runtime-card-border' : ''}>
            <section
              className={`rounded-2xl h-full bg-card p-6 ${installing ? 'border border-border/50' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">
                    {showManual
                      ? captions.runtimeSetup.manualInstall.title
                      : captions.runtimeSetup.package.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {showManual
                      ? captions.runtimeSetup.manualInstall.subtitle
                      : captions.runtimeSetup.package.subtitle}
                  </p>
                </div>
                <Cpu className="h-5 w-5 text-primary" />
              </div>

              {showManual ? (
                <ManualInstallGuide
                  status={status}
                  userDataPath={userDataPath}
                  activating={activating}
                  activateError={activateError}
                  onActivate={() => void activate()}
                />
              ) : (
                <>
                  {status.available.length > 0 ? (
                    <div className="mt-5 grid gap-2">
                      {status.available.map((artifact) => (
                        <button
                          type="button"
                          key={artifact.id}
                          disabled={installing}
                          onClick={() => setSelectedId(artifact.id)}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                            selected?.id === artifact.id
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary/30 hover:bg-secondary/50'
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-medium">
                              {captions.runtimeSetup.artifacts[artifact.accelerator]}
                              {artifact.id === status.recommended?.id &&
                                captions.runtimeSetup.artifacts.recommended}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {artifactLabel(artifact)}
                            </span>
                          </span>
                          <span className="text-xs font-mono">
                            {formatBytes(artifact.sizeBytes)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    !error && (
                      <div className="mt-5 rounded-xl bg-warning/10 p-4 text-sm text-warning">
                        {captions.runtimeSetup.package.unavailable}
                      </div>
                    )
                  )}

                  {installing && progress && (
                    <div className="mt-5 space-y-2" aria-live="polite">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 font-medium text-primary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {captions.runtimeSetup.phases[progress.phase]}
                        </span>
                        {progress.phase === 'downloading' && (
                          <span className="font-mono text-muted-foreground">{pct}%</span>
                        )}
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-3 ${
                            progress.phase === 'downloading'
                              ? 'transition-[width] duration-300 ease-out'
                              : 'animate-[splash-progress_1.3s_ease-in-out_infinite]'
                          }`}
                          style={
                            progress.phase === 'downloading' ? { width: `${pct}%` } : undefined
                          }
                        />
                      </div>
                      <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
                        <span>{progress.message}</span>
                        {(progress.speedBytesPerSec ?? 0) > 0 && (
                          <span className="shrink-0 font-mono">
                            {formatBytes(progress.speedBytesPerSec!)}/s
                            {(progress.etaSeconds ?? 0) > 0
                              ? ` · ${secondsToDisplay(progress.etaSeconds!)} ${captions.runtimeSetup.progress.left}`
                              : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-5 flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="break-all leading-5">{error}</span>
                    </div>
                  )}

                  <Button
                    className="mt-6 w-full gap-2"
                    disabled={installing || (!error && !selected)}
                    onClick={() => void install()}
                  >
                    {installing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : error ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {installing
                      ? captions.runtimeSetup.actions.installing
                      : error
                        ? captions.runtimeSetup.actions.retry
                        : captions.runtimeSetup.actions.install}
                  </Button>
                </>
              )}

              <div className="mt-4 border-t border-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showManual ? (
                    <>
                      <ArrowLeft className="h-3 w-3" />
                      {captions.runtimeSetup.manualInstall.backToDownload}
                    </>
                  ) : (
                    captions.runtimeSetup.manualInstall.toggle
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </BrandedPage>
  )
}
