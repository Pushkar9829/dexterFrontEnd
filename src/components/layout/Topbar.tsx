import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Calendar, ChevronDown, LogOut, Menu, Search, Smartphone } from 'lucide-react'
import { getSession, signOut, DEMO_USER } from '@/lib/auth'
import { terminateBrowserSession } from '@/pages/auth/flow'
import { ROLES, switchRole, useRole, type Role } from '@/lib/rbac'
import { apiEnabled, get } from '@/lib/api'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const role = useRole()
  const user = { ...(getSession() ?? DEMO_USER), role }
  const [menu, setMenu] = useState(false)
  // API mode: unread in-app notifications of the signed-in user (refreshed on navigation).
  const [unread, setUnread] = useState<number | null>(apiEnabled ? null : 3)
  useEffect(() => {
    if (!apiEnabled) return
    get<{ total: number }>('/notifications', { unread: true, limit: 1 })
      .then((r) => setUnread(r.total))
      .catch(() => undefined)
  }, [pathname])
  const searchRef = useRef<HTMLInputElement>(null)
  const isReports = pathname.startsWith('/reports')
  const qVal = isReports ? (params.get('q') ?? '') : ''

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
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-line bg-white px-4 sm:px-7">
      {/* Left section: mobile hamburger */}
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="text-muted lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        {/* Dexter Mobile App Simulator Button */}
        <button
          onClick={() => navigate('/mobile')}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/90 px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-xs active:scale-95"
          title="Open Dexter Mobile App"
        >
          <Smartphone size={15} className="text-blue-600" />
          <span className="hidden sm:inline">Mobile App</span>
          <span className="sm:hidden">App</span>
          <span className="rounded bg-blue-600 px-1 py-0.2 text-[9px] font-extrabold text-white">
            Demo
          </span>
        </button>

        {/* {pathname.startsWith('/tasks/') && !pathname.startsWith('/tasks/create') && !pathname.startsWith('/tasks/new') && (
          <button
            onClick={() => navigate(/^\/tasks\/(my|today|daily|monthly|overdue|blocked|approval-pending)$/.test(pathname) ? `${pathname}?create=1` : '/tasks/create')}
            className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white hover:bg-primary-hover sm:flex"
          >
            <Plus size={15} /> Create Task
          </button>
        )} */}
        <button className="relative p-1 text-ink-2 hover:text-ink transition-colors" aria-label="Notifications" onClick={() => navigate('/notices')}>
          <Bell size={19} />
          {!!unread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
        <div className="hidden items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-left sm:flex">
          <Calendar size={15} className="text-[#0066FF] shrink-0" />
          <div className="leading-tight text-[11px]">
            <div className="font-semibold text-[#1E293B]">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-[10px] text-[#64748B]">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
          </div>
        </div>

        {/* Search bar between date time and profile */}
        <label className="flex h-9 w-[180px] sm:w-[240px] md:w-[280px] lg:w-[320px] items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-[12px] text-muted transition-colors focus-within:border-primary focus-within:bg-white">
          <Search size={15} className="shrink-0 text-[#64748B]" />
          <input
            key={isReports ? 'reports-search' : 'global-search'}
            ref={searchRef}
            value={isReports ? qVal : undefined}
            onChange={(e) => {
              if (isReports) {
                setParams((p) => {
                  const n = new URLSearchParams(p)
                  if (e.target.value) n.set('q', e.target.value)
                  else n.delete('q')
                  return n
                }, { replace: true })
              }
            }}
            placeholder={isReports ? 'Search reports, modules...' : 'Search across workspace...'}
            className="w-full bg-transparent text-ink outline-none placeholder:text-muted text-[12px]"
          />
          <span className="hidden md:inline-block text-[10px] whitespace-nowrap text-[#94A3B8] rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium shadow-2xs">
            Ctrl K
          </span>
        </label>

        <div className="hidden h-8 w-px bg-line sm:block" />
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-[12px] font-medium text-primary">
              {user.initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[12px] font-semibold">{user.name}</span>
              <span className="mt-0.5 block text-[10px] text-muted">{user.role}</span>
            </span>
            <ChevronDown size={16} className="text-ink-2" />
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-white py-1 shadow-lg">
              {apiEnabled ? (
                <div className="border-b border-line px-3 py-2 text-[11px] text-muted">
                  Signed in as <b className="text-ink">{user.role}</b>
                  {user.email ? <div className="truncate">{user.email}</div> : null}
                </div>
              ) : (
              <div className="border-b border-line px-3 py-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">View as role (UAT demo)</label>
                <select
                  value={role}
                  onChange={(e) => {
                    switchRole(e.target.value as Role)
                    setMenu(false)
                  }}
                  className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] text-ink outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              )}
              <button
                onClick={() => {
                  if (!apiEnabled) terminateBrowserSession('Signed out')
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
