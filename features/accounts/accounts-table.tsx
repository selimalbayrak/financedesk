'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, ArrowUpDown, Pencil, Trash2, Eye } from 'lucide-react'
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
import { DataTable } from '@/components/shared/data-table'
import { AccountFormSheet } from './account-form-sheet'
import { AccountTypeBadge } from '@/components/shared/status-badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/client'
import { Users, Loader2 } from 'lucide-react'
import type { Account } from '@/types/database.types'

interface AccountsTableProps {
  accounts: Account[]
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const filtered = typeFilter === 'all'
    ? accounts
    : accounts.filter((a) => a.type === typeFilter)

  async function handleDelete() {
    if (!deleteAccount) return
    const supabase = createClient()
    startDelete(async () => {
      await supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', deleteAccount.id)
      setDeleteAccount(null)
      router.refresh()
    })
  }

  const columns: ColumnDef<Account>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <a
            href={`/accounts/${row.original.id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {row.original.company_name || row.original.name}
          </a>
          {row.original.company_name && (
            <p className="text-xs text-muted-foreground">{row.original.name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <AccountTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.phone ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.city ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'tax_number',
      header: 'Tax No.',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm font-mono text-xs">
          {row.original.tax_number ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              render={<a href={`/accounts/${row.original.id}`} className="flex items-center gap-2 w-full" />}
            >
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditAccount(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteAccount(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Current Accounts"
        description="Manage your customers and suppliers"
        actions={
          <Button
            size="sm"
            onClick={() => { setEditAccount(null); setFormOpen(true) }}
            id="new-account-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Account
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No accounts yet"
          description="Add your first customer or supplier to get started."
          actionLabel="New Account"
          onAction={() => { setEditAccount(null); setFormOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder="Search accounts..."
          toolbar={
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          }
          emptyMessage="No accounts match your search."
        />
      )}

      {/* Create / Edit Sheet */}
      <AccountFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditAccount(null)
        }}
        account={editAccount}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteAccount} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteAccount?.company_name || deleteAccount?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccount(null)}>
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
