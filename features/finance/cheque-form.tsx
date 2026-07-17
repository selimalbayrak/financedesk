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
  const [discountRate, setDiscountRate] = useState<string>('6') // Monthly %
  const [safeId, setSafeId] = useState<string>('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')

  // Computed Values
  const [remainingDays, setRemainingDays] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [netAmount, setNetAmount] = useState(0)

  useEffect(() => {
    if (issueDate && dueDate) {
      const start = new Date(issueDate)
      const end = new Date(dueDate)
      const diffTime = end.getTime() - start.getTime()
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      setRemainingDays(diffDays)

      if (applyDiscount && amount > 0 && discountRate) {
        const monthlyRate = parseFloat(discountRate) / 100
        const dailyRate = monthlyRate / 30
        const calcDiscount = amount * dailyRate * diffDays
        setDiscountAmount(calcDiscount)
        setNetAmount(amount - calcDiscount)
      } else {
        setDiscountAmount(0)
        setNetAmount(amount)
      }
    } else {
      setRemainingDays(0)
      setDiscountAmount(0)
      setNetAmount(amount)
    }
  }, [issueDate, dueDate, applyDiscount, amount, discountRate])

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
        discount_rate: applyDiscount ? parseFloat(discountRate) : undefined,
        discount_amount: applyDiscount ? Math.round(discountAmount * 100) : undefined,
        net_amount: applyDiscount ? Math.round(netAmount * 100) : undefined,
        safe_id: applyDiscount ? safeId : undefined,
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(applyDiscount ? 'Çek eklendi ve vade farkı düşülerek nakit girişi yapıldı!' : 'Çek/Senet başarıyla eklendi!')
        router.push('/finance?tab=cheques')
      }
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              <SelectValue placeholder="Cari hesap seçin" />
            </SelectTrigger>
            <SelectContent>
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
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <Label htmlFor="applyDiscount" className="cursor-pointer font-semibold text-sm">
                Vade Farkı Uygula (Nakit Girişi Yap / Çeki Kırdır)
              </Label>
            </div>

            {applyDiscount && (
              <div className="space-y-4 animate-in-up">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Aylık Vade Farkı Oranı (%)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={discountRate} 
                      onChange={(e) => setDiscountRate(e.target.value)} 
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Paranın Gireceği Kasa / Banka</Label>
                    <Select value={safeId} onValueChange={(val) => setSafeId(val || '')} required>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue placeholder="Kasa/Banka seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {safes.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-primary/20 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Vadeye Kalan:</span>
                    <strong className="text-sm">{remainingDays} Gün</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Vade Farkı Tutarı:</span>
                    <strong className="text-sm text-rose-500">{formatCurrency(Math.round(discountAmount * 100))}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Net Tahsilat:</span>
                    <strong className="text-sm text-emerald-500 font-bold">{formatCurrency(Math.round(netAmount * 100))}</strong>
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
