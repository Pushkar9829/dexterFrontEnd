import { Route } from 'react-router-dom'
import UserHub from './UserHub'
import MyAccountHub from './MyAccountHub'
import HelpSupportHub from './HelpSupportHub'
import UserProfile from './UserProfile'
import ChangePassword from './ChangePassword'
import SupportTickets from './SupportTickets'
import HelpCenter from './HelpCenter'
import TakeTour from './TakeTour'

export const userRoutes = [
  <Route key="user-hub" path="/user" element={<UserHub />} />,
  <Route key="user-my-account" path="/user/my-account" element={<MyAccountHub />} />,
  <Route key="user-help-support" path="/user/help-support" element={<HelpSupportHub />} />,
  <Route key="user-profile" path="/user/profile" element={<UserProfile />} />,
  <Route key="user-change-password" path="/user/change-password" element={<ChangePassword />} />,
  <Route key="user-tickets" path="/user/tickets" element={<SupportTickets />} />,
  <Route key="user-help-center" path="/user/help-center" element={<HelpCenter />} />,
  <Route key="user-tour" path="/user/tour" element={<TakeTour />} />,
]
