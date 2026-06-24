import type { Dispatch, SetStateAction } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import {
  FileText,
  Subtitles,
  Code,
  FileCode,
  Globe,
  LayoutTemplate,
  FolderOpen
} from 'lucide-react'
import { captions } from '@/captions'

const FORMAT_ICONS = {
  txt: FileText,
  srt: Subtitles,
  vtt: Globe,
  json: Code,
  md: FileCode,
  html: LayoutTemplate
}

const FORMATS = captions.newTranscription.output.formats.map((format) => ({
  ...format,
  icon: FORMAT_ICONS[format.value]
}))

interface StepOutputProps {
  exportMode: string
  outputFormats: string[]
  setExportMode: Dispatch<SetStateAction<string>>
  setOutputFormats: Dispatch<SetStateAction<string[]>>
}

export default function StepOutput({
  outputFormats,
  setOutputFormats
}: StepOutputProps): JSX.Element {
  const toggleFormat = (value: string): void => {
    setOutputFormats(
      outputFormats.includes(value)
        ? outputFormats.filter((f) => f !== value)
        : [...outputFormats, value]
    )
  }

  return (
    <div className="space-y-6">
      {/* Output Formats */}
      <div>
        <h3 className="text-sm font-semibold mb-1">{captions.newTranscription.output.title}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {captions.newTranscription.output.description}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {FORMATS.map((format) => {
            const isSelected = outputFormats.includes(format.value)
            return (
              <button
                key={format.value}
                onClick={() => toggleFormat(format.value)}
                className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all text-left
                  ${
                    isSelected
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border/50 bg-card/50 hover:bg-secondary/30 hover:border-muted-foreground/20'
                  }`}
              >
                <div className="absolute top-3 right-3">
                  <Checkbox checked={isSelected} />
                </div>
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary/10' : 'bg-secondary'}`}
                >
                  <format.icon
                    className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{format.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{format.ext}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{format.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Output Path */}
      <div>
        <h3 className="text-sm font-semibold mb-1">
          {captions.newTranscription.output.outputFolder.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {captions.newTranscription.output.outputFolder.description}
        </p>
        <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-secondary/30 transition-all text-left">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-[13px] font-mono text-muted-foreground">
            {captions.newTranscription.output.outputFolder.path}
          </span>
        </button>
      </div>

      {/* Estimated Processing */}
      <div className="glass-panel rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              {captions.newTranscription.output.estimated.timeLabel}
            </span>
            <span className="text-lg font-semibold font-mono">
              {captions.newTranscription.output.estimated.timeValue}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              {captions.newTranscription.output.estimated.modelLabel}
            </span>
            <span className="text-[13px] font-medium">
              {captions.newTranscription.output.estimated.modelValue}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              {captions.newTranscription.output.estimated.outputFilesLabel}
            </span>
            <span className="text-[13px] font-medium">
              {outputFormats.length * 2} {captions.newTranscription.output.estimated.filesSuffix}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
