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
  CanvasLayout
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
  setNodeScreenshot: (id: string, dataUrl: string) => void
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

  setNodeScreenshot: (id, dataUrl) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, screenshot: dataUrl } } : n
      )
    })),

  hydrateCanvas: (layout) =>
    set({
      nodes: layout.nodes as unknown as ScreenNode[],
      edges: layout.edges,
      viewport: layout.viewport
    }),

  resetCanvas: () => set({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
}))
