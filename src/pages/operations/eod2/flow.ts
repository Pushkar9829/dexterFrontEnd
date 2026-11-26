// Stage → workflow step mapping for the Routine / Cash Audit EOD tracker (spec §5.3 process flow).
import type { EodRecord, EodStage } from '@/data/eodStore'

export const FLOW_STEPS = ['Counter slip & acknowledgement', '₹40,000 rule', 'Operations verification', 'Docket + email', 'OTC via link', 'Vault opening / audit', 'Cash ack → history', 'Approval'] as const

export function stepOf(r: EodRecord): { current: number; failedAt?: number } {
  const m: Record<EodStage, number> = {
    'Exception Review': 1,
    'Pending Verification': 2,
    'Returned for Correction': 0,
    'Docket Generated': 4,
    'OTC Generated': 5,
    'Vault Opened': 5,
    'Cash Acknowledged': 7,
    Approved: 8,
    Rejected: 2,
  }
  return { current: m[r.stage], failedAt: r.stage === 'Exception Review' ? 1 : r.stage === 'Rejected' ? 2 : undefined }
}

export function nextActionOf(r: EodRecord): string {
  switch (r.stage) {
    case 'Exception Review': return 'Operations: clear or return the exception'
    case 'Pending Verification': return 'Operations: verify counter slip'
    case 'Returned for Correction': return 'Franchise: re-submit counter slip'
    case 'Docket Generated': return 'Franchise: generate OTC via link'
    case 'OTC Generated': return 'Record vault / bolt opening'
    case 'Vault Opened': return r.events.some((e) => !e.verifiedBy) ? 'Operations: verify opening event(s)' : r.type === 'Cash Audit' ? 'Add more openings or acknowledge cash' : 'Franchise: acknowledge cash'
    case 'Cash Acknowledged': return 'Admin: approve'
    case 'Approved': return '—'
    case 'Rejected': return '—'
  }
}
