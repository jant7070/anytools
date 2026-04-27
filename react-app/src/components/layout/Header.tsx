import { Link, NavLink } from 'react-router-dom'

export const Header = () => {
  const navLinkClassName = ({ isActive }: { isActive: boolean }) => {
    return [
      'rounded-lg px-3 py-2 text-sm font-medium transition',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:bg-zinc-900/70',
    ].join(' ')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="rounded-lg px-2 py-1 text-sm font-semibold tracking-tight text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          aria-label="Go to homepage"
        >
          Tools
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          <NavLink to="/tools" className={navLinkClassName}>
            All tools
          </NavLink>
          <NavLink to="/image-tools" className={navLinkClassName}>
            Image
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

