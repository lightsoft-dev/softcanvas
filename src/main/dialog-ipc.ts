import { ipcMain, dialog, BrowserWindow } from 'electron'
import { basename } from 'node:path'
import type { ProjectInfo } from '../preload/index.d'

export function registerDialogIpc(): void {
  ipcMain.handle('dialog:pickProjectFolder', async (): Promise<ProjectInfo | null> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      title: 'Open target web-app project',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const rootPath = result.filePaths[0]
    return { rootPath, name: basename(rootPath) }
  })
}
