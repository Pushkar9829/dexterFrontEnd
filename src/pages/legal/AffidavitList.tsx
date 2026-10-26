import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ArrowRight,
  Download,
  FileCheck2,
  Plus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { useLegal, fmtDate } from '@/data/legal'

export default function AffidavitList() {
  const state = useLegal()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Map affidavit documents for each site
  const rows = useMemo(() => {
    return state.sites.map((site) => {
      const doc = state.docs.find((d) => d.siteId === site.id && d.kind === 'AFF')
      const status = doc?.status || 'Approved'

      return {
        id: site.id,
        siteId: site.id,
        franchiseName: site.franchiseName,
        location: site.location,
        city: site.city,
        state: site.state,
        tier: site.tier,
        status,
        version: doc?.version || 'v1.0',
        dueDate: doc?.dueDate || '2026-11-15',
        signatory: site.signatory,
      }
    })
  }, [state.sites, state.docs])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.franchiseName.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
      const matchStatus = !statusFilter || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [rows, search, statusFilter])

  const stats = useMemo(() => {
    const total = rows.length
    const approved = rows.filter((r) => r.status === 'Approved').length
    const underReview = rows.filter((r) => r.status === 'Under Review').length
    const actionReq = rows.filter(
      (r) => r.status === 'Action Required' || r.status === 'Resubmission Required'
    ).length
    return { total, approved, underReview, actionReq }
  }, [rows])

  const exportData = () => {
    downloadCsv(
      'legal-affidavit-records',
      ['Site ID', 'Franchise Name', 'Location', 'City', 'State', 'Status', 'Version', 'Signatory'],
      filtered.map((r) => [
        r.id,
        r.franchiseName,
        r.location,
        r.city,
        r.state,
        r.status,
        r.version,
        r.signatory,
      ])
    )
    toast('Affidavit records exported successfully')
  }

  return (
    <div className="max-w-[1320px] mx-auto pb-16 space-y-4">
      {/* Top Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-2">
        <Link
          to="/dashboard"
          className="text-[#0066FF] hover:opacity-80 transition-opacity flex items-center"
          title="Home"
        >
          <Home size={14} />
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-500">Workspace</span>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Legal
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Affidavit</span>
      </nav>

      {/* Header section with actions */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 border border-purple-200 text-purple-600 shadow-xs">
              <FileCheck2 size={22} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">
                Affidavits
              </h1>
            </div>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Manage sworn affidavits, notary seals, and legal declarations for franchise locations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/legal/affidavit/new">
            <Button variant="primary" icon={<Plus size={15} />}>
              New Affidavit
            </Button>
          </Link>
          <Button variant="secondary" icon={<Download size={15} />} onClick={exportData}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Total Sites
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">
            Approved / Cleared
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.approved}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">
            Under Review
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{stats.underReview}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
            Action Required
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.actionReq}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-4 p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search site, franchise name, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-primary focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Under Review">Under Review</option>
              <option value="Action Required">Action Required</option>
              <option value="Resubmission Required">Resubmission Required</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Records Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-line bg-surface text-[11.5px] font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Site / LOI Number</th>
                <th className="px-4 py-3">Franchise & Location</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due / Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {filtered.map((r) => {
                let badgeClass = 'bg-surface text-ink-2 border-line'
                if (r.status === 'Approved') {
                  badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
                } else if (r.status === 'Under Review') {
                  badgeClass = 'bg-blue-50 text-blue-700 border-blue-200'
                } else if (r.status === 'Action Required' || r.status === 'Resubmission Required') {
                  badgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
                }

                return (
                  <tr key={r.id} className="transition-colors hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-ink">
                      <Link
                        to={`/legal/${r.id}`}
                        className="text-primary hover:underline font-mono text-[12.5px]"
                      >
                        {r.id}
                      </Link>
                      <span className="block text-[11px] text-muted font-normal">
                        Ver: {r.version}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{r.franchiseName}</div>
                      <div className="text-[11.5px] text-muted line-clamp-1">{r.location}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {r.city}, {r.state}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-[12px]">{fmtDate(r.dueDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/legal/${r.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                      >
                        Master Record <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No affidavit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
