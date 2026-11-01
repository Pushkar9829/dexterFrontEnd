import { useSearchParams, useLocation } from 'react-router-dom'

/**
 * Hook to detect if a page is being viewed in "Reports & MIS" mode.
 * In Report mode:
 * - Strictly for viewing, filtering, and accessing reports.
 * - Form entry, new creation buttons, and editing/deletion functionality are suppressed.
 */
export function useReportMode() {
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const isReport =
    searchParams.get('source') === 'report' ||
    searchParams.get('from') === 'reports' ||
    searchParams.get('hideNew') === 'true' ||
    searchParams.get('mode') === 'report' ||
    searchParams.get('view') === 'report' ||
    location.pathname.startsWith('/reports')

  return { isReport, searchParams }
}

