import { lazy } from 'react'
import { Route } from 'react-router-dom'
const SiteMasterList = lazy(() => import('./SiteMasterList'))
const SiteCreate = lazy(() => import('./SiteCreate'))
const SiteProfile = lazy(() => import('./SiteProfile'))
export const siteRoutes = [
  <Route key="md-sites" path="/master-data/sites" element={<SiteMasterList />} />,
  <Route key="md-sites-new" path="/master-data/sites/new" element={<SiteCreate />} />,
  <Route key="md-site-profile" path="/master-data/sites/:siteId" element={<SiteProfile />} />,
]

export const siteCrumbs: Record<string, string[]> = {
  '/master-data/sites/new': ['Master Data', 'Site Master', 'New Site'],
  '/master-data/sites': ['Master Data', 'Site Master'],
}
