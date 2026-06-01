import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { AppSettings, DevServerFlavor } from '../types'

const FLAVORS: DevServerFlavor[] = ['auto', 'vite', 'next', 'expo']

export function SettingsPanel(): JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (settings) setDraft(settings)
  }, [settings])

  if (!draft) return <></>

  const save = async (next: AppSettings): Promise<void> => {
    setDraft(next)
    setSettings(next)
    await window.api.saveSettings(next)
  }

  return (
    <div className="settings-panel">
      <button className="settings-panel__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Settings
      </button>
      {open && (
        <div className="settings-panel__body">
          <label>
            Dev command
            <input
              value={draft.defaultCommand}
              onChange={(e) => save({ ...draft, defaultCommand: e.target.value })}
            />
          </label>
          <label>
            Flavor
            <select
              value={draft.defaultFlavor}
              onChange={(e) => save({ ...draft, defaultFlavor: e.target.value as DevServerFlavor })}
            >
              {FLAVORS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ready timeout (ms)
            <input
              type="number"
              value={draft.readyTimeoutMs}
              onChange={(e) =>
                save({ ...draft, readyTimeoutMs: Number(e.target.value) || 120000 })
              }
            />
          </label>
        </div>
      )}
    </div>
  )
}
