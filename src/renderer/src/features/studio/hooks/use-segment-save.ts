import { useState, useRef, useEffect } from 'react'
import type { DesktopApi, TranscriptionRecord } from '@shared/ipc'
import type { SrtSegment } from '@/lib/srt-parser'

type SaveStatus = 'idle' | 'saved' | 'error'

interface UseSegmentSaveResult {
  handleSave: () => Promise<void>
  isDirty: boolean
  isSaving: boolean
  markDirty: () => void
  saveStatus: SaveStatus
}

export function useSegmentSave(
  record: TranscriptionRecord | null,
  segments: SrtSegment[],
  desktop: DesktopApi,
  onSaved: (updated: TranscriptionRecord) => void
): UseSegmentSaveResult {
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Keep a ref so handleSave always reads the latest segments without stale closure
  const segmentsRef = useRef(segments)
  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  function markDirty(): void {
    setIsDirty(true)
    setSaveStatus('idle')
  }

  async function handleSave(): Promise<void> {
    if (!record) return
    setIsSaving(true)
    try {
      const settings = await desktop.getSettings()
      const sep = record.outputDirectory.includes('/') ? '/' : '\\'
      const baseDir =
        settings.defaultOutputDirectory ??
        record.outputDirectory.substring(0, record.outputDirectory.lastIndexOf(sep))
      const outputDirectory = `${baseDir}${sep}${record.id}`
      const metaPath = `${outputDirectory}${sep}whisper-studio.json`
      const speakerNames: Record<string, string> = {}
      for (const s of segmentsRef.current) {
        if (s.speaker && !speakerNames[s.speaker]) {
          speakerNames[s.speaker] = s.name
        }
      }
      const updatedRecord: TranscriptionRecord = {
        ...record,
        outputDirectory,
        editedAt: Date.now(),
        ...(Object.keys(speakerNames).length > 0 ? { speakerNames } : {}),
        segments: segmentsRef.current.map((s) => ({
          id: s.id,
          start: s.startSeconds,
          end: s.endSeconds,
          text: s.text,
          ...(s.speaker ? { speaker: s.speaker } : {})
        }))
      }
      await desktop.writeTextFile(metaPath, JSON.stringify(updatedRecord, null, 2))
      onSaved(updatedRecord)
      setIsDirty(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 4000)
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return { handleSave, isDirty, isSaving, markDirty, saveStatus }
}
