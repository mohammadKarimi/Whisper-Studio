import { useState, useEffect } from 'react'
import { Link } from '@/app/navigation'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { captions } from '@/captions'
import { Loader2, CheckCircle2, Circle, Pause, X, ChevronRight, FileAudio } from 'lucide-react'

const STAGES = captions.processing.stages

export default function Processing() {
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(2)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer)
          return 100
        }
        return p + 0.3
      })
    }, 100)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (progress < 10) setCurrentStage(0)
    else if (progress < 20) setCurrentStage(1)
    else if (progress < 80) setCurrentStage(2)
    else if (progress < 95) setCurrentStage(3)
    else setCurrentStage(4)
  }, [progress])

  const isComplete = progress >= 100

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">{captions.processing.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isComplete ? captions.processing.status.complete : captions.processing.status.inProgress}
        </p>
      </div>

      {/* Current Job */}
      <div className="glass-panel rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <FileAudio className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-medium">{captions.processing.job.fileName}</p>
            <p className="text-[11px] text-muted-foreground">{captions.processing.job.details}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium">
              {isComplete ? captions.processing.progress.complete : STAGES[currentStage]?.label}
            </span>
            <span className="text-sm font-mono font-semibold text-primary">
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isComplete ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {isComplete
              ? captions.processing.progress.allStagesComplete
              : STAGES[currentStage]?.desc}
          </p>
        </div>
      </div>

      {/* Stages */}
      <div className="glass-panel rounded-2xl p-6 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {captions.processing.stagesTitle}
        </h3>
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStage && !isComplete
            const isDone = i < currentStage || isComplete
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-[13px] font-medium ${isDone ? 'text-foreground' : isActive ? 'text-foreground' : 'text-muted-foreground/50'}`}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={`text-[11px] ${isDone || isActive ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}
                  >
                    {stage.desc}
                  </p>
                </div>
                {isDone && (
                  <span className="text-[11px] text-muted-foreground font-mono text-success">
                    {captions.processing.stageStatus.done}
                  </span>
                )}
                {isActive && (
                  <span className="text-[11px] text-primary font-mono">
                    {captions.processing.stageStatus.running}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isComplete && (
            <>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Pause className="w-3.5 h-3.5" /> {captions.processing.actions.pause}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive">
                <X className="w-3.5 h-3.5" /> {captions.processing.actions.cancel}
              </Button>
            </>
          )}
        </div>
        {isComplete && (
          <div className="flex gap-2">
            <Link to="/export">
              <Button variant="secondary" className="gap-2">
                {captions.processing.actions.export}
              </Button>
            </Link>
            <Link to="/studio">
              <Button className="gap-2">
                {captions.processing.actions.openInStudio} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
