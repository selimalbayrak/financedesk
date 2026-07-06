'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { TransactionWithLines } from '@/types/database.types'
import { ChevronDown, ChevronRight, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadStatementDialog } from './upload-statement-dialog'

interface AccountLedgerProps {
  transactions: TransactionWithLines[]
  accountId: string
}

export function AccountLedger({ transactions, accountId }: AccountLedgerProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [uploadOpen, setUploadOpen] = useState(false)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Calculate running balance
  // Since transactions are ordered ascending, we iterate from start to end
  let currentBalance = 0
  const ledgerData = transactions.map(tx => {
    // Debit increases balance (customer owes us more)
    // Credit decreases balance (customer paid us)
    if (tx.type === 'debit') {
      currentBalance += tx.amount
    } else {
      currentBalance -= tx.amount
    }
    return {
      ...tx,
      runningBalance: currentBalance
    }
  })

  // We usually want to show newest first in the UI, but balances calculated ascending
  const displayData = [...ledgerData].reverse()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-2">
          <FileUp className="h-4 w-4" />
          PDF'ten Aktar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Fiş Türü / Belge No</th>
                <th className="px-4 py-3 font-medium">Açıklama</th>
                <th className="px-4 py-3 font-medium text-right">Borç</th>
                <th className="px-4 py-3 font-medium text-right">Alacak</th>
                <th className="px-4 py-3 font-medium text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Henüz işlem bulunmuyor.
                  </td>
                </tr>
              ) : (
                displayData.map((tx) => {
                  const hasLines = tx.transaction_lines && tx.transaction_lines.length > 0
                  const isExpanded = expandedRows[tx.id]

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 w-10">
                          {hasLines && (
                            <button
                              onClick={() => toggleRow(tx.id)}
                              className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(tx.transaction_date)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{tx.document_type || '—'}</div>
                          <div className="text-xs text-muted-foreground">{tx.document_no || tx.reference_no}</div>
                        </td>
                        <td className="px-4 py-3">{tx.description || tx.category}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                          {tx.type === 'debit' ? formatCurrency(tx.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                          {tx.type === 'credit' ? formatCurrency(tx.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatCurrency(tx.runningBalance)}
                          <span className="text-[10px] ml-1 text-muted-foreground">
                            {tx.runningBalance >= 0 ? '(B)' : '(A)'}
                          </span>
                        </td>
                      </tr>
                      {hasLines && isExpanded && (
                        <tr className="bg-muted/10">
                          <td colSpan={7} className="p-0">
                            <div className="px-12 py-3 border-l-4 border-primary/20">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground uppercase border-b">
                                    <th className="py-2 text-left font-medium">Tip/Kodu</th>
                                    <th className="py-2 text-left font-medium">Açıklama</th>
                                    <th className="py-2 text-right font-medium">Miktar</th>
                                    <th className="py-2 text-right font-medium">Birim Fiyat</th>
                                    <th className="py-2 text-right font-medium">Tutar</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  {tx.transaction_lines.map((line) => (
                                    <tr key={line.id}>
                                      <td className="py-2">{line.item_code || '—'}</td>
                                      <td className="py-2">{line.description}</td>
                                      <td className="py-2 text-right">{line.quantity}</td>
                                      <td className="py-2 text-right">{line.unit_price ? formatCurrency(line.unit_price) : '—'}</td>
                                      <td className="py-2 text-right tabular-nums font-medium">
                                        {formatCurrency(line.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <UploadStatementDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        accountId={accountId} 
      />
    </div>
  )
}
