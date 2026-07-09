'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Wallet } from 'lucide-react'

interface SafeBalance {
  id: string
  company_id: string
  name: string
  total_in: number
  total_out: number
  balance: number
}

interface SafesTableProps {
  data: SafeBalance[]
}

export function SafesTable({ data }: SafesTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl border shadow-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Henüz Kasa Eklenmemiş</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Firma içi nakit akışınızı veya banka hesaplarınızı takip etmek için yeni bir kasa ekleyin.
        </p>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-semibold">Kasa Adı</TableHead>
            <TableHead className="text-right font-semibold">Giren (Toplam)</TableHead>
            <TableHead className="text-right font-semibold">Çıkan (Toplam)</TableHead>
            <TableHead className="text-right font-semibold">Mevcut Bakiye</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((safe) => (
            <TableRow key={safe.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
                {safe.name}
              </TableCell>
              <TableCell className="text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.total_in / 100)}
              </TableCell>
              <TableCell className="text-right text-rose-600 dark:text-rose-400 tabular-nums">
                -{Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.total_out / 100)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(safe.balance / 100)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
