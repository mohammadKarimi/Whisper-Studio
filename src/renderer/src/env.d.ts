import type { DesktopApi } from '../../../shared/ipc'

declare global {
  interface Window {
    desktop?: DesktopApi
  }
}

export {}
