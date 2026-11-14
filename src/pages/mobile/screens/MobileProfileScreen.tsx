import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  LogOut
} from 'lucide-react'
import type { MobileUser } from '../data/mobileMockData'

interface MobileProfileScreenProps {
  user: MobileUser
  onBackToHome: () => void
  onSelectRole: (role: 'franchise' | 'team_leader' | 'admin') => void
  onLogout: () => void
}

export function MobileProfileScreen({
  user,
  onBackToHome,
  onSelectRole,
  onLogout
}: MobileProfileScreenProps) {
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
        <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-4 border-blue-100 shadow-md">
          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
        </div>
        <h2 className="mt-2 text-base font-extrabold text-[#0B2A6B]">{user.name}</h2>
        <span className="inline-block mt-0.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800">
          {user.roleTitle}
        </span>
        <p className="mt-1 text-xs text-slate-500 font-mono">{user.franchiseId}</p>

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
            <span className="font-bold text-slate-800">{user.primarySiteId}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Primary ATM</span>
            <span className="font-bold text-slate-800">{user.primaryAtmId}</span>
          </div>
        </div>
      </div>

      {/* Security & Verification Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5 text-xs">
        <h3 className="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-600" /> Account Security & KYC
        </h3>

        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600">Aadhaar & PAN KYC</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle size={13} /> Verified
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600">Two-Factor Auth (OTP)</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle size={13} /> Enabled
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600">Police Verification (PVC)</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle size={13} /> Valid till Jan 2027
          </span>
        </div>
      </div>

      {/* Switch Demo Role */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2 text-xs">
        <span className="font-bold text-slate-700 block">Switch Demo Role</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(['franchise', 'team_leader', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onSelectRole(r)}
              className={`py-2 rounded-xl text-center font-bold text-[11px] transition-all ${
                user.role === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {r === 'franchise' ? 'Franchise' : r === 'team_leader' ? 'Field TL' : 'Admin'}
            </button>
          ))}
        </div>
      </div>

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
