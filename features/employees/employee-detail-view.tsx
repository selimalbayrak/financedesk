'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Pencil, Plus, Trash2, CalendarDays, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmployeeFormSheet } from './employee-form-sheet'
import { EmployeeTransactionSheet } from './employee-transaction-sheet'
import { EmployeeCalendar } from './employee-calendar'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { EmployeeBalance, EmployeeTransaction, SafeBalance } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface EmployeeDetailViewProps {
  employee: EmployeeBalance
  transactions: EmployeeTransaction[]
  safes: SafeBalance[]
  companyId: string
  companyName?: string
}

export function EmployeeDetailView({ employee, transactions, safes, companyId, companyName }: EmployeeDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [txSheetOpen, setTxSheetOpen] = useState(false)
  const [isDeleting, startDelete] = useTransition()
  const router = useRouter()

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return
    const supabase = createClient()
    startDelete(async () => {
      await supabase.from('employee_transactions').update({ deleted_at: new Date().toISOString() } as any).eq('id', id)
      router.refresh()
    })
  }

  return (
    <>
      <div className="print:hidden space-y-6">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1.5"
            render={<Link href="/employees" />}
          >
            <ChevronLeft className="h-4 w-4" />
            Personeller
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold">{employee.name}</h1>
            {employee.role && (
              <p className="text-sm text-muted-foreground">{employee.role}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {employee.start_date ? formatDateShort(employee.start_date) + ' işe başlangıç' : 'Başlangıç tarihi yok'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setTxSheetOpen(true)} className="rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" />
              İşlem Ekle
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="rounded-xl">
              <Printer className="mr-1.5 h-4 w-4" />
              Bordro Yazdır
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="rounded-xl">
              <Pencil className="mr-1.5 h-4 w-4" />
              Düzenle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Maaş / Yevmiye</p>
              <p className="text-xl font-bold tabular-nums">
                {formatCurrency(employee.wage_amount)}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">
                {employee.wage_type === 'monthly' ? 'Aylık Ücret' : 'Günlük Yevmiye'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Toplam Hakediş</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(employee.total_earned)}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Maaş/Yevmiye Alacakları</p>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Toplam Avans / Ödeme</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatCurrency(employee.total_paid)}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Ödenen Tutar</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <EmployeeCalendar employeeId={employee.id} companyId={companyId} />
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">İşlem Türü</th>
                  <th className="px-4 py-3 font-medium">Açıklama</th>
                  <th className="px-4 py-3 font-medium text-right text-emerald-600 dark:text-emerald-400">Hakediş (+)</th>
                  <th className="px-4 py-3 font-medium text-right text-rose-600 dark:text-rose-400">Avans / Ödeme (-)</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Henüz işlem bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(tx.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {tx.transaction_type === 'advance_payment' ? 'Avans Ödemesi' : 'Maaş Ödemesi'}
                        </div>
                      </td>
                      <td className="px-4 py-3">{tx.description || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                        {/* Hakediş is no longer a manual transaction, it's calculated */}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTx(tx.id)} disabled={isDeleting} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Print-only payoff slip (Pay slip / Maaş Bordrosu) */}
      <div className="hidden print:block p-8 max-w-2xl mx-auto space-y-6 text-black bg-white font-sans">
        <div className="text-center border-b-2 border-black pb-4">
          <h2 className="text-2xl font-bold uppercase">{companyName || 'ŞİRKETİMİZ'}</h2>
          <p className="text-lg font-semibold tracking-wide text-gray-700">PERSONEL MAAŞ BORDROSU / HAKEDİŞ SLİBİ</p>
          <p className="text-xs text-gray-500 mt-1">Düzenleme Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Personel Adı Soyadı:</strong> {employee.name}</p>
            <p><strong>Görevi / Ünvanı:</strong> {employee.role || '—'}</p>
            <p><strong>İşe Başlangıç Tarihi:</strong> {employee.start_date ? formatDateShort(employee.start_date) : '—'}</p>
          </div>
          <div className="text-right">
            <p><strong>Maaş / Yevmiye Tipi:</strong> {employee.wage_type === 'monthly' ? 'Aylık Ücret' : 'Günlük Yevmiye'}</p>
            <p><strong>Maaş / Yevmiye Tutarı:</strong> {formatCurrency(employee.wage_amount)}</p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Açıklama</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Toplam Maaş/Yevmiye Hakedişi (+)</td>
              <td className="border border-gray-300 px-4 py-2 text-right text-emerald-700 font-semibold">{formatCurrency(employee.total_earned)}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Toplam Ödenen / Avans (-)</td>
              <td className="border border-gray-300 px-4 py-2 text-right text-rose-700 font-semibold">{formatCurrency(employee.total_paid)}</td>
            </tr>
            <tr className="bg-gray-50 font-bold">
              <td className="border border-gray-300 px-4 py-2">Net Kalan Ödeme</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(employee.total_earned - employee.total_paid)}</td>
            </tr>
          </tbody>
        </table>

        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div className="space-y-12">
            <p className="font-semibold">Teslim Eden (Yetkili)</p>
            <div className="border-b border-black w-32 mx-auto"></div>
            <p className="text-xs text-gray-500">İmza</p>
          </div>
          <div className="space-y-12">
            <p className="font-semibold">Teslim Alan (Personel)</p>
            <div className="border-b border-black w-32 mx-auto"></div>
            <p className="text-xs text-gray-500">İmza</p>
          </div>
        </div>
      </div>

      <EmployeeFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={employee}
        companyId={companyId}
      />
      <EmployeeTransactionSheet
        open={txSheetOpen}
        onOpenChange={setTxSheetOpen}
        employeeId={employee.id}
        safes={safes}
        companyId={companyId}
        wageAmount={employee.wage_amount}
        wageType={employee.wage_type}
      />
    </>
  )
}
