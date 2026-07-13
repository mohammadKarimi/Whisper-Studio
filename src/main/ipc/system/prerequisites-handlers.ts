import { ipcMain } from 'electron'
import type {
  PrerequisiteCheck,
  PrerequisiteCheckId,
  PrerequisiteInstallProgress,
  PrerequisiteInstallResult
} from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { installPrerequisite } from '../../prerequisites/installers'
import { parsePipProgressLine } from '../../prerequisites/pip'
import { prerequisiteIds } from '../../prerequisites/config'
import { getCachedPrerequisites } from '../../prerequisites/service'

export function registerPrerequisiteHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.prerequisites, async (): Promise<PrerequisiteCheck[]> => {
    return getCachedPrerequisites()
  })

  ipcMain.handle(
    IPC_CHANNELS.prerequisiteInstall,
    async (event, id: PrerequisiteCheckId): Promise<PrerequisiteInstallResult> => {
      if (!prerequisiteIds.includes(id)) {
        return { action: 'opened', id, ok: false, stderr: 'Unknown prerequisite.' }
      }

      const onLine = (line: string): void => {
        const parsed = parsePipProgressLine(line)
        const progress: PrerequisiteInstallProgress = { id, line, ...parsed }
        event.sender.send(IPC_CHANNELS.prerequisiteInstallProgress, progress)
      }

      return installPrerequisite(id, onLine)
    }
  )
}
