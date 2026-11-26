// Shared helpers for the Legal registers (cheques, PVC, other documents) in API mode.
import { apiEnabled, uploadFile, type UploadMeta } from '@/lib/api'
import { currentRole } from '@/lib/rbac'
import { apiCall } from '@/data/bizApi'

/** Franchisee users only reach /my/* — the staff legal registers are refused (FRANCHISEE_SELF_SERVICE_ONLY). */
export const legalIsFranchisee = () => apiEnabled && currentRole() === 'Franchisee'

/** Backend 'YYYY-MM-DD' → the registers' 'DD/MM/YYYY' display format (other strings pass through). */
export const isoToSlash = (s?: string | null) => {
  if (!s) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}
/** 'DD/MM/YYYY' / 'DD-MM-YYYY' → 'YYYY-MM-DD' for the backend (ISO / empty pass through). */
export const slashToIso = (s?: string | null) => {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s.trim())
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s.slice(0, 10)
}
/** Indian mobile → 10 digits (backend regex ^[6-9]\d{9}$), '' when it cannot be normalised. */
export const mobile10 = (s?: string | null) => {
  const d = (s ?? '').replace(/\D/g, '').slice(-10)
  return /^[6-9]\d{9}$/.test(d) ? d : ''
}
/** Numeric sn from a backend id like CHQ-00010 / PVC-00003. */
export const snOf = (id: string) => parseInt(id.replace(/\D/g, '').slice(-5), 10) || 0

export type FileMeta = { name: string; sizeKb: number; type: string; fileId?: string }

/** API mode: upload picked files to POST /files (PDF / JPG / PNG) → metadata with fileId. Mock: metadata only. */
export async function uploadLegalFiles(files: File[], meta: UploadMeta = {}): Promise<FileMeta[]> {
  const base = files.map((f) => ({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)), type: f.type || 'application/pdf' }))
  if (!apiEnabled) return base
  const out: FileMeta[] = []
  for (let i = 0; i < files.length; i++) {
    const r = await apiCall(() => uploadFile(files[i], { purpose: 'legal', ...meta }), 'Upload failed')
    out.push({ ...base[i], fileId: r.fileId })
  }
  return out
}
