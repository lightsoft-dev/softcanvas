import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Per-node error boundary. A single screen node throwing during render (e.g. a
 * webview API quirk) must not blank the whole canvas — it degrades to an inline
 * error card for that node only.
 */
export class NodeErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('[ScreenNode] render error:', error)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="screen-node">
          <header className="screen-node__bar drag-handle">
            <span className="badge badge--error" />
            <span className="title">render error</span>
          </header>
          <div className="screen-node__body screen-node__placeholder screen-node__placeholder--empty">
            <span>node crashed</span>
            <small>{String(this.state.error.message)}</small>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
