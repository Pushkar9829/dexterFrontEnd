import { Route } from 'react-router-dom'
import Mailbox from './Mailbox'

export const emailRoutes = [
  <Route key="email-inbox" path="/email/inbox" element={<Mailbox key="inbox" folder="inbox" />} />,
  <Route key="email-compose" path="/email/inbox/compose" element={<Mailbox key="inbox" folder="inbox" compose />} />,
  <Route key="email-sent" path="/email/sent" element={<Mailbox key="sent" folder="sent" />} />,
  <Route key="email-drafts" path="/email/drafts" element={<Mailbox key="drafts" folder="drafts" />} />,
]
