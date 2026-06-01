import Store from 'electron-store'
import type { CanvasLayout, AppSettings } from '../preload/index.d'

const DEFAULT_SETTINGS: AppSettings = {
  defaultCommand: 'npm run dev',
  defaultFlavor: 'auto',
  readyTimeoutMs: 120_000
}

interface Schema {
  settings: AppSettings
  // Per-project layouts keyed by absolute project path.
  layouts: Record<string, CanvasLayout>
}

const store = new Store<Schema>({
  name: 'softcanvas',
  defaults: {
    settings: DEFAULT_SETTINGS,
    layouts: {}
  }
})

export function loadSettings(): AppSettings {
  return store.get('settings', DEFAULT_SETTINGS)
}

export function saveSettings(settings: AppSettings): void {
  store.set('settings', settings)
}

export function loadLayout(projectKey: string): CanvasLayout | null {
  const layouts = store.get('layouts', {})
  return layouts[projectKey] ?? null
}

export function saveLayout(projectKey: string, layout: CanvasLayout): void {
  const layouts = store.get('layouts', {})
  layouts[projectKey] = layout
  store.set('layouts', layouts)
}
