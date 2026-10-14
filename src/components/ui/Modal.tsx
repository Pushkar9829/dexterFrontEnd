import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, sub, onClose, children, footer, width = 520 }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-2xl" style={{ maxWidth: width }}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold">{title}</h2>
            {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md bg-surface text-ink-2" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
