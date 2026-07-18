'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Pencil, Mail, Phone, MapPin, Building2, Hash, CreditCard, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AccountFormSheet } from './account-form-sheet'
import { AccountLedger } from './ledger/account-ledger'
import { AccountTypeBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Account, TransactionWithLines } from '@/types/database.types'
import { ChequeCashModal } from '../finance/cheque-cash-modal'

interface AccountDetailViewProps {
  account: Account
  transactions: TransactionWithLines[]
  cheques?: any[]
  safes?: any[]
  companyId: string
  companyName?: string
}

export function AccountDetailView({ account, transactions, cheques = [], safes = [], companyId, companyName }: AccountDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<any>(null)

  // Balance Logic
  // (+) Alacağımız: invoice_out, payment_out
  // (-) Borcumuz: invoice_in, payment_in
  let balance = 0
  transactions.forEach(t => {
    if (t.transaction_type === 'invoice_out' || t.transaction_type === 'payment_out') {
      balance += t.amount
    } else {
      balance -= t.amount
    }
  })

  // Format this Account into Account type expected by ChequeCashModal
  const modalAccounts = [{
    id: account.id,
    name: account.name,
    company_name: account.company_name
  }]

  return (
    <>
      {/* Back nav */}
      <div className="mb-4 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5"
          render={<Link href="/accounts" />}
        >
          <ChevronLeft className="h-4 w-4" />
          Cari Hesaplar
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">
            {account.company_name || account.name}
          </h1>
          {account.company_name && (
            <p className="text-sm text-muted-foreground">{account.name}</p>
          )}
          <div className="mt-1.5">
            <AccountTypeBadge type={account.type} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/transactions/import">
            <Button size="sm" variant="outline" className="rounded-xl">
              <Upload className="mr-1.5 h-4 w-4" />
              PDF'den Aktar
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="rounded-xl">
            <Pencil className="mr-1.5 h-4 w-4" />
            Düzenle
          </Button>
        </div>
      </div>

      {/* Balance summary */}
      <div className="mb-6 print:hidden">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground font-medium mb-1">Güncel Bakiye Durumu</p>
            {balance === 0 ? (
              <p className="text-2xl font-bold tabular-nums">Bakiyesiz</p>
            ) : balance > 0 ? (
              <div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(balance)}
                </p>
                <p className="text-sm font-medium text-emerald-600/80 mt-1">Bizim Alacağımız Var</p>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCurrency(Math.abs(balance))}
                </p>
                <p className="text-sm font-medium text-rose-600/80 mt-1">Bizim Borcumuz Var</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="print:block">
        <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl mb-4 print:hidden flex">
          <TabsTrigger value="transactions" className="flex-1 rounded-lg text-sm py-2">
            İşlem Geçmişi ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="cheques" className="flex-1 rounded-lg text-sm py-2">
            Çek ve Senetler ({cheques.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="flex-1 rounded-lg text-sm py-2">
            Firma Bilgileri
          </TabsTrigger>
        </TabsList>

        {/* Ledger Tab */}
        <TabsContent value="transactions" className="m-0 border rounded-xl p-4 sm:p-6 bg-card print:border-none print:p-0 print:bg-transparent">
          <AccountLedger 
            transactions={transactions} 
            accountId={account.id} 
            companyId={companyId} 
            companyName={companyName}
            accountInfo={{
              name: account.name,
              company_name: account.company_name
            }}
          />
        </TabsContent>

        {/* Cheques Tab */}
        <TabsContent value="cheques" className="m-0 border rounded-xl p-4 sm:p-6 bg-card print:hidden">
          {cheques.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <CreditCard className="w-12 h-12 mb-4 opacity-20" />
              <p>Bu cariye ait çek veya senet bulunmuyor</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cheques.map(cheque => (
                <Card key={cheque.id} className="shadow-sm flex flex-col justify-between border-border/50">
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

        {/* Info Tab */}
        <TabsContent value="info" className="mt-0">
          <Card>
            <CardContent className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {account.email && (
                <InfoRow icon={Mail} label="E-Posta" value={account.email} />
              )}
              {account.phone && (
                <InfoRow icon={Phone} label="Telefon" value={account.phone} />
              )}
              {account.city && (
                <InfoRow icon={MapPin} label="Şehir" value={account.city} />
              )}
              {account.company_name && (
                <InfoRow icon={Building2} label="Ünvan" value={account.company_name} />
              )}
              {account.tax_number && (
                <InfoRow icon={Hash} label="Vergi No" value={account.tax_number} />
              )}
              {account.tax_office && (
                <InfoRow icon={Hash} label="Vergi Dairesi" value={account.tax_office} />
              )}
              {account.address && (
                <div className="sm:col-span-2">
                  <InfoRow icon={MapPin} label="Adres" value={account.address} />
                </div>
              )}
              {account.notes && (
                <div className="sm:col-span-2">
                  <Separator className="mb-4" />
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Notlar</p>
                  <p className="text-sm whitespace-pre-wrap">{account.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AccountFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
        companyId={companyId}
      />

      <ChequeCashModal
        isOpen={cashModalOpen}
        onClose={() => setCashModalOpen(false)}
        cheque={selectedCheque}
        safes={safes}
        accounts={modalAccounts}
      />
    </>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}
