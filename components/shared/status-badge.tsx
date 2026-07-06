import { cn } from '@/lib/utils'
import { payableStatusConfig, type PayableStatus } from '@/lib/utils'

interface StatusBadgeProps {
  status: PayableStatus | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = payableStatusConfig[status as PayableStatus] ?? {
    label: status,
    className: 'status-neutral',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

// Generic colored badge for direction (incoming/outgoing)
export function DirectionBadge({ direction }: { direction: 'incoming' | 'outgoing' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        direction === 'incoming' ? 'status-positive' : 'status-negative'
      )}
    >
      {direction === 'incoming' ? 'Gelen' : 'Giden'}
    </span>
  )
}

// Account type badge
export function AccountTypeBadge({ type }: { type: 'customer' | 'supplier' | 'both' }) {
  const config = {
    customer: { label: 'Müşteri', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    supplier: { label: 'Tedarikçi', className: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    both: { label: 'Müşteri & Tedarikçi', className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
  }
  const c = config[type]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.className)}>
      {c.label}
    </span>
  )
}
