import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useNearViewport } from './useNearViewport'
import { useAppStore } from '../store/useAppStore'
import type { ScreenNodeData } from '../types'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface WebviewEl extends HTMLElement {
  src: string
  reload(): void
  openDevTools(): void
  closeDevTools(): void
  isDevToolsOpened(): boolean
  capturePage?: () => Promise<{ toDataURL(): string }>
}

function ScreenNodeImpl({ id, data, selected }: NodeProps): JSX.Element {
  const d = data as ScreenNodeData
  const ref = useRef<WebviewEl | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [title, setTitle] = useState('')
  const live = useNearViewport(id)
  const setNodeScreenshot = useAppStore((s) => s.setNodeScreenshot)

  const attachEvents = useCallback((el: WebviewEl) => {
    const onStart = (): void => setStatus('loading')
    const onStop = (): void => setStatus((s) => (s === 'error' ? 'error' : 'ready'))
    const onDomReady = (): void => setStatus('ready')
    const onFail = (e: { isMainFrame?: boolean }): void => {
      if (e.isMainFrame !== false) setStatus('error')
    }
    const onTitle = (e: { title: string }): void => setTitle(e.title)
    el.addEventListener('did-start-loading', onStart)
    el.addEventListener('did-stop-loading', onStop)
    el.addEventListener('dom-ready', onDomReady)
    el.addEventListener('did-fail-load', onFail as unknown as EventListener)
    el.addEventListener('page-title-updated', onTitle as unknown as EventListener)
    return () => {
      el.removeEventListener('did-start-loading', onStart)
      el.removeEventListener('did-stop-loading', onStop)
      el.removeEventListener('dom-ready', onDomReady)
      el.removeEventListener('did-fail-load', onFail as unknown as EventListener)
      el.removeEventListener('page-title-updated', onTitle as unknown as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!live || !ref.current) return
    return attachEvents(ref.current)
  }, [live, attachEvents])

  // Capture a screenshot just before the webview unmounts (live -> false).
  const capturedRef = useRef<WebviewEl | null>(null)
  useEffect(() => {
    if (live && ref.current) capturedRef.current = ref.current
    return () => {
      const el = capturedRef.current
      if (el?.capturePage) {
        el.capturePage()
          .then((img) => setNodeScreenshot(id, img.toDataURL()))
          .catch(() => {})
      }
    }
  }, [live, id, setNodeScreenshot])

  const reload = (): void => ref.current?.reload()
  const toggleDevTools = (): void => {
    const el = ref.current
    if (!el) return
    el.isDevToolsOpened() ? el.closeDevTools() : el.openDevTools()
  }

  return (
    <div
      className={`screen-node ${selected ? 'selected' : ''}`}
      style={{ width: d.width, height: d.height }}
    >
      <NodeResizer minWidth={240} minHeight={320} isVisible={selected} />

      {/* Drag handle — the webview body swallows pointer events, so dragging
          happens via this header (node.dragHandle = '.drag-handle' set in nodeTypes). */}
      <header className="screen-node__bar drag-handle">
        <span className={`badge badge--${status}`} />
        <span className="title">{title || d.route}</span>
        <button className="nodrag" onClick={reload} title="Reload">
          ↻
        </button>
        <button className="nodrag" onClick={toggleDevTools} title="DevTools">
          {'</>'}
        </button>
      </header>

      {/* nodrag = clicks inside don't move the node; nowheel = scroll/zoom inside
          the embed is not hijacked by the canvas. BOTH required on the wrapper. */}
      <div
        className="screen-node__body nodrag nowheel"
        style={{ width: '100%', height: 'calc(100% - 32px)' }}
      >
        {live ? (
          <webview
            ref={ref as never}
            src={d.url}
            partition={`persist:screen-${id}`}
            allowpopups={false}
            style={{ width: '100%', height: '100%', display: 'inline-flex' }}
          />
        ) : d.screenshot ? (
          <img
            className="screen-node__placeholder"
            src={d.screenshot}
            alt={d.route}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="screen-node__placeholder screen-node__placeholder--empty">
            <span>{d.route}</span>
            <small>{d.url}</small>
          </div>
        )}
      </div>
    </div>
  )
}

export const ScreenNode = memo(ScreenNodeImpl)
