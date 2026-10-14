import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSession } from '@/lib/auth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMenuOpen(false), [pathname])

  if (!getSession()) return <Navigate to="/login" replace />

  return (
    <div className="min-h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="px-4 py-6 sm:px-7 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
