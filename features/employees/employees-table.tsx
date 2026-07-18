'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, ArrowUpDown, Pencil, Trash2, Eye, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { EmployeeFormSheet } from './employee-form-sheet'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Loader2 } from 'lucide-react'
import type { EmployeeBalance } from '@/types/database.types'
import { formatCurrency, formatDateShort } from '@/lib/utils'

interface EmployeesTableProps {
  employees: EmployeeBalance[]
  companyId: string
}

export function EmployeesTable({ employees, companyId }: EmployeesTableProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<EmployeeBalance | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeBalance | null>(null)
  const [isDeleting, startDelete] = useTransition()

  async function handleDelete() {
    if (!deleteEmployee) return
    const supabase = createClient()
    startDelete(async () => {
      await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .eq('id', deleteEmployee.id)
        .eq('company_id', companyId)
      setDeleteEmployee(null)
      router.refresh()
    })
  }

  const columns: ColumnDef<EmployeeBalance>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Personel Adı
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <Link
            href={`/employees/${row.original.id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {row.original.name}
          </Link>
          {row.original.role && (
            <p className="text-xs text-muted-foreground">{row.original.role}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'wage_amount',
      header: 'Maaş / Yevmiye',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold tabular-nums text-sm">
            {formatCurrency(row.original.wage_amount)}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {row.original.wage_type === 'monthly' ? 'Aylık' : 'Günlük'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'İçerideki Bakiye',
      cell: ({ row }) => {
        const bal = row.original.balance || 0
        if (bal === 0) return <span className="text-muted-foreground text-sm">Bakiyesiz</span>
        if (bal > 0) {
          return (
            <div className="flex flex-col">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums text-sm">
                +{formatCurrency(bal)}
              </span>
              <span className="text-[10px] text-emerald-600/70 font-medium">Personel Alacaklı</span>
            </div>
          )
        }
        return (
          <div className="flex flex-col">
            <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums text-sm">
              -{formatCurrency(Math.abs(bal))}
            </span>
            <span className="text-[10px] text-rose-600/70 font-medium">Firma Alacaklı</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'is_active',
      header: 'Durum',
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.original.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
          {row.original.is_active ? 'Aktif' : 'Ayrıldı'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              render={<Link href={`/employees/${row.original.id}`} className="flex items-center gap-2 w-full" />}
            >
              <Eye className="h-4 w-4" />
              Görüntüle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditEmployee(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteEmployee(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Personeller"
          description="Çalışanlarınızın maaş, yevmiye ve avans hesaplarını yönetin"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Maaş Listesi Yazdır
              </Button>
              <Button
                size="sm"
                onClick={() => { setEditEmployee(null); setFormOpen(true) }}
                id="new-employee-btn"
                className="rounded-xl"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Yeni Personel Ekle
              </Button>
            </div>
          }
        />

        {employees.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Henüz personel yok"
            description="Başlamak için ilk personelinizi ekleyin."
            actionLabel="Yeni Personel Ekle"
            onAction={() => { setEditEmployee(null); setFormOpen(true) }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={employees}
            searchKey="name"
            searchPlaceholder="Personellerde ara..."
            emptyMessage="Aramanıza uygun personel bulunamadı."
          />
        )}
      </div>

      {/* Print-only Collective Salary Sheet (Toplu Maaş ve İmza Listesi) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans w-full">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h2 className="text-2xl font-bold uppercase">PERSONEL TOPLU MAAŞ ÖDEME VE İMZA LİSTESİ</h2>
          <p className="text-xs text-gray-500 mt-1">Oluşturulma Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <table className="w-full text-xs border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th className="border border-gray-400 px-2 py-2 text-left">Personel Adı</th>
              <th className="border border-gray-400 px-2 py-2 text-left">Görevi / Ünvanı</th>
              <th className="border border-gray-400 px-2 py-2 text-right">Maaş/Yevmiye</th>
              <th className="border border-gray-400 px-2 py-2 text-right">Hakediş (+)</th>
              <th className="border border-gray-400 px-2 py-2 text-right">Ödenen (-)</th>
              <th className="border border-gray-400 px-2 py-2 text-right">Net Ödenecek</th>
              <th className="border border-gray-400 px-2 py-2 w-32">İmza</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-gray-400 text-center py-4 text-gray-500">
                  Kayıtlı personel bulunamadı.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const remaining = emp.total_earned - emp.total_paid
                return (
                  <tr key={emp.id} className="h-10">
                    <td className="border border-gray-400 px-2 py-1 font-semibold">{emp.name}</td>
                    <td className="border border-gray-400 px-2 py-1 text-gray-700">{emp.role || '—'}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">
                      {formatCurrency(emp.wage_amount)} ({emp.wage_type === 'monthly' ? 'Aylık' : 'Günlük'})
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right tabular-nums text-emerald-800 font-semibold">
                      {formatCurrency(emp.total_earned)}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right tabular-nums text-rose-800 font-semibold">
                      {formatCurrency(emp.total_paid)}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-right font-bold tabular-nums">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-center">
                      <div className="h-6 w-full border border-gray-200 border-dashed rounded bg-gray-50/50"></div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-between text-xs font-semibold px-4">
          <div>
            <p>Hazırlayan (Muhasebe/İKA)</p>
            <div className="h-16 w-32 border-b border-black"></div>
          </div>
          <div>
            <p>Onaylayan (Yönetici)</p>
            <div className="h-16 w-32 border-b border-black"></div>
          </div>
        </div>
      </div>

      <EmployeeFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditEmployee(null)
        }}
        employee={editEmployee}
        companyId={companyId}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteEmployee} onOpenChange={(open) => !open && setDeleteEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personeli Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteEmployee?.name}</strong> adlı personeli silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz ve maaş/avans geçmişini gizleyecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEmployee(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
