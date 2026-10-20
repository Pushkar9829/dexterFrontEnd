import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type HubTileTheme =
  | 'blue'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'indigo'
  | 'teal'

interface ThemeConfig {
  topBar: string
  iconBg: string
  iconShadow: string
  tagBadge: string
  titleHover: string
  cardBorderHover: string
  cardShadowHover: string
  arrowHover: string
  ambientGradient: string
  watermarkColor: string
  watermarkHover: string
  footerText: string
}

const THEMES: Record<HubTileTheme, ThemeConfig> = {
  blue: {
    topBar: 'from-blue-600 via-indigo-600 to-blue-500',
    iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
    iconShadow: 'shadow-md shadow-blue-500/25',
    tagBadge: 'bg-blue-50/90 text-blue-700 border-blue-200/70',
    titleHover: 'group-hover:text-blue-700',
    cardBorderHover: 'hover:border-blue-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-blue-500/10',
    arrowHover:
      'group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/30',
    ambientGradient: 'from-blue-500/15 via-indigo-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-blue-500/15',
    footerText: 'text-blue-600 group-hover:text-blue-700',
  },
  purple: {
    topBar: 'from-violet-600 via-purple-600 to-fuchsia-600',
    iconBg: 'bg-gradient-to-br from-violet-600 to-purple-600 text-white',
    iconShadow: 'shadow-md shadow-purple-500/25',
    tagBadge: 'bg-purple-50/90 text-purple-700 border-purple-200/70',
    titleHover: 'group-hover:text-purple-700',
    cardBorderHover: 'hover:border-purple-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-purple-500/10',
    arrowHover:
      'group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-purple-500/30',
    ambientGradient: 'from-purple-500/15 via-violet-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-purple-500/15',
    footerText: 'text-purple-600 group-hover:text-purple-700',
  },
  emerald: {
    topBar: 'from-emerald-600 via-teal-600 to-teal-500',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    iconShadow: 'shadow-md shadow-emerald-500/25',
    tagBadge: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/70',
    titleHover: 'group-hover:text-emerald-700',
    cardBorderHover: 'hover:border-emerald-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-emerald-500/10',
    arrowHover:
      'group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-500/30',
    ambientGradient: 'from-emerald-500/15 via-teal-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-emerald-500/15',
    footerText: 'text-emerald-600 group-hover:text-emerald-700',
  },
  amber: {
    topBar: 'from-amber-500 via-orange-500 to-amber-600',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    iconShadow: 'shadow-md shadow-orange-500/25',
    tagBadge: 'bg-amber-50/90 text-amber-800 border-amber-200/70',
    titleHover: 'group-hover:text-orange-700',
    cardBorderHover: 'hover:border-amber-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-amber-500/10',
    arrowHover:
      'group-hover:bg-orange-600 group-hover:border-orange-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-orange-500/30',
    ambientGradient: 'from-amber-500/15 via-orange-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-amber-500/15',
    footerText: 'text-orange-600 group-hover:text-orange-700',
  },
  rose: {
    topBar: 'from-rose-500 via-pink-600 to-rose-600',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
    iconShadow: 'shadow-md shadow-rose-500/25',
    tagBadge: 'bg-rose-50/90 text-rose-700 border-rose-200/70',
    titleHover: 'group-hover:text-rose-700',
    cardBorderHover: 'hover:border-rose-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-rose-500/10',
    arrowHover:
      'group-hover:bg-rose-600 group-hover:border-rose-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-rose-500/30',
    ambientGradient: 'from-rose-500/15 via-pink-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-rose-500/15',
    footerText: 'text-rose-600 group-hover:text-rose-700',
  },
  cyan: {
    topBar: 'from-cyan-500 via-sky-500 to-blue-600',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
    iconShadow: 'shadow-md shadow-cyan-500/25',
    tagBadge: 'bg-cyan-50/90 text-cyan-800 border-cyan-200/70',
    titleHover: 'group-hover:text-cyan-700',
    cardBorderHover: 'hover:border-cyan-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-cyan-500/10',
    arrowHover:
      'group-hover:bg-cyan-600 group-hover:border-cyan-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-cyan-500/30',
    ambientGradient: 'from-cyan-500/15 via-sky-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-cyan-500/15',
    footerText: 'text-cyan-600 group-hover:text-cyan-700',
  },
  indigo: {
    topBar: 'from-indigo-600 via-blue-600 to-indigo-700',
    iconBg: 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white',
    iconShadow: 'shadow-md shadow-indigo-500/25',
    tagBadge: 'bg-indigo-50/90 text-indigo-700 border-indigo-200/70',
    titleHover: 'group-hover:text-indigo-700',
    cardBorderHover: 'hover:border-indigo-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-indigo-500/10',
    arrowHover:
      'group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/30',
    ambientGradient: 'from-indigo-500/15 via-blue-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-indigo-500/15',
    footerText: 'text-indigo-600 group-hover:text-indigo-700',
  },
  teal: {
    topBar: 'from-teal-500 via-emerald-600 to-teal-600',
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
    iconShadow: 'shadow-md shadow-teal-500/25',
    tagBadge: 'bg-teal-50/90 text-teal-800 border-teal-200/70',
    titleHover: 'group-hover:text-teal-700',
    cardBorderHover: 'hover:border-teal-300',
    cardShadowHover: 'hover:shadow-xl hover:shadow-teal-500/10',
    arrowHover:
      'group-hover:bg-teal-600 group-hover:border-teal-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-teal-500/30',
    ambientGradient: 'from-teal-500/15 via-emerald-400/10 to-transparent',
    watermarkColor: 'text-slate-100/80',
    watermarkHover: 'group-hover:text-teal-500/15',
    footerText: 'text-teal-600 group-hover:text-teal-700',
  },
}

export interface HubTileProps {
  title: string
  sub: string
  to: string
  Icon: LucideIcon
  theme?: HubTileTheme
  tag?: string
  badge?: string
  actionText?: string
  customWatermark?: ReactNode
}

export function HubTile({
  title,
  sub,
  to,
  Icon,
  theme = 'blue',
  tag,
  badge,
  actionText,
}: HubTileProps) {
  const t = THEMES[theme] || THEMES.blue

  return (
    <Link
      to={to}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line/90 bg-white p-5',
        'min-h-[200px] sm:min-h-[205px] transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-xl',
        t.cardBorderHover,
        t.cardShadowHover
      )}
    >
      {/* Top Accent Gradient Line */}
      <span
        className={cn(
          'absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r transition-all duration-300 group-hover:h-[4px]',
          t.topBar
        )}
      />

      {/* Decorative Bottom-Right Soft Arc */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 rounded-tl-full bg-blue-100/35 transition-all duration-500 group-hover:scale-115 group-hover:bg-blue-100/60"
      />

      {/* Ambient Radial Glow on Hover */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-gradient-to-br blur-2xl transition-all duration-500',
          'opacity-35 group-hover:scale-125 group-hover:opacity-90',
          t.ambientGradient
        )}
      />

      {/* Elegant Large Watermark Icon */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-3 -bottom-3 transition-all duration-500 ease-out',
          'group-hover:scale-110 group-hover:-rotate-6',
          t.watermarkColor,
          t.watermarkHover
        )}
      >
        <Icon size={120} strokeWidth={1.2} />
      </div>

      {/* Card Content - Upper Part */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          {/* Vibrant Gradient Icon Box */}
          <div
            className={cn(
              'grid h-11 w-11 place-items-center rounded-xl transition-all duration-300',
              'group-hover:scale-105',
              t.iconBg,
              t.iconShadow
            )}
          >
            <Icon size={22} strokeWidth={2} />
          </div>

          <div className="flex items-center gap-1.5">
            {tag && (
              <span
                className={cn(
                  'inline-flex items-center text-[10.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border',
                  t.tagBadge
                )}
              >
                {tag}
              </span>
            )}
            <span
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full border border-line-soft bg-surface text-ink-2 transition-all duration-300',
                t.arrowHover
              )}
            >
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          className={cn(
            'mt-3.5 text-[15.5px] sm:text-[16.5px] font-bold tracking-tight text-ink transition-colors duration-200',
            t.titleHover
          )}
        >
          {title}
        </div>

        {/* Subtitle / Description */}
        <p className="mt-1.5 text-[12px] sm:text-[12.5px] leading-relaxed text-muted line-clamp-2 max-w-[250px]">
          {sub}
        </p>
      </div>

      {/* Card Footer */}
      <div className="relative z-10 mt-4 pt-3 border-t border-line-soft/80 flex items-center justify-between text-[11.5px]">
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold transition-all duration-200 group-hover:translate-x-0.5',
            t.footerText
          )}
        >
          {actionText || 'Open module'}
          <ArrowRight size={12} />
        </span>
        {badge && (
          <span className="text-[11px] text-muted font-medium bg-surface px-2 py-0.5 rounded border border-line-soft">
            {badge}
          </span>
        )}
      </div>
    </Link>
  )
}
