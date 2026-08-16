'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { deleteJournalEntry } from '@/features/transactions/actions' // We will need to export this or create it
import { toast } from 'sonner'

export function SafeDetailsClient({ safe, transactions }: { safe: any, transactions: any[] }) {
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  
  const filtered = transactions.filter(t => 
    t.journal_entries?.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.journal_entries?.date?.includes(search)
  )

  const balance = transactions.reduce((acc, curr) => {
    return curr.is_debit ? acc + curr.amount : acc - curr.amount
  }, 0)

  async function handleDelete(journalId: string) {
    if (!window.confirm('Bu işlemi silmek istediğinize emin misiniz? (Yevmiye fişi tamamen iptal edilir)')) return
    
    setLoadingId(journalId)
    try {
      const res = await deleteJournalEntry(journalId)
      if (res.error) toast.error(res.error)
      else toast.success('İşlem iptal edildi ve silindi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/safes">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{safe.name} Ekstresi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {safe.chart_of_accounts?.code} - {safe.chart_of_accounts?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Güncel Bakiye</p>
            <h2 className={`text-3xl font-bold tracking-tight ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balance)}
            </h2>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Toplam Giriş (Borç)</p>
            <h2 className="text-2xl font-bold tracking-tight text-green-600">
              {formatCurrency(transactions.filter(t => t.is_debit).reduce((a,b) => a + b.amount, 0))}
            </h2>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Toplam Çıkış (Alacak)</p>
            <h2 className="text-2xl font-bold tracking-tight text-red-600">
              {formatCurrency(transactions.filter(t => !t.is_debit).reduce((a,b) => a + b.amount, 0))}
            </h2>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Hesap Hareketleri</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Açıklama veya tarih ara..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-background/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="h-11 px-6 text-left font-medium text-muted-foreground w-32">Tarih</th>
                  <th className="h-11 px-6 text-left font-medium text-muted-foreground">Açıklama (Fiş)</th>
                  <th className="h-11 px-6 text-right font-medium text-muted-foreground">Giriş (+)</th>
                  <th className="h-11 px-6 text-right font-medium text-muted-foreground">Çıkış (-)</th>
                  <th className="h-11 px-6 text-right font-medium text-muted-foreground">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center text-muted-foreground">Kayıtlı hesap hareketi bulunamadı.</td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-6 whitespace-nowrap">{new Date(t.journal_entries?.date).toLocaleDateString('tr-TR')}</td>
                      <td className="p-6 font-medium text-muted-foreground">{t.journal_entries?.description}</td>
                      <td className="p-6 text-right font-medium text-green-600">
                        {t.is_debit && <div className="flex items-center justify-end gap-1"><ArrowDownLeft className="w-3 h-3"/> {formatCurrency(t.amount)}</div>}
                      </td>
                      <td className="p-6 text-right font-medium text-red-600">
                        {!t.is_debit && <div className="flex items-center justify-end gap-1"><ArrowUpRight className="w-3 h-3"/> {formatCurrency(t.amount)}</div>}
                      </td>
                      <td className="p-6 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(t.journal_entries?.id)}
                          disabled={loadingId === t.journal_entries?.id}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 rounded-lg"
                          title="İşlemi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
