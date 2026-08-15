'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, ArrowLeft, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getAccountLedger, LedgerRow } from './actions'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function LedgerClient({ 
  initialData, 
  account, 
  accountId 
}: { 
  initialData: LedgerRow[], 
  account: any, 
  accountId: string 
}) {
  const [data, setData] = useState<LedgerRow[]>(initialData)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFilter = async () => {
    setLoading(true)
    const res = await getAccountLedger(accountId, startDate, endDate)
    if (res.success && res.data) {
      setData(res.data)
    }
    setLoading(false)
  }

  const exportToExcel = () => {
    const exportData = data.map(r => ({
      'Tarih': formatDate(r.entry_date),
      'Evrak No': r.receipt_no,
      'Açıklama': r.description,
      'Borç': r.debit,
      'Alacak': r.credit,
      'Bakiye': r.running_balance
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Muavin")
    XLSX.writeFile(wb, `${account?.code}_Muavin.xlsx`)
  }

  const totalDebit = data.reduce((sum, r) => sum + Number(r.debit), 0)
  const totalCredit = data.reduce((sum, r) => sum + Number(r.credit), 0)

  return (
    <div className="space-y-6 pb-24 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/accounting/trial-balance" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Mizan'a Dön
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Muavin Defter: {account?.code} - {account?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hesabın tüm borç ve alacak hareketlerinin tarih sırasına göre dökümü.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
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
                  <th className="p-3 font-medium">Tarih</th>
                  <th className="p-3 font-medium">Evrak No</th>
                  <th className="p-3 font-medium">Açıklama</th>
                  <th className="p-3 font-medium text-right">Borç</th>
                  <th className="p-3 font-medium text-right">Alacak</th>
                  <th className="p-3 font-medium text-right border-l">Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Hareket bulunamadı.</td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr 
                      key={row.entry_id || `opening-${index}`} 
                      className={`hover:bg-muted/30 transition-colors ${row.is_opening ? 'bg-muted/20 font-semibold' : ''}`}
                    >
                      <td className="p-3 whitespace-nowrap">{formatDate(row.entry_date)}</td>
                      <td className="p-3">{row.receipt_no || '-'}</td>
                      <td className="p-3">{row.description}</td>
                      <td className="p-3 text-right">{Number(row.debit) > 0 ? formatCurrency(row.debit) : '-'}</td>
                      <td className="p-3 text-right">{Number(row.credit) > 0 ? formatCurrency(row.credit) : '-'}</td>
                      <td className="p-3 text-right border-l font-medium text-primary">
                        {formatCurrency(row.running_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-primary/5 font-bold border-t-2">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">GENEL TOPLAM:</td>
                    <td className="p-3 text-right">{formatCurrency(totalDebit)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalCredit)}</td>
                    <td className="p-3 border-l"></td>
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
