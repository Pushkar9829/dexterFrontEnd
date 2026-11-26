import { useEffect, useState } from 'react'
import { uploadFile, type UploadMeta } from '@/lib/api'
import { apiEnabled } from '@/data/opsApi'
import type { Tone } from '@/components/ui/Badge'
import type { Address } from '@/data/workflow'
import type { DeliveryStatus, InwardStatus } from '@/data/daakData'
import { processDueReminders, type CbStage } from '@/data/chargeBackDisputes'

/** A picked file: name / size for display; `file` is kept so API mode can upload it (POST /files). */
export type PickedFile = { name: string; size: number; file?: File }

/** API mode: upload a picked file and return its fileId (undefined in mock mode / when nothing was picked). */
export async function uploadPicked(p?: PickedFile | null, meta: UploadMeta = {}): Promise<string | undefined> {
  if (!apiEnabled || !p?.file) return undefined
  const r = await uploadFile(p.file, meta)
  return r.fileId
}

export const fmtDt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const rupees = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/** Ticking clock for live countdowns; interval is cleared on unmount. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

export function fmtLeft(msLeft: number) {
  const neg = msLeft < 0
  const s = Math.floor(Math.abs(msLeft) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const txt = `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`
  return neg ? `Overdue by ${txt}` : `${txt} left`
}


export const inwardTone = (s: InwardStatus): Tone => (s === 'Received' ? 'amber' : s === 'Inwarded' ? 'blue' : s === 'Assigned' ? 'purple' : s === 'Stored' ? 'green' : 'gray')
export const deliveryTone = (s: DeliveryStatus): Tone => (s === 'Delivered' ? 'green' : s === 'In Transit' ? 'blue' : s === 'Returned' ? 'red' : 'amber')

export const searchAddresses = (list: Address[], q: string) => {
  const t = q.trim().toLowerCase()
  return t ? list.filter((a) => [a.id, a.name, a.organization, a.line1, a.city, a.state, a.pin, a.phone, ...a.tags].join(' ').toLowerCase().includes(t)) : list
}

/** Logs chargeback reminders as their scheduled slots arrive (timer cleared on unmount). */
export function useReminderProcessor(ms = 30_000) {
  useEffect(() => {
    processDueReminders()
    const t = window.setInterval(() => processDueReminders(), ms)
    return () => window.clearInterval(t)
  }, [ms])
}

export const CB_STAGE_COLORS: Record<CbStage, string> = { New: '#f59e0b', 'CRM Review': '#2563eb', 'Franchise Response': '#7c3aed', Submitted: '#0891b2', Closed: '#059669' }
