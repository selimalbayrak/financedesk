import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isWithinInterval, addDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency ───────────────────────────────────────────────────────────────

/**
 * Format a monetary value stored as integer kuruş (1/100 of TRY) for display.
 * @param kurus Integer amount in kuruş (e.g. 150000 = ₺1,500.00)
 */
export function formatCurrency(kurus: number, currency = 'TRY'): string {
  const amount = kurus / 100
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Convert a display amount (e.g. "1500.50") to integer kuruş for DB storage.
 */
export function toKurus(amount: number | string): number {
  return Math.round(Number(amount) * 100)
}

/**
 * Convert integer kuruş to decimal display amount.
 */
export function fromKurus(kurus: number): number {
  return kurus / 100
}

// ─── Dates ──────────────────────────────────────────────────────────────────

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateShort(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy')
}

export function formatRelativeDate(date: string | Date | null): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isOverdue(date: string | Date | null): boolean {
  if (!date) return false
  return isPast(new Date(date))
}

export function isDueSoon(date: string | Date | null, days = 7): boolean {
  if (!date) return false
  const d = new Date(date)
  return isWithinInterval(d, { start: new Date(), end: addDays(new Date(), days) })
}

// ─── Payable Status ──────────────────────────────────────────────────────────

export type PayableStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export function computePayableStatus(
  remainingAmount: number,
  originalAmount: number,
  dueDate: string | null
): PayableStatus {
  if (remainingAmount <= 0) return 'paid'
  if (remainingAmount < originalAmount) return 'partial'
  if (dueDate && isOverdue(dueDate)) return 'overdue'
  return 'pending'
}

export const payableStatusConfig: Record<PayableStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-neutral' },
  partial: { label: 'Partial', className: 'status-warning' },
  paid: { label: 'Paid', className: 'status-positive' },
  overdue: { label: 'Overdue', className: 'status-negative' },
  cancelled: { label: 'Cancelled', className: 'status-neutral' },
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value)
}

export function formatPercentage(value: number, decimals = 2): string {
  return `%${value.toFixed(decimals)}`
}

// ─── Strings ─────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}
