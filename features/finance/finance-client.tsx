'use client'

import React, { useState, useTransition } from 'react'
import { CreditCardCalendar } from './credit-card-calendar'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Building, MoreHorizontal, Pencil, Trash2, X, FileText, ChevronDown, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, Upload, CreditCard, Search, Landmark, Printer, Check, Loader2, Paperclip, Calendar, ArrowRightLeft, MoreVertical } from 'lucide-react'
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
  deleteFactoryExpense,
  createCreditCard,
  deleteCreditCard,
  payCreditCardDebt,
  importCreditCardTransactions,
  deleteChequeNote,
  updateChequeNote,
  transferChequeNote
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
  creditCards?: any[]
  cardTransactions?: any[]
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

export function FinanceClient({ cheques, loans, installments, safes, accounts, expenses, creditCards = [], cardTransactions = [], companyName }: FinanceClientProps) {
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

  // Credit Card Dialog States
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardType, setCardType] = useState<'personal' | 'company'>('company')
  const [cardBankName, setCardBankName] = useState('')
  const [cardLimit, setCardLimit] = useState('')
  const [cardCutoffDay, setCardCutoffDay] = useState('15')
  const [cardDueDay, setCardDueDay] = useState('25')
  const [cardMinPaymentRatio, setCardMinPaymentRatio] = useState('40')

  // Card Payment States
  const [showPayCardModal, setShowPayCardModal] = useState(false)
  const [selectedPayCard, setSelectedPayCard] = useState<any>(null)
  const [payCardSafeId, setPayCardSafeId] = useState('')
  const [payCardAmount, setPayCardAmount] = useState('')

  // Card Statement Upload States
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedUploadCard, setSelectedUploadCard] = useState<any>(null)
  const [uploadFiles, setUploadFiles] = useState<File[] | null>(null)
  const [parsedCardTx, setParsedCardTx] = useState<any[] | null>(null)
  const [extractedCardLimit, setExtractedCardLimit] = useState<number | null>(null)
  const [extractedCardDebt, setExtractedCardDebt] = useState<number | null>(null)
  const [parsingLoading, setParsingLoading] = useState(false)

  // CC Search and Print States
  const [ccSearchQuery, setCcSearchQuery] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printSection, setPrintSection] = useState<'all' | 'cheques' | 'loans' | 'cards' | 'expenses'>('all')

  // Selected Card Details view
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  // Cheque Edit States
  const [showEditChequeModal, setShowEditChequeModal] = useState(false)
  const [selectedEditCheque, setSelectedEditCheque] = useState<any>(null)
  const [editChequeType, setEditChequeType] = useState<'cheque' | 'promissory_note'>('cheque')
  const [editChequeDirection, setEditChequeDirection] = useState<'in' | 'out'>('in')
  const [editChequeAmount, setEditChequeAmount] = useState('')
  const [editChequeIssueDate, setEditChequeIssueDate] = useState('')
  const [editChequeDueDate, setEditChequeDueDate] = useState('')
  const [editChequeContactName, setEditChequeContactName] = useState('')
  const [editChequeAccountId, setEditChequeAccountId] = useState('')
  const [editChequeBankName, setEditChequeBankName] = useState('')
  const [editChequeDocNum, setEditChequeDocNum] = useState('')
  const [editChequeNotes, setEditChequeNotes] = useState('')
  const [editChequeStatus, setEditChequeStatus] = useState<any>('portfolio')

  // Cheque Ciro/Transfer States
  const [showCiroModal, setShowCiroModal] = useState(false)
  const [selectedCiroCheque, setSelectedCiroCheque] = useState<any>(null)
  const [ciroAccountId, setCiroAccountId] = useState('')

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

  // Credit Card Actions
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardLimit || parseFloat(cardLimit) <= 0) {
      toast.error('Lütfen geçerli bir limit girin.')
      return
    }

    startTransition(async () => {
      const res = await createCreditCard({
        card_name: cardName,
        card_type: cardType,
        bank_name: cardBankName,
        limit_amount: Math.round(parseFloat(cardLimit) * 100),
        cutoff_day: parseInt(cardCutoffDay),
        due_day: parseInt(cardDueDay),
        min_payment_ratio: parseInt(cardMinPaymentRatio)
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kredi kartı başarıyla tanımlandı!')
        setCardName('')
        setCardBankName('')
        setCardLimit('')
        setCardMinPaymentRatio('40')
        setShowCardModal(false)
      }
    })
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Bu kredi kartını ve tüm kart hareketlerini silmek istediğinize emin misiniz?')) return

    try {
      const res = await deleteCreditCard(cardId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kredi kartı silindi!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Silme işlemi başarısız.')
    }
  }

  const handlePayCardDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payCardAmount || parseFloat(payCardAmount) <= 0 || !payCardSafeId) {
      toast.error('Lütfen geçerli kasa ve tutar girin.')
      return
    }

    startTransition(async () => {
      const res = await payCreditCardDebt(
        selectedPayCard.id,
        payCardSafeId,
        Math.round(parseFloat(payCardAmount) * 100)
      )

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Ödeme işlemi başarıyla tamamlandı, kasa ve kart bakiye hareketleri işlendi!')
        setPayCardAmount('')
        setShowPayCardModal(false)
      }
    })
  }

  // Cheque Actions
  const handleDeleteCheque = async (chequeId: string) => {
    if (!confirm('Bu çek/senet kaydını silmek istediğinize emin misiniz?')) return

    try {
      const res = await deleteChequeNote(chequeId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Çek/Senet kaydı silindi!')
      }
    } catch (e: any) {
      toast.error(e.message || 'Silme işlemi başarısız.')
    }
  }

  const handleOpenEditCheque = (cheque: any) => {
    setSelectedEditCheque(cheque)
    setEditChequeType(cheque.type)
    setEditChequeDirection(cheque.direction)
    setEditChequeAmount((cheque.amount / 100).toString())
    setEditChequeIssueDate(cheque.issue_date)
    setEditChequeDueDate(cheque.due_date)
    setEditChequeContactName(cheque.contact_name)
    setEditChequeAccountId(cheque.account_id || '')
    setEditChequeBankName(cheque.bank_name || '')
    setEditChequeDocNum(cheque.document_number || '')
    setEditChequeNotes(cheque.notes || '')
    setEditChequeStatus(cheque.status)
    setShowEditChequeModal(true)
  }

  const handleUpdateChequeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEditCheque) return
    if (!editChequeAmount || parseFloat(editChequeAmount) <= 0) {
      toast.error('Lütfen geçerli bir tutar girin.')
      return
    }

    startTransition(async () => {
      const res = await updateChequeNote(selectedEditCheque.id, {
        type: editChequeType,
        direction: editChequeDirection,
        amount: Math.round(parseFloat(editChequeAmount) * 100),
        issue_date: editChequeIssueDate,
        due_date: editChequeDueDate,
        contact_name: editChequeContactName,
        account_id: editChequeAccountId || undefined,
        bank_name: editChequeBankName || undefined,
        document_number: editChequeDocNum || undefined,
        notes: editChequeNotes || undefined,
        status: editChequeStatus
      })

      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Çek/Senet kaydı güncellendi!')
        setShowEditChequeModal(false)
      }
    })
  }

  const handleOpenCiro = (cheque: any) => {
    setSelectedCiroCheque(cheque)
    if (accounts.length > 0) {
      setCiroAccountId(accounts[0].id)
    }
    setShowCiroModal(true)
  }

  const handleCiroSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCiroCheque || !ciroAccountId) return

    startTransition(async () => {
      const res = await transferChequeNote(selectedCiroCheque.id, ciroAccountId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Çek başarıyla ciro edildi ve cari hesap hareketi kaydedildi!')
        setShowCiroModal(false)
      }
    })
  }

  const handleUploadCCStatement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFiles || uploadFiles.length === 0 || !selectedUploadCard) {
      toast.error('Lütfen en az bir ekstre dosyası seçin.')
      return
    }

    setParsingLoading(true)
    const formData = new FormData()
    uploadFiles.forEach(file => {
      formData.append('file', file)
    })

    try {
      const res = await fetch('/api/parse-cc-statement', {
        method: 'POST',
        body: formData,
      })

      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()

      if (!res.ok || !contentType.includes('application/json')) {
        if (text.includes('<html') || !contentType.includes('application/json')) {
          if (res.status === 504) toast.error('Zaman aşımı (504): Ekstreler çok büyük veya karmaşık. Lütfen tek seferde daha az sayfa yükleyin.')
          else if (res.status === 413) toast.error('Yüklenen dosya çok büyük (Limit: 4.5MB).')
          else toast.error(`Sunucu Hatası (${res.status}): Ekstre analiz edilirken sunucudan yanıt alınamadı.`)
          return
        }
        let jsonErr
        try { jsonErr = JSON.parse(text) } catch (_) {}
        toast.error(jsonErr?.error || `Ekstre çözümlenirken hata oluştu (${res.status})`)
        return
      }

      const data = JSON.parse(text)
      if (data.error) {
        toast.error(data.error)
      } else {
        setParsedCardTx(data.transactions || [])
        setExtractedCardLimit(data.extracted_limit || null)
        setExtractedCardDebt(data.extracted_debt || null)
        toast.success('Ekstreler başarıyla analiz edildi, önizleme aşağıda listeleniyor.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Analiz hatası.')
    } finally {
      setParsingLoading(false)
    }
  }

  const handleSaveCCStatement = async () => {
    if (!parsedCardTx || parsedCardTx.length === 0 || !selectedUploadCard) return

    startTransition(async () => {
      const res = await importCreditCardTransactions(
        selectedUploadCard.id, 
        parsedCardTx, 
        extractedCardLimit, 
        extractedCardDebt
      )
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kart hareketleri başarıyla aktarıldı ve kart limiti/borcu güncellendi!')
        setParsedCardTx(null)
        setExtractedCardLimit(null)
        setExtractedCardDebt(null)
        setUploadFiles(null)
        setShowUploadModal(false)
      }
    })
  }

  // Live calculation of expense totals
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

  // Live calculation of CC totals
  const totalLimit = creditCards.reduce((sum, c) => sum + c.limit_amount, 0)
  const totalDebt = creditCards.reduce((sum, c) => sum + c.current_debt, 0)
  const totalAvailableLimit = Math.max(0, totalLimit - totalDebt)

  // Upcoming credit card due & cutoff dates events
  const getUpcomingCardEvents = () => {
    const events: { date: Date; type: 'cutoff' | 'due'; cardName: string; bankName: string; formattedDate: string; daysLeft: number }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    creditCards.forEach(card => {
      // Cutoff day event
      let nextCutoff = new Date(today.getFullYear(), today.getMonth(), card.cutoff_day)
      if (nextCutoff.getTime() < today.getTime()) {
        nextCutoff = new Date(today.getFullYear(), today.getMonth() + 1, card.cutoff_day)
      }
      
      // Due day event
      let nextDue = new Date(today.getFullYear(), today.getMonth(), card.due_day)
      if (nextDue.getTime() < today.getTime()) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 1, card.due_day)
      }
      
      events.push({
        date: nextCutoff,
        type: 'cutoff',
        cardName: card.card_name,
        bankName: card.bank_name,
        formattedDate: nextCutoff.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        daysLeft: Math.ceil((nextCutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })

      events.push({
        date: nextDue,
        type: 'due',
        cardName: card.card_name,
        bankName: card.bank_name,
        formattedDate: nextDue.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        daysLeft: Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })
    })

    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const upcomingCardEvents = getUpcomingCardEvents()

  // Label resolvers
  const selectedPayCardSafeName = safes.find(s => s.id === payCardSafeId)?.name || 'Kasa/Banka seçin'

  return (
    <div className="space-y-6 pb-24 animate-in-up">
      {/* Screen layout */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Finansman"
            description="Çek, senet, kredi, kart ve fabrika giderleri takibi"
          />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
                <Printer className="w-4 h-4 mr-2" />
                Rapor Yazdır
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border w-56">
                <DropdownMenuItem onClick={() => { setPrintSection('all'); setTimeout(() => window.print(), 100) }} className="cursor-pointer font-medium">
                  📋 Toplu Finans Raporu (Tümü)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPrintSection('cheques'); setTimeout(() => window.print(), 100) }} className="cursor-pointer">
                  📄 1. Çek & Senet Raporu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPrintSection('loans'); setTimeout(() => window.print(), 100) }} className="cursor-pointer">
                  🏦 2. Banka Kredileri Raporu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPrintSection('cards'); setTimeout(() => window.print(), 100) }} className="cursor-pointer">
                  💳 3. Kredi Kartları Raporu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPrintSection('expenses'); setTimeout(() => window.print(), 100) }} className="cursor-pointer">
                  🏭 4. Fabrika Giderleri Raporu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {activeTab === 'expenses' ? (
              <Button size="sm" onClick={() => setShowExpenseModal(true)} className="rounded-xl h-9 cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Gider Ekle
              </Button>
            ) : activeTab === 'credit_cards' ? (
              <Button size="sm" onClick={() => setShowCardModal(true)} className="rounded-xl h-9 cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kart Ekle
              </Button>
            ) : (
              <Link href={activeTab === 'cheques' ? '/finance/cheques/new' : '/finance/loans/new'}>
                <Button size="sm" className="rounded-xl h-9 cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'cheques' ? 'Yeni Çek/Senet' : 'Yeni Kredi'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-14 rounded-2xl bg-muted/50 p-1">
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
            <TabsTrigger value="credit_cards" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CreditCard className="w-4 h-4 mr-2" />
              Kredi Kartları
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
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              cheque.status === 'portfolio' ? 'bg-amber-100 text-amber-700' :
                              cheque.status === 'cashed' ? 'bg-emerald-100 text-emerald-700' :
                              cheque.status === 'endorsed' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {cheque.status === 'portfolio' ? 'Portföyde' :
                               cheque.status === 'cashed' ? 'Tahsil Edildi' : 
                               cheque.status === 'endorsed' ? 'Ciro Edildi' : cheque.status}
                            </span>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-6 w-6 rounded-full cursor-pointer flex items-center justify-center hover:bg-muted">
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border">
                                <DropdownMenuItem onClick={() => handleOpenEditCheque(cheque)} className="cursor-pointer">
                                  <Pencil className="w-3.5 h-3.5 mr-2 text-primary" />
                                  Düzenle
                                </DropdownMenuItem>
                                {cheque.status === 'portfolio' && cheque.direction === 'in' && (
                                  <DropdownMenuItem onClick={() => handleOpenCiro(cheque)} className="cursor-pointer">
                                    <ArrowRightLeft className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                    Ciro Et (Devret)
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDeleteCheque(cheque.id)} className="cursor-pointer text-rose-600 focus:text-rose-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

          {/* Credit Cards Tab */}
          <TabsContent value="credit_cards" className="mt-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Toplam Kart Limiti</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatCurrency(totalLimit)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-rose-50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Toplam Kart Borcu</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatCurrency(totalDebt)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Kullanılabilir Limit</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(totalAvailableLimit)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Kredi Kartları Aylık Takvimi */}
            <CreditCardCalendar creditCards={creditCards} />

            {creditCards.length === 0 ? (
              <Card className="border-dashed bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                  <p>Henüz tanımlanmış kredi kartı bulunmuyor.</p>
                  <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => setShowCardModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Kredi Kartı Ekle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {creditCards.map(card => {
                  const isExpanded = expandedCardId === card.id
                  const cardTx = cardTransactions.filter(tx => tx.card_id === card.id)
                  
                  // Limit calculation
                  const avail = Math.max(0, card.limit_amount - card.current_debt)
                  const debtPercent = Math.min(100, Math.round((card.current_debt / card.limit_amount) * 100))

                  return (
                    <Card key={card.id} className="shadow-sm border-muted overflow-hidden">
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-background via-background to-muted/20">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase bg-primary/10 text-primary">
                              {card.card_type === 'personal' ? 'Bireysel Kart' : 'Şirket Kartı'}
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">{card.bank_name}</span>
                          </div>
                          <h3 className="font-extrabold text-lg text-foreground">{card.card_name}</h3>
                          
                          {/* Progress bar */}
                          <div className="space-y-1 max-w-sm">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Borç: {formatCurrency(card.current_debt)}</span>
                              <span>Limit: {formatCurrency(card.limit_amount)}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  debtPercent > 85 ? 'bg-rose-500' : debtPercent > 50 ? 'bg-amber-500' : 'bg-primary'
                                }`} 
                                style={{ width: `${debtPercent}%` }} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Middle Info */}
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2 text-xs md:text-right shrink-0">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Kullanılabilir Limit:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(avail)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Asgari Ödeme Tutarı (%{card.min_payment_ratio || 40}):</span>
                            <span className="font-bold text-rose-500">{formatCurrency(Math.round(card.current_debt * ((card.min_payment_ratio || 40) / 100)))}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Kesim / Son Ödeme Günü:</span>
                            <span className="font-medium">Her ayın {card.cutoff_day}'ü / {card.due_day}'si</span>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs rounded-xl cursor-pointer text-primary hover:bg-primary/5"
                            onClick={() => {
                              setSelectedPayCard(card)
                              setShowPayCardModal(true)
                            }}
                          >
                            Ödeme Yap
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs rounded-xl cursor-pointer"
                            onClick={() => {
                              setSelectedUploadCard(card)
                              setShowUploadModal(true)
                            }}
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Ekstre Yükle (PDF)
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs rounded-xl cursor-pointer"
                            onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                          >
                            {isExpanded ? 'Detayları Gizle' : 'Kart Hareketleri'}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteCard(card.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Collapsible card ledger details */}
                      {isExpanded && (
                        <div className="border-t bg-muted/10 p-4 space-y-3 animate-in-up">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-xs uppercase text-primary tracking-wide">Aylık Kart Hareketleri Ledger</p>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="İşlem ara..."
                                className="h-8 pl-8 text-xs w-64 rounded-xl"
                                value={ccSearchQuery}
                                onChange={(e) => setCcSearchQuery(e.target.value)}
                              />
                            </div>
                          </div>
                          {cardTx.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">Bu karta ait henüz bir hareket kaydı bulunmuyor. PDF Hesap ekstresi yükleyebilirsiniz.</p>
                          ) : (
                            <div className="space-y-4">
                              {Object.entries(
                                cardTx
                                  .filter(tx => (tx.description || '').toLowerCase().includes(ccSearchQuery.toLowerCase()))
                                  .reduce((acc, tx) => {
                                    const month = new Date(tx.transaction_date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
                                    if (!acc[month]) acc[month] = []
                                    acc[month].push(tx)
                                    return acc
                                  }, {} as Record<string, typeof cardTx>)
                              ).map(([month, txs]) => (
                                <div key={month} className="space-y-2">
                                  <h4 className="text-sm font-semibold text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-md inline-block">{month}</h4>
                                  <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-muted/40 uppercase font-semibold text-muted-foreground">
                                        <tr>
                                          <th className="px-4 py-2">Tarih</th>
                                          <th className="px-4 py-2">Açıklama</th>
                                          <th className="px-4 py-2 text-right">Tutar</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {/* @ts-ignore */}
                                        {(txs as any[]).map((tx: any) => {
                                          const isPayment = tx.amount < 0
                                          return (
                                            <tr key={tx.id} className="hover:bg-muted/30">
                                              <td className="px-4 py-2 font-medium whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                                              <td className="px-4 py-2">{tx.description}</td>
                                              <td className={`px-4 py-2 text-right font-semibold whitespace-nowrap flex items-center justify-end gap-1.5 ${
                                                isPayment ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                              }`}>
                                                {isPayment ? (
                                                  <>
                                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                                                    -{formatCurrency(Math.abs(tx.amount))} (Ödeme/İade)
                                                  </>
                                                ) : (
                                                  <>
                                                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                                                    {formatCurrency(tx.amount)} (Harcama)
                                                  </>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
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
        {(printSection === 'all' || printSection === 'cheques') && (
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
        )}

        {/* Bank Loans section in Print */}
        {(printSection === 'all' || printSection === 'loans') && (
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
        )}

        {/* Factory Expenses section in Print */}
        {(printSection === 'all' || printSection === 'expenses') && (
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
        )}

        {/* Credit Cards section in Print */}
        {(printSection === 'all' || printSection === 'cards') && (
          <div className="space-y-3">
          <h3 className="text-sm font-bold border-b pb-1 uppercase">4. Kredi Kartları Durumu</h3>
          <table className="w-full text-xs border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-gray-400 px-2 py-1.5 text-left">Kart Adı</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Banka</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Tür</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Limit</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Güncel Borç</th>
              </tr>
            </thead>
            <tbody>
              {creditCards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-400 text-center py-2 text-gray-500">Kredi kartı kaydı bulunmuyor.</td>
                </tr>
              ) : (
                creditCards.map(card => (
                  <tr key={card.id}>
                    <td className="border border-gray-400 px-2 py-1 font-semibold">{card.card_name}</td>
                    <td className="border border-gray-400 px-2 py-1">{card.bank_name}</td>
                    <td className="border border-gray-400 px-2 py-1">{card.card_type === 'personal' ? 'Bireysel' : 'Şirket'}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{formatCurrency(card.limit_amount)}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right font-semibold">{formatCurrency(card.current_debt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* New Factory Expense Dialog */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
          <form onSubmit={handleCreateExpense} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[90vh] overflow-y-auto">
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

      {/* New Credit Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowCardModal(false)} />
          <form onSubmit={handleCreateCard} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Yeni Kredi Kartı Ekle
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowCardModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cardName" className="text-xs">Kart Adı (Açıklama)</Label>
                <Input 
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="örn: Şirket Bonus Kartı, Bireysel Maximum"
                  className="h-10 rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cardBankName" className="text-xs">Banka Adı</Label>
                <Input 
                  id="cardBankName"
                  value={cardBankName}
                  onChange={(e) => setCardBankName(e.target.value)}
                  placeholder="örn: Yapı Kredi, Garanti BBVA"
                  className="h-10 rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kart Türü</Label>
                <Select value={cardType} onValueChange={(val: any) => setCardType(val)}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue>{cardType === 'personal' ? 'Bireysel Kredi Kartı' : 'Şirket Kredi Kartı'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    <SelectItem value="personal">Bireysel Kredi Kartı</SelectItem>
                    <SelectItem value="company">Şirket Kredi Kartı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cardLimit" className="text-xs">Limit (TL)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  id="cardLimit"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="cardCutoffDay" className="text-xs">Hesap Kesim Günü</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="31"
                    id="cardCutoffDay"
                    value={cardCutoffDay}
                    onChange={(e) => setCardCutoffDay(e.target.value)}
                    className="h-10 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cardDueDay" className="text-xs">Son Ödeme Günü</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="31"
                    id="cardDueDay"
                    value={cardDueDay}
                    onChange={(e) => setCardDueDay(e.target.value)}
                    className="h-10 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cardMinRatio" className="text-xs">Asgari Ödeme Oranı (%)</Label>
                <Input 
                  type="number"
                  min="1"
                  max="100"
                  id="cardMinRatio"
                  value={cardMinPaymentRatio}
                  onChange={(e) => setCardMinPaymentRatio(e.target.value)}
                  className="h-10 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowCardModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                {isPending ? 'Kaydediliyor...' : 'Kartı Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Credit Card Payment Modal */}
      {showPayCardModal && selectedPayCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowPayCardModal(false)} />
          <form onSubmit={handlePayCardDebt} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" />
                Borç Ödeme Girişi
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowPayCardModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Kart: <span className="font-bold text-foreground">{selectedPayCard.bank_name} - {selectedPayCard.card_name}</span><br />
              Güncel Borç: <span className="font-bold text-rose-500">{formatCurrency(selectedPayCard.current_debt)}</span>
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Ödemenin Çıkacağı Kasa / Banka</Label>
                <Select value={payCardSafeId} onValueChange={(val) => setPayCardSafeId(val || '')} required>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue>{selectedPayCardSafeName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    {safes.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="payCardAmount" className="text-xs">Ödeme Tutarı (TL)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  id="payCardAmount"
                  value={payCardAmount}
                  onChange={(e) => setPayCardAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowPayCardModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                {isPending ? 'Ödeniyor...' : 'Ödemeyi Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Credit Card PDF Statement Upload Modal */}
      {showUploadModal && selectedUploadCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => {
            if (!parsingLoading && !isPending) {
              setParsedCardTx(null)
              setUploadFiles(null)
              setShowUploadModal(false)
            }
          }} />
          <div className="relative bg-card border w-full max-w-lg p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Ekstre Analiz ve Yükleme
              </h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                disabled={parsingLoading || isPending}
                onClick={() => {
                  setParsedCardTx(null)
                  setUploadFiles(null)
                  setShowUploadModal(false)
                }} 
                className="rounded-full h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Kart: <span className="font-bold text-foreground">{selectedUploadCard.bank_name} - {selectedUploadCard.card_name}</span>
            </p>

            {!parsedCardTx ? (
              <form onSubmit={handleUploadCCStatement} className="space-y-4 text-left">
                <div className="space-y-1">
                  <Label htmlFor="ccFile" className="text-xs font-semibold">Hesap Ekstresi Seçin (PDF, Excel, CSV, Resim, Metin)</Label>
                  <Input 
                    type="file" 
                    id="ccFile" 
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain,image/*"
                    multiple={true}
                    onChange={(e) => {
                      if (e.target.files) {
                        setUploadFiles(Array.from(e.target.files))
                      } else {
                        setUploadFiles(null)
                      }
                    }}
                    className="h-10 rounded-lg cursor-pointer"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setParsedCardTx(null)
                      setUploadFiles(null)
                      setShowUploadModal(false)
                    }}
                    className="rounded-xl"
                  >
                    Vazgeç
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={parsingLoading}
                    className="rounded-xl px-6"
                  >
                    {parsingLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI Analiz Ediyor...
                      </>
                    ) : 'Ekstre Çözümle'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-emerald-600 font-semibold">
                  Ekstreden toplam {parsedCardTx.length} adet işlem başarıyla çıkartıldı. Lütfen kontrol edip onaylayın.
                </p>
                <div className="max-h-[300px] overflow-y-auto border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 uppercase font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Tarih</th>
                        <th className="px-4 py-2">Açıklama</th>
                        <th className="px-4 py-2 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedCardTx.map((tx, idx) => {
                        const isPayment = tx.amount < 0
                        return (
                          <tr key={idx} className="hover:bg-muted/35">
                            <td className="px-4 py-2 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                            <td className="px-4 py-2">{tx.description}</td>
                            <td className={`px-4 py-2 text-right font-semibold whitespace-nowrap ${
                              isPayment ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {isPayment ? '-' : ''}{formatCurrency(Math.abs(tx.amount))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setParsedCardTx(null)}
                    disabled={isPending}
                    className="rounded-xl"
                  >
                    Geri Dön
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveCCStatement}
                    disabled={isPending}
                    className="rounded-xl px-6"
                  >
                    {isPending ? 'Kaydediliyor...' : 'İşlemleri İçe Aktar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
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

      {/* Edit Cheque Modal */}
      {showEditChequeModal && selectedEditCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowEditChequeModal(false)} />
          <form onSubmit={handleUpdateChequeSubmit} className="relative bg-card border w-full max-w-md p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Evrak Düzenle
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowEditChequeModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Evrak Türü</Label>
                  <Select value={editChequeType} onValueChange={(val: any) => setEditChequeType(val)}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      <SelectItem value="cheque">Çek</SelectItem>
                      <SelectItem value="promissory_note">Senet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">İşlem Yönü</Label>
                  <Select value={editChequeDirection} onValueChange={(val: any) => setEditChequeDirection(val)}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border">
                      <SelectItem value="in">Alınan (Giriş)</SelectItem>
                      <SelectItem value="out">Verilen (Çıkış)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="editAmount" className="text-xs">Tutar (TL)</Label>
                <Input 
                  id="editAmount"
                  type="number"
                  step="0.01"
                  value={editChequeAmount}
                  onChange={(e) => setEditChequeAmount(e.target.value)}
                  className="h-10 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editContactName" className="text-xs">Muhatap (Cari İsim)</Label>
                <Input 
                  id="editContactName"
                  value={editChequeContactName}
                  onChange={(e) => setEditChequeContactName(e.target.value)}
                  className="h-10 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editIssueDate" className="text-xs">Düzenleme Tarihi</Label>
                  <Input 
                    id="editIssueDate"
                    type="date"
                    value={editChequeIssueDate}
                    onChange={(e) => setEditChequeIssueDate(e.target.value)}
                    className="h-10 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editDueDate" className="text-xs">Vade Tarihi</Label>
                  <Input 
                    id="editDueDate"
                    type="date"
                    value={editChequeDueDate}
                    onChange={(e) => setEditChequeDueDate(e.target.value)}
                    className="h-10 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editBankName" className="text-xs">Banka Adı</Label>
                  <Input 
                    id="editBankName"
                    value={editChequeBankName}
                    onChange={(e) => setEditChequeBankName(e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editDocNum" className="text-xs">Belge / Seri No</Label>
                  <Input 
                    id="editDocNum"
                    value={editChequeDocNum}
                    onChange={(e) => setEditChequeDocNum(e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Durum</Label>
                <Select value={editChequeStatus} onValueChange={(val: any) => setEditChequeStatus(val)}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    <SelectItem value="portfolio">Portföyde</SelectItem>
                    <SelectItem value="endorsed">Ciro Edildi</SelectItem>
                    <SelectItem value="cashed">Tahsil Edildi / Ödendi</SelectItem>
                    <SelectItem value="bounced">Karşılıksız / Protestolu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="editNotes" className="text-xs">Notlar</Label>
                <Input 
                  id="editNotes"
                  value={editChequeNotes}
                  onChange={(e) => setEditChequeNotes(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowEditChequeModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                {isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Cheque Ciro / Endorsement Modal */}
      {showCiroModal && selectedCiroCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowCiroModal(false)} />
          <form onSubmit={handleCiroSubmit} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up text-left">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Çek/Senet Ciro Et (Devret)
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowCiroModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Evrak: <span className="font-bold text-foreground">{formatCurrency(selectedCiroCheque.amount)} ({selectedCiroCheque.type === 'cheque' ? 'Çek' : 'Senet'})</span>
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Ciro Edilecek Cari Hesap (Alıcı/Tedarikçi)</Label>
                <Select value={ciroAccountId} onValueChange={(val) => setCiroAccountId(val || '')} required>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue>
                      {accounts.find(a => a.id === ciroAccountId)?.name || 'Cari hesap seçin...'}
                    </SelectValue>
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
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowCiroModal(false)} className="rounded-xl">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95">
                {isPending ? 'Ciro Ediliyor...' : 'Ciro Et'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
