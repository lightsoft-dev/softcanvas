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
  title?: string
  filePath?: string
  screenshot?: string
}

export interface DiscoveredScreen {
  route: string
  title: string
  filePath?: string
}
export interface DiscoverResult {
  ok: boolean
  screens: DiscoveredScreen[]
  error?: string
}
export interface DiscoveryProgressEvent {
  line: string
}

export type EditScope = { type: 'project' } | { type: 'screen'; route: string; filePath?: string }
export interface EditOutcome {
  ok: boolean
  summary: string
  changedFiles: string[]
  error?: string
}
export interface EditProgressEvent {
  line: string
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
  runDiscovery(projectPath: string): Promise<DiscoverResult>
  cancelDiscovery(): Promise<{ cancelled: true }>
  onDiscoveryProgress(cb: (p: DiscoveryProgressEvent) => void): Unsub
  runEdit(req: { projectPath: string; prompt: string; scope: EditScope }): Promise<EditOutcome>
  cancelEdit(): Promise<{ cancelled: true }>
  onEditProgress(cb: (p: EditProgressEvent) => void): Unsub
}

declare global {
  interface Window {
    api: SoftcanvasApi
  }
}
