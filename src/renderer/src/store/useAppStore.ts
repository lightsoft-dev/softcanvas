import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Viewport
} from '@xyflow/react'
import type {
  ProjectInfo,
  DevServerStatus,
  ScreenNodeData,
  AppSettings,
  CanvasLayout,
  DiscoveredScreen,
  EditScope
} from '../types'

export type ScreenNode = Node<ScreenNodeData, 'screen'>

interface AppState {
  // project
  project: ProjectInfo | null
  setProject: (p: ProjectInfo | null) => void

  // dev server
  devStatus: DevServerStatus
  devUrl: string | null
  devLog: string[]
  setDevStatus: (s: DevServerStatus) => void
  setDevUrl: (u: string | null) => void
  appendLog: (line: string) => void
  clearLog: () => void

  // settings
  settings: AppSettings | null
  setSettings: (s: AppSettings) => void

  // canvas
  nodes: ScreenNode[]
  edges: Edge[]
  viewport: Viewport
  onNodesChange: (changes: NodeChange<ScreenNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  setViewport: (v: Viewport) => void
  addScreenNode: (route: string, baseUrl: string) => void
  addScreens: (screens: DiscoveredScreen[], baseUrl: string) => number
  setNodeScreenshot: (id: string, dataUrl: string) => void

  // discovery
  discovering: boolean
  setDiscovering: (b: boolean) => void

  // edit agent
  editTarget: EditScope
  setEditTarget: (t: EditScope) => void
  editing: boolean
  setEditing: (b: boolean) => void
  reloadToken: number
  bumpReload: () => void
  hydrateCanvas: (layout: CanvasLayout) => void
  resetCanvas: () => void
}

const DEFAULT_NODE_SIZE = { width: 420, height: 720 }
const MAX_LOG_LINES = 1000

export const useAppStore = create<AppState>((set) => ({
  project: null,
  setProject: (project) => set({ project }),

  devStatus: 'stopped',
  devUrl: null,
  devLog: [],
  setDevStatus: (devStatus) => set({ devStatus }),
  setDevUrl: (devUrl) => set({ devUrl }),
  appendLog: (line) =>
    set((s) => {
      const next = [...s.devLog, line]
      return { devLog: next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next }
    }),
  clearLog: () => set({ devLog: [] }),

  settings: null,
  setSettings: (settings) => set({ settings }),

  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },

  onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  setViewport: (viewport) => set({ viewport }),

  addScreenNode: (route, baseUrl) =>
    set((s) => {
      const id = `screen-${crypto.randomUUID()}`
      const url = new URL(route, baseUrl).toString()
      const node: ScreenNode = {
        id,
        type: 'screen',
        position: { x: s.nodes.length * 60, y: s.nodes.length * 40 },
        width: DEFAULT_NODE_SIZE.width,
        height: DEFAULT_NODE_SIZE.height,
        data: { url, route, ...DEFAULT_NODE_SIZE }
      }
      return { nodes: [...s.nodes, node] }
    }),

  addScreens: (screens, baseUrl) => {
    const COLS = 4
    const W = DEFAULT_NODE_SIZE.width
    const H = DEFAULT_NODE_SIZE.height
    const GAP = 48
    let added = 0
    set((s) => {
      const existing = new Set(s.nodes.map((n) => n.data.route))
      const fresh = screens.filter((sc) => !existing.has(sc.route))
      added = fresh.length
      const base = s.nodes.length
      const newNodes: ScreenNode[] = fresh.map((sc, i) => {
        const idx = base + i
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        let url = baseUrl
        try {
          url = new URL(sc.route, baseUrl).toString()
        } catch {
          /* keep baseUrl */
        }
        return {
          id: `screen-${crypto.randomUUID()}`,
          type: 'screen',
          position: { x: col * (W + GAP), y: row * (H + GAP) },
          width: W,
          height: H,
          data: { url, route: sc.route, title: sc.title, filePath: sc.filePath, width: W, height: H }
        }
      })
      return { nodes: [...s.nodes, ...newNodes] }
    })
    return added
  },

  setNodeScreenshot: (id, dataUrl) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, screenshot: dataUrl } } : n
      )
    })),

  discovering: false,
  setDiscovering: (discovering) => set({ discovering }),

  editTarget: { type: 'project' },
  setEditTarget: (editTarget) => set({ editTarget }),
  editing: false,
  setEditing: (editing) => set({ editing }),
  reloadToken: 0,
  bumpReload: () => set((s) => ({ reloadToken: s.reloadToken + 1 })),

  hydrateCanvas: (layout) =>
    set({
      nodes: layout.nodes as unknown as ScreenNode[],
      edges: layout.edges,
      viewport: layout.viewport
    }),

  resetCanvas: () => set({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
}))
