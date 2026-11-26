import { lazy } from 'react'
import { Route } from 'react-router-dom'
const UserHub = lazy(() => import('./UserHub'))
const MyAccountHub = lazy(() => import('./MyAccountHub'))
const HelpSupportHub = lazy(() => import('./HelpSupportHub'))
const UserProfile = lazy(() => import('./UserProfile'))
const ChangePassword = lazy(() => import('./ChangePassword'))
const SupportTickets = lazy(() => import('./SupportTickets'))
const HelpCenter = lazy(() => import('./HelpCenter'))
const TakeTour = lazy(() => import('./TakeTour'))
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
