import { type ApplicationForm } from '@/data/applications'
import { MASTER_SECTIONS } from './types'
import {
  MasterFranchiseTerritory,
  MasterBusinessEntity,
  MasterAuthorizedPerson,
  MasterAddressLocation,
  MasterOfficeInfrastructure,
  MasterDocumentsKYC,
  MasterBankPayment,
  MasterReferencesPolice,
  MasterAgreementConsent,
  MasterFeePayment,
  MasterInternalApproval,
  MasterReviewChecklist,
  type MasterStepProps,
} from './MasterSteps'

export interface MasterSectionsViewProps {
  form: ApplicationForm
  set: (patch: Partial<ApplicationForm>) => void
  errors?: Record<string, string | undefined>
  readOnly?: boolean
  activeSectionKey?: string
  showAllSections?: boolean
  onEditSection?: (key: string) => void
}

/**
 * Clean card-based Master & Super Master Franchise view.
 * Renders modern, responsive 2-column form sections without Excel tables.
 */
export function MasterSectionsView({
  form,
  set,
  errors = {},
  readOnly = false,
  activeSectionKey = 'A',
  showAllSections = false,
  onEditSection,
}: MasterSectionsViewProps) {
  const stepProps: MasterStepProps = {
    form,
    set,
    errors,
    readOnly,
    onEditSection,
  }

  const renderSectionByKey = (key: string) => {
    switch (key) {
      case 'A':
        return <MasterFranchiseTerritory {...stepProps} />
      case 'B':
        return <MasterBusinessEntity {...stepProps} />
      case 'C':
        return <MasterAuthorizedPerson {...stepProps} />
      case 'D':
        return <MasterAddressLocation {...stepProps} />
      case 'E':
        return <MasterOfficeInfrastructure {...stepProps} />
      case 'F':
        return <MasterDocumentsKYC {...stepProps} />
      case 'G':
        return <MasterBankPayment {...stepProps} />
      case 'H':
        return <MasterReferencesPolice {...stepProps} />
      case 'I':
        return <MasterAgreementConsent {...stepProps} />
      case 'J':
        return <MasterFeePayment {...stepProps} />
      case 'K':
        return <MasterInternalApproval {...stepProps} />
      case 'L':
        return <MasterReviewChecklist {...stepProps} />
      default:
        return <MasterFranchiseTerritory {...stepProps} />
    }
  }

  if (showAllSections) {
    return (
      <div className="space-y-10">
        {MASTER_SECTIONS.map((sec) => (
          <section key={sec.key} id={`section-${sec.key}`} className="scroll-mt-6">
            {renderSectionByKey(sec.key)}
          </section>
        ))}
      </div>
    )
  }

  return <div>{renderSectionByKey(activeSectionKey)}</div>
}
