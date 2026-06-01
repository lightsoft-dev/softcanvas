// Shared payload types (the single source of truth for both processes) +
// the ambient window.api declaration.

export interface ProjectInfo {
  rootPath: string
  name: string
}

export type DevServerFlavor = 'vite' | 'next' | 'expo' | 'auto'

export interface DevServerStartRequest {
  cwd: string
  command?: string
  flavor?: DevServerFlavor
  readyTimeoutMs?: number
}
export interface DevServerStartResponse {
  started: boolean
}
export type DevServerStatus = 'stopped' | 'starting' | 'ready' | 'error'
export interface DevServerLineEvent {
  stream: 'stdout' | 'stderr'
  line: string
}
export interface DevServerReadyEvent {
  url: string
}
export interface DevServerExitEvent {
  code: number | null
  signal: string | null
}
export interface DevServerErrorEvent {
  message: string
}

export interface ScreenNodeData {
  url: string
  route: string
  width: number
  height: number
  screenshot?: string
}
export interface PersistedNode {
  id: string
  type: 'screen'
  position: { x: number; y: number }
  data: ScreenNodeData
  width?: number
  height?: number
}
export interface PersistedEdge {
  id: string
  source: string
  target: string
}
export interface CanvasLayout {
  version: 1
  nodes: PersistedNode[]
  edges: PersistedEdge[]
  viewport: { x: number; y: number; zoom: number }
}
export interface AppSettings {
  defaultCommand: string
  defaultFlavor: DevServerFlavor
  readyTimeoutMs: number
}

type Unsub = () => void

export interface SoftcanvasApi {
  pickProjectFolder(): Promise<ProjectInfo | null>
  startDevServer(req: DevServerStartRequest): Promise<DevServerStartResponse>
  stopDevServer(): Promise<{ stopped: true }>
  onDevServerLine(cb: (p: DevServerLineEvent) => void): Unsub
  onDevServerReady(cb: (p: DevServerReadyEvent) => void): Unsub
  onDevServerExit(cb: (p: DevServerExitEvent) => void): Unsub
  onDevServerError(cb: (p: DevServerErrorEvent) => void): Unsub
  loadLayout(projectKey: string): Promise<CanvasLayout | null>
  saveLayout(projectKey: string, layout: CanvasLayout): Promise<{ saved: true }>
  loadSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<{ saved: true }>
}

declare global {
  interface Window {
    api: SoftcanvasApi
  }
}
