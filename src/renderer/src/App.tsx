import { useEffect } from 'react'
import { Canvas } from './canvas/Canvas'
import { ProjectPanel } from './panels/ProjectPanel'
import { useAppStore } from './store/useAppStore'

export default function App(): JSX.Element {
  const setSettings = useAppStore((s) => s.setSettings)

  // Load global settings on boot.
  useEffect(() => {
    window.api.loadSettings().then(setSettings)
  }, [setSettings])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        width: '100vw',
        height: '100vh' // REQUIRED: canvas parent must have explicit size
      }}
    >
      <ProjectPanel />
      <div style={{ width: '100%', height: '100%' }}>
        <Canvas />
      </div>
    </div>
  )
}
