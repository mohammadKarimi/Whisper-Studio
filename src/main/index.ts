import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { registerSystemHandlers } from './ipc/system'
import { registerWhisperHandlers } from './ipc/whisper'
import { IPC_CHANNELS } from '../shared/ipc'

let mainWindow: BrowserWindow | null = null

const isDevelopment = process.env.NODE_ENV === 'development'

function isAllowedNavigation(navigationUrl: string): boolean {
  if (navigationUrl.startsWith('file://')) {
    return true
  }

  if (!isDevelopment || !process.env.ELECTRON_RENDERER_URL) {
    return false
  }

  return new URL(navigationUrl).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'WhisperX',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 16, y: 14 },
    backgroundColor: '#18191f',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('maximize', () => {
    window.webContents.send(IPC_CHANNELS.windowStateChanged, true)
  })

  window.on('unmaximize', () => {
    window.webContents.send(IPC_CHANNELS.windowStateChanged, false)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  registerSystemHandlers(() => mainWindow)
  registerWhisperHandlers()

  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigation(navigationUrl)) {
      event.preventDefault()
    }
  })
})

ipcMain.on('renderer-ready', () => {
  mainWindow?.webContents.send('main-ready')
})
