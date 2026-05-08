import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    const { fallback } = this.props
    if (fallback) return fallback(this.state.error, () => this.setState({ error: null }))

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-lg font-medium text-zinc-200">Something went wrong</p>
        <p className="max-w-md text-sm text-zinc-400">{this.state.error.message}</p>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Try again
        </button>
      </div>
    )
  }
}
