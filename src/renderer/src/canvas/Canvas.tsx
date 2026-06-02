import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeProps,
  type NodeTypes,
  type OnMove,
  type Viewport
} from '@xyflow/react'
import { ScreenNode } from './ScreenNode'
import { NodeErrorBoundary } from './NodeErrorBoundary'
import { useAppStore, type ScreenNode as ScreenNodeType } from '../store/useAppStore'
import type { CanvasLayout } from '../types'

// Wrap each node in an error boundary so one node crashing can't blank the canvas.
function ScreenNodeBoundary(props: NodeProps): JSX.Element {
  return (
    <NodeErrorBoundary>
      <ScreenNode {...props} />
    </NodeErrorBoundary>
  )
}

// MODULE SCOPE — never inline (remounts every node = reloads every webview).
const nodeTypes: NodeTypes = { screen: ScreenNodeBoundary }

// Make the header the drag handle for every screen node.
const defaultNodeOptions = { dragHandle: '.drag-handle' }

function CanvasInner(): JSX.Element {
  const nodes = useAppStore((s) => s.nodes)
  const edges = useAppStore((s) => s.edges)
  const onNodesChange = useAppStore((s) => s.onNodesChange)
  const onEdgesChange = useAppStore((s) => s.onEdgesChange)
  const setViewport = useAppStore((s) => s.setViewport)
  const project = useAppStore((s) => s.project)
  const { fitView } = useReactFlow()

  // Whenever the node count changes (a screen was added, or a project's saved
  // layout was just loaded), bring the nodes into view. Without this, a node
  // added while the canvas is panned away lands off-screen and looks "missing"
  // (and stays non-live since the viewport-virtualization gate never sees it).
  const prevCount = useRef(0)
  useEffect(() => {
    if (nodes.length > 0 && nodes.length !== prevCount.current) {
      // rAF so RF has measured the freshly added node before fitting.
      requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1, duration: 300 }))
    }
    prevCount.current = nodes.length
  }, [nodes.length, fitView])

  // Apply dragHandle to nodes that don't carry one explicitly.
  const nodesWithHandle = useMemo(
    () => nodes.map((n): ScreenNodeType => (n.dragHandle ? n : { ...n, ...defaultNodeOptions })),
    [nodes]
  )

  // Debounced layout persistence on any change.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persist = useCallback(() => {
    if (!project) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const s = useAppStore.getState()
      const layout: CanvasLayout = {
        version: 1,
        nodes: s.nodes.map((n) => ({
          id: n.id,
          type: 'screen',
          position: n.position,
          width: n.width,
          height: n.height,
          // strip non-serializable fields — keep only data we defined
          data: {
            url: n.data.url,
            route: n.data.route,
            width: n.data.width,
            height: n.data.height,
            screenshot: n.data.screenshot
          }
        })),
        edges: s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        viewport: s.viewport
      }
      window.api.saveLayout(project.rootPath, layout)
    }, 500)
  }, [project])

  useEffect(() => {
    persist()
  }, [nodes, edges, persist])

  const onMoveEnd: OnMove = useCallback(
    (_e, vp: Viewport) => {
      setViewport(vp)
      persist()
    },
    [setViewport, persist]
  )

  return (
    <ReactFlow<ScreenNodeType>
      nodes={nodesWithHandle}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onMoveEnd={onMoveEnd}
      minZoom={0.1}
      maxZoom={4}
      fitView
      onlyRenderVisibleElements={false} // keep mounted; virtualize via useNearViewport instead
      panOnScroll
      selectionOnDrag
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  )
}

export function Canvas(): JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
