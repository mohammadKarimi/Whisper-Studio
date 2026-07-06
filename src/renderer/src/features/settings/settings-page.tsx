import { useEffect, useState } from 'react'
import {
  RefreshCw,
  FolderOpen,
  Trash2,
  Github,
  Bug,
  Mail,
  Send,
  CheckCircle2,
  ArrowUpCircle,
  Coffee,
  Loader2,
  Settings,
  Sliders,
  FolderOutput,
  Database,
  Info,
  Heart
} from 'lucide-react'
import { WHISPER_LANGUAGES } from '@shared/constants'
import type { AppInfo, DesktopApi, UpdateCheckResult } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { AboutLinkCard } from './components/about-link-card'
import { DeleteAllConfirmModal } from './components/delete-all-confirm-modal'
import { SegmentedControl } from './components/segmented-control'
import { SettingsCard } from './components/settings-card'
import { SettingRow } from './components/setting-row'
import { useSettings } from './use-settings'

const EXPORT_FORMATS = ['srt', 'vtt', 'txt', 'tsv'] as const

interface SettingsPageProps {
  desktop: DesktopApi
}

export function SettingsPage({ desktop }: SettingsPageProps): JSX.Element {
  const { settings, loading, updateSettings } = useSettings(desktop)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [updateState, setUpdateState] = useState<
    'idle' | 'checking' | { result: UpdateCheckResult } | 'error'
  >('idle')
  const [deletingAll, setDeletingAll] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    void desktop.getAppInfo().then(setAppInfo)
  }, [desktop])

  async function handleCheckUpdate(): Promise<void> {
    setUpdateState('checking')
    try {
      const result = await desktop.checkForUpdates()
      setUpdateState({ result })
    } catch {
      setUpdateState('error')
    }
  }

  async function handleBrowseOutputDir(): Promise<void> {
    const dir = await desktop.selectDirectory()
    if (dir) {
      await updateSettings({ defaultOutputDirectory: dir })
    }
  }

  async function handleDeleteAll(): Promise<void> {
    setDeletingAll(true)
    try {
      const records = await desktop.listTranscriptions()
      await Promise.all(records.map((r) => desktop.deleteTranscription(r.id)))
    } finally {
      setDeletingAll(false)
      setDeleteModalOpen(false)
    }
  }

  function toggleExportFormat(fmt: string): void {
    const current = settings.defaultExportFormats
    const next = current.includes(fmt) ? current.filter((f) => f !== fmt) : [...current, fmt]
    void updateSettings({ defaultExportFormats: next })
  }

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-8">
        {/* ── Hero: App info + Check for Updates ───────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card to-card p-8">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-64 h-64 rounded-full bg-chart-2/5 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  Whisper Studio
                </span>
              </div>
              <h1 className="mb-1 text-3xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">
                {appInfo ? (
                  <>
                    Version{' '}
                    <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                      v{appInfo.version}
                    </span>
                  </>
                ) : (
                  <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />
                )}
              </p>
            </div>

            {/* Check for Updates */}
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Button
                variant="outline"
                size="sm"
                disabled={updateState === 'checking'}
                onClick={() => void handleCheckUpdate()}
                className="bg-background/60 backdrop-blur-sm"
              >
                {updateState === 'checking' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {updateState === 'checking' ? 'Checking…' : 'Check for Updates'}
              </Button>

              {updateState !== 'idle' && updateState !== 'checking' && updateState !== 'error' && (
                <>
                  {updateState.result.hasUpdate ? (
                    <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
                      <ArrowUpCircle className="h-4 w-4 shrink-0 text-primary" />
                      <span className="font-medium text-primary">
                        {updateState.result.releaseName} available
                      </span>
                      <button
                        type="button"
                        className="ml-1 text-xs text-primary underline underline-offset-2 hover:opacity-80"
                        onClick={() => void desktop.openExternal(updateState.result.releaseUrl)}
                      >
                        Download
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>v{updateState.result.currentVersion} — you&apos;re up to date</span>
                    </div>
                  )}
                </>
              )}

              {updateState === 'error' && (
                <p className="text-xs text-destructive">Could not reach GitHub.</p>
              )}
            </div>
          </div>
        </div>

        <SettingsCard
          icon={<Sliders className="h-4 w-4 text-primary" />}
          title="Transcription Defaults"
        >
          <SettingRow label="Default Language" description="Language used when none is selected.">
            <Select
              value={settings.defaultLanguage}
              onValueChange={(v) => void updateSettings({ defaultLanguage: v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHISPER_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Default Task"
            description="Transcribe audio or translate to English."
            badge="Soon"
          >
            <SegmentedControl
              value={settings.defaultTask}
              options={[
                { label: 'Transcribe', value: 'transcribe' },
                { label: 'Translate', value: 'translate' }
              ]}
              onChange={(v) =>
                void updateSettings({ defaultTask: v as 'transcribe' | 'translate' })
              }
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard icon={<FolderOutput className="h-4 w-4 text-primary" />} title="Output">
          <SettingRow
            label="Output Directory"
            description="Where transcription files are saved by default."
          >
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={settings.defaultOutputDirectory ?? ''}
                placeholder="Default system location"
                className="h-9 w-56 min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-muted-foreground outline-none"
              />
              <Button variant="outline" size="icon" onClick={() => void handleBrowseOutputDir()}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </SettingRow>

          <SettingRow
            label="Export Formats"
            description="Formats generated automatically after each transcription."
            last
          >
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {EXPORT_FORMATS.map((fmt) => (
                <label key={fmt} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={settings.defaultExportFormats.includes(fmt)}
                    onCheckedChange={() => toggleExportFormat(fmt)}
                  />
                  <span className="font-mono text-xs uppercase text-foreground/80">{fmt}</span>
                </label>
              ))}
            </div>
          </SettingRow>
        </SettingsCard>

        <SettingsCard icon={<Database className="h-4 w-4 text-primary" />} title="Storage">
          <SettingRow
            label="Delete All Transcriptions"
            badge="Danger Zone"
            badgeClassName="border-destructive/20 bg-destructive/10 text-destructive"
            description="Permanently removes all saved transcription records and output files from disk."
            last
          >
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete All
            </Button>
          </SettingRow>
        </SettingsCard>

        <SettingsCard icon={<Info className="h-4 w-4 text-primary" />} title="About">
          <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-5">
            <AboutLinkCard
              icon={<Github className="h-5 w-5" />}
              label="GitHub"
              description="Source code"
              onClick={() =>
                void desktop.openExternal('https://github.com/mohammadKarimi/Whisper-Studio')
              }
            />
            <AboutLinkCard
              icon={<Bug className="h-5 w-5" />}
              label="Report a Bug"
              description="Open an issue"
              onClick={() =>
                void desktop.openExternal('https://github.com/mohammadKarimi/Whisper-Studio/issues')
              }
            />
            <AboutLinkCard
              icon={<Coffee className="h-5 w-5" />}
              label="Buy Me a Coffee"
              description="Support the team"
              onClick={() => void desktop.openExternal('https://buymeacoffee.com/mohammadkarimi')}
            />
            <AboutLinkCard
              icon={<Mail className="h-5 w-5" />}
              label="Contact"
              description="Send an email"
              onClick={() => void desktop.openExternal('mailto:mha.karimi@gmail.com')}
            />
            <AboutLinkCard
              icon={<Send className="h-5 w-5" />}
              label="Telegram"
              description="@mhaKarimi"
              onClick={() => void desktop.openExternal('https://t.me/mhaKarimi')}
            />
          </div>
        </SettingsCard>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground/50">
          Built with <Heart className="h-3 w-3 fill-destructive text-destructive" /> by the Whisper
          Studio team · © {new Date().getFullYear()}
        </p>
      </div>
      <DeleteAllConfirmModal
        open={deleteModalOpen}
        deleting={deletingAll}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteAll()}
      />
    </div>
  )
}
