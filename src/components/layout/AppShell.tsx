import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { getSession, signOut } from '@/lib/auth'
import { can, routeBlock, useRole } from '@/lib/rbac'
import { usePolicy, logSecurity } from '@/data/security'
import { toast } from '@/components/ui/Toast'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/** Dynamic watermark with user ID + date/time over every screen (Security §15B). */
function Watermark({ text }: { text: string }) {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='200'><text x='0' y='120' transform='rotate(-24 0 120)' fill='rgba(15,23,42,0.07)' font-family='Inter,Arial' font-size='14' font-weight='600'>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
  )
  return <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] print:z-[999]" style={{ backgroundImage: `url("data:image/svg+xml,${svg}")` }} data-watermark />
}

function NoAccess({ reason }: { reason: string }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-xl border border-line bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-brand-red">
        <ShieldAlert size={22} />
      </span>
      <h1 className="mt-4 text-[18px] font-bold text-ink">Access restricted</h1>
      <p className="mt-2 text-[13px] text-muted">{reason}</p>
      <p className="mt-1 text-[11px] text-muted">This attempt has been recorded in the security audit log.</p>
      <Link to="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-white">
        Back to Dashboard
      </Link>
    </div>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [stamp, setStamp] = useState(() => new Date())
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const role = useRole()
  const policy = usePolicy()
  const session = getSession()
  const blocked = session ? routeBlock(pathname, role) : null

  useEffect(() => setMenuOpen(false), [pathname])

  // Record blocked route attempts (Security §12: unauthorized module access is logged).
  useEffect(() => {
    if (blocked && session) logSecurity({ actor: session.name, action: 'Unauthorized module access blocked', target: pathname, detail: role })
  }, [blocked, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Watermark clock.
  useEffect(() => {
    const t = setInterval(() => setStamp(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Automatic logout after the configured inactivity period (Security §10).
  useEffect(() => {
    if (!session) return
    let last = Date.now()
    const bump = () => (last = Date.now())
    const evs = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const t = setInterval(() => {
      if (Date.now() - last > policy.sessionIdleMinutes * 60_000) {
        logSecurity({ actor: session.name, action: 'Session expired (inactivity)', target: 'Web portal' })
        signOut()
        navigate('/login', { state: { expired: true } })
      }
    }, 15_000)
    return () => {
      clearInterval(t)
      evs.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [policy.sessionIdleMinutes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Role-based copy / print restrictions (Security §15B).
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (!can('Copy', role)) {
        e.preventDefault()
        toast('Copying data is not permitted for your role.', 'error')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && !can('Print', role)) {
        e.preventDefault()
        toast('Printing is not permitted for your role.', 'error')
      }
    }
    document.addEventListener('copy', onCopy)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('copy', onCopy)
      window.removeEventListener('keydown', onKey)
    }
  }, [role])

  if (!session) return <Navigate to="/login" replace />

  const wm = `${session.name} · ${session.email ?? ''} · ${stamp.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className="min-h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className={`px-4 py-6 sm:px-7 sm:py-7 ${can('Copy', role) ? '' : 'select-none'}`}>{blocked ? <NoAccess reason={blocked} /> : <Outlet />}</main>
      </div>
      {policy.watermarkEnabled && <Watermark text={wm} />}
    </div>
  )
}
