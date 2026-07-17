'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { TransactionWithLines, Account } from '@/types/database.types'
import { ChevronDown, ChevronRight, FileUp, MoreHorizontal, Pencil, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { UploadStatementDialog } from './upload-statement-dialog'
import { EditTransactionDialog } from './edit-transaction-dialog'
import { DeleteTransactionDialog } from './delete-transaction-dialog'
import { DeleteAllTransactionsDialog } from './delete-all-transactions-dialog'

interface AccountLedgerProps {
  transactions: TransactionWithLines[]
  accountId: string
  account: Account
}

export function AccountLedger({ transactions, accountId, account }: AccountLedgerProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [uploadOpen, setUploadOpen] = useState(false)
  
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithLines | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithLines | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Calculate running balance
  // Since transactions are ordered ascending, we iterate from start to end
  let currentBalance = 0
  const ledgerData = transactions.map(tx => {
    const isPositive = tx.transaction_type === 'invoice_out' || tx.transaction_type === 'payment_out'
    if (isPositive) {
      currentBalance += tx.amount
    } else {
      currentBalance -= tx.amount
    }
    return {
      ...tx,
      isPositive,
      runningBalance: currentBalance
    }
  })

  // We usually want to show newest first in the UI, but balances calculated ascending
  const displayData = [...ledgerData].reverse()

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={() => window.print()} size="sm" variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Mutabakat Yazdır
        </Button>
        <Button onClick={() => setDeleteAllOpen(true)} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Tümünü Sil
        </Button>
      </div>

      {/* Print-only Header (Mutabakat Formu) */}
      <div className="hidden print:block mb-8">
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">MUTABAKAT MEKTUBU</h1>
          <p className="text-sm mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <h3 className="font-bold underline mb-2">Gönderen / Hazırlayan</h3>
            <p>FinanceDesk Sistemi</p>
          </div>
          <div>
            <h3 className="font-bold underline mb-2">Alıcı (Cari)</h3>
            <p className="font-semibold">{account.company_name || account.name}</p>
            {account.company_name && <p>{account.name}</p>}
            {account.tax_number && <p>VD / No: {account.tax_office} / {account.tax_number}</p>}
          </div>
        </div>
        
        <p className="text-sm mb-4">
          Sayın Yetkili,<br/><br/>
          Firmanızla olan cari hesap kayıtlarımızın incelenmesi sonucunda {new Date().toLocaleDateString('tr-TR')} tarihi itibarıyla cari hesabınızın hareketleri aşağıda listelenmiştir. 
          Bakiyede mutabık olup olmadığınızı bildirmenizi rica ederiz.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 font-medium print:hidden"></th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">İşlem Türü / Belge</th>
                <th className="px-4 py-3 font-medium">Açıklama</th>
                <th className="px-4 py-3 font-medium text-right text-emerald-600 dark:text-emerald-400">Bizim Alacağımız (+)</th>
                <th className="px-4 py-3 font-medium text-right text-rose-600 dark:text-rose-400">Bizim Borcumuz (-)</th>
                <th className="px-4 py-3 font-medium text-right">Kalan Bakiye</th>
                <th className="px-4 py-3 w-10 print:hidden"></th>
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
                  
                  const typeLabel = 
                    tx.transaction_type === 'payment_in' ? 'Alınan Ödeme' :
                    tx.transaction_type === 'payment_out' ? 'Gönderilen Ödeme' :
                    tx.transaction_type === 'invoice_in' ? 'Alınan Ürün/Hizmet' :
                    'Verilen Ürün/Hizmet'

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 w-10 print:hidden">
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
                          <div className="font-medium text-foreground">{typeLabel}</div>
                          <div className="text-xs text-muted-foreground">{tx.document_no || tx.reference_no || '—'}</div>
                        </td>
                        <td className="px-4 py-3">{tx.description || tx.category || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                          {tx.isPositive ? formatCurrency(tx.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                          {!tx.isPositive ? formatCurrency(tx.amount) : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatCurrency(Math.abs(tx.runningBalance))}
                          <span className={`text-[10px] ml-1.5 px-1.5 py-0.5 rounded-sm ${tx.runningBalance >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'}`}>
                            {tx.runningBalance >= 0 ? 'Alacak' : 'Borç'}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-10 print:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground h-8 w-8 p-0">
                              <span className="sr-only">Menüyü aç</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setTransactionToEdit(tx)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Düzenle</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setTransactionToDelete(tx)}
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Sil</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Print-only Footer (Mutabakat Formu) */}
      <div className="hidden print:block mt-16 border-t pt-8">
        <div className="text-center font-bold text-lg mb-8">
          Genel Bakiye: {currentBalance === 0 ? 'Bakiyesiz' : currentBalance > 0 ? `${formatCurrency(currentBalance)} (Alacaklıyız)` : `${formatCurrency(Math.abs(currentBalance))} (Borçluyuz)`}
        </div>

        <div className="grid grid-cols-2 gap-16 text-sm">
          <div className="border p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" className="w-4 h-4" />
              <label className="font-bold">MUTABIKIZ</label>
            </div>
            <p className="text-xs text-gray-500 mb-8">Yukarıdaki bakiyeyi onaylıyorum.</p>
            <div className="flex justify-between mt-8">
              <div>Kaşe:</div>
              <div>İmza:</div>
            </div>
          </div>

          <div className="border p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" className="w-4 h-4" />
              <label className="font-bold">MUTABIK DEĞİLİZ</label>
            </div>
            <p className="text-xs text-gray-500 mb-8">Bizim kayıtlarımıza göre bakiye ..............................................................</p>
            <div className="flex justify-between mt-8">
              <div>Kaşe:</div>
              <div>İmza:</div>
            </div>
          </div>
        </div>
      </div>

      <UploadStatementDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        accountId={accountId} 
      />

      <EditTransactionDialog
        transaction={transactionToEdit}
        open={!!transactionToEdit}
        onOpenChange={(open) => !open && setTransactionToEdit(null)}
      />

      <DeleteTransactionDialog
        transaction={transactionToDelete}
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
      />

      <DeleteAllTransactionsDialog
        accountId={accountId}
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
      />
    </div>
  )
}
