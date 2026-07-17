'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MoneyInput } from '@/components/ui/money-input'
import { createLoan } from './actions'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

export function LoanForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [loanAmount, setLoanAmount] = useState<number>(0)
  const [totalRepayment, setTotalRepayment] = useState<number>(0)
  const [months, setMonths] = useState<number>(12)

  // Calculate monthly installment automatically
  const monthlyInstallment = months > 0 && totalRepayment > 0 ? Math.round(totalRepayment / months) : 0

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loanAmount <= 0 || totalRepayment < loanAmount || months <= 0) {
      toast.error('Lütfen geçerli kredi tutarı ve vade giriniz.')
      return
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      // Calculate end date based on start date and months
      const startDate = new Date(formData.get('start_date') as string)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + months)

      await createLoan({
        bank_name: formData.get('bank_name') as string,
        loan_amount: loanAmount,
        total_repayment: totalRepayment,
        interest_rate: formData.get('interest_rate') ? parseFloat(formData.get('interest_rate') as string) : undefined,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        monthly_installment: monthlyInstallment,
        notes: formData.get('notes') as string,
      })
      toast.success('Kredi başarıyla eklendi, ödeme planı oluşturuldu!')
      router.push('/finance?tab=loans')
    } catch (error: any) {
      toast.error(error.message)
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
        <h1 className="text-2xl font-bold">Yeni Kredi Tanımla</h1>
      </div>

      <form onSubmit={onSubmit} className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
        
        <div className="space-y-2">
          <Label>Banka / Finans Kurumu Adı</Label>
          <Input name="bank_name" required placeholder="Örn: Akbank Ticari Kredi" className="h-12 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Çekilen Kredi Tutarı (Ana Para)</Label>
            <MoneyInput name="loan_amount" value={loanAmount} onChange={setLoanAmount} />
          </div>
          <div className="space-y-2">
            <Label>Toplam Geri Ödeme Tutarı</Label>
            <MoneyInput name="total_repayment" value={totalRepayment} onChange={setTotalRepayment} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Vade (Ay)</Label>
            <Input 
              type="number" 
              required 
              min="1" 
              max="360"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
              className="h-12 rounded-xl" 
            />
          </div>
          <div className="space-y-2">
            <Label>Aylık Faiz Oranı (%) - İsteğe Bağlı</Label>
            <Input name="interest_rate" type="number" step="0.01" placeholder="Örn: 3.50" className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
          <p className="text-sm text-muted-foreground">Hesaplanan Aylık Taksit Tutarı</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyInstallment)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            * Kredi kaydedildiğinde bu tutar üzerinden {months} aylık ödeme planı otomatik oluşturulacaktır.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Kredi Başlangıç Tarihi</Label>
          <Input name="start_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-12 rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label>Notlar</Label>
          <Textarea name="notes" placeholder="Kredi kullanım amacı vb..." className="min-h-[100px] rounded-xl" />
        </div>

        <Button type="submit" size="lg" className="w-full h-12 rounded-xl" disabled={loading}>
          {loading ? 'Plan Oluşturuluyor...' : 'Kaydet ve Ödeme Planını Oluştur'}
        </Button>
      </form>
    </div>
  )
}
