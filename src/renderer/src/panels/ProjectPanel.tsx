import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { SettingsPanel } from './SettingsPanel'

export function ProjectPanel(): JSX.Element {
  const project = useAppStore((s) => s.project)
  const setProject = useAppStore((s) => s.setProject)
  const devStatus = useAppStore((s) => s.devStatus)
  const devUrl = useAppStore((s) => s.devUrl)
  const devLog = useAppStore((s) => s.devLog)
  const settings = useAppStore((s) => s.settings)
  const setDevStatus = useAppStore((s) => s.setDevStatus)
  const setDevUrl = useAppStore((s) => s.setDevUrl)
  const appendLog = useAppStore((s) => s.appendLog)
  const addScreenNode = useAppStore((s) => s.addScreenNode)
  const hydrateCanvas = useAppStore((s) => s.hydrateCanvas)
  const resetCanvas = useAppStore((s) => s.resetCanvas)

  const [route, setRoute] = useState('/')

  // Subscribe to dev-server push events once. Return unsubscribers on unmount.
  useEffect(() => {
    const offLine = window.api.onDevServerLine((p) => appendLog(`[${p.stream}] ${p.line}`))
    const offReady = window.api.onDevServerReady((p) => {
      setDevUrl(p.url)
      setDevStatus('ready')
    })
    const offExit = window.api.onDevServerExit((p) => {
      appendLog(`[exit] code=${p.code} signal=${p.signal}`)
      setDevStatus('stopped')
      setDevUrl(null)
    })
    const offError = window.api.onDevServerError((p) => {
      appendLog(`[error] ${p.message}`)
      setDevStatus('error')
    })
    return () => {
      offLine()
      offReady()
      offExit()
      offError()
    }
  }, [appendLog, setDevStatus, setDevUrl])

  const openProject = async (): Promise<void> => {
    const info = await window.api.pickProjectFolder()
    if (!info) return
    setProject(info)
    const layout = await window.api.loadLayout(info.rootPath)
    if (layout) hydrateCanvas(layout)
    else resetCanvas()
  }

  const start = async (): Promise<void> => {
    if (!project || !settings) return
    setDevStatus('starting')
    await window.api.startDevServer({
      cwd: project.rootPath,
      command: settings.defaultCommand,
      flavor: settings.defaultFlavor,
      readyTimeoutMs: settings.readyTimeoutMs
    })
  }

  const stop = async (): Promise<void> => {
    await window.api.stopDevServer()
    setDevStatus('stopped')
    setDevUrl(null)
  }

  const addScreen = (): void => {
    if (!devUrl) return
    addScreenNode(route.trim() || '/', devUrl)
  }

  return (
    <aside className="project-panel">
      <div className="project-panel__header">
        <h1>softcanvas</h1>
        <button onClick={openProject}>Open Project…</button>
        <div className="project-panel__name">{project?.name ?? 'No project'}</div>
      </div>

      <div className="project-panel__devserver">
        <div className="project-panel__row">
          <span className={`status status--${devStatus}`}>{devStatus}</span>
          {devUrl && <code>{devUrl}</code>}
        </div>
        <div className="project-panel__row">
          <button
            onClick={start}
            disabled={!project || devStatus === 'starting' || devStatus === 'ready'}
          >
            Start
          </button>
          <button onClick={stop} disabled={devStatus === 'stopped'}>
            Stop
          </button>
        </div>
        <div className="project-panel__row">
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="/dashboard"
            aria-label="route to embed"
          />
          <button onClick={addScreen} disabled={!devUrl}>
            + Add Screen
          </button>
        </div>
      </div>

      <SettingsPanel />

      <pre className="project-panel__log">{devLog.slice(-200).join('\n')}</pre>
    </aside>
  )
}
