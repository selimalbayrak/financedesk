'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MoneyInput } from '@/components/ui/money-input'
import { createLoan } from './actions'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

export function LoanForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  
  const [bankName, setBankName] = useState('')
  const [loanAmount, setLoanAmount] = useState<number>(0)
  const [totalRepayment, setTotalRepayment] = useState<number>(0)
  const [months, setMonths] = useState<number>(12)
  const [interestRate, setInterestRate] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Custom parsed installments from PDF (in Liras)
  const [customInstallments, setCustomInstallments] = useState<Array<{ due_date: string; amount_due: number }>>([])

  // Calculate standard monthly installment automatically if not parsed
  const monthlyInstallment = months > 0 && totalRepayment > 0 ? Math.round(totalRepayment / months) : 0

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/parse-loan', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.error) {
        toast.error(`Tarama hatası: ${data.error}`)
        return
      }

      if (data.loan) {
        const { loan } = data
        if (loan.bank_name) setBankName(loan.bank_name)
        if (loan.loan_amount) setLoanAmount(loan.loan_amount)
        if (loan.total_repayment) setTotalRepayment(loan.total_repayment)
        if (loan.interest_rate) setInterestRate(loan.interest_rate.toString())
        if (loan.start_date) setStartDate(loan.start_date)
        if (loan.installments && loan.installments.length > 0) {
          setCustomInstallments(loan.installments)
          setMonths(loan.installments.length)
        } else if (loan.months) {
          setMonths(loan.months)
        }
        toast.success('Banka ödeme planı başarıyla tarandı!')
      }
    } catch (err: any) {
      toast.error('Ödeme planı taranırken teknik bir hata oluştu.')
    } finally {
      setParsing(false)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loanAmount <= 0 || totalRepayment < loanAmount || months <= 0) {
      toast.error('Lütfen geçerli kredi tutarı ve vade giriniz.')
      return
    }

    setLoading(true)

    // Calculate end date based on start date and months
    const sDate = new Date(startDate)
    const endDate = new Date(sDate)
    endDate.setMonth(endDate.getMonth() + months)

    try {
      // Map custom installments to cents
      const installmentsCents = customInstallments.map(inst => ({
        due_date: inst.due_date,
        amount_due: Math.round(inst.amount_due * 100)
      }))

      const res = await createLoan({
        bank_name: bankName,
        loan_amount: Math.round(loanAmount * 100),
        total_repayment: Math.round(totalRepayment * 100),
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        monthly_installment: Math.round(monthlyInstallment * 100),
        notes: notes,
        installments: installmentsCents.length > 0 ? installmentsCents : undefined
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kredi başarıyla eklendi, ödeme planı oluşturuldu!')
        router.push('/finance?tab=loans')
      }
    } catch (error: any) {
      toast.error(error.message || 'Kredi kaydedilirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Yeni Kredi Tanımla</h1>
        </div>

        {/* AI PDF Ödeme Planı Yükleme */}
        <div className="relative">
          <input
            type="file"
            accept=".pdf,image/*"
            id="pdf-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={parsing}
          />
          <Label
            htmlFor="pdf-upload"
            className="flex items-center gap-2 px-4 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer font-medium text-sm transition-colors"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Okunuyor...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Ödeme Planı PDF Yükle
              </>
            )}
          </Label>
        </div>
      </div>

      {parsing && (
        <div className="p-6 border border-dashed border-primary/30 bg-primary/5 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
          <FileText className="w-10 h-10 text-primary animate-bounce" />
          <div>
            <h3 className="font-bold text-primary">Kredi Ödeme Planı Taranıyor</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Gemini yapay zeka, bankanın ödeme tablosundaki taksit tutarlarını, vadeleri ve faiz oranlarını otomatik çözümlüyor.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
        
        <div className="space-y-2">
          <Label>Banka / Finans Kurumu Adı</Label>
          <Input 
            name="bank_name" 
            required 
            placeholder="Örn: Akbank Ticari Kredi" 
            className="h-12 rounded-xl"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
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
            <Input 
              name="interest_rate" 
              type="number" 
              step="0.01" 
              placeholder="Örn: 3.50" 
              className="h-12 rounded-xl"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Kredi Başlangıç Tarihi</Label>
          <Input 
            name="start_date" 
            type="date" 
            required 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-12 rounded-xl" 
          />
        </div>

        {customInstallments.length > 0 ? (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
            <div>
              <h4 className="text-sm font-bold text-emerald-600">Taranan Taksit Planı ({customInstallments.length} Ay)</h4>
              <p className="text-xs text-muted-foreground">PDF'ten okunan taksit tablosu başarıyla yüklendi. Kaydettiğinizde bu plana göre kaydedilecektir.</p>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-emerald-500/10 text-xs font-mono">
              {customInstallments.map((inst, index) => (
                <div key={index} className="py-1.5 flex justify-between">
                  <span>{index + 1}. Taksit ({formatDate(inst.due_date)})</span>
                  <span className="font-bold">{formatCurrency(Math.round(inst.amount_due * 100))}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
            <p className="text-sm text-muted-foreground">Hesaplanan Aylık Taksit Tutarı</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(Math.round(monthlyInstallment * 100))}</p>
            <p className="text-xs text-muted-foreground mt-2">
              * Kredi kaydedildiğinde bu tutar üzerinden {months} aylık standart ödeme planı otomatik oluşturulacaktır.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Notlar</Label>
          <Textarea 
            name="notes" 
            placeholder="Kredi kullanım amacı vb..." 
            className="min-h-[100px] rounded-xl"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" className="w-full h-12 rounded-xl" disabled={loading || parsing}>
          {loading ? 'Kredi Kaydediliyor...' : 'Kaydet ve Ödeme Planını Oluştur'}
        </Button>
      </form>
    </div>
  )
}
