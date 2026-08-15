'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BookOpen, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function JournalsClient({ initialData }: { initialData: any[] }) {
  const [journals, setJournals] = useState(initialData || [])
  const [search, setSearch] = useState('')

  const filtered = journals.filter(j => 
    j.receipt_no?.toLowerCase().includes(search.toLowerCase()) ||
    j.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-24 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            Yevmiye Defteri
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sistemdeki tüm muhasebe fişlerini (yevmiye kayıtlarını) inceleyin.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b bg-muted/20 pb-4">
          <CardTitle className="text-lg font-semibold">Fiş Listesi</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Evrak No veya Açıklama ara..."
              className="pl-9 h-10 rounded-xl bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Kayıt bulunamadı.
              </div>
            ) : (
              filtered.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-semibold">{formatDate(entry.date)}</div>
                      <div className="text-sm text-muted-foreground">Evrak No: {entry.receipt_no || '-'} | Tip: {entry.type}</div>
                      <div className="text-sm">{entry.description}</div>
                    </div>
                  </div>
                  
                  {/* Journal Lines Table */}
                  <div className="overflow-x-auto rounded-lg border bg-card">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="p-2 font-medium">Hesap Kodu</th>
                          <th className="p-2 font-medium">Hesap Adı</th>
                          <th className="p-2 font-medium">Açıklama</th>
                          <th className="p-2 font-medium text-right">Borç</th>
                          <th className="p-2 font-medium text-right">Alacak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(entry.journal_entry_lines || []).map((line: any) => (
                          <tr key={line.id} className="hover:bg-muted/30">
                            <td className="p-2 font-mono text-xs">{line.chart_of_accounts?.code}</td>
                            <td className="p-2">{line.chart_of_accounts?.name}</td>
                            <td className="p-2 text-muted-foreground">{line.description}</td>
                            <td className="p-2 text-right">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                            <td className="p-2 text-right">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 font-semibold">
                        <tr>
                          <td colSpan={3} className="p-2 text-right">Toplam:</td>
                          <td className="p-2 text-right">
                            {formatCurrency(entry.journal_entry_lines?.reduce((sum: number, l: any) => sum + (l.debit || 0), 0) || 0)}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(entry.journal_entry_lines?.reduce((sum: number, l: any) => sum + (l.credit || 0), 0) || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
