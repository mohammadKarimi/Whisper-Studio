import { readFile } from 'node:fs/promises'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import type { WhisperOutputFile, Segment } from '../shared/ipc'
import { type Result, ok, err } from '../shared/types'

export function getFileSize(path: string): number {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

export type ParsedOutput = { segments: Segment[]; jsonFile: WhisperOutputFile | null }

export async function parseWhisperJson(
  outputDir: string,
  sourceFileName: string
): Promise<Result<ParsedOutput, Error>> {
  const baseName = sourceFileName.replace(/\.[^.]+$/, '')
  const jsonPath = join(outputDir, `${baseName}.json`)

  try {
    const raw = await readFile(jsonPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      segments?: Array<{ id: number; start: number; end: number; text: string; speaker?: string }>
    }
    const segments: Segment[] = (parsed.segments ?? []).map((s, i) => ({
      id: i + 1,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      ...(s.speaker ? { speaker: s.speaker } : {})
    }))
    const jsonFile: WhisperOutputFile = {
      format: 'json',
      path: jsonPath,
      sizeBytes: getFileSize(jsonPath)
    }
    return ok({ segments, jsonFile })
  } catch (parseErr) {
    return err(parseErr instanceof Error ? parseErr : new Error(String(parseErr)))
  }
}
