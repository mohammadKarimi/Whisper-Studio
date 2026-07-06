import { useState, useEffect } from 'react'
import type { DesktopApi } from '@shared/ipc'
import { useStudioContext } from '@/lib/studio-context'
import {
  generate,
  type ExportFormat,
  FORMAT_LABELS,
  FORMAT_DESCRIPTIONS
} from '@/lib/export-generators'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link } from '@/app/navigation'
import { captions } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { FileAudio, Download, Check, Copy, ArrowLeft, Loader2, FolderOpen } from 'lucide-react'

interface ExportProps {
  desktop: DesktopApi
}

const FORMATS: ExportFormat[] = ['srt', 'vtt', 'txt', 'tsv']

export default function Export({ desktop }: ExportProps) {
  const { record } = useStudioContext()
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('srt')
  const [saving, setSaving] = useState<ExportFormat | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [saved, setSaved] = useState<Set<ExportFormat>>(new Set())
  const [saveDir, setSaveDir] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [enabledFormats, setEnabledFormats] = useState<ExportFormat[]>(FORMATS)

  useEffect(() => {
    void desktop.getSettings().then((s) => {
      if (s.defaultOutputDirectory) setSaveDir(s.defaultOutputDirectory)
      if (s.defaultExportFormats.length > 0) {
        const filtered = FORMATS.filter((f) => s.defaultExportFormats.includes(f))
        setEnabledFormats(filtered.length > 0 ? filtered : FORMATS)
        setActiveFormat((prev) => (filtered.includes(prev) ? prev : (filtered[0] ?? prev)))
      }
    })
  }, [desktop])

  const segments = record?.segments ?? []
  const preview = segments.length > 0 ? generate(activeFormat, segments) : ''

  async function pickDir(): Promise<string | null> {
    if (saveDir) return saveDir
    const dir = await desktop.selectDirectory()
    if (dir) setSaveDir(dir)
    return dir
  }

  async function handleSave(format: ExportFormat) {
    if (!record || !segments.length) return
    const dir = await pickDir()
    if (!dir) return
    setSaving(format)
    try {
      const content = generate(format, segments)
      const baseName = record.sourceFileName.replace(/\.[^.]+$/, '')
      const sep = dir.includes('/') ? '/' : '\\'
      const filePath = `${dir}${sep}${baseName}.${format}`
      await desktop.writeTextFile(filePath, content)
      setSaved((prev) => new Set([...prev, format]))
      setTimeout(
        () =>
          setSaved((prev) => {
            const next = new Set(prev)
            next.delete(format)
            return next
          }),
        3000
      )
    } catch (err) {
      console.error('[Export] Save failed:', err)
    } finally {
      setSaving(null)
    }
  }

  async function handleSaveAll() {
    if (!record || !segments.length) return
    const dir = await pickDir()
    if (!dir) return
    setSavingAll(true)
    try {
      const baseName = record.sourceFileName.replace(/\.[^.]+$/, '')
      const sep = dir.includes('/') ? '/' : '\\'
      for (const fmt of enabledFormats) {
        const content = generate(fmt, segments)
        await desktop.writeTextFile(`${dir}${sep}${baseName}.${fmt}`, content)
      }
      setSaved(new Set(FORMATS))
      setTimeout(() => setSaved(new Set()), 3000)
    } catch (err) {
      console.error('[Export] Save All failed:', err)
    } finally {
      setSavingAll(false)
    }
  }

  function handleCopy() {
    if (!preview) return
    void navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-card/40 backdrop-blur-xl px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="studio">
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FileAudio className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold">
                {record?.sourceFileName ?? captions.export.labels.fallbackTitle}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {segments.length > 0
                  ? `${segments.length} ${captions.export.labels.segments} · ${record?.model ?? ''} · ${record?.language ?? ''}`
                  : captions.export.empty.goBackToStudio}
              </p>
            </div>
          </div>

          {segments.length > 0 && (
            <div className="flex items-center gap-1.5">
              {saveDir && (
                <span
                  className="text-[10px] text-muted-foreground font-mono max-w-[180px] truncate"
                  title={saveDir}
                >
                  <FolderOpen className="w-3 h-3 inline mr-1 opacity-60" />
                  {saveDir.split(/[\\/]/).slice(-2).join(' / ')}
                </span>
              )}
              {enabledFormats.map((fmt) => (
                <Tooltip key={fmt}>
                  <TooltipTrigger
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'h-7 px-2 text-[11px] font-mono gap-1 disabled:pointer-events-auto'
                    )}
                    disabled={saving !== null || !saveDir}
                    onClick={() => void handleSave(fmt)}
                  >
                    {saving === fmt ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : saved.has(fmt) ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : null}
                    {FORMAT_LABELS[fmt]}
                  </TooltipTrigger>
                  {!saveDir && <TooltipContent>Choose an output folder first</TooltipContent>}
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'gap-1.5 text-xs disabled:pointer-events-auto'
                  )}
                  disabled={saving !== null || savingAll || !saveDir}
                  onClick={() => void handleSaveAll()}
                >
                  {savingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {captions.export.actions.saveAll}
                </TooltipTrigger>
                {!saveDir && <TooltipContent>Choose an output folder first</TooltipContent>}
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <FileAudio className="w-10 h-10 opacity-20" />
          <p className="text-sm">{captions.export.empty.noTranscriptionLoaded}</p>
          <Link to="studio">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> {captions.export.actions.backToStudio}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Format sidebar */}
          <aside className="w-56 shrink-0 border-r border-border/50 bg-card/30 p-3 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {captions.export.labels.format}
            </p>
            <div className="space-y-1">
              {FORMATS.map((fmt) => {
                const enabled = enabledFormats.includes(fmt)
                return (
                  <Tooltip key={fmt}>
                    <TooltipTrigger
                      disabled={!enabled}
                      onClick={() => setActiveFormat(fmt)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                        !enabled
                          ? 'opacity-40 cursor-not-allowed border border-transparent text-muted-foreground'
                          : activeFormat === fmt
                            ? 'bg-primary/10 border border-primary/20 text-foreground'
                            : 'border border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold">{FORMAT_LABELS[fmt]}</span>
                      </div>
                      <p className="text-[10px] mt-0.5 leading-relaxed opacity-70">
                        {FORMAT_DESCRIPTIONS[fmt]}
                      </p>
                    </TooltipTrigger>
                    {!enabled && <TooltipContent>Not enabled in export settings</TooltipContent>}
                  </Tooltip>
                )
              })}
            </div>
          </aside>

          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 px-6 py-2.5 border-b border-border/50 flex items-center gap-2 bg-card/20">
              <span className="text-[11px] font-mono text-muted-foreground flex-1">
                {record?.sourceFileName.replace(/\.[^.]+$/, '')}.{activeFormat}
              </span>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? captions.export.actions.copiedWithBang : captions.export.actions.copy}
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <pre className="p-5 text-[12px] font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {preview}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
