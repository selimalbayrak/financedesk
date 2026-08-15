'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { transferFunds } from './actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Safe {
  id: string
  name: string
  balance: number
}

interface SafeTransferFormProps {
  safes: Safe[]
}

export function SafeTransferForm({ safes }: SafeTransferFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [fromSafeId, setFromSafeId] = useState<string>('')
  const [toSafeId, setToSafeId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromSafeId || !toSafeId) {
      toast.error('Lütfen gönderen ve alıcı hesapları seçin.')
      return
    }

    if (fromSafeId === toSafeId) {
      toast.error('Gönderen ve alıcı hesap aynı olamaz.')
      return
    }

    const transferAmount = parseFloat(amount)
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Geçerli bir tutar girin.')
      return
    }

    const fromSafe = safes.find(s => s.id === fromSafeId)
    if (fromSafe && fromSafe.balance < transferAmount) {
      toast.error('Gönderen hesapta yeterli bakiye yok.')
      return
    }

    setLoading(true)

    try {
      await transferFunds({
        from_safe_id: fromSafeId,
        to_safe_id: toSafeId,
        amount: transferAmount,
        notes: notes
      })
      toast.success('Virman işlemi başarıyla tamamlandı!')
      setOpen(false)
      
      // Reset form
      setFromSafeId('')
      setToSafeId('')
      setAmount('')
      setNotes('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-primary/20 bg-transparent hover:bg-primary/5 hover:text-accent-foreground h-10 px-4 py-2 gap-2 rounded-2xl">
          <ArrowRightLeft className="w-4 h-4" />
          Virman Yap
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Virman (Para Transferi)</DialogTitle>
          <DialogDescription>
            Kasa ve banka hesaplarınız arasında para transferi yapın.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Çıkış Hesabı (Gönderen)</Label>
              <Select value={fromSafeId} onValueChange={(val) => setFromSafeId(val || '')}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Hesap Seç" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {safes.map(safe => (
                    <SelectItem key={safe.id} value={safe.id} className="rounded-lg">
                      {safe.name} (Bakiye: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Giriş Hesabı (Alıcı)</Label>
              <Select value={toSafeId} onValueChange={(val) => setToSafeId(val || '')}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Hesap Seç" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {safes.map(safe => (
                    <SelectItem key={safe.id} value={safe.id} className="rounded-lg">
                      {safe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Tutar (TL)</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" 
              required 
              autoComplete="off"
              className="h-12 rounded-xl text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Açıklama (İsteğe Bağlı)</Label>
            <Input 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Nakit takviyesi..." 
              autoComplete="off"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="rounded-xl h-12 px-6"
              disabled={loading}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              className="rounded-xl h-12 px-8 shadow-lg shadow-primary/25"
              disabled={loading}
            >
              {loading ? 'İşleniyor...' : 'Transferi Tamamla'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
