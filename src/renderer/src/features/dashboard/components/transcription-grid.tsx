import { useEffect, useState } from 'react'
import type { DesktopApi, TranscriptionRecord } from '@shared/ipc'
import { Mic, Clock, FileAudio, Trash2, Loader2, FolderOpen } from 'lucide-react'
import { setStudioRecord } from '@/lib/studio-store'
import { captions } from '@/lib/strings'
import { useAppRoute } from '@/app/use-app-route'
import { Button } from '@/components/ui/button'

const ACCENTS = [
  'from-primary/20 to-primary/5',
  'from-chart-1/20 to-chart-1/5',
  'from-chart-2/20 to-chart-2/5',
  'from-warning/20 to-warning/5',
  'from-chart-4/20 to-chart-4/5',
  'from-chart-5/20 to-chart-5/5'
]

function formatRelativeDate(ts: number): string {
  const timeCaptions = captions.dashboard.transcriptionGrid.relativeTime
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 2) return timeCaptions.justNow
  if (minutes < 60) return `${minutes}${timeCaptions.minutesSuffix}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}${timeCaptions.hoursSuffix}`
  const days = Math.floor(hours / 24)
  if (days === 1) return timeCaptions.yesterday
  if (days < 7) return `${days}${timeCaptions.daysSuffix}`
  return new Date(ts).toLocaleDateString()
}

function getAccent(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return ACCENTS[Math.abs(hash) % ACCENTS.length]
}

interface TranscriptionGridProps {
  desktop: DesktopApi
}

export default function TranscriptionGrid({ desktop }: TranscriptionGridProps) {
  const [records, setRecords] = useState<TranscriptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { navigateTo } = useAppRoute()

  function openInStudio(item: TranscriptionRecord) {
    setStudioRecord(item)
    navigateTo('studio')
  }

  useEffect(() => {
    desktop
      .listTranscriptions()
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [desktop])

  async function handleDelete(id: string) {
    setConfirmId(null)
    setDeletingId(id)
    await desktop.deleteTranscription(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        {captions.dashboard.transcriptionGrid.loading}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center">
        <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {captions.dashboard.transcriptionGrid.empty.title}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {captions.dashboard.transcriptionGrid.empty.subtitle}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Confirmation modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-[15px] font-semibold mb-1">
              {captions.dashboard.transcriptionGrid.confirmDelete.title}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-5">
              {captions.dashboard.transcriptionGrid.confirmDelete.description}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>
                {captions.dashboard.transcriptionGrid.confirmDelete.cancel}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void handleDelete(confirmId)}>
                {captions.dashboard.transcriptionGrid.confirmDelete.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {captions.dashboard.transcriptionGrid.header.title}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {records.length}{' '}
            {records.length === 1
              ? captions.dashboard.transcriptionGrid.header.singular
              : captions.dashboard.transcriptionGrid.header.plural}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {records.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all"
          >
            {/* Gradient header */}
            <div
              className={`h-20 bg-gradient-to-br ${getAccent(item.id)} relative overflow-hidden`}
            >
              <div className="absolute inset-0 flex items-center justify-end pr-4">
                <Mic className="w-12 h-12 text-foreground/5 group-hover:text-primary/10 transition-colors" />
              </div>
              <div className="absolute top-3 left-4 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 backdrop-blur-sm">
                <FileAudio className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {item.sourceFileName.split('.').pop() ?? '—'}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                {deletingId === item.id ? (
                  <div className="p-1.5 rounded-md bg-background/60 backdrop-blur-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmId(item.id)
                    }}
                    className="p-1.5 rounded-md bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <button onClick={() => openInStudio(item)} className="block w-full text-left p-4">
              <h3 className="text-[13px] font-medium truncate group-hover:text-primary transition-colors mb-2">
                {item.sourceFileName}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeDate(item.createdAt)}
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span className="uppercase">{item.model}</span>
                {item.outputFiles.length > 0 && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{item.outputFiles.map((f) => f.format.toUpperCase()).join(', ')}</span>
                  </>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
