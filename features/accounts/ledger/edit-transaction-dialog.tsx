'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateTransaction } from '@/features/transactions/actions'
import { Loader2 } from 'lucide-react'
import type { Transaction } from '@/types/database.types'
import { toast } from 'sonner'

interface EditTransactionDialogProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: EditTransactionDialogProps) {
  const [loading, setLoading] = useState(false)
  
  if (!transaction) return null

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      transaction_date: formData.get('transaction_date') as string,
      transaction_type: formData.get('transaction_type') as any,
      amount: Math.round(parseFloat(formData.get('amount') as string) * 100),
      description: formData.get('description') as string,
      document_no: formData.get('document_no') as string,
    }

    try {
      await updateTransaction(transaction!.id, data)
      toast.success('İşlem başarıyla güncellendi.')
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>İşlemi Düzenle</DialogTitle>
            <DialogDescription>
              Bu işlem bilgisini güncelleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="transaction_date">Tarih</Label>
              <Input
                id="transaction_date"
                name="transaction_date"
                type="date"
                defaultValue={transaction.transaction_date.split('T')[0]}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction_type">İşlem Türü</Label>
              <Select name="transaction_type" defaultValue={transaction.transaction_type}>
                <SelectTrigger>
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_out">Satış Faturası (Bizim Alacağımız)</SelectItem>
                  <SelectItem value="payment_in">Alınan Ödeme (Bize Yapılan)</SelectItem>
                  <SelectItem value="invoice_in">Alış Faturası (Bizim Borcumuz)</SelectItem>
                  <SelectItem value="payment_out">Gönderilen Ödeme (Bizim Yaptığımız)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Tutar</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={transaction.amount / 100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                name="description"
                defaultValue={transaction.description || ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document_no">Belge/Fiş No</Label>
              <Input
                id="document_no"
                name="document_no"
                defaultValue={transaction.document_no || ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
