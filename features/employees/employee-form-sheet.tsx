'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { employeeSchema, type EmployeeFormValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import type { EmployeeBalance } from '@/types/database.types'

interface EmployeeFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: EmployeeBalance | null
  companyId: string
}

export function EmployeeFormSheet({ open, onOpenChange, employee, companyId }: EmployeeFormSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!employee

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? '',
      role: employee?.role ?? '',
      start_date: employee?.start_date ?? '',
      wage_type: (employee?.wage_type as any) ?? 'monthly',
      wage_amount: employee ? employee.wage_amount / 100 : 0,
      daily_food_allowance: employee ? employee.daily_food_allowance / 100 : 0,
      daily_transport_allowance: employee ? employee.daily_transport_allowance / 100 : 0,
      is_active: employee?.is_active ?? true,
    },
  })

  async function onSubmit(values: EmployeeFormValues) {
    const supabase = createClient()
    const cleanValues = {
      ...Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
      ),
      wage_amount: Math.round(values.wage_amount * 100),
      daily_food_allowance: Math.round(values.daily_food_allowance * 100),
      daily_transport_allowance: Math.round(values.daily_transport_allowance * 100)
    }

    startTransition(async () => {
      const db = supabase
      if (isEditing && employee) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from('employees')
          .update({ ...cleanValues, updated_at: new Date().toISOString() })
          .eq('id', employee.id)
          .eq('company_id', companyId)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from('employees').insert({ ...cleanValues, company_id: companyId })
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Personel bilgilerini güncelleyin.' : 'Şirketinize yeni bir çalışan ekleyin.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 px-1">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Soyad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ahmet Yılmaz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Görevi / Pozisyonu</FormLabel>
                  <FormControl>
                    <Input placeholder="Usta, Kalfa, Muhasebeci vb." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İşe Başlama Tarihi</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="wage_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ücret Tipi *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tip seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Aylık Maaş</SelectItem>
                        <SelectItem value="daily">Günlük Yevmiye</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wage_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ücret Tutarı (TL) *</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="daily_food_allowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Günlük Yemek (TL)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daily_transport_allowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Günlük Yol (TL)</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-2 pb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Kaydet' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
