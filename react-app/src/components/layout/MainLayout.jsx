import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'

export const MainLayout = () => {
  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

