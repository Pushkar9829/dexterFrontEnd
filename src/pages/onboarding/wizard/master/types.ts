import {
  Building2,
  FileText,
  User,
  MapPin,
  Briefcase,
  ShieldCheck,
  Landmark,
  Users,
  FileSignature,
  Receipt,
  Settings2,
  ClipboardCheck,
} from 'lucide-react'

export interface MasterSectionMeta {
  key: string
  letter: string
  title: string
  fullName: string
  sNoRange: string
  icon: typeof Building2
  description: string
  badgeText: string
}

export const MASTER_SECTIONS: MasterSectionMeta[] = [
  {
    key: 'A',
    letter: 'A',
    title: 'Franchise & Territory',
    fullName: 'Section - A. Franchise & Territory',
    sNoRange: 'S. No. 9 – 21',
    icon: Building2,
    description: 'Franchise classification, assigned operational zone, and sourcing channels',
    badgeText: 'Franchise & Territory',
  },
  {
    key: 'B',
    letter: 'B',
    title: 'Business & Legal Entity',
    fullName: 'Section - B. Business & Legal Entity',
    sNoRange: 'S. No. 22 – 34',
    icon: FileText,
    description: 'Entity constitution, registration numbers, tax compliance, and corporate credentials',
    badgeText: 'Legal Entity',
  },
  {
    key: 'C',
    letter: 'C',
    title: 'Applicant / Authorized Person',
    fullName: 'Section - C. Applicant / Authorized Person',
    sNoRange: 'S. No. 35 – 48',
    icon: User,
    description: 'Signatory identification, personal background, qualifications, and industry experience',
    badgeText: 'Authorized Person',
  },
  {
    key: 'D',
    letter: 'D',
    title: 'Address & Location',
    fullName: 'Section - D. Address & Location',
    sNoRange: 'S. No. 49 – 61',
    icon: MapPin,
    description: 'Permanent & communication addresses, local jurisdiction, and residency stability',
    badgeText: 'Address & Location',
  },
  {
    key: 'E',
    letter: 'E',
    title: 'Office Infrastructure & Investment',
    fullName: 'Section - E. Office Infrastructure & Investment',
    sNoRange: 'S. No. 62 – 73',
    icon: Briefcase,
    description: 'Commercial premises, hardware assets, power backups, and capital solvency',
    badgeText: 'Office & Capital',
  },
  {
    key: 'F',
    letter: 'F',
    title: 'KYC & Supporting Documents',
    fullName: 'Section - F. KYC & Supporting Documents',
    sNoRange: 'S. No. 74 – 85',
    icon: ShieldCheck,
    description: 'Identity verification, address proofs, corporate certificates, and digital sign',
    badgeText: 'KYC Verification',
  },
  {
    key: 'G',
    letter: 'G',
    title: 'Bank & Payment Account',
    fullName: 'Section - G. Bank & Payment Account',
    sNoRange: 'S. No. 86 – 96',
    icon: Landmark,
    description: 'Designated settlement account, IFSC validation, and financial statement proofs',
    badgeText: 'Bank & Payout',
  },
  {
    key: 'H',
    letter: 'H',
    title: 'References & Background Verification',
    fullName: 'Section - H. References & Background Verification',
    sNoRange: 'S. No. 97 – 116',
    icon: Users,
    description: 'Professional and financial referee attestations and police verification record',
    badgeText: 'References & Police',
  },
  {
    key: 'I',
    letter: 'I',
    title: 'Agreement, Declaration & Consent',
    fullName: 'Section - I. Agreement, Declaration & Consent',
    sNoRange: 'S. No. 117 – 126',
    icon: FileSignature,
    description: 'Information veracity attestations, statutory consents, and legal agreement execution',
    badgeText: 'Declaration & Sign',
  },
  {
    key: 'J',
    letter: 'J',
    title: 'Application Fee / Payment',
    fullName: 'Section - J. Application Fee / Payment',
    sNoRange: 'S. No. 127 – 136',
    icon: Receipt,
    description: 'Territory fee payment record, UTR references, and accounts reconciliation',
    badgeText: 'Fee & Payment',
  },
  {
    key: 'K',
    letter: 'K',
    title: 'Internal Approval & ERP Account',
    fullName: 'Section - K. Internal Approval & ERP Account',
    sNoRange: 'S. No. 137 – 154',
    icon: Settings2,
    description: 'Cross-functional approvals, ERP identity generation, and territory provisioning',
    badgeText: 'ERP & Approvals',
  },
  {
    key: 'L',
    letter: 'L',
    title: 'Final Submission Checklist',
    fullName: 'Section - L. Final Submission Checklist',
    sNoRange: 'S. No. 155 – 165',
    icon: ClipboardCheck,
    description: 'Multi-stage readiness checks and final application dispatch status',
    badgeText: 'Final Checklist',
  },
]

