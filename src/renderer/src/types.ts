// Renderer-side mirror of the IPC payload types. Kept byte-identical to the
// bodies in src/preload/index.d.ts (build spec §5.1) so renderer code does not
// reach into src/preload at runtime.

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

// Must be a `type` (not `interface`) so it satisfies React Flow 12's
// `Node<T extends Record<string, unknown>>` data constraint.
export type ScreenNodeData = {
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
