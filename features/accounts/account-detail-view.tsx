'use client'

import { useState } from 'react'

import { ChevronLeft, Pencil, Mail, Phone, MapPin, Building2, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AccountFormSheet } from './account-form-sheet'
import { AccountTypeBadge, StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils'
import type { Account, Transaction, Payable } from '@/types/database.types'

interface AccountDetailViewProps {
  account: Account
  transactions: Transaction[]
  payables: Payable[]
}

export function AccountDetailView({ account, transactions, payables }: AccountDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false)

  const totalReceivable = payables
    .filter((p) => p.type === 'receivable' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.remaining_amount, 0)

  const totalPayable = payables
    .filter((p) => p.type === 'payable' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.remaining_amount, 0)

  const netBalance = totalReceivable - totalPayable

  return (
    <>
      {/* Back nav */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5"
          render={<a href="/accounts" />}
        >
          <ChevronLeft className="h-4 w-4" />
          Current Accounts
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
          Edit
        </Button>
      </div>

      {/* Balance summary */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Receivable</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {formatCurrency(totalReceivable)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Payable</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
              {formatCurrency(totalPayable)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Net Balance</p>
            <p className={`text-lg font-bold tabular-nums mt-0.5 ${
              netBalance >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="payables">
            Payables & Receivables ({payables.length})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({transactions.length})
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {account.email && (
                <InfoRow icon={Mail} label="Email" value={account.email} />
              )}
              {account.phone && (
                <InfoRow icon={Phone} label="Phone" value={account.phone} />
              )}
              {account.city && (
                <InfoRow icon={MapPin} label="City" value={account.city} />
              )}
              {account.company_name && (
                <InfoRow icon={Building2} label="Company" value={account.company_name} />
              )}
              {account.tax_number && (
                <InfoRow icon={Hash} label="Tax Number" value={account.tax_number} />
              )}
              {account.tax_office && (
                <InfoRow icon={Hash} label="Tax Office" value={account.tax_office} />
              )}
              {account.address && (
                <div className="sm:col-span-2">
                  <InfoRow icon={MapPin} label="Address" value={account.address} />
                </div>
              )}
              {account.notes && (
                <div className="sm:col-span-2">
                  <Separator className="mb-4" />
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{account.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payables Tab */}
        <TabsContent value="payables" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No payables or receivables for this account.
                </p>
              ) : (
                <div className="divide-y">
                  {payables.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.invoice_ref && `Ref: ${p.invoice_ref} · `}
                          Due: {p.due_date ? formatDateShort(p.due_date) : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular-nums ${
                            p.type === 'receivable'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {formatCurrency(p.remaining_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            of {formatCurrency(p.original_amount)}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No transactions for this account.
                </p>
              ) : (
                <div className="divide-y">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {tx.description ?? tx.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.transaction_date)}
                          {tx.reference_no && ` · ${tx.reference_no}`}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                        tx.type === 'credit'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
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
