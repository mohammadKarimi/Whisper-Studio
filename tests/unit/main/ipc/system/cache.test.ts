import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createScopedCache } from '@main/cache'

describe('createScopedCache()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the fetcher on the first get()', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const cache = createScopedCache(fetcher, 5000)

    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('returns the fetched value', async () => {
    const cache = createScopedCache(vi.fn().mockResolvedValue(42), 5000)
    expect(await cache.get()).toBe(42)
  })

  it('returns cached value on second call within duration', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')
    const cache = createScopedCache(fetcher, 5000)

    await cache.get()
    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after the cache duration expires', async () => {
    const fetcher = vi.fn().mockResolvedValue('fresh')
    const cache = createScopedCache(fetcher, 5000)

    await cache.get()
    vi.advanceTimersByTime(5001)
    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does NOT re-fetch before the cache duration expires', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const cache = createScopedCache(fetcher, 5000)

    await cache.get()
    vi.advanceTimersByTime(4999)
    await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests into a single fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue('shared')
    const cache = createScopedCache(fetcher, 5000)

    const [a, b, c] = await Promise.all([cache.get(), cache.get(), cache.get()])

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(a).toBe('shared')
    expect(b).toBe('shared')
    expect(c).toBe('shared')
  })

  it('forces a fresh fetch after invalidate()', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1')
    const cache = createScopedCache(fetcher, 5000)

    await cache.get()
    cache.invalidate()
    fetcher.mockResolvedValue('v2')
    const result = await cache.get()

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result).toBe('v2')
  })

  it('does not use stale value after invalidate even within duration', async () => {
    const fetcher = vi.fn().mockResolvedValue('stale')
    const cache = createScopedCache(fetcher, 60000)

    await cache.get()
    cache.invalidate()
    fetcher.mockResolvedValue('fresh')

    expect(await cache.get()).toBe('fresh')
  })

  it('propagates fetch errors to callers', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network failure'))
    const cache = createScopedCache(fetcher, 5000)

    await expect(cache.get()).rejects.toThrow('network failure')
  })

  it('clears the in-flight request after an error so the next call retries', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce('ok')

    const cache = createScopedCache(fetcher, 5000)

    await expect(cache.get()).rejects.toThrow('first failure')
    expect(await cache.get()).toBe('ok')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
