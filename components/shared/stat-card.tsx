import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: number // in kuruş
  icon: LucideIcon
  description?: string
  trend?: 'positive' | 'negative' | 'neutral'
  className?: string
}

export function StatCard({ title, value, icon: Icon, description, trend = 'neutral', className }: StatCardProps) {
  const trendColors = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-muted-foreground',
  }

  const iconBg = {
    positive: 'bg-emerald-100 dark:bg-emerald-950',
    negative: 'bg-rose-100 dark:bg-rose-950',
    neutral: 'bg-primary/10',
  }

  const iconColor = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-primary',
  }

  return (
    <Card className={cn('card-hover', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className={cn('text-2xl font-bold mt-1 tabular-nums', trendColors[trend])}>
              {formatCurrency(value)}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', iconBg[trend])}>
            <Icon className={cn('h-5 w-5', iconColor[trend])} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-20 mt-2" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}
