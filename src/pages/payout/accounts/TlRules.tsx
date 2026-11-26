// Team Leader profit sharing — rules list, create / revise / approve (spec §5.4, §5.6).
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { PayoutPage } from '@/pages/payout/PayoutShell'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { RadioGroup, SectionTitle, SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { apiEnabled, apiSaveTlRule } from '@/data/payoutApi'
import { downloadCsv } from '@/lib/export'
import { can, useRole } from '@/lib/rbac'
import { inrP, logPayout, nowIso, tlStore, toPaise, useFinanceRules, useTl, type TlRule } from '@/data/payout'
import { TEAM_LEADERS, siteByAtm, useSites } from '@/data/network'
import { approveRule, franchiseSites, isBmSite, me, metaOf, newRuleId, rejectRule, ruleStatus, tlConflicts, tlMetaStore, tlReporting, valueLabel, type TlMeta } from './model'
import { DetailGrid, EmptyRow, FilterSelect, FormActions, HistoryList, Notice, SubTabs, TableCard, btnDanger, btnOutline, btnPrimary, linkBtn, td, th } from './ui'

export function TlTabs() {
  return (
    <SubTabs
      tabs={[
        { label: 'Sharing Rules', to: '/finance/payouts/team-leader', end: true },
        { label: 'Monthly Calculation', to: '/finance/payouts/team-leader/calculation' },
      ]}
    />
  )
}

export function TlRulesList() {
  const navigate = useNavigate()
  const role = useRole()
  const { rules } = useTl()
  const meta = tlMetaStore.use()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const [fTl, setFTl] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rules.filter((r) => {
      const st = ruleStatus(r, metaOf(meta, r.id))
      return (
        (!s || [r.id, r.tlId, r.tlName, r.reportingMf, ...r.siteAtmIds].some((v) => v.toLowerCase().includes(s))) &&
        (!fStatus || st === fStatus) &&
        (!fType || r.type === fType) &&
        (!fTl || r.tlName === fTl)
      )
    })
  }, [rules, meta, q, fStatus, fType, fTl])

  return (
    <PayoutPage
      title="Team Leader Profit Sharing"
      sub="Franchise Model sites only — Business Model site profit is never shared with Team Leaders (§5.4)."
      crumbs={['Team Leader', 'Sharing Rules']}
      actions={
        can('Create', role) && (
          <button type="button" className={btnPrimary} onClick={() => navigate('/finance/payouts/team-leader/new')}>
            <Plus size={15} /> New TL Sharing Rule
          </button>
        )
      }
    >
      <TlTabs />
      <TableCard
        title="TL Sharing Rules"
        sub={`${rows.length} of ${rules.length} rules · historical versions are kept`}
        search={q}
        onSearch={setQ}
        placeholder="Rule, TL, MF, ATM ID"
        filterOpen={open}
        onToggleFilter={() => setOpen((o) => !o)}
        filterCount={[fStatus, fType, fTl].filter(Boolean).length}
        filters={
          <>
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={['Draft', 'Pending', 'Approved', 'Rejected']} />
            <FilterSelect label="Sharing Type" value={fType} onChange={setFType} options={['Percentage', 'Fixed']} />
            <FilterSelect label="Team Leader" value={fTl} onChange={setFTl} options={[...new Set(rules.map((r) => r.tlName))]} />
          </>
        }
        onDownload={() => {
          downloadCsv(
            'tl-sharing-rules',
            ['Rule ID', 'TL ID', 'TL Name', 'Reporting MF / SMF', 'Sites', 'Type', 'Value', 'Effective From', 'Effective To', 'Status', 'Maker', 'Checker'],
            rows.map((r) => {
              const m = metaOf(meta, r.id)
              return [r.id, r.tlId, r.tlName, r.reportingMf, r.siteAtmIds.join(' '), r.type, valueLabel(r), r.effectiveFrom, r.effectiveTo ?? '', ruleStatus(r, m), m.maker, m.checker ?? '']
            }),
          )
          toast(`Downloaded ${rows.length} rules`)
        }}
      >
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr>
              {['Rule ID', 'Team Leader', 'Reporting MF / SMF', 'Sites', 'Type', 'Share', 'Effective', 'Status', 'Maker', 'Action'].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = metaOf(meta, r.id)
              const st = ruleStatus(r, m)
              return (
                <tr key={r.id}>
                  <td className={td}><Link to={`/finance/payouts/team-leader/${r.id}`} className={linkBtn}>{r.id}</Link></td>
                  <td className={td}><div className="font-medium text-slate-900">{r.tlName}</div><div className="text-[11px] text-slate-500">{r.tlId}</div></td>
                  <td className={`${td} max-w-[260px] truncate`} title={r.reportingMf}>{r.reportingMf}</td>
                  <td className={td}>{r.siteAtmIds.length}</td>
                  <td className={td}>{r.type}</td>
                  <td className={td}>{r.value ? valueLabel(r) : <span className="text-amber-700">Pending Finance</span>}</td>
                  <td className={td}>{r.effectiveFrom} → {r.effectiveTo ?? 'open'}</td>
                  <td className={td}><Badge tone={toneFor(st)}>{st}</Badge></td>
                  <td className={td}>{m.maker}</td>
                  <td className={td}><Link to={`/finance/payouts/team-leader/${r.id}`} className={linkBtn}>View</Link></td>
                </tr>
              )
            })}
            {!rows.length && <EmptyRow cols={10} />}
          </tbody>
        </table>
      </TableCard>
    </PayoutPage>
  )
}

// ── create / edit / view ────────────────────────────────────────────────
export function TlRuleRoute() {
  const { id = '' } = useParams()
  const [sp] = useSearchParams()
  const from = sp.get('from') ?? ''
  return <TlRulePage key={`${id}|${from}`} id={id} fromId={from} />
}

function TlRulePage({ id, fromId }: { id: string; fromId: string }) {
  const { rules } = useTl()
  const meta = tlMetaStore.use()
  const rule = id ? rules.find((r) => r.id === id) : undefined
  if (id && !rule)
    return (
      <PayoutPage title="Team Leader Profit Sharing" crumbs={['Team Leader', id]}>
        <TlTabs />
        <Notice tone="error">Rule {id} was not found. <Link className="underline" to="/finance/payouts/team-leader">Back to rules</Link></Notice>
      </PayoutPage>
    )
  if (rule) {
    const m = metaOf(meta, rule.id)
    const editable = m.draft || rule.status === 'Rejected'
    if (!editable) return <TlRuleView rule={rule} meta={m} />
    return <TlRuleForm rule={rule} meta={m} />
  }
  const source = fromId ? rules.find((r) => r.id === fromId && r.status === 'Approved') : undefined
  return <TlRuleForm source={source} />
}

function TlRuleView({ rule, meta }: { rule: TlRule; meta: TlMeta }) {
  const navigate = useNavigate()
  const role = useRole()
  const { rules } = useTl()
  const allMeta = tlMetaStore.use()
  const [dlg, setDlg] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const self = meta.maker === me()
  const versions = rules.filter((r) => r.tlId === rule.tlId && r.id !== rule.id)
  const pendingRevision = rules.find((r) => metaOf(allMeta, r.id).replaces === rule.id && r.status === 'Pending')
  const act = (approve: boolean) => {
    const e = approve ? approveRule(rule.id, note) : rejectRule(rule.id, note)
    if (e) {
      setErr(e)
      return
    }
    toast(`${rule.id} ${approve ? 'approved' : 'rejected'}`)
    setDlg(false)
  }
  return (
    <PayoutPage
      title={`${rule.id} · ${rule.tlName}`}
      sub="Team Leader sharing rule"
      crumbs={['Team Leader', 'Sharing Rules', rule.id]}
      actions={
        <>
          <button type="button" className={btnOutline} onClick={() => navigate(-1)}>Back</button>
          {rule.status === 'Pending' && can('Approve', role) && <button type="button" className={btnPrimary} onClick={() => setDlg(true)}>Review &amp; Approve</button>}
          {rule.status === 'Approved' && can('Edit', role) && !pendingRevision && (
            <button type="button" className={btnPrimary} onClick={() => navigate(`/finance/payouts/team-leader/new?from=${rule.id}`)}>Revise rule (new version)</button>
          )}
        </>
      }
    >
      <TlTabs />
      {!rule.value && <Notice tone="warn">Share value not set — this rule shows “Rule pending Finance approval” in the monthly calculation until Finance configures it.</Notice>}
      {pendingRevision && <Notice>Revision <Link className="underline" to={`/finance/payouts/team-leader/${pendingRevision.id}`}>{pendingRevision.id}</Link> is pending approval.</Notice>}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4"><Badge tone={toneFor(rule.status)}>{rule.status}</Badge></div>
        <DetailGrid
          items={[
            { label: 'Team Leader', value: `${rule.tlName} (${rule.tlId})` },
            { label: 'Reporting MF / Super MF', value: rule.reportingMf },
            { label: 'Profit Sharing Type', value: rule.type },
            { label: 'Share', value: valueLabel(rule) },
            { label: 'Effective', value: `${rule.effectiveFrom} → ${rule.effectiveTo ?? 'open'}` },
            { label: 'Maker / Checker', value: `${meta.maker} / ${meta.checker ?? '—'}` },
            { label: 'Replaces', value: meta.replaces },
            { label: 'Remarks', value: meta.remarks },
          ]}
        />
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold text-slate-500">Assigned Franchise Sites ({rule.siteAtmIds.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {rule.siteAtmIds.map((a) => (
              <span key={a} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px]">{a}</span>
            ))}
          </div>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <SectionTitle title="History" />
          <HistoryList items={[...meta.history].reverse()} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <SectionTitle title="Other mappings for this Team Leader" sub="Historical mappings and effective dates are preserved (§5.6)." />
          {versions.length ? (
            <ul className="space-y-2 text-[12px]">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <Link to={`/finance/payouts/team-leader/${v.id}`} className={linkBtn}>{v.id}</Link>
                  <span>{v.siteAtmIds.length} sites · {valueLabel(v)} · {v.effectiveFrom} → {v.effectiveTo ?? 'open'}</span>
                  <Badge tone={toneFor(ruleStatus(v, metaOf(allMeta, v.id)))}>{ruleStatus(v, metaOf(allMeta, v.id))}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-slate-500">No other mappings.</p>
          )}
        </section>
      </div>
      {dlg && (
        <Modal
          title={`Review ${rule.id}`}
          sub={`Maker ${meta.maker}`}
          onClose={() => setDlg(false)}
          footer={
            <>
              <button type="button" className={btnOutline} onClick={() => setDlg(false)}>Back</button>
              <button type="button" className={btnDanger} disabled={self} onClick={() => act(false)}>Reject</button>
              <button type="button" className={btnPrimary} disabled={self} onClick={() => act(true)}>Approve</button>
            </>
          }
        >
          <div className="space-y-3">
            {self && <Notice tone="error">Maker-checker (§18): you created this rule, so another user must approve or reject it.</Notice>}
            {meta.replaces && <Notice>On approval {meta.replaces} is closed the day before {rule.effectiveFrom} and kept in history.</Notice>}
            <TextAreaField label="Remarks (required to reject)" value={note} onChange={(e) => { setNote(e.target.value); setErr('') }} />
            {err && <p className="text-[12px] text-red-700">{err}</p>}
          </div>
        </Modal>
      )}
    </PayoutPage>
  )
}

type RForm = { tlId: string; sites: string[]; type: 'Percentage' | 'Fixed' | ''; value: string; from: string; to: string; remarks: string }

function TlRuleForm({ rule, meta, source }: { rule?: TlRule; meta?: TlMeta; source?: TlRule }) {
  const navigate = useNavigate()
  const role = useRole()
  const rules = useFinanceRules()
  const sites = useSites()
  const base = rule ?? source
  const [f, setF] = useState<RForm>(() => ({
    tlId: base?.tlId ?? '',
    sites: base?.siteAtmIds ?? [],
    type: base?.type ?? '',
    value: !base?.value ? '' : base.type === 'Fixed' ? String(base.value / 100) : String(base.value),
    from: rule?.effectiveFrom ?? '',
    to: rule?.effectiveTo ?? '',
    remarks: meta?.remarks ?? '',
  }))
  const [mode, setMode] = useState<null | 'draft' | 'submit'>(null)
  const [siteQ, setSiteQ] = useState('')
  const set = <K extends keyof RForm>(k: K, v: RForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const tl = TEAM_LEADERS.find((t) => t.id === f.tlId)
  const rep = useMemo(() => tlReporting(f.tlId, f.sites), [f.tlId, f.sites])
  const eligibleSites = useMemo(() => franchiseSites(sites.sites), [sites])
  const direct = useMemo(() => {
    const ids = new Set(rep.directFranchises)
    return eligibleSites.filter((s) => ids.has(s.frId)).map((s) => s.atmId)
  }, [eligibleSites, rep.directFranchises])
  const matches = useMemo(() => {
    const s = siteQ.trim().toLowerCase()
    if (s.length < 2) return []
    return eligibleSites.filter((x) => !f.sites.includes(x.atmId) && [x.atmId, x.siteId, x.district, x.location].some((v) => (v ?? '').toLowerCase().includes(s))).slice(0, 12)
  }, [siteQ, eligibleSites, f.sites])

  const valueNum = f.value.trim() === '' ? 0 : Number(f.value)
  const stored = f.type === 'Fixed' ? toPaise(f.value || 0) : Math.round(valueNum * 100) / 100
  const draftRule = { id: rule?.id ?? '__new__', siteAtmIds: f.sites, effectiveFrom: f.from, effectiveTo: f.to || null }
  const conflicts = f.from && f.sites.length ? tlConflicts(draftRule, source ? [source.id] : meta?.replaces ? [meta.replaces] : []) : []

  const check = (m: typeof mode) => {
    const e: Record<string, string> = {}
    if (m && !f.tlId) e.tlId = 'Select the Team Leader.'
    if (m === 'submit') {
      if (!f.sites.length) e.sites = 'Assign at least one Franchise site.'
      if (!f.type) e.type = 'Select the sharing type.'
      if (!f.from) e.from = 'Select the effective-from date.'
    }
    if (f.value.trim() && (!Number.isFinite(valueNum) || valueNum < 0)) e.value = 'Enter a valid non-negative number.'
    else if (f.type === 'Percentage' && valueNum > 100) e.value = 'Percentage cannot exceed 100.'
    if (f.to && f.from && f.to < f.from) e.to = 'Effective-to must be on or after effective-from.'
    const bm = f.sites.filter(isBmSite)
    if (bm.length) e.sites = `Business Model sites are not allowed: ${bm.join(', ')}.`
    const unknown = f.sites.filter((a) => !siteByAtm(a))
    if (unknown.length) e.sites = `Unknown ATM IDs: ${unknown.join(', ')}.`
    if (m === 'submit' && conflicts.length)
      e.form = `Duplicate TL sharing for an overlapping period: ${conflicts.map((c) => `${c.rule.id} (${c.rule.tlName}) on ${c.sites.join(', ')}`).join('; ')}.`
    return e
  }
  const shown = check(mode)

  const save = (submit: boolean) => {
    const m = submit ? 'submit' : 'draft'
    setMode(m)
    const e = check(m)
    if (Object.keys(e).length) {
      toast(e.form ?? 'Please fix the highlighted fields.', 'error')
      return
    }
    if (apiEnabled && !submit) {
      toast('Drafts are not stored on the server — submit the rule for approval to save it.', 'error')
      return
    }
    const user = me()
    const at = nowIso()
    const id = rule?.id ?? newRuleId()
    const next: TlRule = {
      id, tlId: f.tlId, tlName: tl?.name ?? f.tlId, reportingMf: rep.label, siteAtmIds: f.sites, type: (f.type || 'Percentage') as TlRule['type'], value: stored,
      effectiveFrom: f.from, effectiveTo: f.to || null, status: 'Pending',
    }
    const action = submit ? 'Submitted for approval' : 'Saved as draft'
    const nm: TlMeta = {
      maker: meta?.maker ?? user,
      draft: !submit,
      replaces: meta?.replaces ?? source?.id,
      remarks: f.remarks.trim() || undefined,
      history: [...(meta?.history ?? (source ? [{ at, by: user, action: `Revision of ${source.id}` }] : [])), { at, by: user, action, detail: `${next.siteAtmIds.length} sites · ${valueLabel(next)}` }],
    }
    tlStore.set((s) => ({ ...s, rules: rule ? s.rules.map((r) => (r.id === id ? next : r)) : [next, ...s.rules] }))
    tlMetaStore.set((all) => ({ ...all, [id]: nm }))
    logPayout({ by: user, area: 'Team Leader', ref: id, action: `TL rule ${action.toLowerCase()}`, before: source ? `${source.id} ${valueLabel(source)}` : undefined, after: `${next.type} ${valueLabel(next)} · ${next.siteAtmIds.length} sites · ${next.effectiveFrom}→${next.effectiveTo ?? 'open'}` })
    if (apiEnabled) {
      void apiSaveTlRule(rule && !source ? rule.id : null, next).then((ok) => ok && toast('TL rule submitted for approval'))
      navigate('/finance/payouts/team-leader', { replace: true })
      return
    }
    toast(submit ? `${id} submitted for approval` : `${id} saved as draft`)
    navigate(`/finance/payouts/team-leader/${id}`, { replace: true })
  }

  const busy = !can(rule ? 'Edit' : 'Create', role)
  return (
    <PayoutPage title={rule ? `Edit ${rule.id}` : source ? `Revise ${source.id}` : 'New TL Sharing Rule'} sub="Assign Franchise sites and the share. The share % / amount is a Finance decision — never defaulted." crumbs={['Team Leader', 'Sharing Rules', rule?.id ?? 'New']}>
      <TlTabs />
      {busy && <Notice tone="warn">Your role ({role}) cannot create or edit TL rules.</Notice>}
      {source && <Notice>Revising {source.id}. The current rule stays in force until this version is approved, then it is closed and kept in history.</Notice>}
      {rule?.status === 'Rejected' && <Notice tone="warn">Rejected: {[...(meta?.history ?? [])].reverse().find((h) => h.action === 'Rejected')?.detail ?? '—'}. Correct and resubmit.</Notice>}
      {shown.form && <Notice tone="error">{shown.form}</Notice>}
      {!shown.form && conflicts.length > 0 && <Notice tone="warn">Overlaps with {conflicts.map((c) => `${c.rule.id} on ${c.sites.join(', ')}`).join('; ')} — submission will be blocked.</Notice>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionTitle num="01" title="Team Leader" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Team Leader Name"
            required
            value={tl ? `${tl.name} (${tl.id})` : ''}
            disabled={!!source}
            options={TEAM_LEADERS.map((t) => `${t.name} (${t.id})`)}
            onChange={(e) => set('tlId', TEAM_LEADERS.find((t) => `${t.name} (${t.id})` === e.target.value)?.id ?? '')}
            error={shown.tlId}
          />
          <TextField label="Team Leader ID (auto)" value={f.tlId} disabled />
          <TextField label="Rule ID (auto)" value={rule?.id ?? 'Generated on save'} disabled />
          <TextField label="Reporting MF / Super MF (auto)" value={rep.label} disabled hint="From the approved hierarchy of the assigned sites" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionTitle num="02" title="Assigned Franchise Sites" sub="Only Franchise vertical sites are offered — BM sites are excluded (§5.4)." />
        <div className="flex flex-wrap items-end gap-3">
          <TextField className="w-full sm:w-[320px]" label="Search site" placeholder="ATM ID, Site ID, district" value={siteQ} onChange={(e) => setSiteQ(e.target.value)} />
          {direct.length > 0 && (
            <button type="button" className={btnOutline} onClick={() => setF((p) => ({ ...p, sites: [...new Set([...p.sites, ...direct])] }))}>
              Add {direct.length} sites mapped to this TL
            </button>
          )}
          {f.sites.length > 0 && <button type="button" className={btnOutline} onClick={() => set('sites', [])}>Clear all</button>}
        </div>
        {matches.length > 0 && (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            {matches.map((s) => (
              <li key={s.atmId} className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-[12px] last:border-0">
                <span><b className="font-mono">{s.atmId}</b> · {s.siteId} · {s.district}, {s.state} · {s.siteType}</span>
                <button type="button" className={linkBtn} onClick={() => setF((p) => ({ ...p, sites: [...p.sites, s.atmId] }))}>Add</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {f.sites.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px]">
              {a}
              <button type="button" aria-label={`Remove ${a}`} onClick={() => setF((p) => ({ ...p, sites: p.sites.filter((x) => x !== a) }))}><X size={12} /></button>
            </span>
          ))}
          {!f.sites.length && <span className="text-[12px] text-slate-500">No sites assigned.</span>}
        </div>
        {shown.sites && <p className="mt-1.5 text-[11px] text-brand-red">{shown.sites}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionTitle num="03" title="Share & Validity" />
        {(rules.tlShareType || rules.tlSharePct != null || rules.tlShareFixed != null) && (
          <div className="mb-3"><Notice>Finance configuration: type {rules.tlShareType ?? '—'} · % {rules.tlSharePct ?? '—'} · fixed {rules.tlShareFixed != null ? inrP(rules.tlShareFixed) : '—'}.</Notice></div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RadioGroup label="Profit Sharing Type *" value={f.type} options={['Percentage', 'Fixed'] as const} onChange={(v) => set('type', v)} error={shown.type} />
          <TextField
            label={f.type === 'Fixed' ? 'Fixed Share (₹ / month)' : 'Sharing Percentage (%)'}
            inputMode="decimal"
            value={f.value}
            onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))}
            error={shown.value}
            hint={!valueNum ? 'Leave blank until Finance approves — calculation will show “Rule pending Finance approval”.' : undefined}
          />
          <TextField label="Effective From" required type="date" value={f.from} onChange={(e) => set('from', e.target.value)} error={shown.from} />
          <TextField label="Effective To" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} error={shown.to} hint="Blank = open-ended" />
          <TextAreaField className="sm:col-span-2 lg:col-span-4" label="Remarks" value={f.remarks} onChange={(e) => set('remarks', e.target.value)} />
        </div>
      </section>

      <FormActions onBack={() => navigate(-1)} onDraft={() => save(false)} onSubmit={() => save(true)} disabled={busy} />
    </PayoutPage>
  )
}
