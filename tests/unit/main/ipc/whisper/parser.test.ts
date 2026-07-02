import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest'
import { join } from 'node:path'
import * as fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import { parseWhisperJson } from '@main/parser'

vi.mock('node:fs/promises')
vi.mock('node:fs')

const mockReadFile = fs.readFile as MockInstance
const mockStatSync = fsSync.statSync as MockInstance

const VALID_JSON = JSON.stringify({
  segments: [
    { id: 1, start: 0, end: 2.5, text: '  Hello world  ' },
    { id: 2, start: 2.5, end: 5, text: 'Second line' }
  ]
})

beforeEach(() => {
  vi.clearAllMocks()
  mockStatSync.mockReturnValue({ size: 1234 })
})

describe('parseWhisperJson()', () => {
  it('returns ok with parsed segments on valid JSON', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)

    const result = await parseWhisperJson('/out', 'audio.mp3')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.segments).toHaveLength(2)
    expect(result.value.segments[0]).toMatchObject({
      id: 1,
      start: 0,
      end: 2.5,
      text: 'Hello world'
    })
  })

  it('trims whitespace from segment text', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)

    const result = await parseWhisperJson('/out', 'audio.mp3')
    if (!result.ok) throw new Error('expected ok')

    expect(result.value.segments[0].text).toBe('Hello world')
  })

  it('re-indexes segment ids sequentially starting at 1', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)

    const result = await parseWhisperJson('/out', 'audio.mp3')
    if (!result.ok) throw new Error('expected ok')

    expect(result.value.segments[0].id).toBe(1)
    expect(result.value.segments[1].id).toBe(2)
  })

  it('resolves the json path from outputDir and sourceFileName', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)

    await parseWhisperJson('/some/output', 'recording.wav')

    expect(mockReadFile).toHaveBeenCalledWith(join('/some/output', 'recording.json'), 'utf8')
  })

  it('strips the source file extension when building the json path', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)

    await parseWhisperJson('/out', 'my.audio.file.mp4')

    expect(mockReadFile).toHaveBeenCalledWith(join('/out', 'my.audio.file.json'), 'utf8')
  })

  it('populates jsonFile with path and size', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)
    mockStatSync.mockReturnValue({ size: 9876 })

    const result = await parseWhisperJson('/out', 'audio.mp3')
    if (!result.ok) throw new Error('expected ok')

    expect(result.value.jsonFile).toMatchObject({
      format: 'json',
      path: join('/out', 'audio.json'),
      sizeBytes: 9876
    })
  })

  it('handles segments array being absent (returns empty array)', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({}))

    const result = await parseWhisperJson('/out', 'audio.mp3')
    if (!result.ok) throw new Error('expected ok')

    expect(result.value.segments).toHaveLength(0)
  })

  it('returns err when the file does not exist', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

    const result = await parseWhisperJson('/out', 'audio.mp3')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('ENOENT')
  })

  it('returns err when the JSON is malformed', async () => {
    mockReadFile.mockResolvedValue('{ not valid json }}}')

    const result = await parseWhisperJson('/out', 'audio.mp3')

    expect(result.ok).toBe(false)
  })

  it('getFileSize returns 0 when statSync throws', async () => {
    mockReadFile.mockResolvedValue(VALID_JSON)
    mockStatSync.mockImplementation(() => {
      throw new Error('no such file')
    })

    const result = await parseWhisperJson('/out', 'audio.mp3')
    if (!result.ok) throw new Error('expected ok')

    expect(result.value.jsonFile?.sizeBytes).toBe(0)
  })
})
