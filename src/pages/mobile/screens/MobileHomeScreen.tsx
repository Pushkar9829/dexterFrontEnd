import { useState } from 'react'
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  AlertTriangle,
  Clock,
  Coins,
  FileSpreadsheet,
  UploadCloud,
  Check,
  Wrench,
  ChevronRight,
  ChevronLeft,
  Calendar,
  User,
  BarChart2,
  Zap
} from 'lucide-react'
import type { MobileUser } from '../data/mobileMockData'

interface MobileHomeScreenProps {
  user: MobileUser
  onNavigate: (screen: string) => void
}

export function MobileHomeScreen({ user, onNavigate }: MobileHomeScreenProps) {
  const [promoIndex, setPromoIndex] = useState(0)

  const promoSlides = [
    {
      title: 'Grow Your ATM Business',
      highlight: 'with Dexter ERP',
      sub1: 'Manage Sites | Track Operations |',
      sub2: 'Ensure Compliance | Real-time Updates'
    },
    {
      title: 'Automated CBR &\nCash Loading SOP',
      highlight: 'for On-Time Payout',
      sub1: 'Submit daily loading before 8:00 PM |',
      sub2: 'Ensure next-day fund disbursement'
    },
    {
      title: 'Instant Dispute &\nChargeback Filing',
      highlight: 'Hitachi Direct SOP',
      sub1: 'Automated docket creation |',
      sub2: 'Real-time bank dispute tracking'
    }
  ]

  // Metric sets togglable by the < > chevrons
  const [metricSet, setMetricSet] = useState<0 | 1>(0)

  return (
    <div className="relative select-none pb-6 w-full max-w-full overflow-x-hidden">
      {/* =========================================================================
       * 1. SEAMLESS LIGHT BLUE GREETING STRIP (CENTERED DIVIDER & AMBIENT WAVES)
       * ========================================================================= */}
      <div className="w-full bg-gradient-to-b from-[#F3F8FE] via-[#F7FAFE] to-[#F1F6FD]  relative overflow-hidden">
        {/* Soft Decorative Fluid Light Blue Waves on the Right Background */}
        <div className="absolute right-0 top-0 bottom-0 w-48 pointer-events-none opacity-60">
          <svg viewBox="0 0 180 60" className="w-full h-full" fill="none" preserveAspectRatio="none">
            <path
              d="M30,0 C70,18 110,8 180,32 L180,60 L0,60 C40,42 10,22 30,0 Z"
              fill="#DCEBFA"
            />
            <path
              d="M60,0 C100,24 130,12 180,42 L180,60 L40,60 C70,38 35,18 60,0 Z"
              fill="#EBF4FD"
            />
          </svg>
        </div>

        <div className="relative z-10 grid grid-cols-[40%_60%] items-center px-3.5 pt-2 pb-2.5">
          {/* Left Column (40% Width): Greeting & User Name */}
          <div className="pr-2.5 flex flex-col justify-center min-w-0">
            <span className="text-[12px] font-medium text-slate-800 block leading-tight">
              Good Morning,
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <h2 className="text-[15.5px] font-black text-[#0A2665] tracking-tight leading-none truncate">
                {user.name}
              </h2>
              <span className="text-sm shrink-0 select-none">👋</span>
            </div>
          </div>

          {/* Vertical Divider Line placed at exact 40/60 boundary */}
          <div className="absolute left-[40%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-[1px] bg-slate-300 pointer-events-none" />

          {/* Right Column (60% Width): Franchise Partner Badge & Last Login */}
          <div className="pl-2.5 flex flex-col items-start gap-1 justify-center min-w-0">
            {/* Franchise Partner Badge Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[10.5px] font-bold text-[#0D44A8] border border-blue-200/90 shadow-2xs shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#00D084]" />
              <User size={11.5} className="text-[#0D44A8]" />
              {user.roleTitle.split('/')[0].trim()}
            </span>

            {/* Last Login without wrapping */}
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-800 leading-tight tracking-tight min-w-0 whitespace-nowrap">
              <Calendar size={12} className="text-[#0D44A8] shrink-0" />
              <span>Last Login: 07 Oct 2026, 10:15 AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Home Screen Content with Padding */}
      <div className="space-y-3.5 px-3 pt-3 relative">
        {/* Ambient Glows constrained to prevent any horizontal scroll overflow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-24 -right-8 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="absolute top-36 -left-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
        </div>

        {/* =========================================================================
         * 2. PROMO ANNOUNCEMENT BANNER ("Grow Your ATM Business with Dexter ERP")
         * ========================================================================= */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-3.5 shadow-xs border border-blue-100/90">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1 pr-1 min-w-0">
              <h3 className="text-[14px] font-black text-[#0A2665] leading-tight tracking-tight">
                {promoSlides[promoIndex].title}
              </h3>
              <span className="text-[14px] font-black text-[#1675F8] leading-tight tracking-tight block">
                {promoSlides[promoIndex].highlight}
              </span>
              <div className="mt-2 space-y-0.5 text-[9px] font-medium text-slate-700 leading-tight">
                <p>{promoSlides[promoIndex].sub1}</p>
                <p>{promoSlides[promoIndex].sub2}</p>
              </div>
            </div>

            {/* 3D ATM Booth graphic */}
            <div className="w-[100px] h-[92px] shrink-0 relative overflow-hidden rounded-xl bg-transparent">
              <img
                src="/mobile-atm-booth-promo.png"
                alt="Dexter ATM ERP"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
          </div>

          {/* Fluid Cyan/Blue Wave Graphic at Bottom of Card */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full h-10 pointer-events-none"
            viewBox="0 0 360 40"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="promoCyanWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#00C0F3" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#67E8F9" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="promoBlueWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0D44A8" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#1675F8" stopOpacity="0.9" />
                <stop offset="85%" stopColor="#00A3FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <path
              d="M0,18 C70,8 140,26 220,14 C280,5 320,17 360,20 L360,40 L0,40 Z"
              fill="url(#promoCyanWave)"
            />
            <path
              d="M0,24 C60,14 130,30 210,18 C270,10 320,22 360,22 L360,40 L0,40 Z"
              fill="url(#promoBlueWave)"
            />
          </svg>

          {/* Carousel Pagination Dots */}
          <div className="relative z-10 mt-1 flex items-center justify-center gap-1.5">
            {promoSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromoIndex(i)}
                className={`h-1.5 rounded-full transition-all ${promoIndex === i ? 'w-5 bg-[#1675F8] shadow-xs' : 'w-1.5 bg-blue-300 hover:bg-blue-400'
                  }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* =========================================================================
         * 3. KEY METRICS ROW (3 PASTEL CARDS WITH < AND > CHEVRONS)
         * ========================================================================= */}
        <div className="flex items-center gap-1">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => setMetricSet((prev) => (prev === 0 ? 1 : 0))}
            className="h-8 w-4 flex items-center justify-center text-[#1675F8] hover:text-blue-800 active:scale-90 transition-all shrink-0"
            aria-label="Previous metrics"
          >
            <ChevronLeft size={18} className="stroke-[2.5]" />
          </button>

          {/* 3 Metrics Cards Grid */}
          <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
            {metricSet === 0 ? (
              <>
                {/* Card 1: Total TXNs */}
                <div
                  onClick={() => onNavigate('transactions')}
                  className="rounded-2xl bg-[#EAF2FF] border border-blue-100 p-2.5 flex flex-col items-center justify-center text-center shadow-2xs cursor-pointer active:scale-95 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/70 text-[#1675F8] mb-1">
                    <ArrowLeftRight size={15} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">Total TXNs</span>
                  <span className="text-[18px] font-black text-[#0A2665] mt-0.5 leading-none">1,618</span>
                </div>

                {/* Card 2: Cash TXNs */}
                <div
                  onClick={() => onNavigate('transactions')}
                  className="rounded-2xl bg-[#EBF9F1] border border-emerald-100 p-2.5 flex flex-col items-center justify-center text-center shadow-2xs cursor-pointer active:scale-95 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-[#15803D] mb-1">
                    <Banknote size={15} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">Cash TXNs</span>
                  <span className="text-[18px] font-black text-[#15803D] mt-0.5 leading-none">1,210</span>
                </div>

                {/* Card 3: Non Cash TXNs */}
                <div
                  onClick={() => onNavigate('transactions')}
                  className="rounded-2xl bg-[#FFF5EB] border border-amber-100 p-2.5 flex flex-col items-center justify-center text-center shadow-2xs cursor-pointer active:scale-95 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-[#EA580C] mb-1">
                    <CreditCard size={15} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">Non Cash</span>
                  <span className="text-[18px] font-black text-[#EA580C] mt-0.5 leading-none">240</span>
                </div>
              </>
            ) : (
              <>
                {/* Card 1: Machine Cash */}
                <div
                  onClick={() => onNavigate('cash-balance')}
                  className="rounded-2xl bg-[#EAF2FF] border border-blue-100 p-2.5 flex flex-col items-center justify-center text-center shadow-2xs cursor-pointer active:scale-95 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/70 text-[#1675F8] mb-1">
                    <Banknote size={15} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">ATM Cash</span>
                  <span className="text-[15px] font-black text-[#0A2665] mt-0.5 leading-none">₹ 4.0 L</span>
                </div>

                {/* Card 2: Uptime Health */}
                <div
                  onClick={() => onNavigate('complaints')}
                  className="rounded-2xl bg-[#EBF9F1] border border-emerald-100 p-2.5 flex flex-col items-center justify-center text-center shadow-2xs cursor-pointer active:scale-95 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-[#15803D] mb-1">
                    <Check size={15} className="stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">Uptime</span>
                  <span className="text-[18px] font-black text-[#15803D] mt-0.5 leading-none">99.8%</span>
                </div>

                {/* Card 3: Open Tickets */}
                <div
                  onClick={() => onNavigate('complaints')}
                  className="rounded-2xl bg-[#FFF5EB] border border-amber-100 p-2.5 flex flex-col items-center justify-center text-center shadow-2xs cursor-pointer active:scale-95 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-[#EA580C] mb-1">
                    <AlertTriangle size={15} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">Open Faults</span>
                  <span className="text-[18px] font-black text-[#EA580C] mt-0.5 leading-none">0</span>
                </div>
              </>
            )}
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => setMetricSet((prev) => (prev === 0 ? 1 : 0))}
            className="h-8 w-4 flex items-center justify-center text-[#1675F8] hover:text-blue-800 active:scale-90 transition-all shrink-0"
            aria-label="Next metrics"
          >
            <ChevronRight size={18} className="stroke-[2.5]" />
          </button>
        </div>

        {/* =========================================================================
       * 4. TWO SIDE-BY-SIDE CARDS: "Recent Updates" & "My Business Overview"
       * ========================================================================= */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Left: Recent Updates Card */}
          <div className="overflow-hidden rounded-2xl border border-blue-100/80 bg-white shadow-xs flex flex-col">
            {/* Header Banner */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-2.5 py-1.5 text-white">
              <Clock size={13} className="shrink-0" />
              <h4 className="text-[11px] font-bold tracking-tight truncate">Recent Updates</h4>
            </div>

            {/* Timeline Body */}
            <div className="p-2 space-y-2 flex-1 text-left">
              {/* Step 1: Site Approved */}
              <div
                onClick={() => onNavigate('sites')}
                className="flex items-start gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <div className="h-3 w-[1.5px] bg-slate-200 my-0.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-black text-[#0A2665] truncate">Site Approved</p>
                  <p className="text-[8.5px] font-medium text-slate-500 truncate">ATM-001 – Ahmedabad</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">20 Oct 2026, 10:15 AM</p>
                </div>
              </div>

              {/* Step 2: ATM Installation Updated */}
              <div
                onClick={() => onNavigate('sites')}
                className="flex items-start gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs">
                    <Wrench size={10} strokeWidth={2.5} />
                  </div>
                  <div className="h-3 w-[1.5px] bg-slate-200 my-0.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-black text-[#0A2665] truncate">ATM Installation Updated</p>
                  <p className="text-[8.5px] font-medium text-slate-500 truncate">ATM-002 – Gandhinagar</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">19 Oct 2026, 05:40 PM</p>
                </div>
              </div>

              {/* Step 3: Payout Processed */}
              <div
                onClick={() => onNavigate('payout')}
                className="flex items-start gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs">
                    <Coins size={10} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-black text-[#0A2665] truncate">Payout Processed</p>
                  <p className="text-[8.5px] font-medium text-slate-500 truncate">Aug 2026 – ₹1,25,600</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">18 Oct 2026, 11:20 AM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: My Business Overview Card */}
          <div className="overflow-hidden rounded-2xl border border-blue-100/80 bg-white shadow-xs flex flex-col">
            {/* Header Banner */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-2.5 py-1.5 text-white">
              <BarChart2 size={13} className="shrink-0" />
              <h4 className="text-[11px] font-bold tracking-tight truncate">My Business Overview</h4>
            </div>

            {/* Metric Rows */}
            <div className="p-2 space-y-2 flex-1 flex flex-col justify-between text-left">
              {/* Metric 1: This Month TXNs */}
              <div
                onClick={() => onNavigate('transactions')}
                className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ArrowLeftRight size={13} />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="text-[8.5px] font-medium text-slate-500 block truncate">
                    This Month TXNs
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[12px] font-black text-[#0A2665]">1,25,480</span>
                    <span className="text-[7.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded-full border border-emerald-200">
                      ▲ +12%
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-slate-100" />

              {/* Metric 2: Last Payout */}
              <div
                onClick={() => onNavigate('payout')}
                className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Coins size={13} />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="text-[8.5px] font-medium text-slate-500 block truncate">
                    Last Payout
                  </span>
                  <span className="text-[12px] font-black text-[#0A2665] block mt-0.5">
                    ₹1,25,600
                  </span>
                </div>
              </div>

              <div className="h-[1px] bg-slate-100" />

              {/* Metric 3: Payout Date */}
              <div
                onClick={() => onNavigate('payout')}
                className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Calendar size={13} />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="text-[8.5px] font-medium text-slate-500 block truncate">
                    Payout Date
                  </span>
                  <span className="text-[12px] font-black text-[#0A2665] block mt-0.5">
                    07 Oct 2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
       * 5. QUICK ACTIONS SECTION (SOLID BLUE BANNER WITH 4 PASTEL CARDS)
       * ========================================================================= */}
        <div className="overflow-hidden rounded-2xl border border-blue-100/80 bg-white shadow-xs">
          {/* Header Banner */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#0C4AC7] to-[#1258E2] px-3 py-1.5 text-white">
            <Zap size={14} className="fill-white" />
            <h4 className="text-[11.5px] font-bold tracking-tight">Quick Actions</h4>
          </div>

          {/* Actions Row with < and > chevrons */}
          <div className="p-2.5 flex items-center gap-1.5">
            {/* Left Arrow Button */}
            <button
              type="button"
              className="h-8 w-4 flex items-center justify-center text-[#1675F8] hover:text-blue-800 active:scale-90 transition-all shrink-0"
              aria-label="Previous actions"
            >
              <ChevronLeft size={16} className="stroke-[2.5]" />
            </button>

            {/* 4 Pastel Action Buttons */}
            <div className="grid grid-cols-4 gap-1.5 flex-1 min-w-0">
              {/* 1. Submit TXN / CBR */}
              <button
                type="button"
                onClick={() => onNavigate('cbr')}
                className="rounded-xl bg-[#EAF2FF] border border-blue-100/80 p-2 flex flex-col items-center justify-center text-center hover:bg-blue-100/60 active:scale-95 transition-all shadow-2xs"
              >
                <FileSpreadsheet size={19} className="text-[#1675F8]" />
                <span className="mt-1 text-[9px] font-bold text-slate-800 leading-tight">
                  Submit<br />TXN / CBR
                </span>
              </button>

              {/* 2. Raise Complaint */}
              <button
                type="button"
                onClick={() => onNavigate('complaints')}
                className="rounded-xl bg-[#FEECEC] border border-rose-100/80 p-2 flex flex-col items-center justify-center text-center hover:bg-rose-100/60 active:scale-95 transition-all shadow-2xs"
              >
                <AlertTriangle size={19} className="text-[#E11D48]" />
                <span className="mt-1 text-[9px] font-bold text-slate-800 leading-tight">
                  Raise<br />Complaint
                </span>
              </button>

              {/* 3. Upload Documents */}
              <button
                type="button"
                onClick={() => onNavigate('uploads')}
                className="rounded-xl bg-[#EDF9F1] border border-emerald-100/80 p-2 flex flex-col items-center justify-center text-center hover:bg-emerald-100/60 active:scale-95 transition-all shadow-2xs"
              >
                <UploadCloud size={19} className="text-[#16A34A]" />
                <span className="mt-1 text-[9px] font-bold text-slate-800 leading-tight">
                  Upload<br />Documents
                </span>
              </button>

              {/* 4. View Payout */}
              <button
                type="button"
                onClick={() => onNavigate('payout')}
                className="rounded-xl bg-[#F5EDFC] border border-purple-100/80 p-2 flex flex-col items-center justify-center text-center hover:bg-purple-100/60 active:scale-95 transition-all shadow-2xs"
              >
                <Coins size={19} className="text-[#9333EA]" />
                <span className="mt-1 text-[9px] font-bold text-slate-800 leading-tight">
                  View<br />Payout
                </span>
              </button>
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              className="h-8 w-4 flex items-center justify-center text-[#1675F8] hover:text-blue-800 active:scale-90 transition-all shrink-0"
              aria-label="Next actions"
            >
              <ChevronRight size={16} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
