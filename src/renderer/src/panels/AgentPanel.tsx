import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export function AgentPanel(): JSX.Element {
  const project = useAppStore((s) => s.project)
  const editTarget = useAppStore((s) => s.editTarget)
  const setEditTarget = useAppStore((s) => s.setEditTarget)
  const editing = useAppStore((s) => s.editing)
  const setEditing = useAppStore((s) => s.setEditing)
  const appendLog = useAppStore((s) => s.appendLog)
  const bumpReload = useAppStore((s) => s.bumpReload)
  const [prompt, setPrompt] = useState('')

  const scopeLabel = editTarget.type === 'screen' ? `Screen ${editTarget.route}` : 'Whole project'

  const send = async (): Promise<void> => {
    const proj = useAppStore.getState().project
    const text = prompt.trim()
    if (!proj || !text || useAppStore.getState().editing) return
    setEditing(true)
    appendLog(`[agent] (${scopeLabel}) ${text}`)
    try {
      const out = await window.api.runEdit({
        projectPath: proj.rootPath,
        prompt: text,
        scope: editTarget
      })
      if (out.ok) {
        appendLog(`[agent] ✓ ${out.changedFiles.length} file(s): ${out.changedFiles.join(', ') || '—'}`)
        if (out.summary) appendLog(`[agent] ${out.summary.slice(0, 400)}`)
        bumpReload()
        setPrompt('')
      } else {
        appendLog(`[agent] ✗ ${out.error ?? 'failed'}`)
      }
    } catch (err) {
      appendLog(`[agent] error: ${String((err as Error)?.message ?? err)}`)
    } finally {
      setEditing(false)
    }
  }

  const stop = (): void => {
    void window.api.cancelEdit()
  }

  return (
    <div className="agent-panel">
      <div className="agent-panel__scope">
        <span className="agent-panel__label">AI edit</span>
        <span className={`agent-panel__chip ${editTarget.type === 'screen' ? 'is-screen' : ''}`}>
          {scopeLabel}
        </span>
        {editTarget.type === 'screen' && (
          <button
            className="agent-panel__clear nodrag"
            onClick={() => setEditTarget({ type: 'project' })}
            title="Switch to whole-project scope"
          >
            ✕
          </button>
        )}
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          editTarget.type === 'screen'
            ? `Change the ${editTarget.route} screen…`
            : 'Describe a change to the whole app…'
        }
        rows={3}
        disabled={!project || editing}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send()
        }}
      />
      <div className="agent-panel__row">
        <button onClick={send} disabled={!project || editing || !prompt.trim()}>
          {editing ? 'Working…' : 'Send  ⌘↵'}
        </button>
        {editing && <button onClick={stop}>Stop</button>}
      </div>
      <p className="agent-panel__hint">
        ✏️ on a screen scopes edits to that endpoint. Changes hot-reload in the canvas.
      </p>
    </div>
  )
}
