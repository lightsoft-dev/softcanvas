import { ipcMain, type BrowserWindow, type WebContents } from 'electron'
import { DevServer, type DevServerOptions } from './devserver'

let server: DevServer | null = null

function send(wc: WebContents | undefined, channel: string, payload: unknown): void {
  if (wc && !wc.isDestroyed()) wc.send(channel, payload)
}

export function registerDevServerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('devserver:start', async (_e, opts: DevServerOptions) => {
    // Only one dev server at a time in Phase 1. Replace any existing.
    if (server) {
      await server.stop()
      server = null
    }
    const wc = getWindow()?.webContents
    server = new DevServer(opts)
    server.on('line', (p) => send(wc, 'devserver:line', p))
    server.on('ready', (p) => send(wc, 'devserver:ready', p))
    server.on('exit', (p) => send(wc, 'devserver:exit', p))
    server.on('error', (err: Error) =>
      send(wc, 'devserver:error', { message: String(err?.message ?? err) })
    )
    server.start()
    return { started: true }
  })

  ipcMain.handle('devserver:stop', async () => {
    await server?.stop()
    server = null
    return { stopped: true }
  })
}

/** Called from app before-quit to guarantee no orphaned processes. */
export async function disposeDevServer(): Promise<void> {
  await server?.stop()
  server = null
}
