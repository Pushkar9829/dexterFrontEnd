import { createStore } from '@/lib/store'
import { ist } from '@/data/complaints'

/* Preventive recommendations issued by the (demo) Service Risk model. Decisions persist locally. */

export type RecStatus = 'Needs review' | 'Accepted' | 'Rejected'
export type Recommendation = {
  id: string
  title: string
  context: string
  body: string
  rationaleTitle: string
  rationale: string
  confidence: number
  complaintId?: string
  atmId?: string
  owner: string
  issuedAt: string
  status: RecStatus
  decidedAt?: string
  decidedBy?: string
  taskId?: string
  rejectReason?: string
  highlighted?: boolean
}

export const MODEL_INFO = {
  name: 'Service Risk v2.4',
  updated: ist('2026-10-06', '09:00'),
  horizon: 'Next 24 hours',
  precision: 86,
}

const R = (r: Omit<Recommendation, 'status'> & { status?: RecStatus }): Recommendation => ({ status: 'Needs review', ...r })

function seed(): Recommendation[] {
  return [
    R({
      id: 'REC-050',
      title: 'Test UPS charging circuit before replacement',
      context: 'CMP-1048 · ATM-MH-1024 · Pune',
      body: 'Battery failed again within 27 days. Check charging voltage and wiring during the scheduled field visit.',
      rationaleTitle: 'Investigate charging faults before another replacement',
      rationale: 'ATM-MH-1024 has a recent battery replacement and a new power complaint. Validate charging voltage, wiring and load before accepting a new battery.',
      confidence: 94,
      complaintId: 'CMP-1048',
      atmId: 'ATM-MH-1024',
      owner: 'Amit Jadhav',
      issuedAt: ist('2026-10-06', '09:00'),
      highlighted: true,
    }),
    R({
      id: 'REC-049',
      title: 'Pre-position batteries for repeat-risk sites',
      context: 'Pattern: Power backup · repeat complaints',
      body: 'Batteries were replaced repeatedly this period. Audit replacement quality and stock spares in Pune and Ahmedabad.',
      rationaleTitle: 'Reduce spare lead time on repeat power faults',
      rationale: 'Power / UPS complaints are the largest repeat pattern. Spare dispatch delay is the main predicted breach driver on CMP-1048 and CMP-1044.',
      confidence: 89,
      owner: 'Paras Dubey',
      issuedAt: ist('2026-10-06', '09:00'),
      highlighted: true,
    }),
    R({
      id: 'REC-048',
      title: 'Run overnight network stability diagnostics',
      context: 'CMP-1052 · ATM-KA-0076 · Bengaluru',
      body: 'Intermittent link failures match earlier network complaints. A 6-hour diagnostic task has been assigned to Priya Nair.',
      rationaleTitle: 'Link failures repeat on the same carrier',
      rationale: 'CMP-1052 and CMP-1008 both report link drops on ATM-KA-0076 within 30 days.',
      confidence: 92,
      complaintId: 'CMP-1052',
      atmId: 'ATM-KA-0076',
      owner: 'Priya Nair',
      issuedAt: ist('2026-10-05', '09:00'),
      status: 'Accepted',
      decidedAt: ist('2026-10-05', '11:20'),
      decidedBy: 'Paras Dubey',
      taskId: 'TSK-2088',
      highlighted: true,
    }),
    R({
      id: 'REC-047',
      title: 'Confirm card reader visit before spare arrives',
      context: 'CMP-1046 · ATM-MH-1028 · Pune',
      body: 'The card reader is in transit but the engineer visit is not confirmed. Lock the 15:00 slot to avoid a second trip.',
      rationaleTitle: 'Visit confirmation is the missing dependency',
      rationale: 'Visit not confirmed is the primary breach driver for CMP-1046 (Next 18h).',
      confidence: 81,
      complaintId: 'CMP-1046',
      atmId: 'ATM-MH-1028',
      owner: 'Paras Dubey',
      issuedAt: ist('2026-10-07', '09:00'),
    }),
    R({
      id: 'REC-046',
      title: 'Approve dispenser module from Lucknow depot',
      context: 'CMP-1039 · ATM-UP-0305 · Lucknow',
      body: 'Dispenser jams have repeated within 30 days (CMP-0997). Replace the module instead of another service visit.',
      rationaleTitle: 'Repeat dispenser failure',
      rationale: 'Two dispenser jams on ATM-UP-0305 within 30 days; the ATM has been down since 06 Oct, 05:04.',
      confidence: 87,
      complaintId: 'CMP-1039',
      atmId: 'ATM-UP-0305',
      owner: 'Rohit Verma',
      issuedAt: ist('2026-10-06', '15:00'),
    }),
    R({ id: 'REC-045', title: 'Clean note validators before weekend load', context: 'Pattern: Note reject · Karnataka', body: 'Reject-bin counts are rising on Bengaluru ATMs.', rationaleTitle: 'Reject counts trending up', rationale: 'Two note-reject complaints in Karnataka this period.', confidence: 77, owner: 'Priya Nair', issuedAt: ist('2026-10-05', '09:00'), status: 'Rejected', decidedAt: ist('2026-10-05', '16:00'), decidedBy: 'Priya Nair', rejectReason: 'Already covered by monthly PM schedule' }),
    ...[
      ['REC-044', 'Replace printer heads on TP-07 batch', 'Pattern: Receipt printer', 'Kavita Reddy', '2026-10-01', '2026-10-01'],
      ['REC-043', 'Swap SIMs to dual-carrier on repeat sites', 'Pattern: Network interruption', 'Priya Nair', '2026-10-01', '2026-10-02'],
      ['REC-042', 'Recalibrate cash sensors in Jaipur', 'ATM-RJ-0267 · Jaipur', 'Amit Desai', '2026-10-02', '2026-10-02'],
      ['REC-041', 'Check UPS earthing at Ahmedabad sites', 'ATM-GJ-0218 · Ahmedabad', 'Paras Dubey', '2026-10-02', '2026-10-03'],
      ['REC-040', 'Schedule AC servicing for Chennai kiosks', 'Pattern: Cooling', 'Kavita Reddy', '2026-10-03', '2026-10-03'],
      ['REC-039', 'Patch EJ upload agent on Hyosung units', 'Pattern: Software & EJ', 'Rohit Verma', '2026-10-03', '2026-10-04'],
      ['REC-038', 'Pre-book Exide replacements for Pune', 'Pattern: Power backup', 'Paras Dubey', '2026-10-04', '2026-10-04'],
      ['REC-037', 'Replace worn pick belts in Lucknow', 'ATM-UP-0305 · Lucknow', 'Rohit Verma', '2026-10-04', '2026-10-05'],
      ['REC-036', 'Verify router firmware on KA sites', 'Pattern: Network interruption', 'Priya Nair', '2026-10-05', '2026-10-05'],
      ['REC-035', 'Stock card readers at Pune depot', 'Pattern: Card reader', 'Paras Dubey', '2026-10-05', '2026-10-06'],
      ['REC-034', 'Audit battery installation checklist', 'Pattern: Power backup', 'Paras Dubey', '2026-10-06', '2026-10-06'],
    ].map(([id, title, context, owner, issued, decided], i) =>
      R({
        id,
        title,
        context,
        body: 'Accepted and converted into a preventive task.',
        rationaleTitle: title,
        rationale: 'Observed recurrence in the prior 30 days.',
        confidence: 78 + (i % 5) * 3,
        owner,
        issuedAt: ist(issued, '09:00'),
        status: 'Accepted',
        decidedAt: ist(decided, '15:00'),
        decidedBy: owner,
        taskId: `TSK-${2040 + i}`,
      }),
    ),
  ]
}

export const recStore = createStore<Recommendation[]>('dexter.complaints.ai.v1', seed)

/** Human review of a prediction (risk queue). */
export type PredictionReview = { verdict: 'Agree' | 'Disagree'; by: string; at: string; note: string }
export const reviewStore = createStore<Record<string, PredictionReview>>('dexter.complaints.aireview.v1', () => ({}))
