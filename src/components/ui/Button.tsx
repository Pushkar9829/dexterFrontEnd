import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'bright' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-primary/40',
  bright: 'bg-bright text-white hover:bg-bright/90 disabled:bg-bright/40',
  secondary: 'border border-line bg-white text-ink hover:bg-surface disabled:text-muted',
  ghost: 'text-primary hover:bg-primary-soft disabled:text-muted',
  danger: 'border border-red-200 bg-white text-brand-red hover:bg-red-50',
}

const sizes: Record<Size, string> = {
  sm: 'h-[30px] px-2.5 text-[11px] gap-1.5',
  md: 'h-[38px] px-4 text-[12px] gap-2',
  lg: 'h-[45px] px-5 text-[13px] gap-2',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  block?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon, block, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}
