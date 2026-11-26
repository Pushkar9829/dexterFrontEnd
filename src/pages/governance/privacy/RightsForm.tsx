// Data-principal rights request form (Access, Correction, Erasure, Grievance, Withdraw consent, Nominate).
import { useState } from 'react'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Form'
import { toast } from '@/components/ui/Toast'
import { RIGHT_TYPES, addDays, logPrivacy, nextId, privacyStore, type RightType, type RightsRequest } from '@/data/privacy'
import { FormActions, Note } from '../security/kit'
import { actor } from '../security/util'

type Identity = { name: string; ref: string; contact: string }
const HELP: Record<RightType, string> = {
  Access: 'A summary of the personal data we process about you, the processing activities and who it was shared with.',
  Correction: 'Correct, complete or update inaccurate personal data — say what is wrong and the correct value.',
  Erasure: 'Delete personal data no longer needed, unless the law requires us to keep it.',
  'Grievance redressal': 'Raise a complaint about how your personal data is handled.',
  'Withdraw consent': 'Stop processing that relies on your consent. Processing done before withdrawal stays lawful.',
  Nominate: 'Name a person who can exercise your rights in case of death or incapacity.',
}

export function RightsForm({ identity, source, onDone, onBack }: { identity?: Identity; source: RightsRequest['source']; onDone: (r: RightsRequest) => void; onBack: () => void }) {
  const fixed = !!identity
  const [who, setWho] = useState<Identity>(identity ?? { name: '', ref: '', contact: '' })
  const [type, setType] = useState<RightType | ''>('')
  const [details, setDetails] = useState('')
  const [nominee, setNominee] = useState({ name: '', relation: '', contact: '' })
  const [err, setErr] = useState<Record<string, string>>({})

  const submit = () => {
    const e: Record<string, string> = {}
    if (!who.name.trim()) e.name = 'Name is required.'
    if (!who.contact.trim()) e.contact = 'Email or mobile is required.'
    if (!type) e.type = 'Choose the right you want to exercise.'
    if (details.trim().length < 10) e.details = 'Describe the request (at least 10 characters).'
    if (type === 'Nominate') {
      if (!nominee.name.trim()) e.nName = 'Nominee name is required.'
      if (!nominee.relation.trim()) e.nRel = 'Relationship is required.'
      if (!nominee.contact.trim()) e.nContact = 'Nominee contact is required.'
    }
    setErr(e)
    if (Object.keys(e).length || !type) return toast('Fill the required fields.', 'error')
    const s = privacyStore.get()
    const at = new Date().toISOString()
    const by = actor()
    const r: RightsRequest = {
      id: nextId('DSR', s.rights),
      createdAt: at,
      principal: who.name.trim(),
      principalRef: who.ref.trim() || who.contact.trim(),
      contact: who.contact.trim(),
      type,
      details: details.trim(),
      nominee: type === 'Nominate' ? { name: nominee.name.trim(), relation: nominee.relation.trim(), contact: nominee.contact.trim() } : undefined,
      status: fixed ? 'In Progress' : 'Identity Verification',
      dueAt: addDays(at, s.settings.rightsSlaDays),
      source,
      history: [{ at, actor: by, action: 'Submitted', detail: `${type} — ${source}` }, ...(fixed ? [{ at, actor: 'System', action: 'Identity verified', detail: 'Signed-in account' }] : [])],
    }
    privacyStore.set((st) => ({ ...st, rights: [r, ...st.rights] }))
    logPrivacy(by, 'Rights request submitted', r.id, `${r.type} for ${r.principal}`)
    toast(`Request ${r.id} submitted. Response due within ${s.settings.rightsSlaDays} days.`)
    onDone(r)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Data principal" required value={who.name} readOnly={fixed} onChange={(e) => setWho({ ...who, name: e.target.value })} error={err.name} />
        <TextField label="Reference (account / application ID)" value={who.ref} readOnly={fixed} onChange={(e) => setWho({ ...who, ref: e.target.value })} />
        <TextField label="Email or mobile" required value={who.contact} readOnly={fixed} onChange={(e) => setWho({ ...who, contact: e.target.value })} error={err.contact} />
        <SelectField label="Right" required options={[...RIGHT_TYPES]} value={type} onChange={(e) => setType(e.target.value as RightType)} error={err.type} hint={type ? HELP[type] : undefined} className="sm:col-span-3" />
        <TextAreaField label="Request details" required className="sm:col-span-3" value={details} onChange={(e) => setDetails(e.target.value)} error={err.details} />
      </div>
      {type === 'Nominate' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Nominee name" required value={nominee.name} onChange={(e) => setNominee({ ...nominee, name: e.target.value })} error={err.nName} />
          <TextField label="Relationship" required value={nominee.relation} onChange={(e) => setNominee({ ...nominee, relation: e.target.value })} error={err.nRel} />
          <TextField label="Nominee email / mobile" required value={nominee.contact} onChange={(e) => setNominee({ ...nominee, contact: e.target.value })} error={err.nContact} />
        </div>
      )}
      {!fixed && <Note>Requests received outside the signed-in account start in “Identity Verification”.</Note>}
      <FormActions onBack={onBack} onSubmit={submit} submitLabel="Submit request" />
    </div>
  )
}
