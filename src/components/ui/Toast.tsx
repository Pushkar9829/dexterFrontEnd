import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastItem = { id: number; text: string; tone: 'success' | 'info' | 'error' }
let push: ((t: Omit<ToastItem, 'id'>) => void) | null = null

/** Fire-and-forget toast from anywhere. */
export const toast = (text: string, tone: ToastItem['tone'] = 'success') => push?.({ text, tone })

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random()
      setItems((xs) => [...xs, { ...t, id }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3500)
    }
    return () => {
      push = null
    }
  }, [])
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border border-line bg-white px-4 py-3 text-[13px] shadow-lg">
          {t.tone === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : t.tone === 'error' ? (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          ) : (
            <Info size={18} className="text-primary shrink-0" />
          )}
          <span className="flex-1 text-ink">{t.text}</span>
          <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} className="text-muted" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
