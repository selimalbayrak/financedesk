'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Wallet, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

interface SafesTableProps {
  data: SafeBalance[]
}

export function SafesTable({ data }: SafesTableProps) {
  const router = useRouter()
  const [deleteSafeItem, setDeleteSafeItem] = useState<SafeBalance | null>(null)
  const [editSafeItem, setEditSafeItem] = useState<SafeBalance | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [isDeleting, startDelete] = useTransition()

  async function handleDelete() {
    if (!deleteSafeItem) return
    
    if (deleteSafeItem.balance !== 0 || deleteSafeItem.total_in > 0 || deleteSafeItem.total_out > 0) {
      toast.error('İşlem görmüş veya bakiyesi olan bir kasayı silemezsiniz!')
      setDeleteSafeItem(null)
      return
    }

    startDelete(async () => {
      try {
        await deleteSafe(deleteSafeItem.id)
        toast.success('Kasa başarıyla silindi.')
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        setDeleteSafeItem(null)
      }
    })
  }

  if (!data || data.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl border shadow-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Henüz Kasa Eklenmemiş</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Firma içi nakit akışınızı veya banka hesaplarınızı takip etmek için yeni bir kasa ekleyin.
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card className="rounded-3xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Kasa Adı</TableHead>
              <TableHead className="text-right font-semibold">Giren (Toplam)</TableHead>
              <TableHead className="text-right font-semibold">Çıkan (Toplam)</TableHead>
              <TableHead className="text-right font-semibold">Mevcut Bakiye</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((safe) => (
              <TableRow key={safe.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Wallet className="w-4 h-4" />
                  </div>
                  {safe.name}
                </TableCell>
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.total_in / 100)}
                </TableCell>
                <TableCell className="text-right text-rose-600 dark:text-rose-400 tabular-nums">
                  -{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.total_out / 100)}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.balance / 100)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditSafeItem(safe); setFormOpen(true) }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteSafeItem(safe)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
            <DialogTitle>Kasayı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteSafeItem?.name}</strong> adlı kasayı silmek istediğinize emin misiniz?
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
