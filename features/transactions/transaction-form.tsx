'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, PackagePlus, PackageMinus, ArrowRightLeft, Users, CreditCard, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoneyInput } from '@/components/ui/money-input'
import { createTransaction, createEmployeeTransaction } from './actions'
import { createChequeNote } from '@/features/finance/actions'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

type Account = {
  id: string
  name: string
  company_name: string | null
}

const TRANSACTION_TYPES = [
  { id: 'payment_out', label: 'Gönderilen Ödeme', icon: ArrowUpCircle, color: 'text-rose-500' },
  { id: 'payment_in', label: 'Alınan Ödeme', icon: ArrowDownCircle, color: 'text-emerald-500' },
  { id: 'invoice_out', label: 'Fatura Kestik (Verilen)', icon: PackageMinus, color: 'text-emerald-500' },
  { id: 'invoice_in', label: 'Fatura Geldi (Alınan)', icon: PackagePlus, color: 'text-rose-500' },
  { id: 'safe_transfer', label: 'Kasalar Arası Transfer', icon: ArrowRightLeft, color: 'text-blue-500' },
  { id: 'salary_payment', label: 'Maaş/Avans Ödemesi', icon: Users, color: 'text-amber-500' },
  { id: 'cheque_note', label: 'Çek / Senet', icon: CreditCard, color: 'text-indigo-500' },
] as const

const PAYMENT_METHODS = [
  'Nakit', 'Havale/EFT', 'Kredi Kartı', 'Çek', 'Senet'
]

export function TransactionForm({ accounts, safes, employees = [] }: { accounts: Account[], safes: Array<{id: string, name: string}>, employees?: Array<{id: string, name: string}> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<typeof TRANSACTION_TYPES[number]['id']>('payment_out')
  const [paymentMethod, setPaymentMethod] = useState<string>('Nakit')
  const [accountId, setAccountId] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [safeId, setSafeId] = useState<string>('')
  const [toSafeId, setToSafeId] = useState<string>('')
  const [amount, setAmount] = useState<number>(0)

  // AI Invoice Upload State
  const [invoiceParsing, setInvoiceParsing] = useState(false)

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setInvoiceParsing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData
      })
      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()

      if (res.ok && contentType.includes('application/json')) {
        const data = JSON.parse(text)
        if (data.transactions && data.transactions.length > 0) {
          const firstTx = data.transactions[0]
          if (firstTx.debit > 0 || firstTx.credit > 0) {
            setAmount((firstTx.debit || firstTx.credit) / 100)
          }
          if (firstTx.document_no) {
            const invoiceInput = document.getElementById('invoice_number') as HTMLInputElement
            if (invoiceInput) invoiceInput.value = firstTx.document_no
          }
          if (firstTx.description) {
            const descInput = document.getElementById('description') as HTMLInputElement
            if (descInput) descInput.value = firstTx.description
          }
          if (firstTx.date) {
            const dateInput = document.getElementById('transaction_date') as HTMLInputElement
            if (dateInput) dateInput.value = firstTx.date
          }
          toast.success('Fatura PDF verileri başarıyla okundu ve forma dolduruldu!')
        } else {
          toast.info('Belge okundu, lütfen tutarı ve fatura numarasını kontrol edin.')
        }
      } else {
        toast.error('Fatura okunamadı.')
      }
    } catch (err: any) {
      toast.error('Fatura okuma hatası: ' + err.message)
    } finally {
      setInvoiceParsing(false)
    }
  }

  // Integrated Cheque/Senet Entry States
  const [chequeType, setChequeType] = useState<'cheque' | 'promissory_note'>('cheque')
  const [chequeDirection, setChequeDirection] = useState<'in' | 'out'>('in')
  
  // Cheque Vade Farkı (Discount) States
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [calcInterestByRate, setCalcInterestByRate] = useState(true)
  const [discountRate, setDiscountRate] = useState<string>('6') // Monthly %
  const [interestVal, setInterestVal] = useState('0.00')
  const [commissionVal, setCommissionVal] = useState('0.00')
  const [bankExpenseVal, setBankExpenseVal] = useState('0.00')

  const [chequeSafeId, setChequeSafeId] = useState<string>('')
  const [netTarget, setNetTarget] = useState<'safe' | 'account'>('safe')
  const [netTargetId, setNetTargetId] = useState('')
  const [expenseTarget, setExpenseTarget] = useState<'safe' | 'account'>('safe')
  const [expenseTargetId, setExpenseTargetId] = useState('')

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')

  // Computed Values for Cheque
  const [remainingDays, setRemainingDays] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [netAmount, setNetAmount] = useState(0)

  // Initialize cheque safe defaults
  useEffect(() => {
    if (safes.length > 0) {
      if (!chequeSafeId) setChequeSafeId(safes[0].id)
      if (!netTargetId) setNetTargetId(safes[0].id)
    }
  }, [safes, chequeSafeId, netTargetId])

  // Sync target when chequeSafeId changes
  useEffect(() => {
    if (expenseTarget === 'safe') {
      setExpenseTargetId(chequeSafeId)
    }
  }, [expenseTarget, chequeSafeId])

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
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      if (type === 'cheque_note') {
        if (!accountId) {
          toast.error('Lütfen bir Cari Hesap seçin.')
          setLoading(false)
          return
        }
        if (amount <= 0) {
          toast.error('Lütfen geçerli bir tutar girin.')
          setLoading(false)
          return
        }
        if (applyDiscount && !netTargetId) {
          toast.error('Vade farkı kırdırma işlemi için net tutarın aktarılacağı Kasa veya Cari seçmelisiniz.')
          setLoading(false)
          return
        }

        const selectedAccount = accounts.find(a => a.id === accountId)
        const res = await createChequeNote({
          type: chequeType,
          direction: chequeDirection,
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
          net_target: applyDiscount ? netTarget : undefined,
          net_target_id: applyDiscount ? netTargetId : undefined,
          expense_target: applyDiscount ? expenseTarget : undefined,
          expense_target_id: applyDiscount ? expenseTargetId : undefined,
          safe_id: applyDiscount ? chequeSafeId : undefined,
        })

        if (res && 'error' in res && res.error) {
          toast.error(res.error)
        } else {
          toast.success(applyDiscount ? 'Çek eklendi ve kırdırılarak nakit girişi yapıldı!' : 'Çek/Senet başarıyla eklendi!')
          router.push('/')
        }
      } else if (type === 'salary_payment') {
        const amountStr = formData.get('amount') as string
        const payVal = Math.round(parseFloat(amountStr.replace(',', '.')) * 100)
        
        await createEmployeeTransaction({
          employee_id: formData.get('employee_id') as string,
          safe_id: formData.get('safe_id') as string,
          transaction_type: 'salary_payment',
          amount: payVal,
          description: formData.get('description') as string,
          date: formData.get('transaction_date') as string,
        })
        toast.success('İşlem başarıyla eklendi!')
        router.push('/')
      } else {
        const amountStr = formData.get('amount') as string
        const txVal = Math.round(parseFloat(amountStr.replace(',', '.')) * 100)

        await createTransaction({
          account_id: type === 'safe_transfer' ? undefined : (formData.get('account_id') as string),
          safe_id: formData.get('safe_id') as string,
          to_safe_id: type === 'safe_transfer' ? (formData.get('to_safe_id') as string) : undefined,
          transaction_type: type as any,
          amount: txVal,
          description: formData.get('description') as string,
          transaction_date: formData.get('transaction_date') as string,
          invoice_number: (type === 'invoice_in' || type === 'invoice_out') 
            ? (formData.get('invoice_number') as string)
            : undefined,
          payment_method: (type === 'payment_in' || type === 'payment_out' || type === 'safe_transfer') 
            ? paymentMethod
            : undefined,
          bank_detail: (paymentMethod === 'Havale/EFT') ? (formData.get('bank_detail') as string) : undefined
        })
        toast.success('İşlem başarıyla eklendi!')
        router.push('/')
      }
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Label resolvers to prevent raw UUID bug
  const currentAcc = accounts.find(a => a.id === accountId)
  const selectedAccountName = currentAcc 
    ? `${currentAcc.name} ${currentAcc.company_name ? `(${currentAcc.company_name})` : ''}` 
    : 'Bir cari seçin...'

  const selectedEmployeeName = employees.find(e => e.id === employeeId)?.name || 'Bir personel seçin...'
  const selectedSafeName = safes.find(s => s.id === safeId)?.name || 'Kasa seçin...'
  const selectedToSafeName = safes.find(s => s.id === toSafeId)?.name || 'Alıcı kasa seçin...'

  const selectedChequeSafeName = safes.find(s => s.id === chequeSafeId)?.name || 'Kasa/Banka seçin'
  const selectedNetTargetSafeName = safes.find(s => s.id === netTargetId)?.name || 'Kasa/Banka seçin'
  
  const netAcc = accounts.find(a => a.id === netTargetId)
  const selectedNetTargetAccountName = netAcc 
    ? `${netAcc.name} ${netAcc.company_name ? `(${netAcc.company_name})` : ''}` 
    : 'Cari hesap seçin'

  const selectedExpenseTargetSafeName = safes.find(s => s.id === expenseTargetId)?.name || 'Kasa seçin'
  
  const expAcc = accounts.find(a => a.id === expenseTargetId)
  const selectedExpenseTargetAccountName = expAcc 
    ? `${expAcc.name} ${expAcc.company_name ? `(${expAcc.company_name})` : ''}` 
    : 'Cari hesap seçin'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni İşlem Ekle</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-4">
          <Label>Ne İşlemi Eklemek İstiyorsunuz?</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TRANSACTION_TYPES.map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  type === t.id 
                    ? 'border-primary bg-primary/5 shadow-sm scale-[1.02]' 
                    : 'border-border/50 hover:bg-muted'
                }`}
              >
                <t.icon className={`w-8 h-8 ${t.color}`} />
                <span className="text-sm font-medium text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {type === 'cheque_note' ? (
          /* Sub-form for direct Cheque/Senet creation */
          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-5 animate-in-up">
            <h3 className="font-bold text-base text-primary border-b pb-2">Hızlı Çek / Senet Girişi</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Evrak Tipi</Label>
                <Select value={chequeType} onValueChange={(val: any) => setChequeType(val)}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue>{chequeType === 'cheque' ? 'Çek' : 'Senet'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    <SelectItem value="cheque">Çek</SelectItem>
                    <SelectItem value="promissory_note">Senet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Yönü</Label>
                <Select value={chequeDirection} onValueChange={(val: any) => {
                  setChequeDirection(val)
                  if (val === 'out') setApplyDiscount(false)
                }}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue>{chequeDirection === 'in' ? 'Alınan (Müşteriden)' : 'Verilen (Tedarikçiye)'}</SelectValue>
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

            {chequeType === 'cheque' && (
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
            {chequeDirection === 'in' && amount > 0 && remainingDays > 0 && (
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
                    {/* Net Target (Safe or Cari) Selector */}
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <Label className="text-xs">Net Paranın Gireceği Yer</Label>
                        <Select 
                          value={netTarget} 
                          onValueChange={(val: any) => {
                            setNetTarget(val)
                            if (val === 'safe') setNetTargetId(safes[0]?.id || '')
                            else setNetTargetId(accounts[0]?.id || '')
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue>
                              {netTarget === 'safe' ? 'Kasa / Banka' : 'Cari Hesap'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-card border">
                            <SelectItem value="safe">Kasa / Banka</SelectItem>
                            <SelectItem value="account">Cari Hesap</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {netTarget === 'safe' ? (
                        <div className="space-y-1">
                          <Label className="text-xs">Alıcı Kasa/Banka</Label>
                          <Select value={netTargetId} onValueChange={(val) => setNetTargetId(val || '')}>
                            <SelectTrigger className="h-10 rounded-lg">
                              <SelectValue>{selectedNetTargetSafeName}</SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-card border">
                              {safes.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs">Alıcı Cari Hesap</Label>
                          <Select value={netTargetId} onValueChange={(val) => setNetTargetId(val || '')}>
                            <SelectTrigger className="h-10 rounded-lg">
                              <SelectValue>{selectedNetTargetAccountName}</SelectValue>
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
                      )}
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
          </div>
        ) : (
          /* Standard Transaction Form */
          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
            {(type === 'invoice_out' || type === 'invoice_in') && (
              <div className="p-4 bg-primary/5 border border-dashed border-primary/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Fatura Belgesi Yükle (PDF / Görsel ile Otomatik Doldur)</span>
                  </div>
                  {invoiceParsing && <span className="text-xs text-primary font-medium animate-pulse">AI Analiz Ediyor...</span>}
                </div>
                <Input 
                  type="file" 
                  accept=".pdf,image/*" 
                  onChange={handleInvoiceUpload}
                  disabled={invoiceParsing}
                  className="text-xs cursor-pointer h-9 rounded-xl bg-background"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {type !== 'safe_transfer' && type !== 'salary_payment' && (
                <div className="space-y-2">
                  <Label htmlFor="account_id">Cari Hesap (Kişi/Firma)</Label>
                  <Select name="account_id" required value={accountId} onValueChange={(val) => setAccountId(val || '')}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue>{selectedAccountName}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.company_name || acc.name} {acc.company_name ? `(${acc.name})` : ''}
                        </SelectItem>
                      ))}
                      {accounts.length === 0 && (
                        <SelectItem value="none" disabled>Kayıtlı cari bulunamadı</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {type === 'salary_payment' && (
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Personel Seçin</Label>
                  <Select name="employee_id" required value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue>{selectedEmployeeName}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                      {employees.length === 0 && (
                        <SelectItem value="none" disabled>Kayıtlı personel bulunamadı</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="safe_id">{type === 'safe_transfer' ? 'Gönderen Kasa/Banka' : 'Hangi Kasadan/Kasaya?'}</Label>
                <Select name="safe_id" required value={safeId} onValueChange={(val) => setSafeId(val || '')}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue>{selectedSafeName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    {safes.map(safe => (
                      <SelectItem key={safe.id} value={safe.id}>
                        {safe.name}
                      </SelectItem>
                    ))}
                    {safes.length === 0 && (
                      <SelectItem value="none" disabled>Kasa bulunamadı</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {type === 'safe_transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="to_safe_id">Alan Kasa/Banka</Label>
                  <Select name="to_safe_id" required value={toSafeId} onValueChange={(val) => setToSafeId(val || '')}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue>{selectedToSafeName}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {safes.map(safe => (
                        <SelectItem key={safe.id} value={safe.id}>
                          {safe.name}
                        </SelectItem>
                      ))}
                      {safes.length === 0 && (
                        <SelectItem value="none" disabled>Kasa bulunamadı</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Tutar (TL)</Label>
                <MoneyInput 
                  name="amount" 
                  value={amount}
                  onChange={setAmount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction_date">Tarih</Label>
                <Input 
                  id="transaction_date" 
                  name="transaction_date" 
                  type="date" 
                  required 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {(type === 'invoice_in' || type === 'invoice_out') && (
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Fatura Numarası (İsteğe bağlı)</Label>
                <Input 
                  id="invoice_number" 
                  name="invoice_number" 
                  className="h-12 rounded-xl uppercase"
                  placeholder="Örn: ABC2024000000123" 
                />
              </div>
            )}

            {(type === 'payment_out' || type === 'payment_in' || type === 'safe_transfer') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Ödeme Şekli</Label>
                  <Select name="payment_method" value={paymentMethod} onValueChange={(val) => { if (val) setPaymentMethod(val) }}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue>{paymentMethod}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {paymentMethod === 'Havale/EFT' && (
                  <div className="space-y-2">
                    <Label htmlFor="bank_detail">Banka Adı / Detayı (İsteğe bağlı)</Label>
                    <Input 
                      id="bank_detail" 
                      name="bank_detail" 
                      className="h-12 rounded-xl"
                      placeholder="Örn: Ziraat, Garanti..." 
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (İsteğe bağlı)</Label>
              <Textarea 
                id="description" 
                name="description" 
                className="resize-none rounded-xl"
                placeholder="Örn: Nisan ayı taksidi, Kömür alımı vb."
              />
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          {loading ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
        </Button>
      </form>
    </div>
  )
}
