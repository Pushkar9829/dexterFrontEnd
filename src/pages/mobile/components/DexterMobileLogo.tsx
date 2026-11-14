export function DexterMobileLogo({
  variant = 'header',
  className = '',
}: {
  variant?: 'header' | 'badge' | 'large'
  className?: string
}) {
  if (variant === 'large') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-xl border border-white/60">
          <img
            src="/dexter-logo.png"
            alt="Dexter India"
            className="h-14 w-auto max-w-[210px] object-contain drop-shadow-xs"
          />
        </div>
        <p className="text-[11px] font-semibold text-slate-500 mt-2">
          ATM Franchise Management System
        </p>
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center rounded-xl bg-white px-2.5 py-1 shadow-xs border border-slate-200/80 ${className}`}>
        <img
          src="/dexter-logo.png"
          alt="Dexter India"
          className="h-6 w-auto max-w-[120px] object-contain"
        />
      </div>
    )
  }

  // Header variant (compact pill badge with official CRM logo)
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center h-8.5 px-3 py-1 rounded-xl bg-white/95 shadow-xs border border-white/30 backdrop-blur-xs">
        <img
          src="/dexter-logo.png"
          alt="Dexter India"
          className="h-5.5 w-auto max-w-[115px] object-contain"
        />
      </div>
    </div>
  )
}
