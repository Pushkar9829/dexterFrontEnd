// Account Mapping (§8) + Team Leader profit sharing (§5.4–5.6) helpers.
// The shared payout model (src/data/payout.ts) is read-only for this module; extra
// maker/checker metadata for TL rules / shares lives in this folder's own stores.
import { createStore } from '@/lib/store'
import { apiEnabled } from '@/lib/api'
import * as papi from '@/data/payoutApi'
import { getSession } from '@/lib/auth'
import {
  accountStore, tlStore, businessStore, inrP, logPayout, nowIso, pid, type BeneficiaryAccount, type BeneficiaryType, type TlRule, type TlShare, type Vertical,
} from '@/data/payout'
import { payoutStore } from '@/data/payout'
import { networkStore, siteStore, siteByAtm, TEAM_LEADERS } from '@/data/network'
import { franchiseStore } from '@/data/franchises'
import { FRANCHISEES } from '@/data/cbrSites'

export const me = () => getSession()?.name ?? 'Unknown user'

// ── validation ───────────────────────────────────────────────────────────
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const ACC_RE = /^\d{9,18}$/
export const UTR_RE = /^[A-Z0-9]{10,22}$/

export const BENEFICIARY_TYPES: BeneficiaryType[] = ['Franchisee', 'MF', 'Super MF', 'Team Leader', 'Other']
export const ACCOUNT_STATUSES: BeneficiaryAccount['status'][] = ['Draft', 'Pending', 'Active', 'Rejected', 'Superseded']
export const DOC_TYPES = ['Cancelled Cheque', 'Bank Statement'] as const
export const TIER_OF: Partial<Record<BeneficiaryType, 'Franchise' | 'Master' | 'Super Master'>> = { Franchisee: 'Franchise', MF: 'Master', 'Super MF': 'Super Master' }

export type BeneficiaryOption = { id: string; name: string }
/** Candidates for the beneficiary picker by type. */
export function beneficiaryOptions(type: BeneficiaryType | ''): BeneficiaryOption[] {
  if (!type || type === 'Other') return []
  if (type === 'Team Leader') return TEAM_LEADERS.map((t) => ({ id: t.id, name: t.name }))
  const tier = TIER_OF[type]
  return franchiseStore.get().filter((f) => f.tier === tier).map((f) => ({ id: f.id, name: f.name }))
}
export function beneficiaryName(type: BeneficiaryType | '', id: string) {
  return beneficiaryOptions(type).find((o) => o.id === id)?.name
}

/** SMF / MF / FR chain from the approved network hierarchy. */
export function hierarchyOf(type: BeneficiaryType | '', id: string): { smf: string; mf: string; fr: string; tl?: string } {
  const nodes = networkStore.get().nodes
  const fr = franchiseStore.get()
  const nameOf = (x: string) => fr.find((f) => f.id === x)?.name ?? x
  const out = { smf: '—', mf: '—', fr: '—', tl: undefined as string | undefined }
  if (!id) return out
  if (type === 'Super MF') out.smf = nameOf(id)
  if (type === 'MF') {
    out.mf = nameOf(id)
    const p = nodes[id]?.parent
    if (p?.kind === 'SMF') out.smf = p.name
  }
  if (type === 'Franchisee') {
    out.fr = nameOf(id)
    const p = nodes[id]?.parent
    if (p?.kind === 'MF') {
      out.mf = p.name
      const pp = nodes[p.id]?.parent
      if (pp?.kind === 'SMF') out.smf = pp.name
    } else if (p?.kind === 'Team Leader') out.tl = p.name
    else if (p?.kind === 'Company') out.mf = p.name
  }
  return out
}

/** PAN from approved KYC — only returned when the beneficiary's KYC is Verified. */
export function kycOf(type: BeneficiaryType | '', id: string): { verified: boolean; pan: string | null; status: string } {
  if (!TIER_OF[type as BeneficiaryType] || !id) return { verified: false, pan: null, status: type === 'Team Leader' ? 'Employee KYC (checker verifies)' : 'Manual verification' }
  const f = franchiseStore.get().find((x) => x.id === id)
  if (!f) return { verified: false, pan: null, status: 'Not found' }
  if (f.kyc !== 'Verified') return { verified: false, pan: null, status: `KYC ${f.kyc}` }
  const pan =
    FRANCHISEES.find((x) => x.id === id)?.pan ??
    payoutStore.get().lines.find((l) => l.frId === id && PAN_RE.test(l.pan))?.pan ??
    accountStore.get().find((a) => a.beneficiaryId === id && PAN_RE.test(a.pan))?.pan ??
    null
  return { verified: true, pan, status: 'KYC Verified' }
}

/** Sites a beneficiary is linked to (for the ATM ID suggestions). */
export function sitesFor(type: BeneficiaryType | '', id: string) {
  const sites = siteStore.get().sites
  if (!id) return []
  if (type === 'Franchisee') return sites.filter((s) => s.frId === id)
  const nodes = networkStore.get().nodes
  if (type === 'MF' || type === 'Super MF' || type === 'Team Leader') {
    const kids = new Set(Object.values(nodes).filter((n) => n.parent.id === id).map((n) => n.frId))
    if (type === 'Super MF') Object.values(nodes).forEach((n) => kids.has(n.parent.id) && kids.add(n.frId))
    return sites.filter((s) => kids.has(s.frId) || s.frId === id)
  }
  return []
}

export const verticalForAtm = (atmId: string): Vertical => (siteByAtm(atmId)?.siteType === 'BM' || isBmSite(atmId) ? 'Business Model' : 'Franchise Model')

export const accountKey = (a: Pick<BeneficiaryAccount, 'beneficiaryType' | 'beneficiaryId' | 'atmId'>) => `${a.beneficiaryType}|${a.beneficiaryId}|${a.atmId ?? ''}`
export const paymentEligible = (a: BeneficiaryAccount) => a.status === 'Active' && a.kycVerified

/** §8.1 duplicate detection: the same account no. + IFSC on another beneficiary is blocked. */
export function duplicateOf(accountNo: string, ifsc: string, beneficiaryId: string, ignoreId?: string) {
  if (!accountNo || !ifsc) return undefined
  return accountStore
    .get()
    .find((a) => a.id !== ignoreId && a.accountNo === accountNo && a.ifsc === ifsc.toUpperCase() && a.beneficiaryId !== beneficiaryId && a.status !== 'Rejected' && a.status !== 'Superseded')
}

/** Account in force for a beneficiary on a date (effective-date based selection, §8.1). */
export function accountInForce(list: BeneficiaryAccount[], beneficiaryId: string, date: string, atmId?: string) {
  const approved = list.filter((a) => a.beneficiaryId === beneficiaryId && (a.status === 'Active' || a.status === 'Superseded') && a.effectiveFrom <= date)
  const pick = (xs: BeneficiaryAccount[]) => [...xs].sort((a, b) => (a.effectiveFrom === b.effectiveFrom ? (b.status === 'Active' ? 1 : -1) : b.effectiveFrom.localeCompare(a.effectiveFrom)))[0]
  if (atmId) {
    const siteSpecific = approved.filter((a) => a.atmId === atmId)
    if (siteSpecific.length) return pick(siteSpecific)
  }
  return pick(approved.filter((a) => !a.atmId)) ?? pick(approved)
}

export function nextAccountId() {
  const max = accountStore.get().reduce((m, a) => Math.max(m, Number(a.id.replace(/\D/g, '')) || 0), 1000)
  return `BEN-${max + 1}`
}

/** Checker approval. Returns an error message, or null on success. */
export function approveAccount(id: string, kycVerified: boolean, note: string): string | null {
  const user = me()
  const acc = accountStore.get().find((a) => a.id === id)
  if (!acc) return 'Account not found.'
  if (acc.status !== 'Pending') return 'Only pending accounts can be approved.'
  if (acc.maker === user) return 'Maker-checker: you created this change, so another user must approve it.'
  const dup = duplicateOf(acc.accountNo, acc.ifsc, acc.beneficiaryId, acc.id)
  if (dup) return `Duplicate: this account no. + IFSC is already mapped to ${dup.name} (${dup.id}).`
  const at = nowIso()
  const replaced = accountStore.get().filter((a) => a.id !== id && a.status === 'Active' && accountKey(a) === accountKey(acc))
  accountStore.set((list) =>
    list.map((a) => {
      if (a.id === id)
        return { ...a, status: 'Active', kycVerified, checker: user, history: [...a.history, { at, by: user, action: 'Approved', detail: [note, kycVerified ? 'KYC verified' : 'KYC NOT verified — not payment-eligible'].filter(Boolean).join(' · ') }] }
      if (replaced.some((r) => r.id === a.id)) return { ...a, status: 'Superseded', history: [...a.history, { at, by: user, action: `Superseded by ${id}`, detail: `New account effective ${acc.effectiveFrom}` }] }
      return a
    }),
  )
  logPayout({ by: user, area: 'Account Mapping', ref: id, action: 'Account approved', before: replaced.map((r) => `${r.id} ${r.bank} ••${r.accountNo.slice(-4)}`).join('; ') || undefined, after: `${acc.bank} ••${acc.accountNo.slice(-4)} ${acc.ifsc}` })
  replaced.forEach((r) => logPayout({ by: user, area: 'Account Mapping', ref: r.id, action: 'Account superseded', after: `Replaced by ${id}` }))
  if (apiEnabled) void papi.apiDecideAccount(id, true, note, kycVerified)
  return null
}

export function rejectAccount(id: string, reason: string): string | null {
  const user = me()
  const acc = accountStore.get().find((a) => a.id === id)
  if (!acc) return 'Account not found.'
  if (acc.status !== 'Pending') return 'Only pending accounts can be rejected.'
  if (acc.maker === user) return 'Maker-checker: you created this change, so another user must review it.'
  if (!reason.trim()) return 'Enter a rejection reason.'
  accountStore.set((list) => list.map((a) => (a.id === id ? { ...a, status: 'Rejected', checker: user, history: [...a.history, { at: nowIso(), by: user, action: 'Rejected', detail: reason.trim() }] } : a)))
  logPayout({ by: user, area: 'Account Mapping', ref: id, action: 'Account rejected', after: reason.trim() })
  if (apiEnabled) void papi.apiDecideAccount(id, false, reason.trim())
  return null
}

// ── Team Leader ──────────────────────────────────────────────────────────
export type TlMeta = { maker: string; checker?: string; draft?: boolean; replaces?: string; remarks?: string; history: { at: string; by: string; action: string; detail?: string }[] }
export const tlMetaStore = createStore<Record<string, TlMeta>>(apiEnabled ? 'dexter.payout.tlRuleMeta.api' : 'dexter.payout.tlRuleMeta.v1', () => ({}))
export const SEED_META: TlMeta = { maker: 'System (seed)', history: [{ at: '2026-04-01T10:00:00.000Z', by: 'System (seed)', action: 'Rule seeded — share value awaiting Finance' }] }
export const metaOf = (all: Record<string, TlMeta>, id: string) => all[id] ?? SEED_META
export const ruleStatus = (r: TlRule, m: TlMeta) => (m.draft ? 'Draft' : r.status)

export type TlShareMeta = { maker: string; checker?: string; basis: string; batchId: string; sites: { atmId: string; eligible: number }[]; remarks?: string; history: { at: string; by: string; action: string; detail?: string }[] }
export const tlShareMetaStore = createStore<Record<string, TlShareMeta>>(apiEnabled ? 'dexter.payout.tlShareMeta.api' : 'dexter.payout.tlShareMeta.v1', () => ({}))

export function isBmSite(atmId: string) {
  return siteByAtm(atmId)?.siteType === 'BM' || businessStore.get().bmSites.some((b) => b.atmId === atmId)
}
/** Franchise-vertical sites only — TL sharing never includes BM sites (§5.4 / §5.6). */
export function franchiseSites(sites = siteStore.get().sites) {
  const bm = new Set(businessStore.get().bmSites.map((b) => b.atmId))
  return sites.filter((s) => s.siteType !== 'BM' && !bm.has(s.atmId))
}

/** Reporting MF / SMF fetched from the approved hierarchy of the assigned sites (and the TL's own mapping). */
export function tlReporting(tlId: string, atmIds: string[]) {
  const nodes = networkStore.get().nodes
  const mfs = new Set<string>()
  const smfs = new Set<string>()
  atmIds.forEach((a) => {
    const s = siteByAtm(a)
    const p = s ? nodes[s.frId]?.parent : undefined
    if (p?.kind === 'MF') {
      mfs.add(p.name)
      const pp = nodes[p.id]?.parent
      if (pp?.kind === 'SMF') smfs.add(pp.name)
    }
  })
  const direct = Object.values(nodes).filter((n) => n.parent.kind === 'Team Leader' && n.parent.id === tlId).map((n) => n.frId)
  return { mfs: [...mfs], smfs: [...smfs], directFranchises: direct, label: [mfs.size ? `MF: ${[...mfs].join(', ')}` : '', smfs.size ? `SMF: ${[...smfs].join(', ')}` : ''].filter(Boolean).join(' · ') || '—' }
}

const end = (d: string | null) => d || '9999-12-31'
/** Duplicate TL sharing: same site + overlapping period in another live rule. */
export function tlConflicts(r: Pick<TlRule, 'id' | 'siteAtmIds' | 'effectiveFrom' | 'effectiveTo'>, ignore: string[] = []) {
  const meta = tlMetaStore.get()
  return tlStore
    .get()
    .rules.filter((x) => x.id !== r.id && !ignore.includes(x.id) && x.status !== 'Rejected' && !metaOf(meta, x.id).draft && x.effectiveFrom <= end(r.effectiveTo) && r.effectiveFrom <= end(x.effectiveTo))
    .map((x) => ({ rule: x, sites: x.siteAtmIds.filter((a) => r.siteAtmIds.includes(a)) }))
    .filter((c) => c.sites.length)
}

export const dayBefore = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() - 1)
  return t.toISOString().slice(0, 10)
}

export function approveRule(id: string, note: string): string | null {
  const user = me()
  const r = tlStore.get().rules.find((x) => x.id === id)
  const m = metaOf(tlMetaStore.get(), id)
  if (!r) return 'Rule not found.'
  if (r.status !== 'Pending' || m.draft) return 'Only submitted pending rules can be approved.'
  if (m.maker === user) return 'Maker-checker: you created this rule, so another user must approve it.'
  if (r.siteAtmIds.some(isBmSite)) return 'Rule contains Business Model sites — TL sharing applies to Franchise sites only.'
  const clash = tlConflicts(r, m.replaces ? [m.replaces] : [])
  if (clash.length) return `Duplicate TL sharing: ${clash.map((c) => `${c.rule.id} (${c.rule.tlName}) on ${c.sites.join(', ')}`).join('; ')}.`
  const at = nowIso()
  const old = m.replaces ? tlStore.get().rules.find((x) => x.id === m.replaces) : undefined
  const closeTo = old ? (dayBefore(r.effectiveFrom) < old.effectiveFrom ? old.effectiveFrom : dayBefore(r.effectiveFrom)) : null
  tlStore.set((s) => ({
    ...s,
    rules: s.rules.map((x) => (x.id === id ? { ...x, status: 'Approved' } : old && x.id === old.id && end(x.effectiveTo) >= r.effectiveFrom ? { ...x, effectiveTo: closeTo } : x)),
  }))
  tlMetaStore.set((all) => {
    const next = { ...all, [id]: { ...m, checker: user, history: [...m.history, { at, by: user, action: 'Approved', detail: note || undefined }] } }
    if (old) {
      const om = metaOf(all, old.id)
      next[old.id] = { ...om, history: [...om.history, { at, by: user, action: `Closed — superseded by ${id}`, detail: `Effective to ${closeTo}` }] }
    }
    return next
  })
  logPayout({ by: user, area: 'Team Leader', ref: id, action: 'TL rule approved', before: old ? `${old.id} to ${old.effectiveTo ?? 'open'}` : undefined, after: `${r.type} ${r.value} from ${r.effectiveFrom}` })
  if (apiEnabled) void papi.apiDecideTlRule(id, true, note)
  return null
}

export function rejectRule(id: string, reason: string): string | null {
  const user = me()
  const r = tlStore.get().rules.find((x) => x.id === id)
  const m = metaOf(tlMetaStore.get(), id)
  if (!r) return 'Rule not found.'
  if (r.status !== 'Pending' || m.draft) return 'Only submitted pending rules can be rejected.'
  if (m.maker === user) return 'Maker-checker: you created this rule, so another user must review it.'
  if (!reason.trim()) return 'Enter a rejection reason.'
  tlStore.set((s) => ({ ...s, rules: s.rules.map((x) => (x.id === id ? { ...x, status: 'Rejected' } : x)) }))
  tlMetaStore.set((all) => ({ ...all, [id]: { ...m, checker: user, history: [...m.history, { at: nowIso(), by: user, action: 'Rejected', detail: reason.trim() }] } }))
  logPayout({ by: user, area: 'Team Leader', ref: id, action: 'TL rule rejected', after: reason.trim() })
  if (apiEnabled) void papi.apiDecideTlRule(id, false, reason.trim())
  return null
}

export const valueLabel = (r: Pick<TlRule, 'type' | 'value'>) => (!r.value ? 'Not set' : r.type === 'Percentage' ? `${r.value}%` : `${inrP(r.value)} / month`)

export const newRuleId = () => {
  const max = tlStore.get().rules.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, '')) || 0), 99)
  return `TLR-${max + 1}`
}
export const newShareId = () => pid('TLS')

export function monthBounds(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, '0')}` }
}
export const ruleActiveIn = (r: TlRule, m: string) => {
  const b = monthBounds(m)
  return r.effectiveFrom <= b.to && end(r.effectiveTo) >= b.from
}

export function decideShare(id: string, approve: boolean, reason: string): string | null {
  const user = me()
  const s = tlStore.get().shares.find((x) => x.id === id)
  const m = tlShareMetaStore.get()[id]
  if (!s) return 'Share not found.'
  if (s.approval !== 'Pending') return 'This share is already decided.'
  if (m?.maker === user) return 'Maker-checker: you calculated this share, so another user must approve it.'
  if (!approve && !reason.trim()) return 'Enter a rejection reason.'
  const approval: TlShare['approval'] = approve ? 'Approved' : 'Rejected'
  tlStore.set((st) => ({ ...st, shares: st.shares.map((x) => (x.id === id ? { ...x, approval } : x)) }))
  if (m) tlShareMetaStore.set((all) => ({ ...all, [id]: { ...m, checker: user, history: [...m.history, { at: nowIso(), by: user, action: approval, detail: reason.trim() || undefined }] } }))
  logPayout({ by: user, area: 'Team Leader', ref: id, action: `TL share ${approval.toLowerCase()}`, after: reason.trim() || undefined })
  if (apiEnabled) void papi.apiDecideTlShare(id, approve, reason.trim())
  return null
}

export function updateSharePayment(id: string, payment: TlShare['payment'], utr: string, remarks: string): string | null {
  const user = me()
  const s = tlStore.get().shares.find((x) => x.id === id)
  if (!s) return 'Share not found.'
  if (s.approval !== 'Approved') return 'Payment can be recorded only after the share is approved.'
  const u = utr.trim().toUpperCase()
  if (payment === 'Paid' && !UTR_RE.test(u)) return 'UTR must be 10–22 letters/digits.'
  if (payment === 'Hold' && !remarks.trim()) return 'Enter the hold reason.'
  tlStore.set((st) => ({ ...st, shares: st.shares.map((x) => (x.id === id ? { ...x, payment, utr: payment === 'Paid' ? u : x.utr } : x)) }))
  tlShareMetaStore.set((all) => {
    const m = all[id]
    return m ? { ...all, [id]: { ...m, remarks: remarks.trim() || m.remarks, history: [...m.history, { at: nowIso(), by: user, action: `Payment ${payment}`, detail: [payment === 'Paid' ? `UTR ${u}` : '', remarks.trim()].filter(Boolean).join(' · ') || undefined }] } } : all
  })
  logPayout({ by: user, area: 'Team Leader', ref: id, action: `TL payment ${payment}`, before: `${s.payment}${s.utr ? ` ${s.utr}` : ''}`, after: `${payment}${payment === 'Paid' ? ` ${u}` : ''}` })
  if (apiEnabled) void papi.apiTlPayment(id, payment, u, remarks.trim())
  return null
}
