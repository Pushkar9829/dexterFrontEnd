import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  LogOut
} from 'lucide-react'
import { useSecurity } from '@/data/security'
import { usePvcRecords } from '@/data/legalPvc'
import { MobileFrBar } from '@/pages/operations/eod2/MobileFrBar'
import { fmtDateTime, relTime, useMyScope, type MobileUser } from '../data/mobileSession'

interface MobileProfileScreenProps {
  user: MobileUser
  onBackToHome: () => void
  onLogout: () => void
}

function StatusRow({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-600">{label}</span>
      <span className={`font-bold flex items-center gap-1 ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
        {ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />} {text}
      </span>
    </div>
  )
}

/** Profile = Franchise Master record + signed-in user (security account) — read-only. */
export function MobileProfileScreen({
  user,
  onBackToHome,
  onLogout
}: MobileProfileScreenProps) {
  const { franchise, sites, siteIds, frId } = useMyScope()
  const security = useSecurity()
  const { records: pvcRecords } = usePvcRecords()
  const account = security.accounts.find((a) => a.id === user.accountId)
  const primary = sites[0]
  const pvc = pvcRecords.filter((r) => siteIds.has(r.siteId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const pvcTrack = sites.map((s) => s.legal?.PVC).filter(Boolean)
  const pvcDone = pvcTrack.length > 0 && pvcTrack.every((t) => t!.final === 'Complete')
  const kycTrack = sites.map((s) => s.legal?.KYC).filter(Boolean)
  const kycDone = franchise?.kyc === 'Verified' || (kycTrack.length > 0 && kycTrack.every((t) => t!.final === 'Complete'))

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-black text-white">My Profile & Settings</h1>
            <p className="text-[11px] text-blue-100 mt-0.5">
              Franchise Partner Profile & Security Settings
            </p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-blue-100 bg-blue-50 text-2xl font-black text-[#0B2A6B] shadow-md">
          {user.initials}
        </div>
        <h2 className="mt-2 text-base font-extrabold text-[#0B2A6B]">{user.name}</h2>
        <span className="inline-block mt-0.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800">
          {user.roleTitle}
        </span>
        <p className="mt-1 text-xs text-slate-700 font-bold">{franchise?.name ?? frId}</p>
        <p className="text-xs text-slate-500 font-mono">
          {frId} · {user.franchiseCode}
          {franchise ? ` · ${franchise.tier}` : ''}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs border-t pt-3">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Phone</span>
            <span className="font-bold text-slate-800">{user.phone}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Email</span>
            <span className="font-bold text-slate-800 truncate block">{user.email}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Primary Site</span>
            <span className="font-bold text-slate-800">{primary?.siteId ?? '—'}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Primary ATM</span>
            <span className="font-bold text-slate-800">{primary?.atmId ?? '—'}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Mapped Sites</span>
            <span className="font-bold text-slate-800">
              {sites.length} ({sites.filter((s) => s.operational).length} live)
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">City / State</span>
            <span className="font-bold text-slate-800 truncate block">
              {franchise ? `${franchise.city}, ${franchise.state}` : '—'}
            </span>
          </div>
          <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Last Login (before this session)</span>
            <span className="font-bold text-slate-800">
              {user.prevLoginAt ? `${relTime(user.prevLoginAt)} · ${fmtDateTime(user.prevLoginAt)}` : 'First login'}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Verification Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5 text-xs">
        <h3 className="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-600" /> Account Security & KYC
        </h3>

        <StatusRow label="Franchise KYC" ok={kycDone} text={franchise?.kyc ?? (kycDone ? 'Verified' : 'Pending')} />
        <StatusRow
          label="Two-Factor Auth"
          ok={!!account?.mfaEnrolled}
          text={account?.mfaEnrolled ? `Enabled · ${account.mfaMethod}` : 'Not enrolled'}
        />
        <StatusRow
          label="Police Verification (PVC)"
          ok={pvc ? pvc.status === 'Active' : pvcDone}
          text={pvc ? `${pvc.status}${pvc.expiryDate ? ` · valid till ${pvc.expiryDate}` : ''}` : pvcDone ? 'Complete' : 'Pending'}
        />
      </div>

      {/* Admin / Super Admin preview only: switch the franchise being previewed */}
      {user.isPreview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2 text-xs">
          <span className="font-bold text-slate-700 block">Preview as franchise (Admin only)</span>
          <MobileFrBar />
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full h-11 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 flex items-center justify-center gap-2"
      >
        <LogOut size={15} /> Logout Session
      </button>
    </div>
  )
}
