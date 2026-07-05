'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, ArrowUpDown, Pencil, Trash2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { PayableFormSheet } from './payable-form-sheet'
import { RecordPaymentDialog } from './record-payment-dialog'
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ArrowDownCircle, Loader2 } from 'lucide-react'
import type { Account, PayableWithAccount } from '@/types/database.types'

interface PayablesTableProps {
  payables: PayableWithAccount[]
  accounts: Pick<Account, 'id' | 'name' | 'company_name'>[]
}

export function PayablesTable({ payables, accounts }: PayablesTableProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('payable')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editPayable, setEditPayable] = useState<PayableWithAccount | null>(null)
  const [paymentPayable, setPaymentPayable] = useState<PayableWithAccount | null>(null)
  const [deletePayable, setDeletePayable] = useState<PayableWithAccount | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const filtered = payables
    .filter((p) => p.type === activeTab)
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)

  async function handleDelete() {
    if (!deletePayable) return
    const supabase = createClient()
    startDelete(async () => {
      await supabase
        .from('payables')
        .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
        .eq('id', deletePayable.id)
      setDeletePayable(null)
      router.refresh()
    })
  }

  const totalByType = {
    payable: payables
      .filter((p) => p.type === 'payable' && p.status !== 'cancelled' && p.status !== 'paid')
      .reduce((s, p) => s + p.remaining_amount, 0),
    receivable: payables
      .filter((p) => p.type === 'receivable' && p.status !== 'cancelled' && p.status !== 'paid')
      .reduce((s, p) => s + p.remaining_amount, 0),
  }

  const columns: ColumnDef<PayableWithAccount>[] = [
    {
      accessorKey: 'account',
      header: 'Account',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">
            {row.original.account.company_name || row.original.account.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="text-sm truncate">{row.original.description}</p>
          {row.original.invoice_ref && (
            <p className="text-xs text-muted-foreground">Ref: {row.original.invoice_ref}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Due Date
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const due = row.original.due_date
        const over = due ? isOverdue(due) : false
        return (
          <span className={`text-sm ${over && row.original.status !== 'paid' ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-muted-foreground'}`}>
            {formatDate(due)}
          </span>
        )
      },
      sortingFn: 'datetime',
    },
    {
      accessorKey: 'remaining_amount',
      header: 'Remaining',
      cell: ({ row }) => (
        <div>
          <p className={`text-sm font-semibold tabular-nums ${
            row.original.type === 'receivable'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(row.original.remaining_amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            of {formatCurrency(row.original.original_amount)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const p = row.original
        const canPay = p.status !== 'paid' && p.status !== 'cancelled'
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              {canPay && (
                <DropdownMenuItem onClick={() => setPaymentPayable(p)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setEditPayable(p); setFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeletePayable(p)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Payables & Receivables"
        description="Track what you owe and what you're owed"
        actions={
          <Button
            size="sm"
            onClick={() => { setEditPayable(null); setFormOpen(true) }}
            id="new-payable-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Entry
          </Button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border bg-rose-50 dark:bg-rose-950/30 p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Payable (Outstanding)</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {formatCurrency(totalByType.payable)}
          </p>
        </div>
        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Receivable (Outstanding)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatCurrency(totalByType.receivable)}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'payable' | 'receivable')}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <TabsList>
            <TabsTrigger value="payable">
              Payables ({payables.filter(p => p.type === 'payable').length})
            </TabsTrigger>
            <TabsTrigger value="receivable">
              Receivables ({payables.filter(p => p.type === 'receivable').length})
            </TabsTrigger>
          </TabsList>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="payable">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ArrowDownCircle}
              title="No payables"
              description="Track amounts you owe to suppliers."
              actionLabel="New Payable"
              onAction={() => { setEditPayable(null); setFormOpen(true) }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              searchKey="description"
              searchPlaceholder="Search payables..."
              emptyMessage="No payables match your filters."
            />
          )}
        </TabsContent>

        <TabsContent value="receivable">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ArrowDownCircle}
              title="No receivables"
              description="Track amounts customers owe you."
              actionLabel="New Receivable"
              onAction={() => { setEditPayable(null); setFormOpen(true) }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              searchKey="description"
              searchPlaceholder="Search receivables..."
              emptyMessage="No receivables match your filters."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Form Sheet */}
      <PayableFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditPayable(null)
        }}
        accounts={accounts}
        payable={editPayable}
        defaultType={activeTab}
      />

      {/* Record Payment */}
      {paymentPayable && (
        <RecordPaymentDialog
          open={!!paymentPayable}
          onOpenChange={(open) => !open && setPaymentPayable(null)}
          payable={paymentPayable}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deletePayable} onOpenChange={(open) => !open && setDeletePayable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Delete <strong>{deletePayable?.description}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePayable(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
