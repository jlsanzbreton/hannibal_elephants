import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { error: Error | null }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in app tree', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <div className="app-shell error-shell">
        <h1>Something went wrong</h1>
        <p>{this.state.error.message}</p>
        <button type="button" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    }
    return this.props.children
  }
}
