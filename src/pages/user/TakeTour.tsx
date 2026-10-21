import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Workspace Navigation & Modules',
    subtitle: 'Everything in one unified sidebar',
    desc: 'The left sidebar provides instant access to all core Dexter systems: Onboarding, Legal, Projects, Reports & MIS, Operations, Finance, Governance, Tasks, and User settings.',
    badge: 'Step 1 of 4',
    tip: 'Click on any sidebar item to directly open its dedicated tiles hub.',
  },
  {
    step: 2,
    title: 'Unified Reports & Analytics',
    subtitle: 'Pre-configured financial & operational reports',
    desc: 'Search across all standard reports, customize date ranges (Today, 7D, Month-to-date, FY), and export data instantly to CSV or Excel with audit-proof data attribution.',
    badge: 'Step 2 of 4',
    tip: 'Use the global search bar (⌘K) to jump straight to any report.',
  },
  {
    step: 3,
    title: 'Tasks & Operational Workflows',
    subtitle: 'Daily routine, approvals and SLA management',
    desc: 'Keep track of daily ATM loading checks, pending franchisee KYC approvals, vendor payouts, and unresolved incidents before SLAs breach.',
    badge: 'Step 3 of 4',
    tip: 'Tasks with upcoming deadlines are automatically highlighted in the Command Center.',
  },
  {
    step: 4,
    title: 'Governance & Security Compliance',
    subtitle: 'RBI regulatory checklists & audit trails',
    desc: 'Review tamper-evident audit logs, active user sessions with IP monitoring, corporate security policies, and regulatory RBI White Label ATM compliance scores.',
    badge: 'Step 4 of 4',
    tip: 'Session timeouts and security rules are centrally governed and enforced.',
  },
]

export default function TakeTour() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  const step = TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOUR_STEPS.length - 1

  const nextStep = () => {
    if (isLast) {
      toast('Workspace tour completed! Welcome to Dexter.')
      navigate('/user/help-support')
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  const prevStep = () => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1)
    }
  }

  return (
    <div className="max-w-[800px] pb-12 font-sans">
      <Link
        to="/user/help-support"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline"
      >
        <ArrowLeft size={15} /> Back to Help & Support
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1E293B]">
          Workspace Interactive Tour
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Learn how to navigate, operate, and utilize Dexter's tools effectively.
        </p>
      </div>

      {/* Tour Progress Bar */}
      <div className="mb-6 flex items-center justify-between gap-2">
        {TOUR_STEPS.map((s, idx) => (
          <div key={s.step} className="flex-1">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-[#0066FF]' : 'bg-slate-200'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Main Tour Card */}
      <Card className="p-8 shadow-sm">
        <div className="flex items-center justify-between text-[11.5px] font-semibold text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[#0066FF] border border-blue-200">
            <Compass size={13} /> {step.badge}
          </span>
          <span>{Math.round(((currentStep + 1) / TOUR_STEPS.length) * 100)}% Completed</span>
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B]">
          {step.title}
        </h2>
        <p className="text-[13.5px] font-medium text-[#0066FF] mt-0.5">
          {step.subtitle}
        </p>

        <p className="mt-4 text-[13.5px] leading-relaxed text-[#475569]">
          {step.desc}
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 border border-line-soft p-4 text-[12.5px] text-[#334155] flex items-start gap-2.5">
          <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#1E293B]">Pro Tip:</strong> {step.tip}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line-soft pt-5">
          <Button
            variant="secondary"
            disabled={isFirst}
            onClick={prevStep}
            icon={<ArrowLeft size={14} />}
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                toast('Tour skipped.')
                navigate('/user/help-support')
              }}
            >
              Skip Tour
            </Button>
            <Button onClick={nextStep} icon={isLast ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}>
              {isLast ? 'Finish Tour' : 'Next Step'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
