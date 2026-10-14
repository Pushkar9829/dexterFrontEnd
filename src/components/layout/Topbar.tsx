import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, PanelLeft, Search } from 'lucide-react'
import { trailFor } from '@/data/nav'
import { getSession, signOut, DEMO_USER } from '@/lib/auth'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = getSession() ?? DEMO_USER
  const trail = trailFor(pathname)
  const [menu, setMenu] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-line bg-white px-4 sm:px-7">
      <button onClick={onMenu} className="text-muted lg:hidden" aria-label="Open menu">
        <Menu size={20} />
      </button>
      <PanelLeft size={18} className="hidden shrink-0 text-muted lg:block" />
      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        {trail.map((t, i) => (
          <span key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-muted" />}
            <span className={i === trail.length - 1 ? 'truncate font-semibold text-ink' : 'truncate text-muted'}>{t}</span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-4">
        <label className="hidden h-9 w-[264px] items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted md:flex">
          <Search size={16} />
          <input
            ref={searchRef}
            placeholder="Search across workspace"
            className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
          />
          <span className="text-[11px] whitespace-nowrap">⌘ K</span>
        </label>
        <button className="relative text-ink-2" aria-label="Notifications" onClick={() => navigate('/notices')}>
          <Bell size={20} />
          <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-brand-red ring-2 ring-white" />
        </button>
        <div className="hidden h-8 w-px bg-line sm:block" />
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
              {user.initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] font-semibold">{user.name}</span>
              <span className="block text-[11px] text-muted">{user.role}</span>
            </span>
            <ChevronDown size={16} className="text-muted" />
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-line bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  signOut()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-ink-2 hover:bg-surface"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
