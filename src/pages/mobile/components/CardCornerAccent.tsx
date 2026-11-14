import { useId } from 'react'

interface CardCornerAccentProps {
  className?: string
  width?: number | string
  height?: number | string
}

/**
 * Signature Dexter dual-wave corner accent:
 * - Top wave: Fluid Royal Blue (#0B56D0 -> #1472F4) with soft cyan reflection (#38BDF8)
 * - Bottom corner: Dexter Scarlet Red (#F2272E -> #D31017) tucked neatly into the rounded-br
 */
export function CardCornerAccent({
  className = '',
  width = 58,
  height = 38
}: CardCornerAccentProps) {
  const rawId = useId()
  const cleanId = rawId.replace(/[^a-zA-Z0-9-_]/g, '')
  const blueGradientId = `dexter-blue-wave-${cleanId}`
  const redGradientId = `dexter-red-wedge-${cleanId}`
  const cyanGradientId = `dexter-cyan-tail-${cleanId}`

  return (
    <div
      className={`pointer-events-none absolute bottom-0 right-0 overflow-hidden ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 64"
        className="w-full h-full block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={blueGradientId} x1="0%" y1="100%" x2="100%" y2="15%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="22%" stopColor="#0091FF" />
            <stop offset="60%" stopColor="#1472F4" />
            <stop offset="100%" stopColor="#0B56D0" />
          </linearGradient>

          <linearGradient id={redGradientId} x1="15%" y1="10%" x2="100%" y2="90%">
            <stop offset="0%" stopColor="#F2272E" />
            <stop offset="100%" stopColor="#D31017" />
          </linearGradient>

          <linearGradient id={cyanGradientId} x1="0%" y1="100%" x2="60%" y2="60%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#0284C7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft Tapered Cyan Feather Accent */}
        <path
          d="M 0 64 C 18 64, 32 58, 44 46 C 48 42, 58 33, 68 25 L 64 31 C 52 40, 42 49, 28 58 C 16 64, 6 64, 0 64 Z"
          fill={`url(#${cyanGradientId})`}
        />

        {/* Fluid Royal Blue Dynamic S-Curve Ribbon */}
        <path
          d="M 0 64 C 20 64, 36 57, 48 44 C 60 32, 76 20, 100 10 L 100 36 C 84 43, 70 51, 52 61 C 40 64, 20 64, 0 64 Z"
          fill={`url(#${blueGradientId})`}
        />

        {/* Signature Dexter Scarlet Red Wedge */}
        <path
          d="M 52 61 C 70 51, 84 43, 100 36 L 100 64 L 52 64 Z"
          fill={`url(#${redGradientId})`}
        />
      </svg>
    </div>
  )
}
