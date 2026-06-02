import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerDialogIpc } from './dialog-ipc'
import { registerStoreIpc } from './store-ipc'
import { registerDevServerIpc, disposeDevServer } from './devserver-ipc'
import { registerDiscoveryIpc } from './discovery-ipc'
import { registerEditorIpc } from './editor-ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true, // REQUIRED — isolate preload/renderer worlds
      nodeIntegration: false, // REQUIRED — no Node in the trusted renderer
      sandbox: false, // false so the preload can import @electron-toolkit/preload (node-style ESM)
      webviewTag: true // REQUIRED — enables <webview>; disabled by default since Electron 5
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // window.open / target=_blank inside the TRUSTED renderer → OS browser, not a new Electron window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.lightsoft.softcanvas')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // Register all IPC before creating the window.
  registerDialogIpc()
  registerStoreIpc()
  registerDevServerIpc(() => mainWindow)
  registerDiscoveryIpc(() => mainWindow)
  registerEditorIpc(() => mainWindow)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// CRITICAL: kill the dev-server process tree before fully quitting (gotcha §7).
let quitting = false
app.on('before-quit', async (ev) => {
  if (quitting) return
  ev.preventDefault()
  quitting = true
  await disposeDevServer()
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
