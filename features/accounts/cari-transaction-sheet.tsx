'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import type { SafeBalance } from '@/types/database.types'
import { processCariPayment } from '@/features/accounting/rpc-actions'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const formSchema = z.object({
  safe_id: z.string().min(1, 'Kasa/Banka seçmelisiniz.'),
  amount: z.number().min(0.01, 'Tutar 0 dan büyük olmalıdır.'),
  date: z.string().min(1, 'Tarih seçmelisiniz.'),
  description: z.string().optional(),
})

interface CariTransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  accountName: string
  safes: SafeBalance[]
  companyId: string
  direction: 'COLLECTION' | 'PAYMENT'
}

export function CariTransactionSheet({ 
  open, 
  onOpenChange, 
  accountId,
  accountName,
  safes,
  companyId,
  direction
}: CariTransactionSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      safe_id: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: direction === 'COLLECTION' ? 'Cari Tahsilat' : 'Cari Ödeme',
    },
  })

  // Reset form description when direction changes
  useState(() => {
    form.setValue('description', direction === 'COLLECTION' ? 'Cari Tahsilat' : 'Cari Ödeme')
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const supabase = createClient()
      const { error: txError } = await supabase.from('transactions').insert({
        company_id: companyId,
        account_id: accountId,
        safe_id: values.safe_id,
        transaction_type: direction === 'COLLECTION' ? 'payment_in' : 'payment_out',
        amount: Math.round(values.amount * 100),
        transaction_date: values.date,
        description: values.description,
        payment_method: 'Nakit'
      })

      if (txError) {
        toast.error('İşlem kaydedilemedi (Transactions): ' + txError.message)
        return
      }

      // 2. Accounting RPC
      const result = await processCariPayment(
        accountId,
        values.safe_id,
        values.amount * 100, // Cents
        values.date,
        values.description || (direction === 'COLLECTION' ? 'Tahsilat' : 'Ödeme'),
        direction
      )

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('İşlem başarıyla kaydedildi.')
        onOpenChange(false)
        form.reset()
        router.refresh()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{direction === 'COLLECTION' ? 'Para Al (Tahsilat)' : 'Para Gönder (Ödeme)'}</SheetTitle>
          <SheetDescription>
            {accountName} carisine ait {direction === 'COLLECTION' ? 'tahsilat' : 'ödeme'} işlemini giriyorsunuz.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 px-1">
            
            <FormField
              control={form.control}
              name="safe_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{direction === 'COLLECTION' ? 'Paranın Gireceği Kasa/Banka *' : 'Paranın Çıkacağı Kasa/Banka *'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Kasa seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {safes.map(safe => (
                        <SelectItem key={safe.id} value={safe.id}>
                          {(safe as any).account_code ? `${(safe as any).account_code} - ${safe.name}` : safe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
