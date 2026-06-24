import { Fragment, useState } from 'react'
import { useNavigate } from '@/app/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { captions } from '@/captions'
import StepFiles, { type TranscriptionFile } from './components/files-step'
import StepSettings, { type TranscriptionSettings } from './components/settings-step'
import StepOutput from './components/output-step'
import Processing from './components/processing-step'
import { ArrowLeft, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'

const STEPS = captions.newTranscription.steps

export default function NewTranscription() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<TranscriptionFile[]>(() =>
    captions.newTranscription.initialFiles.map((file) => ({ ...file }))
  )
  const [settings, setSettings] = useState<TranscriptionSettings>({
    ...captions.newTranscription.initialSettings
  })
  const [outputFormats, setOutputFormats] = useState<string[]>([
    ...captions.newTranscription.initialOutputFormats
  ])
  const [exportMode, setExportMode] = useState(captions.newTranscription.initialExportMode)

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
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
        {STEPS.map((s, i) => (
          <Fragment key={s.id}>
            <button
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all text-left
                ${
                  step === s.id
                    ? 'bg-primary/10 border border-primary/20'
                    : step > s.id
                      ? 'bg-secondary/50 border border-transparent'
                      : 'border border-transparent opacity-50'
                }`}
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
                <p className="text-[10px] text-muted-foreground hidden sm:block">{s.description}</p>
              </div>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/30" />}
          </Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && <StepFiles files={files} setFiles={setFiles} />}
          {step === 2 && <StepSettings settings={settings} setSettings={setSettings} />}
          {step === 3 && (
            <StepOutput
              outputFormats={outputFormats}
              setOutputFormats={setOutputFormats}
              exportMode={exportMode}
              setExportMode={setExportMode}
            />
          )}
          {step === 4 && <Processing />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < 4 && (
        <div className="flex items-center justify-between mt-8 pt-6">
          <Button
            variant="ghost"
            onClick={() => (step > 1 ? setStep(step - 1) : navigate('/'))}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1
              ? captions.newTranscription.navigation.back
              : captions.newTranscription.navigation.cancel}
          </Button>
          <div className="flex items-center gap-3">
            {step < 3 && (
              <Button onClick={() => setStep(step + 1)} className="gap-2">
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
