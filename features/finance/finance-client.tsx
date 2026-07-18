'use client'

import React, { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, Landmark, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { payLoanInstallment, unpayLoanInstallment } from './actions'
import { ChequeCashModal } from './cheque-cash-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FinanceClientProps {
  cheques: any[]
  loans: any[]
  installments: any[]
  safes: any[]
  accounts: any[]
}

export function FinanceClient({ cheques, loans, installments, safes, accounts }: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState('cheques')
  
  // Cheque Cash Modal States
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<any>(null)

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

  return (
    <div className="space-y-6 pb-24 animate-in-up">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Finansman"
          description="Çek, senet ve kredi takibi"
        />
        <Link href={activeTab === 'cheques' ? '/finance/cheques/new' : '/finance/loans/new'}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'cheques' ? 'Yeni Çek/Senet' : 'Yeni Kredi'}
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-14 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="cheques" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="w-4 h-4 mr-2" />
            Çek ve Senetler
          </TabsTrigger>
          <TabsTrigger value="loans" className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Landmark className="w-4 h-4 mr-2" />
            Banka Kredileri
          </TabsTrigger>
        </TabsList>

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
      </Tabs>

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
