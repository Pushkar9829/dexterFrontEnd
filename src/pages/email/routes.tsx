import { lazy } from 'react'
import { Route } from 'react-router-dom'
const EmailHub = lazy(() => import('./EmailHub'))
const Mailbox = lazy(() => import('./Mailbox'))
const CaseEmailRoute = lazy(() => import('./CaseEmail').then((m) => ({ default: m.CaseEmailRoute })))
export const emailRoutes = [
  <Route key="email-hub" path="/email" element={<EmailHub />} />,
  <Route key="email-inbox" path="/email/inbox" element={<Mailbox key="inbox" folder="inbox" />} />,
  <Route key="email-compose" path="/email/inbox/compose" element={<Mailbox key="inbox" folder="inbox" compose />} />,
  <Route key="email-sent" path="/email/sent" element={<Mailbox key="sent" folder="sent" />} />,
  <Route key="email-drafts" path="/email/drafts" element={<Mailbox key="drafts" folder="drafts" />} />,
  <Route key="email-case" path="/email/case/:trackerId" element={<CaseEmailRoute />} />,
]
