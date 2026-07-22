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
import { deleteAllAccountTransactions } from '@/features/transactions/actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteAllTransactionsDialogProps {
  accountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAllTransactionsDialog({ accountId, open, onOpenChange }: DeleteAllTransactionsDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteAllAccountTransactions(accountId)
      toast.success('Hesaba ait tüm işlemler başarıyla silindi.')
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
          <AlertDialogTitle>Tüm işlemleri silmek istediğinize emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu cari hesaba ait <strong className="text-destructive">TÜM</strong> işlem geçmişi kalıcı olarak silinecektir. Bu işlem geri alınamaz. Onaylıyor musunuz?
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
            Evet, Tümünü Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
