import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { SelectField, TextField } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'
import { useBusiness, usePlans, VERTICALS, type Vertical } from '@/data/payout'
import { BENEFICIARY_KINDS, BM_FRANCHISEE_MSG, categoriesFor, fmtDate, latestByCode, activeVersionOf, type BeneficiaryKind, type Errors, type MapDraft } from './model'
import { FieldError, inputCls } from './ui'

function Num({ n }: { n: number }) {
  return <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-[#0066FF] text-[10.5px] font-bold text-white">{n}</span>
}
export function StepLabel({ n, children, required }: { n: number; children: ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center text-[12px] font-semibold text-ink">
      <Num n={n} />{children}{required && <span className="ml-0.5 text-brand-red">*</span>}
    </div>
  )
}

/** Steps 1–3 of §10.2: vertical → that vertical's site category → an approved (Active) plan. */
export function PlanPicker({ d, set, errors }: { d: MapDraft; set: (p: Partial<MapDraft>) => void; errors: Errors }) {
  const business = useBusiness()
  const plans = usePlans()
  const options = latestByCode(plans)
    .map((p) => activeVersionOf(plans, p.code))
    .filter((p): p is NonNullable<typeof p> => !!p && p.vertical === d.vertical && p.siteCategory === d.siteCategory)
  const chosen = d.planCode ? activeVersionOf(plans, d.planCode) : undefined
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <StepLabel n={1} required>Business Vertical</StepLabel>
        <SelectField label="" className="[&>label]:hidden" name="mapVertical" value={d.vertical} options={VERTICALS} error={errors.vertical}
          onChange={(e) => set({ vertical: e.target.value as Vertical, siteCategory: '', planCode: '', beneficiaryType: '' })} />
      </div>
      <div>
        <StepLabel n={2} required>Site Category</StepLabel>
        <SelectField label="" className="[&>label]:hidden" name="mapCategory" value={d.siteCategory} options={categoriesFor(d.vertical, business)} placeholder={d.vertical ? 'Select category' : 'Select vertical first'} error={errors.siteCategory}
          onChange={(e) => set({ siteCategory: e.target.value, planCode: '' })} />
      </div>
      <div>
        <StepLabel n={3} required>Approved Plan</StepLabel>
        <select value={d.planCode} onChange={(e) => set({ planCode: e.target.value })} aria-label="Approved plan" disabled={!d.siteCategory} className={cn(inputCls, 'h-9', errors.planCode ? 'border-brand-red' : 'border-line')}>
          <option value="">{!d.siteCategory ? 'Select category first' : options.length ? 'Select plan' : 'No active plan for this category'}</option>
          {options.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name} (v{p.version})</option>)}
        </select>
        <FieldError msg={errors.planCode} />
        {chosen && <p className="mt-1 text-[11px] text-muted">v{chosen.version} · {chosen.applicableFor} · valid {fmtDate(chosen.effectiveFrom)} – {chosen.effectiveTo ? fmtDate(chosen.effectiveTo) : 'open'}</p>}
      </div>
    </div>
  )
}

/** Steps 6–7: beneficiary and effective period. */
export function BeneficiaryAndDates({ d, set, errors, names, n0 = 6 }: { d: MapDraft; set: (p: Partial<MapDraft>) => void; errors: Errors; names?: Partial<Record<BeneficiaryKind, string | null>>; n0?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
      <div>
        <StepLabel n={n0} required>Applicable Beneficiary</StepLabel>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Beneficiary">
          {BENEFICIARY_KINDS.map((k) => {
            const blocked = d.vertical === 'Business Model' && k === 'Franchisee'
            const on = d.beneficiaryType === k
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => set({ beneficiaryType: k })}
                className={cn('flex h-[52px] flex-col items-start justify-center rounded-md border px-3 text-left text-[12px] transition-colors',
                  on ? (blocked ? 'border-brand-red bg-red-50' : 'border-[#0066FF] bg-primary-soft') : 'border-line bg-white hover:border-[#0066FF]/40', blocked && 'text-muted')}>
                <span className="font-semibold">{k === 'MF' ? 'MF' : k}</span>
                {names && <span className="w-full truncate text-[10.5px] text-muted">{blocked ? 'Not allowed for BM' : names[k] ?? 'Not in hierarchy'}</span>}
              </button>
            )
          })}
        </div>
        {errors.beneficiaryType && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-brand-red"><AlertTriangle size={13} className="mt-px shrink-0" />{errors.beneficiaryType}</p>
        )}
        {!errors.beneficiaryType && d.vertical === 'Business Model' && <p className="mt-1.5 text-[11px] text-muted">{BM_FRANCHISEE_MSG}</p>}
      </div>
      <div>
        <StepLabel n={n0 + 1} required>Effective Period</StepLabel>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="From" type="date" name="mapFrom" value={d.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} error={errors.effectiveFrom} />
          <TextField label="To" type="date" name="mapTo" value={d.effectiveTo} min={d.effectiveFrom} onChange={(e) => set({ effectiveTo: e.target.value })} error={errors.effectiveTo} hint="Empty = open-ended" />
        </div>
      </div>
    </div>
  )
}

export type RunResult = { title: string; created: { atmId: string; id: string }[]; skipped: { atmId: string; reason: string }[] }

/** Outcome of a bulk / rule-based run: every site was checked individually, skipped ones are reported. */
export function RunResultModal({ result, onClose }: { result: RunResult; onClose: () => void }) {
  const exportSkipped = () => downloadCsv(`mapping-skipped-${new Date().toISOString().slice(0, 10)}`, ['ATM ID', 'Reason'], result.skipped.map((s) => [s.atmId, s.reason]))
  return (
    <Modal title={result.title} sub={`${result.created.length} mapping(s) sent for approval · ${result.skipped.length} skipped`} onClose={onClose} width={720}
      footer={<>{result.skipped.length > 0 && <Button variant="secondary" onClick={exportSkipped}>Download skipped</Button>}<Button onClick={onClose}>Done</Button></>}>
      {result.created.length > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
          <CheckCircle2 size={15} className="mt-px shrink-0" />{result.created.length} site(s) mapped and waiting for checker approval.
        </p>
      )}
      {result.skipped.length > 0 ? (
        <div className="max-h-[340px] overflow-y-auto rounded-md border border-line">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 bg-surface"><tr><th className="px-3 py-2 text-left">ATM ID</th><th className="px-3 py-2 text-left">Skipped because</th></tr></thead>
            <tbody>
              {result.skipped.map((s) => <tr key={s.atmId} className="border-t border-line-soft"><td className="px-3 py-1.5 font-medium whitespace-nowrap">{s.atmId}</td><td className="px-3 py-1.5 text-ink-2">{s.reason}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="text-[12.5px] text-muted">No sites were skipped.</p>}
    </Modal>
  )
}
