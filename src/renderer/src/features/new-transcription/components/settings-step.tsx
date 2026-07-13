import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { ModelApi, DownloadedWhisperModel, SettingsApi } from '@shared/ipc'
import { useNavigate } from '@/app/navigation'
import { Banner } from '@/components/banner'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Info, Cpu, Zap, Brain, Users, Volume2, Waves, Languages } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { captions } from '@/lib/strings'
import { WHISPER_CATALOG_MODELS } from '@shared/constants'

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
  icon: typeof Languages
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
                  <TooltipContent side="right" className="text-xs">
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
  desktop: ModelApi & Pick<SettingsApi, 'getSettings'>
  settings: TranscriptionSettings
  setSettings: Dispatch<SetStateAction<TranscriptionSettings>>
}

function getDownloadedModelLabel(model: DownloadedWhisperModel): string {
  return model.name
}

export default function StepSettings({
  desktop,
  settings,
  setSettings
}: StepSettingsProps): JSX.Element {
  const navigate = useNavigate()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [downloadedModels, setDownloadedModels] = useState<DownloadedWhisperModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [languageSearch, setLanguageSearch] = useState('')
  const [hfToken, setHfToken] = useState<string | null>(null)

  const update = (key: keyof TranscriptionSettings, value: boolean | string): void =>
    setSettings({ ...settings, [key]: value })

  useEffect(() => {
    let isActive = true

    async function loadDownloadedModels(): Promise<void> {
      setIsLoadingModels(true)

      try {
        const result = await desktop.getDownloadedModels()

        if (!isActive) {
          return
        }

        setDownloadedModels(result.models)
        setSettings((current) => {
          if (result.models.length === 0) {
            return { ...current, model: '' }
          }

          if (result.models.some((model) => model.name === current.model)) {
            return current
          }

          return { ...current, model: result.models[0].name }
        })
      } finally {
        if (isActive) {
          setIsLoadingModels(false)
        }
      }
    }

    void loadDownloadedModels()

    return () => {
      isActive = false
    }
  }, [desktop, setSettings])

  useEffect(() => {
    void desktop.getSettings().then((s) => setHfToken(s.hfToken))
  }, [desktop])

  const hasDownloadedModels = downloadedModels.length > 0
  const selectedDownloadedModel = downloadedModels.find((model) => model.name === settings.model)
  const selectedModelLabel = selectedDownloadedModel
    ? getDownloadedModelLabel(selectedDownloadedModel)
    : captions.newTranscription.settings.modelPlaceholder
  const filteredLanguages = LANGUAGES.filter((language) => {
    const query = languageSearch.trim().toLowerCase()

    if (!query) {
      return true
    }

    return (
      language.value.toLowerCase().includes(query) || language.label.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Recommended Banner */}
      <Banner
        emphasis={captions.newTranscription.settings.recommendedBanner.emphasis}
        detail={captions.newTranscription.settings.recommendedBanner.detail}
      />

      {!isLoadingModels && !hasDownloadedModels && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-warning">
              {captions.newTranscription.settings.noDownloadedModelsAlert}
            </p>
            <button
              type="button"
              onClick={() => navigate('models')}
              className="shrink-0 rounded-md bg-warning/15 px-3 py-1.5 text-[12px] font-medium text-warning hover:bg-warning/20"
            >
              {captions.newTranscription.settings.goToModels}
            </button>
          </div>
        </div>
      )}

      {/* Core Settings */}
      <div className="glass-panel relative z-30 rounded-xl divide-y divide-border/50">
        <div className="px-5">
          <SettingRow
            icon={Languages}
            label={settingRows.language.label}
            description={settingRows.language.description}
            tooltip={settingRows.language.tooltip}
          >
            <Select value={settings.language} onValueChange={(v) => update('language', v)}>
              <SelectTrigger className="w-[180px] h-9 text-[13px] bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[260px]">
                <div className="p-1">
                  <Input
                    value={languageSearch}
                    onChange={(event) => setLanguageSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder={captions.newTranscription.settings.languageSearchPlaceholder}
                    className="h-8 text-[12px]"
                  />
                </div>
                <div className="max-h-[240px] overflow-y-auto">
                  {filteredLanguages.length === 0 ? (
                    <p className="px-2 py-2 text-[12px] text-muted-foreground">
                      {captions.newTranscription.settings.noLanguageResults}
                    </p>
                  ) : (
                    filteredLanguages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value} className="text-[13px] mb-1">
                        {lang.label}
                      </SelectItem>
                    ))
                  )}
                </div>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>

        <div className="px-5">
          <SettingRow
            icon={Brain}
            label={settingRows.model.label}
            description={settingRows.model.description}
            tooltip={
              hasDownloadedModels
                ? settingRows.model.tooltip
                : captions.newTranscription.settings.noDownloadedModelsTooltip
            }
          >
            <Select value={settings.model} onValueChange={(v) => update('model', v)}>
              <SelectTrigger className="w-[180px] h-9 text-[13px]" disabled={!hasDownloadedModels}>
                <span className="truncate">{selectedModelLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {downloadedModels.map((m) => (
                  <SelectItem key={m.id} value={m.name} className="text-[13px] mb-1">
                    <div className="flex items-center gap-2">{getDownloadedModelLabel(m)}</div>
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
                const m = WHISPER_CATALOG_MODELS.find((x) => x.id === settings.model)
                const downloadedModel = downloadedModels.find((x) => x.name === settings.model)
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
                ) : downloadedModel ? (
                  <>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.speed}
                      </span>
                      <span className="text-[13px] font-mono font-medium">-</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.accuracy}
                      </span>
                      <span className="text-[13px] font-medium">-</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.vram}
                      </span>
                      <span className="text-[13px] font-mono font-medium">-</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                        {captions.newTranscription.settings.modelDetails.note}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {downloadedModel.source}
                      </span>
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
      <div className="glass-panel relative z-10 rounded-xl divide-y divide-border/50">
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
          {settings.diarization && !hfToken && (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-[12px] text-destructive">
                Diarization requires a HuggingFace token.{' '}
                <button
                  type="button"
                  onClick={() => navigate('settings')}
                  className="underline hover:no-underline"
                >
                  Add it in Settings
                </button>
                .
              </p>
            </div>
          )}
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
          <div className="glass-panel relative z-0 rounded-xl divide-y divide-border/50">
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
