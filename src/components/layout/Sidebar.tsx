import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Building2, ChevronDown, ChevronRight, ChevronsUpDown, CircleHelp, X } from 'lucide-react'
import { NAV, activeRoute, containsPath, type NavItem } from '@/data/nav'
import { cn } from '@/lib/cn'
import { Brand } from './Brand'

function SubItem({ item, depth }: { item: NavItem; depth: number }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() => containsPath(item, pathname))
  const pad = depth === 1 ? 'pl-[38px]' : 'pl-[52px]'

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex w-full items-center justify-between rounded-md py-2 pr-3 text-left text-[13px] text-white/75 hover:bg-white/5 hover:text-white',
            pad,
          )}
        >
          <span>{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && item.children.map((c) => <SubItem key={c.label} item={c} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to!}
      end
      className={() =>
        cn(
          'flex items-center justify-between rounded-md py-2 pr-3 text-[13px] transition-colors',
          pad,
          activeRoute(pathname) === item.to ? 'bg-navy-700 font-semibold text-white' : 'text-white/75 hover:bg-white/5 hover:text-white',
        )
      }
    >
      <span className="truncate">{item.label}</span>
      {item.badge != null && (
        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/80">{item.badge}</span>
      )}
    </NavLink>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState<string | null>(
    () => NAV.find((g) => containsPath(g, pathname))?.label ?? 'Overview',
  )

  return (
    <>
      <div className={cn('fixed inset-0 z-30 bg-black/40 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-navy-900 text-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between px-6 pt-8 pb-7">
          <Brand />
          <button className="text-white/70 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="px-4">
          <button className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-white/15 bg-navy-800 px-3 text-[13px] text-white">
            <Building2 size={16} className="text-white/80" />
            <span className="flex-1 text-left">India operations</span>
            <ChevronsUpDown size={14} className="text-white/70" />
          </button>
        </div>

        <nav className="scroll-dark mt-6 flex-1 overflow-y-auto px-3 pb-4">
          <div className="pb-2 text-[10px] font-semibold tracking-wider text-white/60">WORKSPACE</div>
          {NAV.map((g) => {
            const isOpen = expanded === g.label
            const active = containsPath(g, pathname)
            return (
              <div key={g.label} className="mb-0.5">
                <button
                  onClick={() => setExpanded(isOpen ? null : g.label)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-[14px] font-semibold hover:bg-white/5',
                    active ? 'text-white' : 'text-white/85',
                  )}
                >
                  <g.icon size={18} strokeWidth={1.8} />
                  <span className="flex-1 text-left">{g.label}</span>
                  {isOpen ? (
                    <ChevronDown size={16} className="text-white/70" />
                  ) : (
                    <ChevronRight size={16} className="text-white/70" />
                  )}
                </button>
                {isOpen && (
                  <div className="space-y-0.5 pb-1">
                    {g.children?.map((c) => <SubItem key={c.label} item={c} depth={1} />)}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <CircleHelp size={18} className="text-white/80" />
          <div className="leading-tight">
            <div className="text-[13px] font-medium">Help &amp; support</div>
            <div className="text-[11px] text-white/60">Operator workspace · v2.4</div>
          </div>
        </div>
      </aside>
    </>
  )
}
