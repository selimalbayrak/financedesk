'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  companyId: string
}

export function AccountsTable({ accounts, companyId }: AccountsTableProps) {
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
        .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .eq('id', deleteAccount.id)
        .eq('company_id', companyId)
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
          Cari Adı / Ünvan
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <Link
            href={`/accounts/${row.original.id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {row.original.company_name || row.original.name}
          </Link>
          {row.original.company_name && (
            <p className="text-xs text-muted-foreground">{row.original.name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Hesap Tipi',
      cell: ({ row }) => <AccountTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: 'balance',
      header: 'Bakiye Durumu',
      cell: ({ row }) => {
        const bal = (row.original as any).balance || 0
        if (bal === 0) return <span className="text-muted-foreground text-sm">Bakiyesiz</span>
        if (bal > 0) {
          return (
            <div className="flex flex-col">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums text-sm">
                +{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(bal)}
              </span>
              <span className="text-[10px] text-emerald-600/70 font-medium">Alacağımız</span>
            </div>
          )
        }
        return (
          <div className="flex flex-col">
            <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums text-sm">
              -{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Math.abs(bal))}
            </span>
            <span className="text-[10px] text-rose-600/70 font-medium">Borcumuz</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'tax_number',
      header: 'Vergi / TC No',
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
              render={<Link href={`/accounts/${row.original.id}`} className="flex items-center gap-2 w-full" />}
            >
              <Eye className="h-4 w-4" />
              Görüntüle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditAccount(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteAccount(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Cari Hesaplar"
        description="Müşteri ve tedarikçilerinizi yönetin"
        actions={
          <Button
            size="sm"
            onClick={() => { setEditAccount(null); setFormOpen(true) }}
            id="new-account-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Cari Ekle
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Henüz cari hesap yok"
          description="Başlamak için ilk müşterinizi veya tedarikçinizi ekleyin."
          actionLabel="Yeni Cari Ekle"
          onAction={() => { setEditAccount(null); setFormOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder="Cari hesaplarda ara..."
          toolbar={
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="customer">Müşteriler</SelectItem>
                <SelectItem value="supplier">Tedarikçiler</SelectItem>
                <SelectItem value="both">İkisi de</SelectItem>
              </SelectContent>
            </Select>
          }
          emptyMessage="Aramanıza uygun cari hesap bulunamadı."
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
        companyId={companyId}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteAccount} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cari Hesabı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteAccount?.company_name || deleteAccount?.name}</strong> adlı cariyi silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccount(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
