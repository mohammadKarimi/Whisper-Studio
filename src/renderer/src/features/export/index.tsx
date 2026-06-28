import { useState, useEffect } from 'react'
import type { DesktopApi, TranscriptionRecord } from '@shared/ipc'
import { takeStudioRecord } from '@/lib/studio-store'
import {
  generate,
  type ExportFormat,
  FORMAT_LABELS,
  FORMAT_DESCRIPTIONS
} from '@/lib/export-generators'
import { Button } from '@/components/ui/button'
import { Link } from '@/app/navigation'
import { FileAudio, Download, Check, Copy, ArrowLeft, Loader2, FolderOpen } from 'lucide-react'

interface ExportProps {
  desktop: DesktopApi
}

const FORMATS: ExportFormat[] = ['srt', 'vtt', 'txt', 'tsv']

export default function Export({ desktop }: ExportProps) {
  const [record, setRecord] = useState<TranscriptionRecord | null>(null)
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('srt')
  const [saving, setSaving] = useState<ExportFormat | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [saved, setSaved] = useState<Set<ExportFormat>>(new Set())
  const [saveDir, setSaveDir] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Export is always reached from Studio — pick up same record
    const rec = takeStudioRecord()
    if (rec) setRecord(rec)
  }, [])

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
      for (const fmt of FORMATS) {
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
            <Link to="/studio">
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FileAudio className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold">{record?.sourceFileName ?? 'Export'}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {segments.length > 0
                  ? `${segments.length} segments · ${record?.model ?? ''} · ${record?.language ?? ''}`
                  : 'No transcription loaded — go back to Studio first'}
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
              {FORMATS.map((fmt) => (
                <Button
                  key={fmt}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] font-mono gap-1"
                  disabled={saving !== null}
                  onClick={() => handleSave(fmt)}
                >
                  {saving === fmt ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : saved.has(fmt) ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : null}
                  {FORMAT_LABELS[fmt]}
                </Button>
              ))}
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={saving !== null || savingAll}
                onClick={handleSaveAll}
              >
                {savingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Save All
              </Button>
            </div>
          )}
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <FileAudio className="w-10 h-10 opacity-20" />
          <p className="text-sm">No transcription loaded.</p>
          <Link to="/studio">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Studio
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Format sidebar */}
          <aside className="w-56 shrink-0 border-r border-border/50 bg-card/30 p-3 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Format
            </p>
            <div className="space-y-1">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setActiveFormat(fmt)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    activeFormat === fmt
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
                </button>
              ))}
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
                {copied ? 'Copied!' : 'Copy'}
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

// import { useNavigate } from '@/app/navigation'
// import { FALLBACK_FORMAT_ICON, FORMAT_ICONS } from '@/lib/format-icons'
// import { Button } from '@/components/ui/button'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { captions } from '@/lib/strings'
// import { ArrowLeft, Copy, Check, Download, FolderOpen, Eye } from 'lucide-react'

// const FORMATS = captions.export.formats.map((format) => ({
//   ...format,
//   icon: FORMAT_ICONS[format.value] ?? FALLBACK_FORMAT_ICON
// }))

// type ExportFormat = (typeof FORMATS)[number]['value']

// const PREVIEWS = captions.export.previews

// export default function Export() {
//   const navigate = useNavigate()
//   const [activeFormat, setActiveFormat] = useState<ExportFormat>(captions.export.defaultFormat)
//   const [copied, setCopied] = useState(false)

//   const handleCopy = () => {
//     void navigator.clipboard.writeText(PREVIEWS[activeFormat])
//     setCopied(true)
//     setTimeout(() => setCopied(false), 2000)
//   }

//   return (
//     <div className="p-8 max-w-[1000px] mx-auto">
//       {/* Header */}
//       <div className="flex items-center gap-3 mb-6">
//         <button
//           onClick={() => navigate(-1)}
//           className="text-muted-foreground hover:text-foreground transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4" />
//         </button>
//         <div>
//           <h1 className="text-xl font-semibold tracking-tight">{captions.export.title}</h1>
//           <p className="text-xs text-muted-foreground mt-0.5">{captions.export.subtitle}</p>
//         </div>
//       </div>

//       {/* File Info */}
//       <div className="glass-panel rounded-xl p-4 mb-6 flex items-center justify-between">
//         <div>
//           <p className="text-[13px] font-medium">{captions.export.fileInfo.title}</p>
//           <p className="text-[11px] text-muted-foreground mt-0.5">
//             {captions.export.fileInfo.details}
//           </p>
//         </div>
//         <div className="flex items-center gap-4">
//           <div>
//             <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
//               {captions.export.fileInfo.confidenceLabel}
//             </span>
//             <span className="text-[13px] font-mono font-medium">
//               {captions.export.fileInfo.confidenceValue}
//             </span>
//           </div>
//           <div>
//             <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
//               {captions.export.fileInfo.languageLabel}
//             </span>
//             <span className="text-[13px] font-medium">
//               {captions.export.fileInfo.languageValue}
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Format Tabs + Preview */}
//       <Tabs value={activeFormat} onValueChange={(value) => setActiveFormat(value as ExportFormat)}>
//         <div className="flex items-center justify-between mb-4">
//           <TabsList className="bg-secondary/50 p-1">
//             {FORMATS.map((f) => (
//               <TabsTrigger
//                 key={f.value}
//                 value={f.value}
//                 className="gap-1.5 text-xs data-[state=active]:bg-background"
//               >
//                 <f.icon className="w-3.5 h-3.5" />
//                 {f.label}
//               </TabsTrigger>
//             ))}
//           </TabsList>
//           <div className="flex items-center gap-2">
//             <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
//               {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
//               {copied ? captions.export.actions.copied : captions.export.actions.copyToClipboard}
//             </Button>
//           </div>
//         </div>

//         {FORMATS.map((f) => (
//           <TabsContent key={f.value} value={f.value}>
//             <div className="glass-panel rounded-xl overflow-hidden">
//               <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-secondary/20">
//                 <Eye className="w-3.5 h-3.5 text-muted-foreground" />
//                 <span className="text-[11px] font-medium text-muted-foreground">
//                   {captions.export.preview.titlePrefix} {captions.export.preview.titleSeparator}{' '}
//                   {f.label}
//                 </span>
//                 <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">
//                   {captions.export.preview.fileNameStem}.{f.value}
//                 </span>
//               </div>
//               <pre className="p-5 text-[12px] font-mono leading-relaxed text-foreground/80 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
//                 {PREVIEWS[f.value]}
//               </pre>
//             </div>
//           </TabsContent>
//         ))}
//       </Tabs>

//       {/* Export Actions */}
//       <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
//         <div>
//           <h3 className="text-sm font-semibold mb-1">{captions.export.options.title}</h3>
//           <p className="text-xs text-muted-foreground">
//             {captions.export.options.formatPrefix} {activeFormat.toUpperCase()}{' '}
//             {captions.export.options.formatSuffix}
//           </p>
//         </div>
//         <div className="flex items-center gap-3">
//           <Button variant="outline" className="gap-2 text-sm">
//             <FolderOpen className="w-4 h-4" />
//             {captions.export.actions.chooseFolder}
//           </Button>
//           <Button className="gap-2 text-sm glow-primary">
//             <Download className="w-4 h-4" />
//             {captions.export.actions.saveLocally}
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }
