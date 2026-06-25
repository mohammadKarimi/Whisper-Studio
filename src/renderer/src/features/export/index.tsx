import { useState } from 'react'
import { useNavigate } from '@/app/navigation'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { captions } from '@/captions'
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  FileText,
  Subtitles,
  Code,
  FileCode,
  Globe,
  LayoutTemplate,
  FolderOpen,
  Eye
} from 'lucide-react'

const FORMAT_ICONS = {
  txt: FileText,
  srt: Subtitles,
  vtt: Globe,
  json: Code,
  md: FileCode,
  html: LayoutTemplate
}

const FORMATS = captions.export.formats.map((format) => ({
  ...format,
  icon: FORMAT_ICONS[format.value]
}))

type ExportFormat = (typeof FORMATS)[number]['value']

const PREVIEWS = captions.export.previews

export default function Export() {
  const navigate = useNavigate()
  const [activeFormat, setActiveFormat] = useState<ExportFormat>(captions.export.defaultFormat)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(PREVIEWS[activeFormat])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{captions.export.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{captions.export.subtitle}</p>
        </div>
      </div>

      {/* File Info */}
      <div className="glass-panel rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium">{captions.export.fileInfo.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {captions.export.fileInfo.details}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              {captions.export.fileInfo.confidenceLabel}
            </span>
            <span className="text-[13px] font-mono font-medium">
              {captions.export.fileInfo.confidenceValue}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              {captions.export.fileInfo.languageLabel}
            </span>
            <span className="text-[13px] font-medium">
              {captions.export.fileInfo.languageValue}
            </span>
          </div>
        </div>
      </div>

      {/* Format Tabs + Preview */}
      <Tabs value={activeFormat} onValueChange={(value) => setActiveFormat(value as ExportFormat)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-secondary/50 p-1">
            {FORMATS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="gap-1.5 text-xs data-[state=active]:bg-background"
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? captions.export.actions.copied : captions.export.actions.copyToClipboard}
            </Button>
          </div>
        </div>

        {FORMATS.map((f) => (
          <TabsContent key={f.value} value={f.value}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-secondary/20">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {captions.export.preview.titlePrefix} {captions.export.preview.titleSeparator}{' '}
                  {f.label}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">
                  {captions.export.preview.fileNameStem}.{f.value}
                </span>
              </div>
              <pre className="p-5 text-[12px] font-mono leading-relaxed text-foreground/80 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                {PREVIEWS[f.value]}
              </pre>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Export Actions */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
        <div>
          <h3 className="text-sm font-semibold mb-1">{captions.export.options.title}</h3>
          <p className="text-xs text-muted-foreground">
            {captions.export.options.formatPrefix} {activeFormat.toUpperCase()}{' '}
            {captions.export.options.formatSuffix}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 text-sm">
            <FolderOpen className="w-4 h-4" />
            {captions.export.actions.chooseFolder}
          </Button>
          <Button className="gap-2 text-sm glow-primary">
            <Download className="w-4 h-4" />
            {captions.export.actions.saveLocally}
          </Button>
        </div>
      </div>
    </div>
  )
}
