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
  
  // Cost breakdown states (in TL strings)
  const [calcInterestByRate, setCalcInterestByRate] = useState(true)
  const [discountRate, setDiscountRate] = useState('6') // Monthly %
  const [interestVal, setInterestVal] = useState('0.00')
  const [commissionVal, setCommissionVal] = useState('0.00')
  const [bankExpenseVal, setBankExpenseVal] = useState('0.00')

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

      setApplyDiscount(false) // Default to false, let user check it
      setCalcInterestByRate(true)
      setInterestVal('0.00')
      setCommissionVal('0.00')
      setBankExpenseVal('0.00')

      // Reset target
      setExpenseTarget('safe')
      if (cheque.account_id) {
        setExpenseTargetId(cheque.account_id)
      } else if (safes.length > 0) {
        setExpenseTargetId(safes[0].id)
      }
    }
  }, [cheque, safes])

  // Recalculate interest amount based on rate if checked
  useEffect(() => {
    if (cheque && applyDiscount && calcInterestByRate && discountRate) {
      const monthlyRate = parseFloat(discountRate) / 100
      const dailyRate = monthlyRate / 30
      const calcDiscount = cheque.amount * dailyRate * remainingDays
      setInterestVal((calcDiscount / 100).toFixed(2))
    }
  }, [cheque, applyDiscount, calcInterestByRate, discountRate, remainingDays])

  // Compute total discount sum and net amount
  useEffect(() => {
    if (cheque && applyDiscount) {
      const faiz = parseFloat(interestVal) || 0
      const komisyon = parseFloat(commissionVal) || 0
      const masraf = parseFloat(bankExpenseVal) || 0
      const totalTL = faiz + komisyon + masraf
      const totalCents = Math.round(totalTL * 100)
      setDiscountAmount(totalCents)
      setNetAmount(Math.max(0, cheque.amount - totalCents))
    } else if (cheque) {
      setDiscountAmount(0)
      setNetAmount(cheque.amount)
    }
  }, [cheque, applyDiscount, interestVal, commissionVal, bankExpenseVal])

  // Sync expenseTargetId when target or safe changes
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
        applyDiscount: applyDiscount,
        interestAmount: applyDiscount ? Math.round((parseFloat(interestVal) || 0) * 100) : 0,
        commissionAmount: applyDiscount ? Math.round((parseFloat(commissionVal) || 0) * 100) : 0,
        bankExpenseAmount: applyDiscount ? Math.round((parseFloat(bankExpenseVal) || 0) * 100) : 0,
        expenseTarget: applyDiscount ? expenseTarget : undefined,
        expenseTargetId: applyDiscount ? expenseTargetId : undefined,
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          isIncoming 
            ? (applyDiscount ? 'Çek kırdırılarak tahsil edildi!' : 'Çek başarıyla tahsil edildi!')
            : (applyDiscount ? 'Çek vade farkı düşülerek erken ödendi!' : 'Çek ödemesi kasadan düşülerek ödendi işaretlendi!')
        )
        onClose()
      }
    } catch (e: any) {
      toast.error(e.message || 'İşlem başarısız.')
    } finally {
      setLoading(false)
    }
  }

  // Helper selectors for correct naming instead of showing raw UUIDs
  const selectedSafeName = safes.find(s => s.id === safeId)?.name || 'Kasa/Banka seçin'
  const selectedExpenseTargetSafeName = safes.find(s => s.id === expenseTargetId)?.name || 'Kasa seçin'
  
  const currentAccount = accounts.find(a => a.id === expenseTargetId)
  const selectedExpenseTargetAccountName = currentAccount 
    ? `${currentAccount.name} ${currentAccount.company_name ? `(${currentAccount.company_name})` : ''}`
    : 'Cari hesap seçin'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-card border w-full max-w-md p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 text-primary">
            <Landmark className="w-5 h-5" />
            <h3 className="font-bold text-lg">
              {cheque.type === 'cheque' ? 'Çek' : 'Senet'} {isIncoming ? 'Tahsil Et (Giriş)' : 'Ödendi İşaretle (Çıkış)'}
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
                <SelectValue>{selectedSafeName}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border">
                {safes.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 py-2 border-t border-b border-dashed">
            <input 
              type="checkbox" 
              id="modalApplyDiscount" 
              checked={applyDiscount} 
              onChange={(e) => setApplyDiscount(e.target.checked)} 
              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
            />
            <Label htmlFor="modalApplyDiscount" className="cursor-pointer font-semibold text-sm">
              {isIncoming ? 'Vade Farkı Uygula (Çeki Kırdır)' : 'Vade Farkı Uygula (Erken Ödeme İndirimi)'}
            </Label>
          </div>

          {applyDiscount && (
            <div className="space-y-3 animate-in-up text-xs">
              {/* Cost Categories Section */}
              <div className="bg-muted/30 p-3 rounded-2xl border space-y-3">
                <p className="font-semibold text-sm border-b pb-1 text-primary">Kırdırma Masrafları</p>
                
                {/* 1. İskonto Faizi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">1. İskonto Faizi (TL)</Label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="checkbox" 
                        id="calcInterestByRate"
                        checked={calcInterestByRate}
                        onChange={(e) => setCalcInterestByRate(e.target.checked)}
                        className="w-3.5 h-3.5 cursor-pointer rounded"
                      />
                      <label htmlFor="calcInterestByRate" className="text-[10px] text-muted-foreground cursor-pointer">
                        Orana Göre Otomatik Hesapla
                      </label>
                    </div>
                  </div>
                  
                  {calcInterestByRate ? (
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="col-span-1">
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={discountRate} 
                          onChange={(e) => setDiscountRate(e.target.value)} 
                          className="h-8 text-xs rounded-lg"
                          placeholder="Aylık %"
                        />
                      </div>
                      <span className="text-[10px] text-center text-muted-foreground">Aylık Faiz Oranı (%)</span>
                      <div className="col-span-1 text-right">
                        <Input 
                          type="text" 
                          value={interestVal} 
                          disabled
                          className="h-8 text-xs rounded-lg text-right bg-muted"
                        />
                      </div>
                    </div>
                  ) : (
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={interestVal} 
                      onChange={(e) => setInterestVal(e.target.value)} 
                      className="h-9 text-xs rounded-lg"
                      placeholder="Faiz Tutarı (TL)"
                    />
                  )}
                </div>

                {/* 2. Komisyon */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">2. Komisyon / Hizmet Bedeli (TL)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={commissionVal} 
                    onChange={(e) => setCommissionVal(e.target.value)} 
                    className="h-9 text-xs rounded-lg"
                    placeholder="Komisyon Tutarı"
                  />
                </div>

                {/* 3. Banka Masrafları */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">3. Banka Masrafları / Dosya Ücreti (TL)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={bankExpenseVal} 
                    onChange={(e) => setBankExpenseVal(e.target.value)} 
                    className="h-9 text-xs rounded-lg"
                    placeholder="Diğer Masraflar"
                  />
                </div>
              </div>

              {/* Expense/Income Target selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Masrafın Düştüğü Hedef</Label>
                  <Select 
                    value={expenseTarget} 
                    onValueChange={(val: any) => setExpenseTarget(val)}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue>
                        {expenseTarget === 'safe' 
                          ? (isIncoming ? 'Kasa Gideri Yaz' : 'Kasa Geliri Yaz')
                          : (isIncoming ? 'Cariye Yansıt (Borçlandır)' : 'Cariye Yansıt (Alacaklandır)')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      <SelectItem value="safe">
                        {isIncoming ? 'Kasa Gideri Yaz' : 'Kasa Geliri Yaz'}
                      </SelectItem>
                      <SelectItem value="account">
                        {isIncoming ? 'Cariye Yansıt (Borçlandır)' : 'Cariye Yansıt (Alacaklandır)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {expenseTarget === 'account' ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Masrafın Yansıtılacağı Cari</Label>
                    <Select 
                      value={expenseTargetId} 
                      onValueChange={(val) => setExpenseTargetId(val || '')}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue>{selectedExpenseTargetAccountName}</SelectValue>
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
                    <Label className="text-xs">Masrafın Düştüğü Kasa</Label>
                    <Select 
                      value={expenseTargetId} 
                      onValueChange={(val) => setExpenseTargetId(val || '')}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue>{selectedExpenseTargetSafeName}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border">
                        {safes.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Live calculations */}
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Vadeye Kalan:</span>
                  <strong className="text-xs">{remainingDays} Gün</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Toplam Masraf:</span>
                  <strong className={`text-xs ${isIncoming ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {formatCurrency(discountAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    {isIncoming ? 'Net Tahsilat:' : 'Net Ödeme:'}
                  </span>
                  <strong className="text-xs text-primary font-bold">{formatCurrency(netAmount)}</strong>
                </div>
              </div>
            </div>
          )}

          {!applyDiscount && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tutar:</span>
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
