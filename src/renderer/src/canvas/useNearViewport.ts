import { useStore, type ReactFlowState } from '@xyflow/react'

const MARGIN_PX = 600 // warm-up halo around the visible rect (screen px)
const MIN_ZOOM_FOR_LIVE = 0.25

/**
 * Returns true when this node's screen-space rect intersects the visible
 * viewport (expanded by MARGIN_PX) AND zoom is above threshold. Only then do
 * we mount the live <webview>; otherwise show the cached screenshot.
 * Reads from a single useStore selector — NEVER call useViewport() per node.
 */
export function useNearViewport(nodeId: string): boolean {
  return useStore((s: ReactFlowState) => {
    const node = s.nodeLookup.get(nodeId)
    if (!node) return false
    const [tx, ty, zoom] = s.transform
    const vw = s.width
    const vh = s.height

    const nx = node.internals.positionAbsolute.x * zoom + tx
    const ny = node.internals.positionAbsolute.y * zoom + ty
    const nw = (node.measured?.width ?? 0) * zoom
    const nh = (node.measured?.height ?? 0) * zoom

    const intersects =
      nx < vw + MARGIN_PX &&
      nx + nw > -MARGIN_PX &&
      ny < vh + MARGIN_PX &&
      ny + nh > -MARGIN_PX

    return intersects && zoom > MIN_ZOOM_FOR_LIVE
  })
}
