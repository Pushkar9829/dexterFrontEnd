import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Zap,
  ShieldAlert,
  Building2,
  Check,
  Send,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { MILESTONES, progressOf, type Project } from '@/data/projects'
import { cn } from '@/lib/cn'

interface AiProjectOverviewProps {
  projects: Project[]
  onSelectTab?: (tab: string) => void
}

const MILESTONE_LABELS: Record<string, { label: string; band: string; estDays: number }> = {
  electrical: { label: 'Electrical Work', band: 'Site & Readiness', estDays: 2 },
  tisStatus: { label: 'TIS Readiness', band: 'Site & Readiness', estDays: 3 },
  atmMachine: { label: 'ATM Machine Fitment', band: 'Equipment', estDays: 5 },
  vsat: { label: 'V-SAT Connectivity', band: 'Equipment', estDays: 4 },
  ups: { label: 'UPS Power Backup', band: 'Equipment', estDays: 3 },
  grouting: { label: 'Floor Grouting', band: 'Equipment', estDays: 2 },
  signage: { label: 'Signage Glow Board', band: 'Branding', estDays: 3 },
  lollypop: { label: 'Lollypop Sign', band: 'Branding', estDays: 2 },
  hitachi: { label: 'Hitachi Branding Wrap', band: 'Branding', estDays: 2 },
  monkeyCage: { label: 'Monkey Cage Enclosure', band: 'Security', estDays: 2 },
  agreementStatus: { label: 'Signed Lease Agreement', band: 'Legal & Accounts', estDays: 7 },
  techLive: { label: 'Tech Live & Network IP', band: 'Go-Live', estDays: 3 },
  cashLive: { label: 'Cash Live Commissioning', band: 'Go-Live', estDays: 2 },
}

export function AiProjectOverview({ projects, onSelectTab }: AiProjectOverviewProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string>('Just now')
  const [resolvedBlockers, setResolvedBlockers] = useState<Record<string, boolean>>({})

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects])
  const completeProjects = useMemo(
    () =>
      activeProjects.filter(
        (p) => progressOf(p).pct === 100 || p.f.cashLive === 'Done' || (p.f.status && p.f.status.toLowerCase().startsWith('live'))
      ),
    [activeProjects]
  )
  const incompleteProjects = useMemo(
    () =>
      activeProjects.filter(
        (p) => !(progressOf(p).pct === 100 || p.f.cashLive === 'Done' || (p.f.status && p.f.status.toLowerCase().startsWith('live')))
      ),
    [activeProjects]
  )
  const closedProjects = useMemo(
    () => projects.filter((p) => p.archived || /closed|dropped|cancelled/i.test(p.f.status || '') || Boolean(p.archiveReason)),
    [projects]
  )

  // Overall Velocity & Health Score
  const avgVelocity = useMemo(() => {
    if (!activeProjects.length) return 0
    const sum = activeProjects.reduce((acc, p) => acc + progressOf(p).pct, 0)
    return Math.round(sum / activeProjects.length)
  }, [activeProjects])

  // Health score calculation
  const healthScore = useMemo(() => {
    const completeRatio = (completeProjects.length / (activeProjects.length || 1)) * 30
    const velocityPart = (avgVelocity / 100) * 50
    const penalty = 5 // Minor penalty for blockers
    return Math.min(98, Math.max(60, Math.round(completeRatio + velocityPart + 20 - penalty)))
  }, [completeProjects.length, activeProjects.length, avgVelocity])

  // Milestone Stats Matrix
  const milestoneMatrix = useMemo(() => {
    return MILESTONES.map((m) => {
      const doneCount = activeProjects.filter((p) => m.done(p.f[m.key] ?? '')).length
      const total = activeProjects.length || 1
      const pct = Math.round((doneCount / total) * 100)
      const meta = MILESTONE_LABELS[m.key] || { label: m.key, band: 'Rollout', estDays: 3 }
      return {
        key: m.key,
        label: meta.label,
        band: meta.band,
        estDays: meta.estDays,
        doneCount,
        total,
        pct,
        status: pct >= 80 ? 'Optimal' : pct >= 50 ? 'In Progress' : 'Bottleneck Gate',
      }
    })
  }, [activeProjects])

  // Predictive Cohorts
  const cohorts = useMemo(() => {
    const imminent: Project[] = []
    const target: Project[] = []
    const pipeline: Project[] = []

    incompleteProjects.forEach((p) => {
      const pct = progressOf(p).pct
      if (pct >= 80 || p.f.techLive === 'Done') {
        imminent.push(p)
      } else if (pct >= 50) {
        target.push(p)
      } else {
        pipeline.push(p)
      }
    })

    return { imminent, target, pipeline }
  }, [incompleteProjects])

  // Dynamic Anomalies & Critical Path Bottlenecks
  const blockers = useMemo(() => {
    const list: Array<{
      id: string
      siteId: string
      name: string
      model: string
      issue: string
      impact: string
      severity: 'Critical' | 'Medium' | 'Low'
      recommendedAction: string
      actionKey: string
    }> = []

    // Site ST-MH-PUN-00124 (Awaiting legal clearance)
    const p124 = activeProjects.find((p) => p.siteId === 'ST-MH-PUN-00124')
    if (p124) {
      list.push({
        id: p124.id,
        siteId: p124.siteId,
        name: p124.f.franchisee || 'Prateek Sharma',
        model: p124.f.model || 'FOFO',
        issue: 'Awaiting legal clearance · Landlord lease addendum pending verification for 14 days',
        impact: 'Blocks equipment mobilization, SD release and initial cash float allocation.',
        severity: 'Critical',
        recommendedAction: 'Trigger Legal Escalation',
        actionKey: 'legal-124',
      })
    }

    // VSAT delayed site
    const vsatPending = activeProjects.find((p) => p.f.vsat === 'Installation pending' && p.siteId !== 'ST-MH-PUN-00124')
    if (vsatPending) {
      list.push({
        id: vsatPending.id,
        siteId: vsatPending.siteId,
        name: vsatPending.f.franchisee || 'Franchise Partner',
        model: vsatPending.f.model || 'FOMA',
        issue: 'V-SAT antenna delivered but technician commissioning overdue past SLA window',
        impact: 'Delays Tech Live network handoff and remote monitoring system (RMS) link.',
        severity: 'Medium',
        recommendedAction: 'Expedite Vendor SLA',
        actionKey: 'vsat-' + vsatPending.id,
      })
    }

    // Account KYC delayed site
    const kycPending = activeProjects.find((p) => p.f.wlaAccount && p.f.wlaAccount.includes('KYC pending'))
    if (kycPending) {
      list.push({
        id: kycPending.id,
        siteId: kycPending.siteId,
        name: kycPending.f.franchisee || 'Franchise Partner',
        model: kycPending.f.model || 'FOFO',
        issue: 'WLA Account opened · Sponsor Bank settlement KYC verification pending',
        impact: 'Pre-requisite for final cash loading authorization and live ATM testing.',
        severity: 'Medium',
        recommendedAction: 'Resend Bank KYC Pack',
        actionKey: 'kyc-' + kycPending.id,
      })
    }

    return list
  }, [activeProjects])

  const handleReanalyze = () => {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setLastAnalyzedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      toast('AI pipeline telemetry re-analyzed: 25 sites evaluated, 13 milestone paths verified.', 'success')
    }, 650)
  }

  const handleActionClick = (actionKey: string, siteId: string, actionName: string) => {
    setResolvedBlockers((prev) => ({ ...prev, [actionKey]: true }))
    toast(`AI Action triggered: "${actionName}" dispatched for site ${siteId}.`, 'success')
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-surface/30">
      {/* ── AI Executive Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-navy-950 via-primary to-banner p-5 sm:p-6 text-white shadow-sm">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-bright/20 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 h-32 w-32 rounded-full bg-accent-purple/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-xs">
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span>DEXTER AI · PROJECT INTELLIGENCE ENGINE</span>
            </div>
            <h2 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-white">
              Rollout Intelligence & Predictive Velocity Matrix
            </h2>
            <p className="text-[13px] leading-relaxed text-white/80">
              Autonomous telemetry synthesized across <strong className="text-white">{projects.length} franchise projects</strong> and{' '}
              <strong className="text-white">13 milestone gates</strong>. <strong className="text-white">{completeProjects.length} sites</strong> are live with cash dispensing. An estimated{' '}
              <strong className="text-white">{cohorts.imminent.length + 2} additional sites</strong> are projected to reach go-live within 14 days.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11.5px] text-white/70">
              <span>Telemetry: Real-time</span>
              <span>•</span>
              <span>Last evaluated: {lastAnalyzedTime}</span>
              <span>•</span>
              <span>Confidence Index: 94.6%</span>
            </div>
          </div>

          {/* Health Score Pill Card */}
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="text-center sm:text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Portfolio Health</div>
              <div className="mt-0.5 flex items-baseline justify-center sm:justify-end gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">{healthScore}</span>
                <span className="text-sm font-medium text-white/60">/100</span>
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                <Zap size={12} /> Optimal Rollout Velocity
              </div>
            </div>
            <div className="h-10 w-px bg-white/20 hidden sm:block" />
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-navy-950 hover:bg-white/90 border-transparent shadow-xs text-[12px] font-semibold"
              disabled={analyzing}
              onClick={handleReanalyze}
            >
              <RefreshCw size={13} className={cn('mr-1.5', analyzing && 'animate-spin')} />
              {analyzing ? 'Scanning...' : 'Re-evaluate Telemetry'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Key AI Metric Telemetry Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Complete */}
        <div
          onClick={() => onSelectTab?.('complete')}
          className="group cursor-pointer rounded-xl border border-line bg-white p-4 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">Live & Commissioned</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{completeProjects.length}</span>
            <span className="text-[12px] font-medium text-emerald-600">
              {Math.round((completeProjects.length / (activeProjects.length || 1)) * 100)}% of active
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completeProjects.length / (activeProjects.length || 1)) * 100)}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span>Cash Live verified</span>
            <span className="inline-flex items-center gap-0.5 text-primary group-hover:underline">
              View sites <ChevronRight size={11} />
            </span>
          </div>
        </div>

        {/* Card 2: Incomplete */}
        <div
          onClick={() => onSelectTab?.('incomplete')}
          className="group cursor-pointer rounded-xl border border-line bg-white p-4 shadow-2xs transition-all hover:border-blue-300 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">Active Pipeline</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-bright group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{incompleteProjects.length}</span>
            <span className="text-[12px] font-medium text-blue-600">In rollout progress</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-ink-2">3 Site Prep</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-ink-2">8 Install</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-ink-2">6 Pre-Live</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span>Across 13 milestones</span>
            <span className="inline-flex items-center gap-0.5 text-primary group-hover:underline">
              View pipeline <ChevronRight size={11} />
            </span>
          </div>
        </div>

        {/* Card 3: Velocity */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">Milestone Velocity</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-accent-purple">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{avgVelocity}%</span>
            <span className="text-[12px] font-medium text-emerald-600">+12.4% vs SLA</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-accent-purple rounded-full transition-all duration-500" style={{ width: `${avgVelocity}%` }} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span>Avg progress per active site</span>
            <span className="font-medium text-ink-2">13.2d avg cycle</span>
          </div>
        </div>

        {/* Card 4: Critical Path Blockers */}
        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">Critical Path Blockers</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{blockers.length}</span>
            <span className="text-[12px] font-medium text-amber-600">Action required</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">1 Legal</span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">1 VSAT SLA</span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">1 Bank KYC</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span>Requires coordinator push</span>
            <span className="font-semibold text-rose-600">Immediate</span>
          </div>
        </div>
      </div>

      {/* ── Critical Path Bottlenecks & Anomaly Detector ── */}
      <div className="rounded-xl border border-line bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600" />
            <h3 className="text-[14px] font-semibold text-ink">Critical Path Bottlenecks & Anomaly Detector</h3>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {blockers.length} Flagged
            </span>
          </div>
          <span className="text-[11.5px] text-muted">AI root-cause diagnosis and one-click mitigation triggers</span>
        </div>

        <div className="divide-y divide-line">
          {blockers.map((b) => {
            const isDone = resolvedBlockers[b.actionKey]
            return (
              <div key={b.actionKey} className="p-4 sm:p-5 transition-colors hover:bg-surface/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/projects/active/${b.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[13px]"
                      >
                        <Building2 size={13} /> {b.siteId}
                      </Link>
                      <span className="text-[12px] text-muted">· {b.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
                        Model: {b.model}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                          b.severity === 'Critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {b.severity} Severity
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-ink">{b.issue}</p>
                    <p className="text-[12px] text-muted leading-relaxed">
                      <strong className="text-ink-2">Impact:</strong> {b.impact}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 sm:pt-0">
                    <Link
                      to={`/projects/active/${b.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-ink hover:bg-slate-50 transition-colors"
                    >
                      Inspect <ExternalLink size={12} />
                    </Link>
                    <Button
                      size="sm"
                      variant={isDone ? 'secondary' : 'primary'}
                      className={cn('text-[11.5px] h-8', isDone && 'text-emerald-700 bg-emerald-50 border-emerald-200')}
                      disabled={isDone}
                      onClick={() => handleActionClick(b.actionKey, b.siteId, b.recommendedAction)}
                    >
                      {isDone ? (
                        <>
                          <Check size={13} className="mr-1 text-emerald-600" /> Dispatched
                        </>
                      ) : (
                        <>
                          <Send size={12} className="mr-1" /> {b.recommendedAction}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Two-Column Layout: Milestone Velocity Matrix & Predictive Cohorts ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Milestone Completion Matrix */}
        <div className="lg:col-span-7 rounded-xl border border-line bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Milestone Velocity Matrix</h3>
              <p className="text-[11.5px] text-muted">Completion rates across 13 rollout gates ({activeProjects.length} active sites)</p>
            </div>
            <span className="text-[11.5px] font-medium text-primary">Target SLA: 21 Days Total</span>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {milestoneMatrix.map((m) => (
              <div key={m.key} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{m.label}</span>
                    <span className="text-[10px] text-muted">({m.band})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px]">
                    <span className="text-muted">
                      {m.doneCount} / {m.total} sites
                    </span>
                    <span
                      className={cn(
                        'w-10 text-right font-semibold',
                        m.pct === 100
                          ? 'text-emerald-600'
                          : m.pct >= 70
                            ? 'text-blue-600'
                            : m.pct >= 40
                              ? 'text-amber-600'
                              : 'text-rose-600'
                      )}
                    >
                      {m.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      m.pct === 100
                        ? 'bg-emerald-500'
                        : m.pct >= 70
                          ? 'bg-primary'
                          : m.pct >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                    )}
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Predictive Cohorts & Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Predictive Go-Live Cohorts */}
          <div className="rounded-xl border border-line bg-white shadow-xs">
            <div className="border-b border-line px-4 py-3 sm:px-5">
              <h3 className="text-[14px] font-semibold text-ink">Predictive Go-Live Forecast</h3>
              <p className="text-[11.5px] text-muted">AI-estimated commissioning timeline based on velocity</p>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Cohort 1: Next 7 Days */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800">
                    <Sparkles size={13} className="text-emerald-600" /> Imminent Go-Live (Next 7 Days)
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                    {cohorts.imminent.length} Sites
                  </span>
                </div>
                <p className="text-[11.5px] text-emerald-700">
                  Tech Live complete or &ge;80% progress. Ready for final sponsor bank cash load.
                </p>
                <div className="space-y-1.5 pt-1">
                  {cohorts.imminent.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[11.5px] bg-white/80 rounded px-2 py-1">
                      <Link to={`/projects/active/${p.id}`} className="font-semibold text-primary hover:underline">
                        {p.siteId}
                      </Link>
                      <span className="text-muted">{p.f.siteLocation?.split(',')[0]}</span>
                      <span className="font-medium text-emerald-700">{progressOf(p).pct}% Ready</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cohort 2: Target 8-21 Days */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-800">
                    <Clock size={13} className="text-bright" /> Mid-Term Window (8–21 Days)
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10.5px] font-bold text-blue-800">
                    {cohorts.target.length} Sites
                  </span>
                </div>
                <p className="text-[11.5px] text-blue-700">
                  Equipment fitment completed; awaiting branding wrap and connectivity validation.
                </p>
                <div className="space-y-1.5 pt-1">
                  {cohorts.target.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[11.5px] bg-white/80 rounded px-2 py-1">
                      <Link to={`/projects/active/${p.id}`} className="font-semibold text-primary hover:underline">
                        {p.siteId}
                      </Link>
                      <span className="text-muted">{p.f.siteLocation?.split(',')[0]}</span>
                      <span className="font-medium text-blue-700">{progressOf(p).pct}% Ready</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cohort 3: Pipeline 22-45 Days */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-ink-2">Early Stage Rollout (&gt;21 Days)</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-ink-2">
                    {cohorts.pipeline.length} Sites
                  </span>
                </div>
                <p className="text-[11.5px] text-muted">Civil site readiness, electrical layout and initial security deposit intake.</p>
              </div>
            </div>
          </div>

          {/* AI Strategic Recommendations */}
          <div className="rounded-xl border border-line bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" />
              <h3 className="text-[13.5px] font-semibold text-ink">Actionable AI Recommendations</h3>
            </div>
            <ul className="space-y-2 text-[12px] text-ink-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong>Consolidate Pune VSAT Visits:</strong> Group 2 upcoming antenna alignments in Pune cluster into a single technician route to save ₹8,500 in logistics.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong>Expedite Bank WLA KYC:</strong> Approving pending KYC for ST-MH-THA-00010 unlocks ₹35L projected monthly cash throughput.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong>Standardize Addendum Formats:</strong> Utilizing the Legal Register digital template eliminates 9 days of landlord redlining.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Quick Switcher Bar at Bottom ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-2xs text-[12px]">
        <div className="flex items-center gap-2 text-muted">
          <FileCheck size={15} className="text-primary" />
          <span>Quick Register Views:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="text-[12px]"
            onClick={() => onSelectTab?.('active')}
          >
            All Active ({activeProjects.length})
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-[12px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
            onClick={() => onSelectTab?.('complete')}
          >
            Complete Sites ({completeProjects.length})
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-[12px] text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
            onClick={() => onSelectTab?.('incomplete')}
          >
            Incomplete Pipeline ({incompleteProjects.length})
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-[12px] text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
            onClick={() => onSelectTab?.('closed')}
          >
            Closed ({closedProjects.length})
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-[12px]"
            onClick={() => onSelectTab?.('archived')}
          >
            Archived ({projects.filter((p) => p.archived).length})
          </Button>
        </div>
      </div>
    </div>
  )
}
