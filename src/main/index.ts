import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron'
import { open, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerSystemHandlers } from './ipc/system-registration'
import { registerWhisperHandlers } from './ipc/asr/index'
import { IPC_CHANNELS } from '../shared/ipc'

// Register a safe protocol for serving local media files from the renderer
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { secure: true, supportFetchAPI: true, stream: true } }
])

let mainWindow: BrowserWindow | null = null

const isDevelopment = process.env.NODE_ENV === 'development'

function getWindowIcon(): string {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  if (process.platform === 'win32') return join(base, 'icon.ico')
  if (process.platform === 'darwin') return join(base, 'icon.icns')
  return join(base, 'icons', '256x256.png')
}
const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === 'true'

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()

  switch (ext) {
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.m4a':
      return 'audio/mp4'
    case '.aac':
      return 'audio/aac'
    case '.ogg':
      return 'audio/ogg'
    case '.flac':
      return 'audio/flac'
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    default:
      return 'application/octet-stream'
  }
}

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
    title: 'Whisper Studio',
    icon: getWindowIcon(),
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
    if (shouldOpenDevTools) {
      window.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  protocol.handle('local-file', async (request) => {
    const filePath = decodeURIComponent(request.url.slice('local-file:///'.length))

    const rangeHeader = request.headers.get('range')

    if (!rangeHeader) {
      return net.fetch(pathToFileURL(filePath).toString(), {
        method: request.method,
        headers: request.headers
      })
    }

    const fileStats = await stat(filePath)
    const totalSize = fileStats.size
    const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim())

    if (!match) {
      return new Response(null, {
        status: 416,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${totalSize}`
        }
      })
    }

    const start = Number(match[1])
    const end = match[2] ? Number(match[2]) : totalSize - 1

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
      return new Response(null, {
        status: 416,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${totalSize}`
        }
      })
    }

    const clampedEnd = Math.min(end, totalSize - 1)
    const length = clampedEnd - start + 1
    const buffer = Buffer.alloc(length)
    const handle = await open(filePath, 'r')

    try {
      await handle.read(buffer, 0, length, start)
    } finally {
      await handle.close()
    }

    return new Response(request.method.toUpperCase() === 'HEAD' ? null : buffer, {
      status: 206,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(length),
        'Content-Range': `bytes ${start}-${clampedEnd}/${totalSize}`,
        'Content-Type': getMimeType(filePath)
      }
    })
  })

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
