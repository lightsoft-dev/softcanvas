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
  const domReadyRef = useRef(false)
  const [status, setStatus] = useState<Status>('idle')
  const [title, setTitle] = useState('')
  const live = useNearViewport(id)
  const setNodeScreenshot = useAppStore((s) => s.setNodeScreenshot)
  const devUrl = useAppStore((s) => s.devUrl)

  const attachEvents = useCallback((el: WebviewEl) => {
    const onStart = (): void => setStatus('loading')
    const onStop = (): void => setStatus((s) => (s === 'error' ? 'error' : 'ready'))
    const onDomReady = (): void => {
      domReadyRef.current = true
      setStatus('ready')
    }
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
    domReadyRef.current = false
    return attachEvents(ref.current)
  }, [live, attachEvents])

  // Capture a screenshot just before the webview unmounts (live -> false) so the
  // virtualized placeholder shows the last frame.
  const capturedRef = useRef<WebviewEl | null>(null)
  useEffect(() => {
    if (live && ref.current) capturedRef.current = ref.current
    return () => {
      const el = capturedRef.current
      // capturePage() THROWS synchronously if the webview is detached or has
      // not emitted dom-ready. Guard + try/catch so a virtualization toggle or
      // unmount can never crash the node (there is no error boundary per node).
      if (!el || !domReadyRef.current || typeof el.capturePage !== 'function') return
      try {
        el.capturePage()
          .then((img) => setNodeScreenshot(id, img.toDataURL()))
          .catch(() => {})
      } catch {
        /* webview detached / not dom-ready — skip screenshot */
      }
    }
  }, [live, id, setNodeScreenshot])

  // When the dev server (re)becomes ready, reload the embed so nodes that were
  // restored/added while the server was down (ERR_CONNECTION_REFUSED) load on
  // their own — no manual ↻ needed.
  useEffect(() => {
    if (!devUrl || !ref.current) return
    try {
      ref.current.reload()
    } catch {
      /* webview not attached yet — it will load src on mount anyway */
    }
  }, [devUrl])

  const reload = (): void => {
    try {
      ref.current?.reload()
    } catch {
      /* not ready */
    }
  }
  const toggleDevTools = (): void => {
    const el = ref.current
    if (!el) return
    try {
      el.isDevToolsOpened() ? el.closeDevTools() : el.openDevTools()
    } catch {
      /* not ready */
    }
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
