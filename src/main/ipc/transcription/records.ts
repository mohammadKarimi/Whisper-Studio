import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { IPC_CHANNELS, type TranscriptionRecord } from '../../../shared/ipc'
import { parseWhisperJson } from '../../parser'
import { getOutputDirectory } from '../../paths'
import { readSettings } from '../app/settings-handlers'

export function registerRecordHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.listTranscriptions, async (): Promise<TranscriptionRecord[]> => {
    const settings = await readSettings()
    const exportsDir = settings.defaultOutputDirectory ?? getOutputDirectory()
    const entries = await readdir(exportsDir, { withFileTypes: true }).catch(() => [])
    const records: TranscriptionRecord[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const metaPath = join(exportsDir, entry.name, 'whisper-studio.json')
      try {
        const raw = await readFile(metaPath, 'utf8')
        const rec = JSON.parse(raw) as TranscriptionRecord
        if (!rec.segments || rec.segments.length === 0) {
          const parseResult = await parseWhisperJson(
            join(exportsDir, entry.name),
            rec.sourceFileName
          )
          if (parseResult.ok) {
            rec.segments = parseResult.value.segments
            if (parseResult.value.segments.length > 0) {
              await writeFile(metaPath, JSON.stringify(rec, null, 2), 'utf8').catch(() => undefined)
            }
          }
        }
        records.push(rec)
      } catch {
        // skip folders without valid metadata
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt)
  })

  ipcMain.handle(
    IPC_CHANNELS.deleteTranscription,
    async (_event: IpcMainInvokeEvent, id: string): Promise<{ ok: boolean }> => {
      // Guard: id must be a plain folder name with no path separators
      if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
        return { ok: false }
      }
      const settings = await readSettings()
      const dir = join(settings.defaultOutputDirectory ?? getOutputDirectory(), id)
      await rm(dir, { force: true, recursive: true }).catch(() => undefined)
      return { ok: true }
    }
  )
}
