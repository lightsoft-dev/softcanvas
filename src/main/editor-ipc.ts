import { ipcMain, type BrowserWindow, type WebContents } from 'electron'
import { runEdit, type EditScope, type EditOutcome } from './editor'

let active: AbortController | null = null

function send(wc: WebContents | undefined, channel: string, payload: unknown): void {
  if (wc && !wc.isDestroyed()) wc.send(channel, payload)
}

export interface EditRequest {
  projectPath: string
  prompt: string
  scope: EditScope
}

export function registerEditorIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('edit:run', async (_e, req: EditRequest): Promise<EditOutcome> => {
    const wc = getWindow()?.webContents
    const onProgress = (line: string): void => send(wc, 'edit:progress', { line })

    active?.abort()
    active = new AbortController()
    try {
      const out = await runEdit(req.projectPath, req.prompt, req.scope, { onProgress }, active)
      onProgress(`done — ${out.changedFiles.length} file(s) changed`)
      return out
    } catch (err) {
      const error = String((err as Error)?.message ?? err)
      onProgress(`error: ${error}`)
      return { ok: false, summary: '', changedFiles: [], error }
    } finally {
      active = null
    }
  })

  ipcMain.handle('edit:cancel', async () => {
    active?.abort()
    active = null
    return { cancelled: true }
  })
}
