// Onboarding › KYC upload against the backend (API mode only). The KYC case store (`@/data/kyc`) belongs to the
// Legal / KYC module; this helper only opens the case on the server, uploads the documents and hands the resulting
// case to that store (`addKycCase`), so the verification queue shows it immediately.
import { patch, post, uploadFile } from '@/lib/api'
import { addKycCase, type KycCase, type KycDocType } from '@/data/kyc'

type ApiKycCase = Omit<KycCase, 'id' | 'api' | 'decision'> & {
  caseId: string
  api?: { at: string; nameMatch: number } | null
  decision?: { by: string; at: string; reason?: string } | null
}

export function kycFromApi(x: ApiKycCase): KycCase {
  return {
    id: x.caseId,
    franchiseId: x.franchiseId,
    applicant: x.applicant,
    loi: x.loi,
    region: x.region,
    status: x.status,
    docs: (x.docs ?? []).map((d) => ({ ...d, versions: d.versions.map((v) => ({ ...v, at: String(v.at) })) })),
    fields: x.fields,
    note: x.note ?? '',
    checklist: x.checklist,
    api: x.api ? { at: String(x.api.at), nameMatch: x.api.nameMatch } : null,
    decision: x.decision ? { ...x.decision, at: String(x.decision.at) } : undefined,
    submittedAt: String(x.submittedAt),
  }
}

export type KycSubmission = {
  franchiseId: string
  applicant?: string
  loi?: string
  fields: { pan: string; entityType: string; nameOnPan: string; fatherName?: string; dob: string; aadhaarLast4: string; address: string }
  note?: string
  docs: { type: KycDocType; file: File | null; name: string }[]
}

/**
 * POST /onboarding/kyc (opens the case, franchise KYC → In review) → POST /files + /onboarding/kyc/:id/documents for
 * every selected file → PATCH note. Returns the server case (also added to the KYC store).
 */
export async function submitKycCase(s: KycSubmission): Promise<KycCase> {
  let k = await post<ApiKycCase>('/onboarding/kyc', { franchiseId: s.franchiseId, applicant: s.applicant, loi: s.loi, fields: s.fields })
  for (const d of s.docs) {
    if (!d.file) continue
    const { fileId } = await uploadFile(d.file, { purpose: 'kyc', entity: 'KycCase', ref: k.caseId })
    k = await post<ApiKycCase>(`/onboarding/kyc/${k.caseId}/documents`, { type: d.type, name: d.name, fileId })
  }
  if (s.note?.trim()) k = await patch<ApiKycCase>(`/onboarding/kyc/${k.caseId}`, { note: s.note.trim() })
  const out = kycFromApi(k)
  addKycCase(out)
  return out
}

