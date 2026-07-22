'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteTransaction } from '@/features/transactions/actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types/database.types'

interface DeleteTransactionDialogProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteTransactionDialog({ transaction, open, onOpenChange }: DeleteTransactionDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!transaction) return null

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteTransaction(transaction.id)
      toast.success('İşlem başarıyla silindi.')
      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>İşlemi silmek istediğinize emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{formatCurrency(transaction.amount)}</strong> tutarındaki "{transaction.description || 'İsimsiz işlem'}" işlemi silinecektir. Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>İptal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Evet, Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
