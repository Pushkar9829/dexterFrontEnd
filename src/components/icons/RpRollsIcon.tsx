export interface RpRollsIconProps {
  size?: number
  className?: string
  color?: string
}

/**
 * Custom icon matching the receipt / paper rolls icon from the Dexter design
 */
export function RpRollsIcon({
  size = 24,
  className = '',
  color = 'currentColor',
}: RpRollsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top Roll Cylinder */}
      <ellipse cx="8.5" cy="6" rx="4" ry="2" stroke={color} strokeWidth="1.8" />
      <path
        d="M4.5 6v3.5c0 1.1 1.79 2 4 2s4-.9 4-2V6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      
      {/* Bottom Roll Cylinder */}
      <path
        d="M4.5 11.5v3.5c0 1.1 1.79 2 4 2s4-.9 4-2v-3.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Side / Stacked Roll */}
      <ellipse cx="16" cy="11" rx="3.5" ry="1.8" stroke={color} strokeWidth="1.8" />
      <path
        d="M12.5 11v4c0 1 1.57 1.8 3.5 1.8s3.5-.8 3.5-1.8v-4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Decorative center paper slit / roll hole */}
      <circle cx="8.5" cy="6" r="1.2" fill={color} />
      <circle cx="16" cy="11" r="1" fill={color} />
    </svg>
  )
}

