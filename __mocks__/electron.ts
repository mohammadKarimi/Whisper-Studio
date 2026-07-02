import { vi } from 'vitest'

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeHandler: vi.fn()
}

export const shell = {
  openExternal: vi.fn()
}

export const app = {
  getVersion: vi.fn(() => '0.0.0'),
  getPath: vi.fn(() => '/tmp'),
  quit: vi.fn()
}

export const net = {
  fetch: vi.fn()
}

export default { ipcMain, shell, app, net }
