'use client'

import { useState, useEffect } from 'react'
import { Landmark, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cashChequeNote } from './actions'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Cheque {
  id: string
  type: 'cheque' | 'promissory_note'
  direction: 'in' | 'out'
  status: string
  amount: number // in cents
  due_date: string
  account_id: string | null
}

interface Safe {
  id: string
  name: string
}

interface Account {
  id: string
  name: string
  company_name: string | null
}

interface ChequeCashModalProps {
  isOpen: boolean
  onClose: () => void
  cheque: Cheque | null
  safes: Safe[]
  accounts: Account[]
}

export function ChequeCashModal({ isOpen, onClose, cheque, safes, accounts }: ChequeCashModalProps) {
  const [loading, setLoading] = useState(false)
  const [safeId, setSafeId] = useState('')
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [discountRate, setDiscountRate] = useState('6') // Monthly %
  const [expenseTarget, setExpenseTarget] = useState<'safe' | 'account'>('safe')
  const [expenseTargetId, setExpenseTargetId] = useState('')

  // Computed values
  const [remainingDays, setRemainingDays] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0) // in cents
  const [netAmount, setNetAmount] = useState(0) // in cents

  const isIncoming = cheque?.direction === 'in'

  // Set default values when cheque changes
  useEffect(() => {
    if (cheque) {
      // Set default safe
      if (safes.length > 0) {
        setSafeId(safes[0].id)
      }
      
      // Calculate remaining days
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(cheque.due_date)
      dueDate.setHours(0, 0, 0, 0)
      const diffTime = dueDate.getTime() - today.getTime()
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      setRemainingDays(diffDays)

      // Outgoing cheques cannot have discount applied
      if (cheque.direction === 'out') {
        setApplyDiscount(false)
      } else {
        setApplyDiscount(false) // Default to false for incoming too, let user check it
      }

      // Reset target
      setExpenseTarget('safe')
      if (cheque.account_id) {
        setExpenseTargetId(cheque.account_id)
      } else if (safes.length > 0) {
        setExpenseTargetId(safes[0].id)
      }
    }
  }, [cheque, safes])

  // Recalculate discount
  useEffect(() => {
    if (cheque && applyDiscount && discountRate && isIncoming) {
      const monthlyRate = parseFloat(discountRate) / 100
      const dailyRate = monthlyRate / 30
      const calcDiscount = cheque.amount * dailyRate * remainingDays
      setDiscountAmount(Math.round(calcDiscount))
      setNetAmount(Math.round(cheque.amount - calcDiscount))
    } else if (cheque) {
      setDiscountAmount(0)
      setNetAmount(cheque.amount)
    }
  }, [cheque, applyDiscount, discountRate, remainingDays, isIncoming])

  // Sync expenseTargetId when target changes
  useEffect(() => {
    if (cheque) {
      if (expenseTarget === 'account') {
        setExpenseTargetId(cheque.account_id || (accounts[0]?.id ?? ''))
      } else {
        setExpenseTargetId(safeId)
      }
    }
  }, [expenseTarget, safeId, cheque, accounts])

  if (!isOpen || !cheque) return null

  async function handleSave() {
    if (!cheque) return
    if (!safeId) {
      toast.error(isIncoming ? 'Lütfen tahsilat yapılacak Kasa/Banka seçin.' : 'Lütfen ödeme yapılacak Kasa/Banka seçin.')
      return
    }

    setLoading(true)

    try {
      const res = await cashChequeNote({
        chequeId: cheque.id,
        safeId: safeId,
        applyDiscount: isIncoming ? applyDiscount : false,
        discountRate: isIncoming && applyDiscount ? parseFloat(discountRate) : undefined,
        expenseTarget: isIncoming && applyDiscount ? expenseTarget : undefined,
        expenseTargetId: isIncoming && applyDiscount ? expenseTargetId : undefined,
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          isIncoming 
            ? (applyDiscount ? 'Çek kırdırılarak tahsil edildi!' : 'Çek başarıyla tahsil edildi!')
            : 'Çek ödemesi kasadan düşülerek ödendi işaretlendi!'
        )
        onClose()
      }
    } catch (e: any) {
      toast.error(e.message || 'İşlem başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-card border w-full max-w-md p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 text-primary">
            <Landmark className="w-5 h-5" />
            <h3 className="font-bold text-lg">
              {cheque.type === 'cheque' ? 'Çek' : 'Senet'} {isIncoming ? 'Tahsil Et' : 'Ödendi İşaretle'}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">
              {isIncoming ? 'Tahsil Edilecek Kasa / Banka' : 'Ödemenin Çıkacağı Kasa / Banka'}
            </Label>
            <Select value={safeId} onValueChange={(val) => setSafeId(val || '')} required>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue placeholder="Kasa/Banka seçin" />
              </SelectTrigger>
              <SelectContent className="bg-card border">
                {safes.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isIncoming && (
            <>
              <div className="flex items-center gap-2 py-2 border-t border-b border-dashed">
                <input 
                  type="checkbox" 
                  id="modalApplyDiscount" 
                  checked={applyDiscount} 
                  onChange={(e) => setApplyDiscount(e.target.checked)} 
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="modalApplyDiscount" className="cursor-pointer font-semibold text-sm">
                  Vade Farkı Uygula (Çeki Kırdır)
                </Label>
              </div>

              {applyDiscount && (
                <div className="space-y-4 animate-in-up">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Aylık Faiz Oranı (%)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={discountRate} 
                        onChange={(e) => setDiscountRate(e.target.value)} 
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Masraf Yansıtma Hedefi</Label>
                      <Select 
                        value={expenseTarget} 
                        onValueChange={(val: any) => setExpenseTarget(val)}
                      >
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border">
                          <SelectItem value="safe">Kasa Gideri Yaz</SelectItem>
                          <SelectItem value="account">Cariye Yansıt (Borçlandır)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {expenseTarget === 'account' ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Masrafın Yansıtılacağı Cari Hesap</Label>
                      <Select 
                        value={expenseTargetId} 
                        onValueChange={(val) => setExpenseTargetId(val || '')}
                      >
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue placeholder="Cari hesap seçin" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border">
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} {acc.company_name ? `(${acc.company_name})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Masrafın Düşeceği Kasa</Label>
                      <Select 
                        value={expenseTargetId} 
                        onValueChange={(val) => setExpenseTargetId(val || '')}
                      >
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue placeholder="Kasa seçin" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border">
                          {safes.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Vadeye Kalan:</span>
                      <strong className="text-xs">{remainingDays} Gün</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Vade Farkı:</span>
                      <strong className="text-xs text-rose-500">{formatCurrency(discountAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Net Tahsilat:</span>
                      <strong className="text-xs text-emerald-500 font-bold">{formatCurrency(netAmount)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!isIncoming && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ödenecek Tutar:</span>
                <span className="font-bold">{formatCurrency(cheque.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vade Tarihi:</span>
                <span className="font-semibold text-rose-600">{formatDate(cheque.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vadeye Kalan:</span>
                <span className="font-semibold">{remainingDays} Gün</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-xl">
            İptal
          </Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-xl px-6">
            {loading ? 'Kaydediliyor...' : (isIncoming ? 'Tahsil Et' : 'Ödendi İşaretle')}
          </Button>
        </div>
      </div>
    </div>
  )
}
