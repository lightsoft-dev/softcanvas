import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  ProjectInfo,
  DevServerStartRequest,
  DevServerStartResponse,
  DevServerLineEvent,
  DevServerReadyEvent,
  DevServerExitEvent,
  DevServerErrorEvent,
  CanvasLayout,
  AppSettings,
  DiscoverResult,
  DiscoveryProgressEvent,
  EditScope,
  EditOutcome,
  EditProgressEvent
} from './index.d'

type Unsub = () => void

function subscribe<T>(channel: string, cb: (payload: T) => void): Unsub {
  const listener = (_e: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  // ---- dialog ----
  pickProjectFolder: (): Promise<ProjectInfo | null> =>
    ipcRenderer.invoke('dialog:pickProjectFolder'),

  // ---- dev server ----
  startDevServer: (req: DevServerStartRequest): Promise<DevServerStartResponse> =>
    ipcRenderer.invoke('devserver:start', req),
  stopDevServer: (): Promise<{ stopped: true }> => ipcRenderer.invoke('devserver:stop'),

  onDevServerLine: (cb: (p: DevServerLineEvent) => void): Unsub =>
    subscribe('devserver:line', cb),
  onDevServerReady: (cb: (p: DevServerReadyEvent) => void): Unsub =>
    subscribe('devserver:ready', cb),
  onDevServerExit: (cb: (p: DevServerExitEvent) => void): Unsub =>
    subscribe('devserver:exit', cb),
  onDevServerError: (cb: (p: DevServerErrorEvent) => void): Unsub =>
    subscribe('devserver:error', cb),

  // ---- persistence ----
  loadLayout: (projectKey: string): Promise<CanvasLayout | null> =>
    ipcRenderer.invoke('store:loadLayout', { projectKey }),
  saveLayout: (projectKey: string, layout: CanvasLayout): Promise<{ saved: true }> =>
    ipcRenderer.invoke('store:saveLayout', { projectKey, layout }),
  loadSettings: (): Promise<AppSettings> => ipcRenderer.invoke('store:loadSettings'),
  saveSettings: (settings: AppSettings): Promise<{ saved: true }> =>
    ipcRenderer.invoke('store:saveSettings', { settings }),

  // ---- AI screen discovery ----
  runDiscovery: (projectPath: string): Promise<DiscoverResult> =>
    ipcRenderer.invoke('discovery:run', { projectPath }),
  cancelDiscovery: (): Promise<{ cancelled: true }> => ipcRenderer.invoke('discovery:cancel'),
  onDiscoveryProgress: (cb: (p: DiscoveryProgressEvent) => void): Unsub =>
    subscribe('discovery:progress', cb),

  // ---- AI edit agent ----
  runEdit: (req: {
    projectPath: string
    prompt: string
    scope: EditScope
  }): Promise<EditOutcome> => ipcRenderer.invoke('edit:run', req),
  cancelEdit: (): Promise<{ cancelled: true }> => ipcRenderer.invoke('edit:cancel'),
  onEditProgress: (cb: (p: EditProgressEvent) => void): Unsub => subscribe('edit:progress', cb)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore fallback only (contextIsolation off — not used in this app)
  window.api = api
}

export type SoftcanvasApi = typeof api
