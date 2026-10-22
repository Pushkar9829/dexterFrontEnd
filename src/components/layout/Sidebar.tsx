import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { NAV, activeRoute, containsPath, type NavItem } from '@/data/nav'
import { cn } from '@/lib/cn'
import { Brand } from './Brand'

function SubItem({ item, depth }: { item: NavItem; depth: number }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() => containsPath(item, pathname))
  const pad = depth === 1 ? 'pl-[40px]' : depth === 2 ? 'pl-[52px]' : 'pl-[64px]'

  useEffect(() => {
    if (containsPath(item, pathname)) {
      setOpen(true)
    }
  }, [pathname, item])

  if (item.children) {
    const isCurrent = item.to ? activeRoute(pathname) === item.to : false
    return (
      <div className="mt-0.5">
        <div
          className={cn(
            'flex min-h-8 w-full items-center justify-between rounded-lg py-1 pr-2 text-left text-[12px] transition-colors',
            pad,
            isCurrent
              ? 'bg-[#0066FF]/12 font-semibold text-[#0066FF]'
              : 'text-[#334155] hover:bg-[#E2EEFB]/70 hover:text-[#0066FF]',
          )}
        >
          {item.to ? (
            <NavLink
              to={item.to}
              end
              onClick={() => setOpen(true)}
              className="flex-1 truncate"
            >
              {item.label}
            </NavLink>
          ) : (
            <span
              className="flex-1 truncate cursor-pointer"
              onClick={() => setOpen((o) => !o)}
            >
              {item.label}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((o) => !o)
            }}
            className="p-1 text-[#64748B] hover:text-[#0066FF]"
            aria-label={open ? 'Collapse submenu' : 'Expand submenu'}
          >
            <ChevronDown size={13} className={cn('transition-transform duration-150', open && 'rotate-180')} />
          </button>
        </div>
        {open && (
          <div className="space-y-0.5">
            {item.children.map((c) => (
              <SubItem key={c.label} item={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isCurrent = activeRoute(pathname) === item.to
  return (
    <NavLink
      to={item.to!}
      end
      className={() =>
        cn(
          'flex min-h-8 items-center justify-between rounded-lg py-1 pr-3 text-[12px] transition-colors',
          pad,
          isCurrent
            ? 'bg-[#0066FF]/12 font-semibold text-[#0066FF]'
            : 'text-[#334155] hover:bg-[#E2EEFB]/70 hover:text-[#0066FF]',
        )
      }
    >
      <span className="truncate">{item.label}</span>
      {item.badge != null && (
        <span
          className={cn(
            'ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium',
            isCurrent ? 'bg-[#0066FF]/15 text-[#0066FF]' : 'bg-slate-200 text-[#475569]',
          )}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState<string | null>(
    () => NAV.find((g) => containsPath(g, pathname))?.label ?? null,
  )

  useEffect(() => {
    const current = NAV.find((g) => containsPath(g, pathname))?.label
    if (current) setExpanded(current)
  }, [pathname])

  return (
    <>
      <div className={cn('fixed inset-0 z-30 bg-black/40 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#E0EBF7] bg-[#F0F7FD] text-[#1E293B] transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          backgroundColor: '#F0F7FD',
          backgroundImage: 'linear-gradient(180deg, #F8FAFD 0%, #F1F7FD 45%, #EBF4FD 100%)',
        }}
      >
        <div className="relative flex items-center justify-center px-4 pt-6 pb-4">
          <NavLink to="/dashboard" className="flex items-center justify-center transition-transform hover:scale-[1.02]">
            <Brand tone="sidebar" />
          </NavLink>
          <button
            type="button"
            className="absolute right-3.5 top-5 p-1 text-slate-400 hover:text-slate-700 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="scroll-thin mt-2 flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {NAV.map((g) => {
            const hasChildren = Boolean(g.children && g.children.length > 0)
            const active =
              containsPath(g, pathname) ||
              (g.to && (pathname === g.to || pathname.startsWith(g.to + '/'))) ||
              (g.to === '/dashboard' && pathname === '/notices')

            if (!hasChildren && g.to) {
              return (
                <div key={g.label}>
                  <NavLink
                    to={g.to}
                    onClick={() => {
                      setExpanded(null)
                      onClose()
                    }}
                    className={cn(
                      'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all',
                      active
                        ? 'bg-[#0066FF] font-semibold text-white shadow-sm'
                        : 'text-[#1E293B] hover:bg-[#E2EEFB]/80 hover:text-[#0066FF]',
                    )}
                  >
                    <g.icon
                      size={18}
                      strokeWidth={1.8}
                      className={cn('shrink-0', active ? 'text-white' : 'text-[#0066FF]')}
                    />
                    <span className="flex-1 text-left truncate">{g.label}</span>
                    {g.badge != null && (
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                          active ? 'bg-white/20 text-white' : 'bg-[#0066FF]/10 text-[#0066FF]',
                        )}
                      >
                        {g.badge}
                      </span>
                    )}
                  </NavLink>
                </div>
              )
            }

            const isOpen = expanded === g.label
            const isCurrent = g.to ? activeRoute(pathname) === g.to : false

            return (
              <div key={g.label}>
                <div
                  className={cn(
                    'flex h-10 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all',
                    isCurrent || active
                      ? 'bg-[#0066FF] font-semibold text-white shadow-sm'
                      : 'text-[#1E293B] hover:bg-[#E2EEFB]/80 hover:text-[#0066FF]',
                  )}
                >
                  {g.to ? (
                    <NavLink
                      to={g.to}
                      end
                      onClick={() => setExpanded(g.label)}
                      className="flex flex-1 items-center gap-3 truncate text-left"
                    >
                      <g.icon
                        size={18}
                        strokeWidth={1.8}
                        className={cn('shrink-0', active ? 'text-white' : 'text-[#0066FF]')}
                      />
                      <span className="flex-1 text-left truncate">{g.label}</span>
                    </NavLink>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : g.label)}
                      className="flex flex-1 items-center gap-3 truncate text-left"
                    >
                      <g.icon
                        size={18}
                        strokeWidth={1.8}
                        className={cn('shrink-0', active ? 'text-white' : 'text-[#0066FF]')}
                      />
                      <span className="flex-1 text-left truncate">{g.label}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpanded(isOpen ? null : g.label)
                    }}
                    className={cn(
                      'p-1 transition-colors',
                      active ? 'text-white hover:text-white/80' : 'text-[#2563EB] hover:text-[#1E293B]',
                    )}
                    aria-label={isOpen ? 'Collapse section' : 'Expand section'}
                  >
                    <ChevronDown
                      size={16}
                      strokeWidth={1.8}
                      className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  </button>
                </div>
                {isOpen && (
                  <div className="pt-1 pb-1">
                    {g.children?.map((c) => (
                      <SubItem key={c.label} item={c} depth={1} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Help & Support Card */}
        {/* <div className="p-3 pb-1">
          <div className="flex items-center gap-3 rounded-2xl bg-[#E2EEFB] px-3.5 py-3 transition-colors hover:bg-[#D5E5F8] cursor-pointer">
            <Headset size={20} className="text-[#0066FF] shrink-0" strokeWidth={1.8} />
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-[12.5px] font-semibold text-[#1E293B]">Help &amp; support</div>
              <div className="text-[10px] text-[#64748B] truncate">Operator workspace · v2.4</div>
            </div>
            <ChevronRight size={14} className="text-[#2563EB] shrink-0" strokeWidth={2} />
          </div>
        </div> */}

        {/* Brand Slogan from image reference */}
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-1 shrink-0">
              <span className="h-5 w-1.5 -skew-x-[24deg] rounded-full bg-[#EF4444]" />
              <span className="h-5 w-1.5 -skew-x-[24deg] rounded-full bg-[#0066FF]" />
            </div>
            <div className="text-[11px] font-medium leading-tight text-[#475569]">
              <div>Together for a</div>
              <div className="font-semibold text-[#1E293B]">Stronger Tomorrow</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

