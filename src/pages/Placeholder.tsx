import { Link, useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { trailFor } from '@/data/nav'

/** Shown for sidebar routes whose module is scheduled for a later phase. */
export default function Placeholder() {
  const { pathname } = useLocation()
  const trail = trailFor(pathname)
  const name = trail[trail.length - 1] ?? 'This page'

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
          <Hammer size={24} />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold">{name}</h1>
        <p className="mt-2 text-[14px] text-muted">
          {trail.slice(0, -1).join(' › ') || 'This module'} is part of an upcoming build phase. The layout and navigation are ready; the screen will be added next.
        </p>
        <Link to="/dashboard" className="mt-5 inline-block text-[14px] font-semibold text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
