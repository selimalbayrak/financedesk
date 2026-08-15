'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, FileText, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getTrialBalance, TrialBalanceRow } from './actions'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function TrialBalanceClient({ initialData }: { initialData: TrialBalanceRow[] }) {
  const [data, setData] = useState<TrialBalanceRow[]>(initialData)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [showZeroBalances, setShowZeroBalances] = useState(false)

  const handleFilter = async () => {
    setLoading(true)
    const res = await getTrialBalance(startDate, endDate)
    if (res.success && res.data) {
      setData(res.data)
    }
    setLoading(false)
  }

  const exportToExcel = () => {
    const exportData = data.map(r => ({
      'Hesap Kodu': r.code,
      'Hesap Adı': r.name,
      'Tip': r.type,
      'Toplam Borç': r.total_debit,
      'Toplam Alacak': r.total_credit,
      'Borç Bakiyesi': r.debit_balance,
      'Alacak Bakiyesi': r.credit_balance
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Mizan")
    XLSX.writeFile(wb, "Mizan_Raporu.xlsx")
  }

  const filteredData = showZeroBalances 
    ? data 
    : data.filter(r => r.debit_balance > 0 || r.credit_balance > 0 || r.total_debit > 0 || r.total_credit > 0)

  // Calculate grand totals
  const mainAccounts = filteredData.filter(r => r.type === 'MAIN' && r.parent_id === null)
  const totalDebit = mainAccounts.reduce((sum, r) => sum + Number(r.total_debit), 0)
  const totalCredit = mainAccounts.reduce((sum, r) => sum + Number(r.total_credit), 0)
  const totalDebitBalance = mainAccounts.reduce((sum, r) => sum + Number(r.debit_balance), 0)
  const totalCreditBalance = mainAccounts.reduce((sum, r) => sum + Number(r.credit_balance), 0)

  return (
    <div className="space-y-6 pb-24 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            Mizan (Trial Balance)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Belirtilen tarih aralığındaki kümülatif hesap bakiyelerini inceleyin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowZeroBalances(!showZeroBalances)} className="bg-white rounded-lg">
            <Filter className="w-4 h-4 mr-2" />
            {showZeroBalances ? 'Sıfır Bakiyeleri Gizle' : 'Tümünü Göster'}
          </Button>
          <Button onClick={exportToExcel} className="rounded-lg">
            Excel'e Aktar
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-xl">
        <CardHeader className="flex flex-col sm:flex-row items-end justify-between gap-4 border-b bg-muted/20 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Başlangıç Tarihi</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-full sm:w-40 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Bitiş Tarihi</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="w-full sm:w-40 bg-white"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Yükleniyor...' : 'Filtrele'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Hesap Kodu</th>
                  <th className="p-3 font-medium">Hesap Adı</th>
                  <th className="p-3 font-medium text-right">Toplam Borç</th>
                  <th className="p-3 font-medium text-right">Toplam Alacak</th>
                  <th className="p-3 font-medium text-right border-l">Borç Bakiyesi</th>
                  <th className="p-3 font-medium text-right">Alacak Bakiyesi</th>
                  <th className="p-3 font-medium text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">Kayıt bulunamadı.</td>
                  </tr>
                ) : (
                  filteredData.map((row) => {
                    const isMain = row.type === 'MAIN'
                    const isSub = row.type === 'SUB'
                    const isDetail = row.type === 'DETAIL'
                    
                    return (
                      <tr 
                        key={row.id} 
                        className={`
                          hover:bg-muted/30 transition-colors
                          ${isMain ? 'bg-muted/10 font-bold' : ''}
                          ${isSub ? 'font-semibold' : ''}
                        `}
                      >
                        <td className={`p-3 font-mono ${isMain ? '' : isSub ? 'pl-6' : 'pl-10 text-muted-foreground'}`}>
                          {row.code}
                        </td>
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 text-right">{Number(row.total_debit) > 0 ? formatCurrency(row.total_debit) : '-'}</td>
                        <td className="p-3 text-right">{Number(row.total_credit) > 0 ? formatCurrency(row.total_credit) : '-'}</td>
                        <td className="p-3 text-right border-l font-medium text-primary">
                          {Number(row.debit_balance) > 0 ? formatCurrency(row.debit_balance) : '-'}
                        </td>
                        <td className="p-3 text-right font-medium text-destructive">
                          {Number(row.credit_balance) > 0 ? formatCurrency(row.credit_balance) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Link href={`/accounting/ledger/${row.id}`}>
                            <Button variant="ghost" size="icon" title="Muavin Defter">
                              <FileText className="w-4 h-4 text-slate-500" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="bg-primary/5 font-bold border-t-2">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">GENEL TOPLAM:</td>
                    <td className="p-3 text-right">{formatCurrency(totalDebit)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalCredit)}</td>
                    <td className="p-3 text-right border-l text-primary">{formatCurrency(totalDebitBalance)}</td>
                    <td className="p-3 text-right text-destructive">{formatCurrency(totalCreditBalance)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
