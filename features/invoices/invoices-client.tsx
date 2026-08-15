'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, FileText, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Invoice, Account } from '@/types/database.types'
import { approveInvoice, deleteInvoice } from './actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface InvoicesClientProps {
  invoices: (Invoice & { accounts: Account })[]
}

export function InvoicesClient({ invoices }: InvoicesClientProps) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'SALES'>('ALL')
  const [isPending, startTransition] = useTransition()
  
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null)

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
                          inv.accounts?.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === 'ALL' || inv.type === filterType
    return matchesSearch && matchesType
  })

  const handleApprove = async () => {
    if (!approveConfirmId) return
    startTransition(async () => {
      try {
        await approveInvoice(approveConfirmId)
        toast.success('Fatura başarıyla onaylandı ve yevmiye fişi oluşturuldu.')
      } catch (error: any) {
        toast.error('Hata: ' + error.message)
      } finally {
        setApproveConfirmId(null)
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu taslak faturayı silmek istediğinize emin misiniz?')) return
    startTransition(async () => {
      try {
        await deleteInvoice(id)
        toast.success('Fatura başarıyla silindi.')
      } catch (error: any) {
        toast.error('Hata: ' + error.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Fatura No veya Cari Ara..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/50 backdrop-blur-sm border-primary/10 h-11 rounded-2xl"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-auto">
            <Button
              variant={filterType === 'ALL' ? 'secondary' : 'ghost'}
              onClick={() => setFilterType('ALL')}
              className={`rounded-lg px-6 ${filterType === 'ALL' ? 'bg-white shadow-sm' : ''}`}
            >
              Tümü
            </Button>
            <Button
              variant={filterType === 'SALES' ? 'secondary' : 'ghost'}
              onClick={() => setFilterType('SALES')}
              className={`rounded-lg px-4 gap-2 ${filterType === 'SALES' ? 'bg-white shadow-sm text-green-600' : ''}`}
            >
              Satış
            </Button>
            <Button
              variant={filterType === 'PURCHASE' ? 'secondary' : 'ghost'}
              onClick={() => setFilterType('PURCHASE')}
              className={`rounded-lg px-4 gap-2 ${filterType === 'PURCHASE' ? 'bg-white shadow-sm text-red-600' : ''}`}
            >
              Alış
            </Button>
          </div>
          <Link href="/invoices/new">
            <Button className="rounded-xl shadow-md gap-2 h-11 px-6">
              <Plus className="w-4 h-4" />
              Yeni Fatura
            </Button>
          </Link>
        </div>
      </div>

      <Card className="rounded-3xl border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Fatura No</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Cari/Müşteri</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Fatura bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>
                    {inv.type === 'SALES' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Satış
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                        <ArrowDownLeft className="w-3 h-3" /> Alış
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{inv.accounts?.name}</TableCell>
                  <TableCell>{new Date(inv.issue_date).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(inv.grand_total)}
                  </TableCell>
                  <TableCell>
                    {inv.status === 'APPROVED' ? (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Onaylı
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="w-3 h-3" /> Taslak
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status === 'DRAFT' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          onClick={() => setApproveConfirmId(inv.id)}
                          title="Faturayı Onayla"
                          disabled={isPending}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          onClick={() => handleDelete(inv.id)}
                          title="Sil"
                          disabled={isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!approveConfirmId} onOpenChange={(open) => !open && setApproveConfirmId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Faturayı Onaylamak Üzeresiniz</AlertDialogTitle>
            <AlertDialogDescription>
              Fatura onaylandığında <strong>otomatik muhasebe fişi (yevmiye) oluşturulacak</strong> ve ilgili stok ile cari hesaplar güncellenecektir. <br/><br/>
              <span className="text-red-600 font-medium">Onaylanmış faturalar bir daha silinemez veya düzenlenemez.</span> Onaylıyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="rounded-xl h-11">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isPending} className="rounded-xl h-11 shadow-lg shadow-primary/20">
              {isPending ? 'İşleniyor...' : 'Evet, Onayla'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
