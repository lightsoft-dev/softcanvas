import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { SettingsPanel } from './SettingsPanel'
import { AgentPanel } from './AgentPanel'

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
  const addScreens = useAppStore((s) => s.addScreens)
  const hydrateCanvas = useAppStore((s) => s.hydrateCanvas)
  const resetCanvas = useAppStore((s) => s.resetCanvas)
  const discovering = useAppStore((s) => s.discovering)
  const setDiscovering = useAppStore((s) => s.setDiscovering)

  const [route, setRoute] = useState('/')
  const autoRanFor = useRef<string | null>(null)

  // Subscribe to dev-server + discovery push events once.
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
    const offDiscover = window.api.onDiscoveryProgress((p) => appendLog(`[discover] ${p.line}`))
    const offEdit = window.api.onEditProgress((p) => appendLog(`[agent] ${p.line}`))
    return () => {
      offLine()
      offReady()
      offExit()
      offError()
      offDiscover()
      offEdit()
    }
  }, [appendLog, setDevStatus, setDevUrl])

  const runDiscovery = async (): Promise<void> => {
    const proj = useAppStore.getState().project
    const url = useAppStore.getState().devUrl
    if (!proj || !url || useAppStore.getState().discovering) return
    setDiscovering(true)
    appendLog('[discover] analyzing codebase for screens…')
    try {
      const res = await window.api.runDiscovery(proj.rootPath)
      if (!res.ok) {
        appendLog(`[discover] failed: ${res.error ?? 'unknown error'}`)
        return
      }
      const added = addScreens(res.screens, url)
      appendLog(`[discover] found ${res.screens.length}, added ${added} new screen(s)`)
    } catch (err) {
      appendLog(`[discover] error: ${String((err as Error)?.message ?? err)}`)
    } finally {
      setDiscovering(false)
    }
  }

  // Auto-discover once when the dev server first becomes ready for a project
  // that has no screens yet — so screens appear on their own.
  useEffect(() => {
    if (!devUrl || !project) return
    if (autoRanFor.current === project.rootPath) return
    if (useAppStore.getState().nodes.length > 0) {
      autoRanFor.current = project.rootPath // already populated; don't auto-run
      return
    }
    autoRanFor.current = project.rootPath
    void runDiscovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devUrl, project])

  const openProject = async (): Promise<void> => {
    const info = await window.api.pickProjectFolder()
    if (!info) return
    autoRanFor.current = null
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

        <button
          className="project-panel__discover"
          onClick={runDiscovery}
          disabled={!devUrl || discovering}
        >
          {discovering ? '✨ Discovering…' : '✨ Auto-discover screens'}
        </button>

        <details className="project-panel__manual">
          <summary>Add screen manually</summary>
          <div className="project-panel__row">
            <input
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="/dashboard"
              aria-label="route to embed"
            />
            <button onClick={addScreen} disabled={!devUrl}>
              + Add
            </button>
          </div>
        </details>
      </div>

      <AgentPanel />

      <SettingsPanel />

      <pre className="project-panel__log">{devLog.slice(-200).join('\n')}</pre>
    </aside>
  )
}
