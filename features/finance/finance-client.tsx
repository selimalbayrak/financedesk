'use client'

import React, { useState, useTransition } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, Landmark, Plus, Printer, Trash2, Building, Check, Loader2, X, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  payLoanInstallment, 
  unpayLoanInstallment, 
  createFactoryExpense, 
  payFactoryExpense, 
  payRecurringFactoryExpense,
  deleteFactoryExpense 
} from './actions'
import { ChequeCashModal } from './cheque-cash-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu'

interface FinanceClientProps {
  cheques: any[]
  loans: any[]
  installments: any[]
  safes: any[]
  accounts: any[]
  expenses: any[]
  companyName?: string
}

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  Rent: 'Kira',
  Electricity: 'Elektrik Faturası',
  Water: 'Su Faturası',
  Gas: 'Doğalgaz Faturası',
  Internet: 'İnternet Faturası',
  Maintenance: 'Bina/Site Aidatı',
  Other: 'Diğer Fabrika Gideri'
}

export function FinanceClient({ cheques, loans, installments, safes, accounts, expenses, companyName }: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState('cheques')
  const [isPending, startTransition] = useTransition()
  
  // Cheque Cash Modal States
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<any>(null)

  // Factory Expense Dialog States
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseType, setExpenseType] = useState('Electricity')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDueDate, setExpenseDueDate] = useState(new Date().toISOString().split('T')[0])
  const [expenseDescription, setExpenseDescription] = useState('')

  // Recurring expense fields
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState('10')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [attachmentUrl, setAttachmentUrl] = useState('')

  // Utility to calculate unpaid months for recurring expense
  const getRecurringUnpaidMonths = (startDateStr: string, recurrenceDayVal: number, monthsPaidVal: number) => {
    if (!startDateStr) return 0
    const start = new Date(startDateStr)
    const today = new Date()
    
    let yearDiff = today.getFullYear() - start.getFullYear()
    let monthDiff = today.getMonth() - start.getMonth()
    let totalMonths = yearDiff * 12 + monthDiff + 1 // start month is due
    
    if (today.getDate() < recurrenceDayVal) {
      totalMonths -= 1
    }
    
    return Math.max(0, totalMonths - (monthsPaidVal || 0))
  }

  const handlePay = async (installmentId: string, safeId: string) => {
    try {
      const res = await payLoanInstallment(installmentId, safeId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Taksit başarıyla ödendi ve kasa hareketi oluşturuldu!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Ödeme yapılamadı')
    }
  }

  const handleUnpay = async (installmentId: string) => {
    try {
      const res = await unpayLoanInstallment(installmentId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Ödeme başarıyla geri alındı, kasa hareketi silindi!')
      }
    } catch (e: any) {
      toast.error(e.message || 'İşlem geri alınamadı')
    }
  }

  // Factory Expense Actions
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast.error('Lütfen geçerli bir gider tutarı girin.')
      return
    }

    startTransition(async () => {
      const res = await createFactoryExpense({
        expense_type: expenseType,
        amount: isRecurring ? 0 : Math.round(parseFloat(expenseAmount) * 100), // convert to cents
        due_date: isRecurring ? undefined : expenseDueDate,
        description: expenseDescription,
        is_recurring: isRecurring,
        recurrence_day: isRecurring ? parseInt(recurrenceDay) : undefined,
        start_date: isRecurring ? startDate : undefined,
        monthly_amount: isRecurring ? Math.round(parseFloat(expenseAmount) * 100) : undefined,
        attachment_url: isRecurring ? undefined : attachmentUrl
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Gider başarıyla eklendi!')
        setExpenseAmount('')
        setExpenseDescription('')
        setAttachmentUrl('')
        setIsRecurring(false)
        setShowExpenseModal(false)
      }
    })
  }

  const handlePayExpense = async (expenseId: string, safeId: string) => {
    try {
      const res = await payFactoryExpense(expenseId, safeId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Gider başarıyla ödendi işaretlendi ve kasadan düşüldü!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Ödeme işlemi başarısız.')
    }
  }

  const handlePayExpenseRecurring = async (expenseId: string, safeId: string, months: number) => {
    try {
      const res = await payRecurringFactoryExpense(expenseId, safeId, months)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${months} aylık gider ödemesi yapıldı ve kasadan düşüldü!`)
      }
    } catch (e: any) {
      toast.error(e.message || 'Ödeme işlemi başarısız.')
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Bu gider kaydını silmek istediğinize emin misiniz?')) return

    try {
      const res = await deleteFactoryExpense(expenseId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Gider kaydı başarıyla silindi!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Silme işlemi başarısız.')
    }
  }

  // Live calculation of totals
  let totalUnpaidExpenses = 0
  let totalPaidExpenses = 0

  expenses.forEach(e => {
    if (e.is_recurring) {
      const unpaidMonths = getRecurringUnpaidMonths(e.start_date, e.recurrence_day, e.months_paid)
      const monthlyAmt = e.monthly_amount || e.amount
      totalUnpaidExpenses += unpaidMonths * monthlyAmt
      totalPaidExpenses += (e.months_paid || 0) * monthlyAmt
    } else {
      if (e.status === 'paid') {
        totalPaidExpenses += e.amount
      } else {
        totalUnpaidExpenses += e.amount
      }
    }
  })

  return (
    <div className="space-y-6 pb-24 animate-in-up">
      {/* Screen layout */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Finansman"
            description="Çek, senet, kredi ve fabrika giderleri takibi"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl h-9">
              <Printer className="w-4 h-4 mr-2" />
              Rapor Yazdır
            </Button>
            {activeTab === 'expenses' ? (
              <Button size="sm" onClick={() => setShowExpenseModal(true)} className="rounded-xl h-9">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Gider Ekle
              </Button>
            ) : (
              <Link href={activeTab === 'cheques' ? '/finance/cheques/new' : '/finance/loans/new'}>
                <Button size="sm" className="rounded-xl h-9">
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'cheques' ? 'Yeni Çek/Senet' : 'Yeni Kredi'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-14 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="cheques" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CreditCard className="w-4 h-4 mr-2" />
              Çek ve Senetler
            </TabsTrigger>
            <TabsTrigger value="loans" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Landmark className="w-4 h-4 mr-2" />
              Banka Kredileri
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building className="w-4 h-4 mr-2" />
              Fabrika Giderleri
            </TabsTrigger>
          </TabsList>

          {/* Cheques Tab */}
          <TabsContent value="cheques" className="mt-6 space-y-4">
            {cheques.length === 0 ? (
              <Card className="border-dashed bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                  <p>Henüz çek veya senet eklenmemiş</p>
                  <Link href="/finance/cheques/new">
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      İlk Çek/Senedi Ekle
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cheques.map(cheque => (
                  <Card key={cheque.id} className="shadow-sm flex flex-col justify-between">
                    <div>
                      <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span>{cheque.type === 'cheque' ? 'Çek' : 'Senet'} ({cheque.direction === 'in' ? 'Alınan' : 'Verilen'})</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            cheque.status === 'portfolio' ? 'bg-amber-100 text-amber-700' :
                            cheque.status === 'cashed' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {cheque.status === 'portfolio' ? 'Portföyde' :
                             cheque.status === 'cashed' ? 'Tahsil Edildi' : cheque.status}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Tutar:</span>
                          <span className="font-bold text-lg">{formatCurrency(cheque.amount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Muhatap:</span>
                          <span className="font-medium">{cheque.contact_name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Vade Tarihi:</span>
                          <span className="font-medium text-rose-600">{formatDate(cheque.due_date)}</span>
                        </div>
                      </CardContent>
                    </div>
                    {cheque.status === 'portfolio' && (
                      <div className="p-4 pt-0 border-t mt-auto flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCheque(cheque)
                            setCashModalOpen(true)
                          }}
                          className="h-8 text-xs rounded-xl mt-3 cursor-pointer w-full text-primary hover:bg-primary/5"
                        >
                          {cheque.direction === 'in' ? 'Tahsil Et (Nakit Girişi / Kırdır)' : 'Ödendi İşaretle (Kasadan Düş)'}
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans" className="mt-6 space-y-4">
            {loans.length === 0 ? (
              <Card className="border-dashed bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Landmark className="w-12 h-12 mb-4 opacity-20" />
                  <p>Henüz aktif bir kredi bulunmuyor</p>
                  <Link href="/finance/loans/new">
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Kredi Ekle
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {loans.map(loan => {
                  const loanInstallments = installments.filter(i => i.loan_id === loan.id).sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                  const paidCount = loanInstallments.filter(i => i.status === 'paid').length
                  
                  return (
                    <Card key={loan.id} className="shadow-sm overflow-hidden border-primary/20">
                      <CardHeader className="bg-primary/5 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                              <Landmark className="w-5 h-5" />
                              {loan.bank_name} Kredisi
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDate(loan.start_date)} - {formatDate(loan.end_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black">{formatCurrency(loan.loan_amount)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Toplam Geri Ödeme: {formatCurrency(loan.total_repayment)}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="px-6 py-4 bg-muted/20 border-b flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">Aylık Taksit: </span>
                            <span className="font-bold">{formatCurrency(loan.monthly_installment)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ödenen Taksit: </span>
                            <span className="font-bold">{paidCount} / {loanInstallments.length}</span>
                          </div>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="pb-2 font-medium">Vade</th>
                                <th className="pb-2 font-medium text-right">Tutar</th>
                                <th className="pb-2 font-medium text-center">Durum</th>
                                <th className="pb-2 font-medium text-right">İşlem</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {loanInstallments.map((inst, index) => (
                                <tr key={inst.id} className="group hover:bg-muted/30 transition-colors">
                                  <td className="py-3">
                                    <span className="font-medium">{index + 1}. Taksit</span>
                                    <div className="text-xs text-muted-foreground">{formatDate(inst.due_date)}</div>
                                  </td>
                                  <td className="py-3 text-right font-medium">{formatCurrency(inst.amount_due)}</td>
                                  <td className="py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      inst.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                      inst.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>
                                      {inst.status === 'paid' ? 'Ödendi' : inst.status === 'late' ? 'Gecikti' : 'Bekliyor'}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    {inst.status === 'paid' ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleUnpay(inst.id)}
                                        className="h-7 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                                      >
                                        Geri Al
                                      </Button>
                                    ) : (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2.5 cursor-pointer">
                                          Öde
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-card border">
                                          <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold border-b">
                                            Ödenecek Kasa/Banka:
                                          </div>
                                          {safes.map(safe => (
                                            <DropdownMenuItem key={safe.id} onClick={() => handlePay(inst.id, safe.id)} className="cursor-pointer">
                                              {safe.name} ile Öde
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Factory Expenses Tab */}
          <TabsContent value="expenses" className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-rose-50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Ödenecek Toplam Gider</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatCurrency(totalUnpaidExpenses)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Ödenen Toplam Gider</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(totalPaidExpenses)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {expenses.length === 0 ? (
              <Card className="border-dashed bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Building className="w-12 h-12 mb-4 opacity-20" />
                  <p>Henüz fabrika gideri eklenmemiş</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowExpenseModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Gideri Ekle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3 font-medium">Gider Türü</th>
                        <th className="px-4 py-3 font-medium text-right">Tutar</th>
                        <th className="px-4 py-3 font-medium">Vade / Ödeme Günü</th>
                        <th className="px-4 py-3 font-medium">Durum</th>
                        <th className="px-4 py-3 font-medium">Ödeme Detayı</th>
                        <th className="px-4 py-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {expenses.map((exp) => {
                        const isRec = exp.is_recurring
                        const unpaidMonths = isRec ? getRecurringUnpaidMonths(exp.start_date, exp.recurrence_day, exp.months_paid) : 0
                        const monthlyAmt = exp.monthly_amount || exp.amount

                        return (
                          <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-semibold">
                              <div className="flex items-center gap-1.5">
                                <span>{EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type}</span>
                                {isRec && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                    Düzenli Gider
                                  </span>
                                )}
                                {exp.attachment_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground"
                                    onClick={() => alert(`Ekli Fatura Belgesi: ${exp.attachment_url}`)}
                                    title="Fatura Ekini Görüntüle"
                                  >
                                    <Paperclip className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              {exp.description && (
                                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{exp.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums">
                              {isRec 
                                ? `${formatCurrency(monthlyAmt)} / Ay` 
                                : formatCurrency(exp.amount)
                              }
                            </td>
                            <td className="px-4 py-3 text-rose-600 font-medium whitespace-nowrap">
                              {isRec 
                                ? `Her ayın ${exp.recurrence_day}'u` 
                                : formatDate(exp.due_date)
                              }
                            </td>
                            <td className="px-4 py-3">
                              {isRec ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  unpaidMonths > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {unpaidMonths > 0 ? `${unpaidMonths} Aylık Borç Birikti` : 'Ödendi'}
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  exp.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {exp.status === 'paid' ? 'Ödendi' : 'Bekliyor'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {isRec ? (
                                <span>Toplam {exp.months_paid || 0} ay ödendi.</span>
                              ) : (
                                exp.status === 'paid' ? (
                                  <span>
                                    {formatDate(exp.paid_date)} tarihinde {safes.find(s => s.id === exp.safe_id)?.name || 'Kasa'} kasasından ödendi.
                                  </span>
                                ) : (
                                  '—'
                                )
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isRec ? (
                                  unpaidMonths > 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                                        Öde
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56 bg-card border">
                                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold border-b">
                                          Ödenecek Ay Sayısı Seçin:
                                        </div>
                                        {Array.from({ length: unpaidMonths }, (_, i) => i + 1).map(months => (
                                          <DropdownMenuSub key={months}>
                                            <DropdownMenuSubTrigger className="cursor-pointer">
                                              {months} Aylık Öde ({formatCurrency(monthlyAmt * months)})
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                              <DropdownMenuSubContent className="bg-card border">
                                                {safes.map(safe => (
                                                  <DropdownMenuItem key={safe.id} onClick={() => handlePayExpenseRecurring(exp.id, safe.id, months)} className="cursor-pointer">
                                                    {safe.name} ile Öde
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                          </DropdownMenuSub>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )
                                ) : (
                                  exp.status === 'unpaid' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                                        Öde
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 bg-card border">
                                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold border-b">
                                          Giderin Ödeneceği Kasa:
                                        </div>
                                        {safes.map(safe => (
                                          <DropdownMenuItem key={safe.id} onClick={() => handlePayExpense(exp.id, safe.id)} className="cursor-pointer">
                                            {safe.name} ile Öde
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-Only Financial Status Report (Finansal Durum Raporu) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans w-full space-y-8">
        <div className="text-center border-b-2 border-black pb-4">
          <h2 className="text-2xl font-bold uppercase">{companyName || 'ŞİRKETİMİZ'}</h2>
          <p className="text-lg font-semibold tracking-wide text-gray-700">FİNANSAL DURUM VE VADELİ BORÇ/ALACAK RAPORU</p>
          <p className="text-xs text-gray-500 mt-1">Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Cheques section in Print */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold border-b pb-1 uppercase">1. Portföydeki Çek ve Senetler</h3>
          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-gray-400 px-2 py-1.5 text-left">Tür</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Muhatap</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Vade Tarihi</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Tutar</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center">Durum</th>
              </tr>
            </thead>
            <tbody>
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-400 text-center py-2 text-gray-500">Çek/senet kaydı bulunmuyor.</td>
                </tr>
              ) : (
                cheques.map(c => (
                  <tr key={c.id}>
                    <td className="border border-gray-400 px-2 py-1">{c.type === 'cheque' ? 'Çek' : 'Senet'} ({c.direction === 'in' ? 'Alınan' : 'Verilen'})</td>
                    <td className="border border-gray-400 px-2 py-1">{c.contact_name}</td>
                    <td className="border border-gray-400 px-2 py-1">{formatDate(c.due_date)}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right font-semibold">{formatCurrency(c.amount)}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">{c.status === 'portfolio' ? 'Portföyde' : 'Tahsil Edildi'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bank Loans section in Print */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold border-b pb-1 uppercase">2. Banka Kredileri Durumu</h3>
          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-gray-400 px-2 py-1.5 text-left">Banka Adı</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Vade Dönemi</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Kredi Tutarı</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Toplam Geri Ödeme</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center">Ödenen / Toplam Taksit</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-400 text-center py-2 text-gray-500">Kredi kaydı bulunmuyor.</td>
                </tr>
              ) : (
                loans.map(loan => {
                  const loanInstallments = installments.filter(i => i.loan_id === loan.id)
                  const paidCount = loanInstallments.filter(i => i.status === 'paid').length
                  return (
                    <tr key={loan.id}>
                      <td className="border border-gray-400 px-2 py-1 font-semibold">{loan.bank_name}</td>
                      <td className="border border-gray-400 px-2 py-1">{formatDate(loan.start_date)} - {formatDate(loan.end_date)}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{formatCurrency(loan.loan_amount)}</td>
                      <td className="border border-gray-400 px-2 py-1 text-right font-semibold">{formatCurrency(loan.total_repayment)}</td>
                      <td className="border border-gray-400 px-2 py-1 text-center">{paidCount} / {loanInstallments.length}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Factory Expenses section in Print */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold border-b pb-1 uppercase">3. Fabrika Giderleri Durumu</h3>
          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-gray-400 px-2 py-1.5 text-left">Gider Türü</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Son Ödeme Tarihi</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Tutar</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center">Durum</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Ödeme Detayı</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-400 text-center py-2 text-gray-500">Gider kaydı bulunmuyor.</td>
                </tr>
              ) : (
                expenses.map(exp => {
                  const isRec = exp.is_recurring
                  const unpaidMonths = isRec ? getRecurringUnpaidMonths(exp.start_date, exp.recurrence_day, exp.months_paid) : 0
                  const amountText = isRec 
                    ? `Aylık ${formatCurrency(exp.monthly_amount || exp.amount)}` 
                    : formatCurrency(exp.amount)
                  const dateText = isRec 
                    ? `Her ayın ${exp.recurrence_day}'u` 
                    : formatDate(exp.due_date)
                  const statusText = isRec
                    ? (unpaidMonths > 0 ? `${unpaidMonths} Aylık Borç Birikti` : 'Ödendi')
                    : (exp.status === 'paid' ? 'Ödendi' : 'Bekliyor')
                  const detailText = isRec
                    ? `Toplam ${exp.months_paid || 0} ay ödendi.`
                    : (exp.status === 'paid' ? `${formatDate(exp.paid_date)} tarihinde kasadan ödendi.` : '—')

                  return (
                    <tr key={exp.id}>
                      <td className="border border-gray-400 px-2 py-1 font-semibold">
                        {EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type}
                        {isRec && ' (Düzenli)'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">{amountText}</td>
                      <td className="border border-gray-400 px-2 py-1">{dateText}</td>
                      <td className="border border-gray-400 px-2 py-1 text-center">{statusText}</td>
                      <td className="border border-gray-400 px-2 py-1 text-xs text-gray-600">{detailText}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Factory Expense Dialog */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
          <form onSubmit={handleCreateExpense} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Building className="w-5 h-5" />
                Fabrika Gideri Ekle
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowExpenseModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Gider Türü</Label>
                <Select value={expenseType} onValueChange={(val) => setExpenseType(val || 'Other')}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue>
                      {EXPENSE_TYPE_LABELS[expenseType] || expenseType}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    <SelectItem value="Rent">Kira</SelectItem>
                    <SelectItem value="Electricity">Elektrik Faturası</SelectItem>
                    <SelectItem value="Water">Su Faturası</SelectItem>
                    <SelectItem value="Gas">Doğalgaz Faturası</SelectItem>
                    <SelectItem value="Internet">İnternet Faturası</SelectItem>
                    <SelectItem value="Maintenance">Aidat / Bakım</SelectItem>
                    <SelectItem value="Other">Diğer Giderler</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Checkbox for Recurring Gider */}
              <div className="flex items-center gap-2 py-1">
                <input 
                  type="checkbox" 
                  id="isRecurring" 
                  checked={isRecurring} 
                  onChange={(e) => setIsRecurring(e.target.checked)} 
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="isRecurring" className="cursor-pointer font-medium text-xs">
                  Aylık Düzenli Tekrarlanan Gider (Kira vb.)
                </Label>
              </div>

              {isRecurring ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="recurrenceDay" className="text-xs">Her Ayın Günü</Label>
                      <Input 
                        type="number" 
                        min="1"
                        max="31"
                        id="recurrenceDay"
                        value={recurrenceDay}
                        onChange={(e) => setRecurrenceDay(e.target.value)}
                        placeholder="10"
                        className="h-10 rounded-lg"
                        required={isRecurring}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="startDate" className="text-xs">Başlangıç Tarihi</Label>
                      <Input 
                        type="date" 
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-10 rounded-lg"
                        required={isRecurring}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="monthlyAmount" className="text-xs">Aylık Sabit Tutar (TL)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      id="monthlyAmount"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0,00"
                      className="h-10 rounded-lg"
                      required={isRecurring}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="expenseAmount" className="text-xs">Tutar (TL)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      id="expenseAmount"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0,00"
                      className="h-10 rounded-lg"
                      required={!isRecurring}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expenseDueDate" className="text-xs">Son Ödeme Tarihi</Label>
                    <Input 
                      type="date" 
                      id="expenseDueDate"
                      value={expenseDueDate}
                      onChange={(e) => setExpenseDueDate(e.target.value)}
                      className="h-10 rounded-lg"
                      required={!isRecurring}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expenseFile" className="text-xs">Fatura Belgesi (İsteğe Bağlı PDF/Görsel)</Label>
                    <Input 
                      type="file" 
                      id="expenseFile" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setAttachmentUrl(file.name)
                        }
                      }}
                      className="h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label htmlFor="expenseDesc" className="text-xs">Açıklama</Label>
                <Input 
                  type="text" 
                  id="expenseDesc"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder={isRecurring ? "örn: Fabrika Dükkan Kirası" : "örn: Temmuz 2026 Elektrik"}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowExpenseModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                {isPending ? 'Kaydediliyor...' : 'Gideri Ekle'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Cheque Cash Modal */}
      <ChequeCashModal
        isOpen={cashModalOpen}
        onClose={() => setCashModalOpen(false)}
        cheque={selectedCheque}
        safes={safes}
        accounts={accounts}
      />
    </div>
  )
}
