import { useParams } from 'react-router-dom'
import BmSiteForm from './BmSiteForm'
import BmPayoutForm from './BmPayoutForm'

// Remount the forms per record so local form state never leaks between /new and /:code.
export function SiteFormRoute() {
  const { code } = useParams()
  return <BmSiteForm key={code ?? 'new'} />
}
export function PayoutFormRoute() {
  const { id } = useParams()
  return <BmPayoutForm key={id ?? 'new'} />
}
