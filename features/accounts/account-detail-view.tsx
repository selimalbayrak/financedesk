'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Pencil, Mail, Phone, MapPin, Building2, Hash, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AccountFormSheet } from './account-form-sheet'
import { AccountLedger } from './ledger/account-ledger'
import { AccountTypeBadge, StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils'
import type { Account, Transaction } from '@/types/database.types'

interface AccountDetailViewProps {
  account: Account
  transactions: Transaction[]
  companyId: string
}

export function AccountDetailView({ account, transactions, companyId }: AccountDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false)

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

  return (
    <>
      {/* Back nav */}
      <div className="mb-4">
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
      <div className="flex items-start justify-between gap-4 mb-6">
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
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1.5 h-4 w-4" />
          Düzenle
        </Button>
      </div>

      {/* Balance summary */}
      <div className="mb-6">
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
      <Tabs defaultValue="transactions">
        <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl mb-4">
          <TabsTrigger value="transactions" className="flex-1 rounded-lg text-sm py-2">
            İşlem Geçmişi ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="flex-1 rounded-lg text-sm py-2">
            Firma Bilgileri
          </TabsTrigger>
        </TabsList>

        {/* Ledger Tab */}
        <TabsContent value="transactions" className="mt-0">
          <AccountLedger transactions={transactions as any} accountId={account.id} account={account} />
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
