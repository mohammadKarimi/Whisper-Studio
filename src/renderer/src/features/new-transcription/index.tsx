import { Fragment, useState, useEffect } from 'react'
import type { AppApi, ModelApi, SettingsApi, TranscriptionApi } from '@shared/ipc'
import { useNavigate } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { captions } from '@/lib/strings'
import StepFiles, { type TranscriptionFile } from './components/files-step'
import StepSettings, { type TranscriptionSettings } from './components/settings-step'
import StepOutput from './components/output-step'
import Processing from './components/processing-step'
import { ArrowLeft, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'

const STEPS = captions.newTranscription.steps

interface NewTranscriptionProps {
  desktop: AppApi & ModelApi & TranscriptionApi & Pick<SettingsApi, 'getSettings'>
}

export default function NewTranscription({ desktop }: NewTranscriptionProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<TranscriptionFile | null>(null)
  const [settings, setSettings] = useState<TranscriptionSettings>({
    ...captions.newTranscription.initialSettings
  })
  const [outputFormats, setOutputFormats] = useState<string[]>(() => [
    ...captions.newTranscription.initialOutputFormats
  ])

  useEffect(() => {
    void desktop.getSettings().then((s) => {
      setSettings((prev) => ({
        ...prev,
        language: s.defaultLanguage ?? prev.language,
        model: s.defaultModel ?? prev.model,
        compute: s.defaultCompute !== 'auto' ? s.defaultCompute : prev.compute
      }))
      if (s.defaultExportFormats.length > 0) {
        setOutputFormats(s.defaultExportFormats)
      }
    })
  }, [desktop])

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('dashboard')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {captions.newTranscription.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {captions.newTranscription.subtitle}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const isAccessible = s.id <= step || (s.id > 1 && !!file)
          return (
            <Fragment key={s.id}>
              <button
                onClick={() => isAccessible && setStep(s.id)}
                disabled={!isAccessible}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all text-left
                ${
                  step === s.id
                    ? 'bg-primary/10 border border-primary/20'
                    : step > s.id
                      ? 'bg-secondary/50 border border-transparent'
                      : 'border border-transparent opacity-50'
                } disabled:cursor-not-allowed`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold
                ${step === s.id ? 'bg-primary text-primary-foreground' : step > s.id ? 'bg-success text-white' : 'bg-secondary text-muted-foreground'}`}
                >
                  {step > s.id ? captions.newTranscription.completedStepMarker : s.id}
                </div>
                <div>
                  <p
                    className={`text-[13px] font-medium ${step === s.id ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">
                    {s.description}
                  </p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* Step Content */}
      <div key={step}>
        {step === 1 && <StepFiles desktop={desktop} file={file} setFile={setFile} />}
        {step === 2 && (
          <StepSettings desktop={desktop} settings={settings} setSettings={setSettings} />
        )}
        {step === 3 && (
          <StepOutput
            file={file}
            outputFormats={outputFormats}
            setOutputFormats={setOutputFormats}
            settings={settings}
          />
        )}
        {step === 4 && (
          <Processing
            desktop={desktop}
            file={file}
            outputFormats={outputFormats}
            settings={settings}
          />
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="flex items-center justify-between mt-8 pt-6">
          <Button
            variant="ghost"
            onClick={() => (step > 1 ? setStep(step - 1) : navigate('dashboard'))}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1
              ? captions.newTranscription.navigation.back
              : captions.newTranscription.navigation.cancel}
          </Button>
          <div className="flex items-center gap-3">
            {step < 3 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !file) || (step === 2 && !settings.model)}
                className="gap-2"
              >
                {captions.newTranscription.navigation.continue} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={() => setStep(4)} className="gap-2 glow-primary">
                <Sparkles className="w-4 h-4" />
                {captions.newTranscription.navigation.startTranscription}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
