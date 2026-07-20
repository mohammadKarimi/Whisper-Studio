import { useEffect, useState } from 'react'
import logoUrl from '../logo.svg'
import { BrandFooter, BrandedBackdrop } from './branded-page'

const MIN_SPLASH_MS = 4500
const FADE_MS = 500

interface SplashScreenProps {
  ready: boolean
  version?: string
}

export function SplashScreen({ ready, version }: SplashScreenProps): JSX.Element | null {
  const [mounted, setMounted] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [startedAt] = useState(() => performance.now())
  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
  }, [])

  useEffect(() => {
    if (!ready) {
      setMounted(true)
      setIsFading(false)
      return
    }

    const remainingMs = Math.max(0, MIN_SPLASH_MS - (performance.now() - startedAt))
    const fadeTimeout = window.setTimeout(() => setIsFading(true), remainingMs)
    const unmountTimeout = window.setTimeout(() => setMounted(false), remainingMs + FADE_MS)

    return () => {
      window.clearTimeout(fadeTimeout)
      window.clearTimeout(unmountTimeout)
    }
  }, [ready, startedAt])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[10000] grid place-items-center overflow-hidden bg-background text-foreground transition-opacity duration-500 ${
        isFading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-busy={!ready}
    >
      <BrandedBackdrop />
      <div className="relative flex flex-col items-center gap-4 px-8 text-center">
        <img src={logoUrl} className="size-24" alt="" />

        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-normal">Whisper Studio</h1>
          <p className="text-xs text-muted-foreground">Starting local workspace</p>
        </div>

        <div className="h-1 w-56 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-3 animate-[splash-progress_1.3s_ease-in-out_infinite]" />
        </div>
      </div>

      <BrandFooter className="absolute bottom-4 w-full" version={version} />
    </div>
  )
}
