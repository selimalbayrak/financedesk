'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoneyInput } from '@/components/ui/money-input'
import { createChequeNote } from './actions'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

type Account = {
  id: string
  name: string
  company_name: string | null
}

type Safe = {
  id: string
  name: string
}

export function ChequeForm({ accounts, safes }: { accounts: Account[], safes: Safe[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(0) // in Liras
  const [type, setType] = useState<'cheque' | 'promissory_note'>('cheque')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [accountId, setAccountId] = useState<string>('')
  
  // Vade Farkı (Discount) States
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [calcInterestByRate, setCalcInterestByRate] = useState(true)
  const [discountRate, setDiscountRate] = useState<string>('6') // Monthly %
  const [interestVal, setInterestVal] = useState('0.00')
  const [commissionVal, setCommissionVal] = useState('0.00')
  const [bankExpenseVal, setBankExpenseVal] = useState('0.00')

  const [safeId, setSafeId] = useState<string>('')
  const [expenseTarget, setExpenseTarget] = useState<'safe' | 'account'>('safe')
  const [expenseTargetId, setExpenseTargetId] = useState('')

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')

  // Computed Values
  const [remainingDays, setRemainingDays] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [netAmount, setNetAmount] = useState(0)

  // Initialize defaults
  useEffect(() => {
    if (safes.length > 0 && !safeId) {
      setSafeId(safes[0].id)
    }
  }, [safes, safeId])

  // Sync target when safeId changes
  useEffect(() => {
    if (expenseTarget === 'safe') {
      setExpenseTargetId(safeId)
    }
  }, [expenseTarget, safeId])

  // Sync account target
  useEffect(() => {
    if (expenseTarget === 'account') {
      setExpenseTargetId(accountId || (accounts[0]?.id ?? ''))
    }
  }, [expenseTarget, accountId, accounts])

  // Calculate days remaining
  useEffect(() => {
    if (issueDate && dueDate) {
      const start = new Date(issueDate)
      const end = new Date(dueDate)
      const diffTime = end.getTime() - start.getTime()
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      setRemainingDays(diffDays)
    } else {
      setRemainingDays(0)
    }
  }, [issueDate, dueDate])

  // Compute interest automatically by rate if checked
  useEffect(() => {
    if (applyDiscount && calcInterestByRate && amount > 0 && discountRate && remainingDays > 0) {
      const monthlyRate = parseFloat(discountRate) / 100
      const dailyRate = monthlyRate / 30
      const calcDiscount = amount * dailyRate * remainingDays
      setInterestVal(calcDiscount.toFixed(2))
    }
  }, [applyDiscount, calcInterestByRate, amount, discountRate, remainingDays])

  // Compute total discount sum and net liras
  useEffect(() => {
    if (applyDiscount) {
      const faiz = parseFloat(interestVal) || 0
      const komisyon = parseFloat(commissionVal) || 0
      const masraf = parseFloat(bankExpenseVal) || 0
      const totalTL = faiz + komisyon + masraf
      setDiscountAmount(totalTL)
      setNetAmount(Math.max(0, amount - totalTL))
    } else {
      setDiscountAmount(0)
      setNetAmount(amount)
    }
  }, [applyDiscount, amount, interestVal, commissionVal, bankExpenseVal])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!accountId) {
      toast.error('Lütfen bir Cari Hesap seçin.')
      return
    }
    if (amount <= 0) {
      toast.error('Lütfen geçerli bir tutar girin.')
      return
    }
    if (applyDiscount && !safeId) {
      toast.error('Vade farkı kırdırma işlemi için tahsil edilecek Kasa/Banka seçmelisiniz.')
      return
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      const selectedAccount = accounts.find(a => a.id === accountId)
      
      const res = await createChequeNote({
        type: type,
        direction: direction,
        amount: Math.round(amount * 100), // convert to cents
        issue_date: issueDate,
        due_date: dueDate,
        contact_name: selectedAccount ? (selectedAccount.company_name || selectedAccount.name) : 'Bilinmeyen Cari',
        account_id: accountId,
        bank_name: formData.get('bank_name') as string,
        document_number: formData.get('document_number') as string,
        notes: formData.get('notes') as string,
        // Vade farkı params
        apply_discount: applyDiscount,
        interest_amount: applyDiscount ? Math.round((parseFloat(interestVal) || 0) * 100) : undefined,
        commission_amount: applyDiscount ? Math.round((parseFloat(commissionVal) || 0) * 100) : undefined,
        bank_expense_amount: applyDiscount ? Math.round((parseFloat(bankExpenseVal) || 0) * 100) : undefined,
        expense_target: applyDiscount ? expenseTarget : undefined,
        expense_target_id: applyDiscount ? expenseTargetId : undefined,
        safe_id: applyDiscount ? safeId : undefined,
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(applyDiscount ? 'Çek eklendi ve kırdırılarak nakit girişi yapıldı!' : 'Çek/Senet başarıyla eklendi!')
        router.push('/finance?tab=cheques')
      }
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Label resolvers to prevent raw UUID bug
  const selectedTypeName = type === 'cheque' ? 'Çek' : 'Senet'
  const selectedDirectionName = direction === 'in' ? 'Alınan (Müşteriden)' : 'Verilen (Tedarikçiye)'
  
  const currentAcc = accounts.find(a => a.id === accountId)
  const selectedAccountName = currentAcc 
    ? `${currentAcc.name} ${currentAcc.company_name ? `(${currentAcc.company_name})` : ''}` 
    : 'Cari hesap seçin'

  const selectedSafeName = safes.find(s => s.id === safeId)?.name || 'Kasa/Banka seçin'
  const selectedExpenseTargetSafeName = safes.find(s => s.id === expenseTargetId)?.name || 'Kasa seçin'
  
  const expAcc = accounts.find(a => a.id === expenseTargetId)
  const selectedExpenseTargetAccountName = expAcc 
    ? `${expAcc.name} ${expAcc.company_name ? `(${expAcc.company_name})` : ''}` 
    : 'Cari hesap seçin'

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in-up">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni Çek / Senet</h1>
      </div>

      <form onSubmit={onSubmit} className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Evrak Tipi</Label>
            <Select name="type" required value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue>{selectedTypeName}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="cheque">Çek</SelectItem>
                <SelectItem value="promissory_note">Senet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Yönü</Label>
            <Select name="direction" required value={direction} onValueChange={(val: any) => {
              setDirection(val)
              if (val === 'out') setApplyDiscount(false) // Only in cheques can be discounted
            }}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue>{selectedDirectionName}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border">
                <SelectItem value="in">Alınan (Müşteriden)</SelectItem>
                <SelectItem value="out">Verilen (Tedarikçiye)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cari Hesap (Muhatap)</Label>
          <Select value={accountId} onValueChange={(val) => setAccountId(val || '')} required>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue>{selectedAccountName}</SelectValue>
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

        <div className="space-y-2">
          <Label>Tutar</Label>
          <MoneyInput name="amount" value={amount} onChange={setAmount} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Düzenlenme Tarihi</Label>
            <Input 
              name="issue_date" 
              type="date" 
              required 
              value={issueDate} 
              onChange={(e) => setIssueDate(e.target.value)} 
              className="h-12 rounded-xl" 
            />
          </div>
          <div className="space-y-2">
            <Label>Vade Tarihi</Label>
            <Input 
              name="due_date" 
              type="date" 
              required 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-12 rounded-xl" 
            />
          </div>
        </div>

        {type === 'cheque' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banka Adı</Label>
              <Input name="bank_name" placeholder="Örn: Garanti BBVA" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Belge Numarası</Label>
              <Input name="document_number" placeholder="Çek numarası" className="h-12 rounded-xl" />
            </div>
          </div>
        )}

        {/* Vade Farkı (İskonto / Kırdırma) Kısmı (Sadece Alınan Evraklar için) */}
        {direction === 'in' && amount > 0 && remainingDays > 0 && (
          <div className="border border-primary/20 rounded-2xl p-4 bg-primary/5 space-y-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="applyDiscount" 
                checked={applyDiscount} 
                onChange={(e) => setApplyDiscount(e.target.checked)} 
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="applyDiscount" className="cursor-pointer font-semibold text-sm">
                Vade Farkı Uygula (Nakit Girişi Yap / Çeki Kırdır)
              </Label>
            </div>

            {applyDiscount && (
              <div className="space-y-4 animate-in-up text-xs">
                {/* Safe Select for net cash entry */}
                <div className="space-y-1 text-left">
                  <Label className="text-xs">Net Paranın Gireceği Kasa / Banka</Label>
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

                {/* Detailed Kırdırma Masrafları Form */}
                <div className="bg-muted/40 p-3 rounded-xl border space-y-3">
                  <p className="font-semibold text-xs border-b pb-1 text-primary">Kırdırma Masrafları</p>
                  
                  {/* 1. İskonto Faizi */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-medium">1. İskonto Faizi (TL)</Label>
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
                            value={parseFloat(interestVal).toFixed(2)} 
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
                    <Label className="text-[11px] font-medium">2. Komisyon / Hizmet Bedeli (TL)</Label>
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
                    <Label className="text-[11px] font-medium">3. Banka Masrafları / Dosya Ücreti (TL)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={bankExpenseVal} 
                      onChange={(e) => setBankExpenseVal(e.target.value)} 
                      className="h-9 text-xs rounded-lg"
                      placeholder="Banka Masrafları"
                    />
                  </div>
                </div>

                {/* Expense Target Selector */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1">
                    <Label className="text-xs">Masrafın Düştüğü Hedef</Label>
                    <Select 
                      value={expenseTarget} 
                      onValueChange={(val: any) => setExpenseTarget(val)}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue>
                          {expenseTarget === 'safe' ? 'Kasa Gideri Yaz' : 'Cariye Yansıt (Borçlandır)'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border">
                        <SelectItem value="safe">Kasa Gideri Yaz</SelectItem>
                        <SelectItem value="account">Cariye Yansıt (Borçlandır)</SelectItem>
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

                {/* Calculation breakdown values */}
                <div className="pt-2 border-t border-dashed border-primary/20 grid grid-cols-3 gap-2 text-xs font-mono text-center">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Vadeye Kalan:</span>
                    <strong className="text-sm">{remainingDays} Gün</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Toplam Masraf:</span>
                    <strong className="text-sm text-rose-500">{formatCurrency(discountAmount)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Net Tahsilat:</span>
                    <strong className="text-sm text-emerald-500 font-bold">{formatCurrency(netAmount)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Notlar</Label>
          <Textarea name="notes" placeholder="İsteğe bağlı notlar..." className="min-h-[100px] rounded-xl" />
        </div>

        <Button type="submit" size="lg" className="w-full h-12 rounded-xl" disabled={loading}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </form>
    </div>
  )
}
