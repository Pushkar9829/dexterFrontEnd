import { useState } from 'react'
import {
  Headphones,
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { SUPPORT_LEVELS } from '../data/mobileMockData'

interface MobileContactScreenProps {
  onBackToMore?: () => void
}

export function MobileContactScreen({ onBackToMore }: MobileContactScreenProps) {
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const currentLevelData = SUPPORT_LEVELS.find((l) => l.level === selectedLevel) || SUPPORT_LEVELS[0]

  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      {/* Banner matching 9.04.13 AM.jpeg */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMore && (
              <button
                onClick={onBackToMore}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h1 className="text-base font-black text-white">Contact Us</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Get in touch with our support team for quick assistance.
              </p>
            </div>
          </div>
          <Headphones size={26} className="text-amber-300 shrink-0" />
        </div>

        {/* Level Switcher Tabs */}
        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
          {[
            { level: 1, label: 'L1: Help Desk' },
            { level: 2, label: 'L2: Admin & Ops' },
            { level: 3, label: 'L3: Management' }
          ].map((item) => (
            <button
              key={item.level}
              type="button"
              onClick={() => setSelectedLevel(item.level)}
              className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold transition-all ${
                selectedLevel === item.level
                  ? 'bg-white text-[#0B2A6B] shadow-xs'
                  : 'bg-white/15 text-white/90 hover:bg-white/20'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Support Details Container */}
      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5">
        <div>
          <h2 className="text-sm font-black text-[#0B2A6B] flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
              {currentLevelData.level}
            </span>
            {currentLevelData.levelTitle}
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            {currentLevelData.subtitle}
          </p>
        </div>

        {/* Contact Person Box */}
        <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              <User size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Designated Officer</span>
              <h3 className="text-xs font-black text-slate-900">{currentLevelData.contactPerson}</h3>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
            Available
          </span>
        </div>

        {/* 3 Action Buttons: Call Support, WhatsApp, Email Support */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {/* Call */}
          <a
            href={`tel:${currentLevelData.phone.replace(/\s+/g, '')}`}
            className="flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 hover:bg-blue-100 active:scale-95 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Phone size={15} />
            </div>
            <span className="mt-1 text-[10px] font-bold text-slate-800">Call</span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">
              {currentLevelData.phone}
            </span>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${currentLevelData.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 hover:bg-emerald-100 active:scale-95 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <MessageSquare size={15} />
            </div>
            <span className="mt-1 text-[10px] font-bold text-slate-800">WhatsApp</span>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">
              Chat Now
            </span>
          </a>

          {/* Email */}
          <a
            href={`mailto:${currentLevelData.email}`}
            className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 hover:bg-amber-100 active:scale-95 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <Mail size={15} />
            </div>
            <span className="mt-1 text-[10px] font-bold text-slate-800">Email</span>
            <span className="text-[9px] text-slate-500 truncate max-w-full">
              Send Mail
            </span>
          </a>
        </div>

        {/* Scope of Support */}
        <div>
          <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
            Area of Responsibility & Scope (Level {currentLevelData.level})
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {currentLevelData.responsibilities.map((resp, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2 text-[10.5px] font-semibold text-slate-700"
              >
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate">{resp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation Matrix Info Box */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-[11px] text-slate-700 flex items-start gap-2">
          <AlertCircle size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <p>
            <strong>Escalation Matrix:</strong> If your query is not resolved at Level 1 within standard SLA, it will be automatically escalated to Level 2 and Level 3 for supervisor intervention.
          </p>
        </div>

        {/* Support Hours Card */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Clock size={15} className="text-blue-600" />
            <span>Support Hours:</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-900 block">Mon – Sat : 9:00 AM – 7:00 PM</span>
            <span className="text-[9.5px] text-slate-400 block">(Except Public Holidays)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
