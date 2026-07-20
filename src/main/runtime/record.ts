import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import type { RuntimeArtifact } from '../../shared/ipc'
import { getActiveRuntimeRecordPath, getRuntimesPath } from '../paths'

export interface ActiveRuntimeRecord {
  artifact: RuntimeArtifact
  installedAt: number
}

export async function readActiveRecord(): Promise<ActiveRuntimeRecord | null> {
  try {
    return JSON.parse(await readFile(getActiveRuntimeRecordPath(), 'utf8')) as ActiveRuntimeRecord
  } catch {
    return null
  }
}

export async function writeActiveRecord(record: ActiveRuntimeRecord): Promise<void> {
  await mkdir(getRuntimesPath(), { recursive: true })
  await writeFile(getActiveRuntimeRecordPath(), JSON.stringify(record, null, 2), 'utf8')
}

export async function clearActiveRecord(): Promise<void> {
  await rm(getActiveRuntimeRecordPath(), { force: true })
}
