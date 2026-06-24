import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ChevronDown,
  Info,
  Cpu,
  Zap,
  Star,
  Globe,
  Brain,
  Users,
  Volume2,
  Waves
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { captions } from '@/captions'

const MODELS = captions.newTranscription.settings.models
const LANGUAGES = captions.newTranscription.settings.languages
const settingRows = captions.newTranscription.settings.rows

export interface TranscriptionSettings {
  compute: string
  diarization: boolean
  language: string
  model: string
  noiseReduction: boolean
  removeSilence: boolean
  translate: boolean
  wordTimestamps: boolean
}

interface SettingRowProps {
  children: ReactNode
  description: string
  icon: typeof Globe
  label: string
  tooltip?: string
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
  tooltip
}: SettingRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium">{label}</span>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[240px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

interface StepSettingsProps {
  settings: TranscriptionSettings
  setSettings: Dispatch<SetStateAction<TranscriptionSettings>>
}

export default function StepSettings({ settings, setSettings }: StepSettingsProps): JSX.Element {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const update = (key: keyof TranscriptionSettings, value: boolean | string): void =>
    setSettings({ ...settings, [key]: value })

  return (
    <div className="space-y-6">
      {/* Recommended Banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
        <Star className="w-4 h-4 text-primary shrink-0 text-warning" />
        <p className="text-[12px] text-muted-foreground">
          <span className="text-foreground font-medium">
            {captions.newTranscription.settings.recommendedBanner.emphasis}
          </span>{' '}
          {captions.newTranscription.settings.recommendedBanner.detail}
        </p>
      </div>

      {/* Core Settings */}
      <div className="glass-panel rounded-xl divide-y divide-border/50">
        <div className="px-5">
          <SettingRow
            icon={Globe}
            label={settingRows.language.label}
            description={settingRows.language.description}
            tooltip={settingRows.language.tooltip}
          >
            <Select value={settings.language} onValueChange={(v) => update('language', v)}>
              <SelectTrigger className="w-[180px] h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-[13px]">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>

        <div className="px-5">
          <SettingRow
            icon={Brain}
            label={settingRows.model.label}
            description={settingRows.model.description}
            tooltip={settingRows.model.tooltip}
          >
            <Select value={settings.model} onValueChange={(v) => update('model', v)}>
              <SelectTrigger className="w-[180px] h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-[13px]">
                    <div className="flex items-center gap-2">
                      {m.label}
                      {m.recommended && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {captions.newTranscription.settings.recommendedBadge}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>

        {/* Model Details */}
        {settings.model && (
          <div className="px-5 py-3">
            <div className="grid grid-cols-4 gap-4">
              {(() => {
                const m = MODELS.find((x) => x.value === settings.model)
                return m ? (
                  <>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.speed}
                      </span>
                      <span className="text-[13px] font-mono font-medium">{m.speed}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.accuracy}
                      </span>
                      <span className="text-[13px] font-medium">{m.accuracy}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.vram}
                      </span>
                      <span className="text-[13px] font-mono font-medium">{m.vram}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.note}
                      </span>
                      <span className="text-[12px] text-muted-foreground">{m.desc}</span>
                    </div>
                  </>
                ) : null
              })()}
            </div>
          </div>
        )}

        <div className="px-5">
          <SettingRow
            icon={Cpu}
            label={settingRows.compute.label}
            description={settingRows.compute.description}
            tooltip={settingRows.compute.tooltip}
          >
            <div className="flex items-center gap-2 p-1 rounded-lg bg-secondary">
              {captions.newTranscription.settings.computeModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => update('compute', mode.value)}
                  className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all
                    ${
                      settings.compute === mode.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </SettingRow>
        </div>
      </div>

      {/* Toggles */}
      <div className="glass-panel rounded-xl divide-y divide-border/50">
        <div className="px-5">
          <SettingRow
            icon={Zap}
            label={settingRows.wordTimestamps.label}
            description={settingRows.wordTimestamps.description}
            tooltip={settingRows.wordTimestamps.tooltip}
          >
            <Switch
              checked={settings.wordTimestamps}
              onCheckedChange={(v) => update('wordTimestamps', v)}
            />
          </SettingRow>
        </div>
        <div className="px-5">
          <SettingRow
            icon={Users}
            label={settingRows.diarization.label}
            description={settingRows.diarization.description}
            tooltip={settingRows.diarization.tooltip}
          >
            <Switch
              checked={settings.diarization}
              onCheckedChange={(v) => update('diarization', v)}
            />
          </SettingRow>
        </div>
      </div>

      {/* Advanced */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
          <ChevronDown
            className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-0' : '-rotate-90'}`}
          />
          {captions.newTranscription.settings.advancedSettings}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="glass-panel rounded-xl divide-y divide-border/50">
            <div className="px-5">
              <SettingRow
                icon={Globe}
                label={settingRows.translate.label}
                description={settingRows.translate.description}
              >
                <Switch
                  checked={settings.translate}
                  onCheckedChange={(v) => update('translate', v)}
                />
              </SettingRow>
            </div>
            <div className="px-5">
              <SettingRow
                icon={Volume2}
                label={settingRows.removeSilence.label}
                description={settingRows.removeSilence.description}
              >
                <Switch
                  checked={settings.removeSilence}
                  onCheckedChange={(v) => update('removeSilence', v)}
                />
              </SettingRow>
            </div>
            <div className="px-5">
              <SettingRow
                icon={Waves}
                label={settingRows.noiseReduction.label}
                description={settingRows.noiseReduction.description}
              >
                <Switch
                  checked={settings.noiseReduction}
                  onCheckedChange={(v) => update('noiseReduction', v)}
                />
              </SettingRow>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
