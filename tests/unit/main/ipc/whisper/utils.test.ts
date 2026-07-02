import { describe, it, expect } from 'vitest'
import { normalizeLanguage, sanitizeFileName, getTimestamp } from '@main/ipc/utils'

describe('normalizeLanguage()', () => {
  it('returns null for empty string', () => {
    expect(normalizeLanguage('')).toBeNull()
  })

  it('returns null for "auto"', () => {
    expect(normalizeLanguage('auto')).toBeNull()
  })

  it('returns null for "Auto" (case insensitive)', () => {
    expect(normalizeLanguage('Auto')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(normalizeLanguage('   ')).toBeNull()
  })

  it('passes through valid 2-letter ISO codes', () => {
    expect(normalizeLanguage('en')).toBe('en')
    expect(normalizeLanguage('fr')).toBe('fr')
    expect(normalizeLanguage('de')).toBe('de')
  })

  it('passes through valid 3-letter ISO codes', () => {
    expect(normalizeLanguage('haw')).toBe('haw')
    expect(normalizeLanguage('yue')).toBe('yue')
  })

  it('normalises known full language names to ISO code', () => {
    expect(normalizeLanguage('english')).toBe('en')
    expect(normalizeLanguage('French')).toBe('fr')
    expect(normalizeLanguage('GERMAN')).toBe('de')
    expect(normalizeLanguage('Chinese')).toBe('zh')
  })

  it('returns null for unknown language names', () => {
    expect(normalizeLanguage('klingon')).toBeNull()
    expect(normalizeLanguage('xyz123')).toBeNull()
  })

  it('trims leading and trailing whitespace before matching', () => {
    expect(normalizeLanguage('  en  ')).toBe('en')
    expect(normalizeLanguage('  english  ')).toBe('en')
  })
})

describe('sanitizeFileName()', () => {
  it('returns an unchanged safe filename', () => {
    expect(sanitizeFileName('my_file')).toBe('my_file')
    expect(sanitizeFileName('recording-2024')).toBe('recording-2024')
  })

  it('replaces forbidden characters with hyphens', () => {
    const forbidden = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    for (const char of forbidden) {
      expect(sanitizeFileName(`file${char}name`)).toBe('file-name')
    }
  })

  it('replaces control characters (charCode < 32) with hyphens', () => {
    expect(sanitizeFileName('file\x00name')).toBe('file-name')
    expect(sanitizeFileName('file\x1fname')).toBe('file-name')
  })

  it('collapses multiple spaces into one', () => {
    expect(sanitizeFileName('hello   world')).toBe('hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeFileName('  hello  ')).toBe('hello')
  })

  it('handles a fully unsafe string', () => {
    // '<>:"/\\|?*' = 9 chars, each replaced with '-'
    expect(sanitizeFileName('  <>:"/\\|?*  ')).toBe('---------')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeFileName('')).toBe('')
  })

  it('preserves dots and underscores', () => {
    expect(sanitizeFileName('audio.file_name')).toBe('audio.file_name')
  })
})

describe('getTimestamp()', () => {
  it('returns a non-empty string', () => {
    expect(getTimestamp().length).toBeGreaterThan(0)
  })

  it('contains no colons or dots from ISO format (only the date-time separator dash)', () => {
    const ts = getTimestamp()
    expect(ts).not.toMatch(/[:.]/)
  })

  it('matches the expected format YYYYMMDDTHHmmss → YYYYMMDD-HHmmss', () => {
    expect(getTimestamp()).toMatch(/^\d{8}-\d{6}$/)
  })

  it('returns a different value if called at different times', async () => {
    const t1 = getTimestamp()
    await new Promise((r) => setTimeout(r, 1100))
    const t2 = getTimestamp()
    expect(t1).not.toBe(t2)
  })
})
