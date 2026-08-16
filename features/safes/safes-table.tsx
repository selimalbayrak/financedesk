'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { Wallet, MoreHorizontal, Pencil, Trash2, ArrowUpDown, Loader2, ArrowRightLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from 'sonner'
import { deleteSafe } from './actions'
import { SafeFormSheet } from './safe-form-sheet'

interface SafeBalance {
  id: string
  company_id: string
  name: string
  total_in: number
  total_out: number
  balance: number
  account_code?: string
}

interface SafesTableProps {
  data: SafeBalance[]
}

export function SafesTable({ data }: SafesTableProps) {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deleteSafeItem, setDeleteSafeItem] = useState<SafeBalance | null>(null)
  const [editSafeItem, setEditSafeItem] = useState<SafeBalance | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [isDeleting, startDelete] = useTransition()

  // Simulate type filtering if account_code starts with 102 (Bank) or 100 (Safe)
  const filtered = typeFilter === 'all'
    ? data
    : data.filter((s) => {
        const code = (s as any).account_code || ''
        if (typeFilter === 'bank') return code.startsWith('102')
        if (typeFilter === 'safe') return code.startsWith('100')
        return true
      })

  async function handleDelete() {
    if (!deleteSafeItem) return
    
    if (deleteSafeItem.balance !== 0 || deleteSafeItem.total_in > 0 || deleteSafeItem.total_out > 0) {
      toast.error('İşlem görmüş veya bakiyesi olan bir kasayı/bankayı silemezsiniz!')
      setDeleteSafeItem(null)
      return
    }

    startDelete(async () => {
      try {
        await deleteSafe(deleteSafeItem.id)
        toast.success('Hesap başarıyla silindi.')
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        setDeleteSafeItem(null)
      }
    })
  }

  const columns: ColumnDef<SafeBalance>[] = [
    {
      id: 'account_code',
      accessorFn: (row) => (row as any).account_code || '',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Kodu
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {(row.original as any).account_code || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Kasa / Banka Adı
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link href={`/safes/${row.original.id}`} className="font-medium hover:text-primary flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Wallet className="w-4 h-4" />
          </div>
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'total_in',
      header: () => <div className="text-right">Giren (Toplam)</div>,
      cell: ({ row }) => (
        <div className="text-right text-emerald-600 dark:text-emerald-400 tabular-nums font-medium">
          +{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(row.original.total_in / 100)}
        </div>
      ),
    },
    {
      accessorKey: 'total_out',
      header: () => <div className="text-right">Çıkan (Toplam)</div>,
      cell: ({ row }) => (
        <div className="text-right text-rose-600 dark:text-rose-400 tabular-nums font-medium">
          -{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(row.original.total_out / 100)}
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: () => <div className="text-right">Mevcut Bakiye</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold tabular-nums">
          {Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(row.original.balance / 100)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 rounded-md">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditSafeItem(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteSafeItem(row.original)}
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
        title="Kasalar ve Bankalar"
        description="Şirket içi nakit ve banka hesaplarınızı yönetin."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl bg-background/50 backdrop-blur-sm" disabled>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Virman Yap
            </Button>
            <Button 
              size="sm" 
              className="rounded-xl shadow-md"
              onClick={() => { setEditSafeItem(null); setFormOpen(true) }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kasa Ekle
            </Button>
          </div>
        }
      />

      {!data || data.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Henüz Kasa Eklenmemiş"
          description="Firma içi nakit akışınızı veya banka hesaplarınızı takip etmek için yeni bir kasa ekleyin."
          actionLabel="Yeni Kasa Ekle"
          onAction={() => { setEditSafeItem(null); setFormOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="name"
          searchPlaceholder="Kasa veya banka ara..."
          toolbar={
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="safe">Sadece Kasalar</SelectItem>
                <SelectItem value="bank">Sadece Bankalar</SelectItem>
              </SelectContent>
            </Select>
          }
          emptyMessage="Aramanıza uygun kayıt bulunamadı."
        />
      )}

      <SafeFormSheet 
        open={formOpen} 
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditSafeItem(null)
        }}
        safeToEdit={editSafeItem ? { id: editSafeItem.id, name: editSafeItem.name } : undefined}
      />

      <Dialog open={!!deleteSafeItem} onOpenChange={(open) => !open && setDeleteSafeItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hesabı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteSafeItem?.name}</strong> adlı hesabı silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSafeItem(null)}>
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
