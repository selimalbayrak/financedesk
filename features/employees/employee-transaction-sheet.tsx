'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/ui/money-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { employeeTransactionSchema, type EmployeeTransactionFormValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import type { SafeBalance } from '@/types/database.types'

interface EmployeeTransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  safes: SafeBalance[]
  companyId: string
  wageAmount: number
  wageType: string
}

export function EmployeeTransactionSheet({ 
  open, 
  onOpenChange, 
  employeeId, 
  safes, 
  companyId, 
  wageAmount,
  wageType 
}: EmployeeTransactionSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<EmployeeTransactionFormValues>({
    resolver: zodResolver(employeeTransactionSchema),
    defaultValues: {
      transaction_type: 'advance_payment',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      safe_id: '',
    },
  })

  const watchTxType = form.watch('transaction_type')
  useEffect(() => {
    if (watchTxType === 'advance_payment') {
      form.setValue('description', 'Avans Ödemesi')
    } else if (watchTxType === 'salary_payment') {
      form.setValue('description', 'Maaş Ödemesi')
    }
  }, [watchTxType, form])

  async function onSubmit(values: EmployeeTransactionFormValues) {
    const supabase = createClient()
    const cleanValues = {
      ...values,
      safe_id: values.safe_id === '' ? null : values.safe_id,
      company_id: companyId,
      employee_id: employeeId
    }

    startTransition(async () => {
      await supabase.from('employee_transactions').insert(cleanValues)
      onOpenChange(false)
      form.reset()
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Personel İşlemi Ekle</SheetTitle>
          <SheetDescription>
            Avans veya maaş ödemesi yapın. Hakedişler takvim üzerinden hesaplanır.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 px-1">
            
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İşlem Türü *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tür seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="advance_payment">Avans Ödemesi</SelectItem>
                      <SelectItem value="salary_payment">Maaş Ödemesi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(watchTxType === 'advance_payment' || watchTxType === 'salary_payment') && (
              <FormField
                control={form.control}
                name="safe_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ödemenin Yapılacağı Kasa *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kasa seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {safes.map(safe => (
                          <SelectItem key={safe.id} value={safe.id}>
                            {safe.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İşlem Tarihi *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutar (TL) *</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Input placeholder="İşlem açıklaması" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2 pb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                İptal
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                İşlemi Kaydet
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
