import { ipcMain } from 'electron'
import type { CanvasLayout, AppSettings } from '../preload/index.d'
import { loadLayout, saveLayout, loadSettings, saveSettings } from './store'

export function registerStoreIpc(): void {
  ipcMain.handle('store:loadLayout', (_e, { projectKey }: { projectKey: string }) =>
    loadLayout(projectKey)
  )
  ipcMain.handle(
    'store:saveLayout',
    (_e, { projectKey, layout }: { projectKey: string; layout: CanvasLayout }) => {
      saveLayout(projectKey, layout)
      return { saved: true }
    }
  )
  ipcMain.handle('store:loadSettings', () => loadSettings())
  ipcMain.handle('store:saveSettings', (_e, { settings }: { settings: AppSettings }) => {
    saveSettings(settings)
    return { saved: true }
  })
}
