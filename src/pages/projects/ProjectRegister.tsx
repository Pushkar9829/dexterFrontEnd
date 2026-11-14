import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Table2,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { exportProjects, restoreProject, useProjects, progressOf, type Project } from '@/data/projects'
import { ProjectSheet, SheetFooter, StatusReference, useSheet } from './bands'
import { useReportMode } from '@/hooks/useReportMode'
import { AiProjectOverview } from './AiProjectOverview'

export type ProjectTabKey = 'active' | 'complete' | 'incomplete' | 'closed' | 'archived' | 'ai-overview'

/**
 * Projects Register & Rollout Intelligence:
 * - Inside Site Master (/projects/active): Shows ALL tabs (Active Projects, Complete, Incomplete, Closed, Archived Projects, AI Overview).
 *   Clicking between any tab (including Archived and Closed) preserves all tabs in view.
 * - Inside Other (/projects/other): Shows ONLY Archived Projects and Closed tabs.
 */
export default function ProjectRegister() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Only the dedicated /projects/other route acts as the standalone "Other" workspace
  const isOther = location.pathname.startsWith('/projects/other')

  const activeTab: ProjectTabKey = useMemo(() => {
    if (isOther) {
      if (tabParam === 'closed' || location.pathname.startsWith('/projects/other/closed')) {
        return 'closed'
      }
      return 'archived'
    }
    if (tabParam === 'closed' || location.pathname.startsWith('/projects/closed')) return 'closed'
    if (tabParam === 'archived' || location.pathname.startsWith('/projects/archived')) return 'archived'
    if (tabParam === 'complete' || location.pathname.startsWith('/projects/complete')) return 'complete'
    if (tabParam === 'incomplete' || location.pathname.startsWith('/projects/incomplete')) return 'incomplete'
    if (tabParam === 'ai-overview' || location.pathname.startsWith('/projects/ai-overview')) return 'ai-overview'
    return 'active'
  }, [isOther, location.pathname, tabParam])

  return <Register key={`${isOther ? 'other' : 'main'}-${activeTab}`} activeTab={activeTab} isOther={isOther} />
}

function Register({ activeTab, isOther }: { activeTab: ProjectTabKey; isOther: boolean }) {
  const navigate = useNavigate()
  const { isReport } = useReportMode()
  const { projects } = useProjects()

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects])
  const completeProjects = useMemo(
    () =>
      activeProjects.filter(
        (p) =>
          progressOf(p).pct === 100 ||
          p.f.cashLive === 'Done' ||
          (p.f.status && p.f.status.toLowerCase().startsWith('live'))
      ),
    [activeProjects]
  )
  const incompleteProjects = useMemo(
    () =>
      activeProjects.filter(
        (p) =>
          !(
            progressOf(p).pct === 100 ||
            p.f.cashLive === 'Done' ||
            (p.f.status && p.f.status.toLowerCase().startsWith('live'))
          )
      ),
    [activeProjects]
  )
  const closedProjects = useMemo(
    () =>
      projects.filter(
        (p) => p.archived || /closed|dropped|cancelled/i.test(p.f.status || '') || Boolean(p.archiveReason)
      ),
    [projects]
  )
  const archivedProjects = useMemo(() => projects.filter((p) => p.archived), [projects])

  const base = useMemo(() => {
    switch (activeTab) {
      case 'complete':
        return completeProjects
      case 'incomplete':
        return incompleteProjects
      case 'closed':
        return closedProjects
      case 'archived':
        return archivedProjects
      case 'ai-overview':
      case 'active':
      default:
        return activeProjects
    }
  }, [activeTab, completeProjects, incompleteProjects, closedProjects, archivedProjects, activeProjects])

  const sheet = useSheet(base)
  const models = [...new Set(projects.map((p) => p.f.model).filter(Boolean))].sort()
  const sel = [...sheet.selected].filter((id) => base.some((p) => p.id === id))

  const doExport = (rows: Project[], file: string) => {
    exportProjects(rows, file)
    toast(`${rows.length} project${rows.length === 1 ? '' : 's'} exported · recorded in the audit trail`)
  }

  const tabConfig = useMemo(() => {
    switch (activeTab) {
      case 'complete':
        return {
          title: isReport ? 'Site Master / Complete Projects' : 'Complete Projects',
          desc: 'All commissioned sites with live cash dispensing and verified project milestones.',
          sheetTitle: 'Complete project register',
          bandNote: `Rows 1–${sheet.rows.length} · 100% Milestone Completion`,
          noun: 'complete sites',
          file: 'complete-projects',
        }
      case 'incomplete':
        return {
          title: isReport ? 'Site Master / Incomplete Projects' : 'Incomplete Projects',
          desc: 'Sites in progress across site readiness, equipment installation, and account setup.',
          sheetTitle: 'Incomplete project register',
          bandNote: `Rows 1–${sheet.rows.length} · Ongoing Rollout`,
          noun: 'in-progress sites',
          file: 'incomplete-projects',
        }
      case 'closed':
        return {
          title: isReport ? 'Site Master / Closed Projects' : 'Closed Projects',
          desc: 'Sites closed, dropped, or cancelled prior to or following deployment.',
          sheetTitle: 'Closed project register',
          bandNote: `Rows 1–${sheet.rows.length} · Closed / Dropped`,
          noun: 'closed sites',
          file: 'closed-projects',
        }
      case 'archived':
        return {
          title: isReport ? 'Site Master / Archived Projects' : 'Archived Projects',
          desc: 'Archived project records retained for audit trail and compliance history.',
          sheetTitle: 'Archived project register',
          bandNote: `Rows 1–${sheet.rows.length}`,
          noun: 'archived records',
          file: 'archived-projects',
        }
      case 'ai-overview':
        return {
          title: isReport ? 'Site Master / AI Overview' : 'AI Project Overview',
          desc: 'Autonomous rollout intelligence, predictive go-live velocity forecasting, and critical path bottleneck detection.',
          sheetTitle: 'AI Rollout Intelligence Matrix',
          bandNote: 'Portfolio Telemetry',
          noun: 'evaluated records',
          file: 'ai-project-summary',
        }
      case 'active':
      default:
        return {
          title: isReport ? 'Site Master / Projects Report' : 'Active Projects',
          desc: 'Track site readiness, equipment installation and account activation in one register.',
          sheetTitle: 'Active project register',
          bandNote: `Rows 1–${sheet.rows.length}`,
          noun: 'active records',
          file: 'active-projects',
        }
    }
  }, [activeTab, isReport, sheet.rows.length])

  // Tabs rendered in the ProjectSheet:
  // - If inside OTHER (/projects/other), shows ONLY Archived Projects and Closed.
  // - If inside /projects/active, shows ALL 6 tabs and switching between them keeps all tabs visible!
  const tabs = useMemo(() => {
    if (isOther) {
      return [
        {
          to: isReport ? '/projects/other?source=report' : '/projects/other',
          label: 'Archived Projects',
          active: activeTab === 'archived',
          badge: archivedProjects.length,
          icon: <Archive size={13} className={activeTab === 'archived' ? 'text-primary' : 'text-muted'} />,
        },
        {
          to: isReport ? '/projects/other?tab=closed&source=report' : '/projects/other?tab=closed',
          label: 'Closed',
          active: activeTab === 'closed',
          badge: closedProjects.length,
          icon: <XCircle size={13} className={activeTab === 'closed' ? 'text-rose-600' : 'text-muted'} />,
        },
      ]
    }

    return [
      {
        to: isReport ? '/projects/active?source=report' : '/projects/active',
        label: 'Active Projects',
        active: activeTab === 'active',
        badge: activeProjects.length,
        icon: <LayoutGrid size={13} className={activeTab === 'active' ? 'text-primary' : 'text-muted'} />,
      },
      {
        to: isReport ? '/projects/active?tab=complete&source=report' : '/projects/active?tab=complete',
        label: 'Complete',
        active: activeTab === 'complete',
        badge: completeProjects.length,
        icon: <CheckCircle2 size={13} className={activeTab === 'complete' ? 'text-emerald-600' : 'text-muted'} />,
      },
      {
        to: isReport ? '/projects/active?tab=incomplete&source=report' : '/projects/active?tab=incomplete',
        label: 'Incomplete',
        active: activeTab === 'incomplete',
        badge: incompleteProjects.length,
        icon: <Clock size={13} className={activeTab === 'incomplete' ? 'text-amber-600' : 'text-muted'} />,
      },
      {
        to: isReport ? '/projects/active?tab=closed&source=report' : '/projects/active?tab=closed',
        label: 'Closed',
        active: activeTab === 'closed',
        badge: closedProjects.length,
        icon: <XCircle size={13} className={activeTab === 'closed' ? 'text-rose-600' : 'text-muted'} />,
      },
      {
        to: isReport ? '/projects/active?tab=archived&source=report' : '/projects/active?tab=archived',
        label: 'Archived Projects',
        active: activeTab === 'archived',
        badge: archivedProjects.length,
        icon: <Archive size={13} className={activeTab === 'archived' ? 'text-primary' : 'text-muted'} />,
      },
      {
        to: isReport ? '/projects/active?tab=ai-overview&source=report' : '/projects/active?tab=ai-overview',
        label: 'AI Overview',
        active: activeTab === 'ai-overview',
        badge: '✨ AI',
        icon: <Sparkles size={13} className={activeTab === 'ai-overview' ? 'text-bright animate-pulse' : 'text-bright'} />,
      },
    ]
  }, [
    isOther,
    isReport,
    activeTab,
    activeProjects.length,
    completeProjects.length,
    incompleteProjects.length,
    closedProjects.length,
    archivedProjects.length,
  ])

  return (
    <div>
      <Link
        to={isReport ? '/reports' : '/projects'}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
      >
        <ArrowLeft size={15} /> {isReport ? 'Back to Reports & MIS' : 'Back to Projects'}
      </Link>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{tabConfig.title}</h1>
          <p className="mt-1 text-[14px] text-muted">{tabConfig.desc}</p>
        </div>
        <Button
          variant="secondary"
          icon={<Download size={16} />}
          onClick={() => {
            if (activeTab === 'ai-overview') {
              doExport(projects, 'dexter-ai-project-portfolio')
            } else {
              doExport(sheet.rows, tabConfig.file)
            }
          }}
        >
          Export
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <Table2 size={14} className="text-primary" />
          {activeTab === 'ai-overview'
            ? `${projects.length} total projects evaluated · 13 operational milestones · Real-time AI inference`
            : `${base.length} ${tabConfig.noun} · 26 project fields · ${models.length} models`}
        </span>
        <span>Unprovided identification details are shown as —</span>
      </div>

      <ProjectSheet
        tabs={tabs}
        tabNote={
          activeTab === 'ai-overview'
            ? 'Dexter AI v2.4 · Real-time pipeline analysis'
            : isOther
              ? 'Other Projects Register · Archived & Closed records'
              : 'Wrapped column view · Open a project for all 26 fields'
        }
        bands={[0]}
        sheet={sheet}
        title={tabConfig.sheetTitle}
        bandNote={tabConfig.bandNote}
        models={models}
        selectable={activeTab !== 'ai-overview'}
        editing={false}
        onRowClick={(id) => {
          const p = projects.find((x) => x.id === id)
          const targetPath = p?.archived ? '/projects/archived' : '/projects/active'
          navigate(`${targetPath}/${id}${isReport ? '?source=report' : ''}`)
        }}
        link={(p) => {
          const targetPath = p.archived ? '/projects/archived' : '/projects/active'
          return (
            <Link
              to={`${targetPath}/${p.id}${isReport ? '?source=report' : ''}`}
              className="font-medium text-primary hover:underline"
            >
              {p.f.siteLoi || '—'}
            </Link>
          )
        }}
        onExport={(rows) => doExport(rows, tabConfig.file)}
        pagination={activeTab !== 'ai-overview'}
        noun={tabConfig.noun}
        footerLeft={
          activeTab === 'ai-overview'
            ? undefined
            : `Selected: ${sel.length} row${sel.length === 1 ? '' : 's'} · ${base.length} ${tabConfig.noun} · Frozen columns: Site/LOI Number`
        }
        footerRight={
          activeTab === 'ai-overview' ? undefined : (activeTab === 'archived' || activeTab === 'closed') && sel.length ? (
            <button
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              onClick={() => {
                sel.forEach(restoreProject)
                sheet.setSelected(new Set())
                toast(`${sel.length} project${sel.length === 1 ? '' : 's'} restored to Active Projects`)
              }}
            >
              <RotateCcw size={12} /> Restore selected
            </button>
          ) : activeTab === 'archived' || activeTab === 'closed' ? (
            'Deleted and closed projects are archived, never erased'
          ) : (
            'Open a project to update it · Changes are saved to the audit trail'
          )
        }
      >
        {activeTab === 'ai-overview' && (
          <AiProjectOverview
            projects={projects}
            onSelectTab={(tab) => {
              const target =
                tab === 'active'
                  ? isReport
                    ? '/projects/active?source=report'
                    : '/projects/active'
                  : isReport
                    ? `/projects/active?tab=${tab}&source=report`
                    : `/projects/active?tab=${tab}`
              navigate(target)
            }}
          />
        )}
      </ProjectSheet>

      <div className="mt-6">
        <StatusReference />
      </div>
      <SheetFooter />
    </div>
  )
}
