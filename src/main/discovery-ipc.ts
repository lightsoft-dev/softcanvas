import { ipcMain, type BrowserWindow, type WebContents } from 'electron'
import { discoverScreens, type DiscoveredScreen } from './discovery'

let active: AbortController | null = null

function send(wc: WebContents | undefined, channel: string, payload: unknown): void {
  if (wc && !wc.isDestroyed()) wc.send(channel, payload)
}

export interface DiscoverResult {
  ok: boolean
  screens: DiscoveredScreen[]
  error?: string
}

export function registerDiscoveryIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    'discovery:run',
    async (_e, { projectPath }: { projectPath: string }): Promise<DiscoverResult> => {
      const wc = getWindow()?.webContents
      const onProgress = (line: string): void => send(wc, 'discovery:progress', { line })

      active?.abort()
      active = new AbortController()
      try {
        const screens = await discoverScreens(projectPath, { onProgress }, active)
        onProgress(`done — ${screens.length} screens`)
        return { ok: true, screens }
      } catch (err) {
        const message = String((err as Error)?.message ?? err)
        onProgress(`error: ${message}`)
        return { ok: false, screens: [], error: message }
      } finally {
        active = null
      }
    }
  )

  ipcMain.handle('discovery:cancel', async () => {
    active?.abort()
    active = null
    return { cancelled: true }
  })
}
