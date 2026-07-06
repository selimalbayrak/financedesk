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
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { payableSchema, type PayableFormValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { toKurus } from '@/lib/utils'
import type { Account, Payable } from '@/types/database.types'

interface PayableFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Pick<Account, 'id' | 'name' | 'company_name'>[]
  payable?: Payable | null
  defaultType?: 'payable' | 'receivable'
  companyId: string
}

export function PayableFormSheet({
  open,
  onOpenChange,
  accounts,
  payable,
  defaultType = 'payable',
  companyId,
}: PayableFormSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!payable

  const form = useForm<PayableFormValues>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      account_id: payable?.account_id ?? '',
      type: payable?.type ?? defaultType,
      description: payable?.description ?? '',
      original_amount: payable ? payable.original_amount / 100 : undefined,
      due_date: payable?.due_date ?? '',
      invoice_ref: payable?.invoice_ref ?? '',
      notes: payable?.notes ?? '',
    },
  })

  async function onSubmit(values: PayableFormValues) {
    const supabase = createClient()
    const amountKurus = toKurus(values.original_amount)

    startTransition(async () => {
      if (isEditing && payable) {
        await supabase
          .from('payables')
          .update({
            account_id: values.account_id,
            type: values.type,
            description: values.description,
            due_date: values.due_date || null,
            invoice_ref: values.invoice_ref || null,
            notes: values.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payable.id)
          .eq('company_id', companyId)
      } else {
        await supabase.from('payables').insert({
          company_id: companyId,
          account_id: values.account_id,
          type: values.type,
          description: values.description,
          original_amount: amountKurus,
          remaining_amount: amountKurus,
          due_date: values.due_date || null,
          invoice_ref: values.invoice_ref || null,
          notes: values.notes || null,
          status: 'pending',
        })
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Kaydı Düzenle' : 'Yeni Kayıt'}</SheetTitle>
          <SheetDescription>
            Tedarikçiye olan borcunuzu veya müşteriden alacağınızı kaydedin.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 px-1">

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kayıt Tipi *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payable">Borç (Benim ödeyeceğim)</SelectItem>
                      <SelectItem value="receivable">Alacak (Bana ödenecek)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cari Hesap *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Cari seçin..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.company_name || a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama *</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: Ocak ayı hizmet bedeli" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="original_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutar (₺) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      disabled={isEditing}
                    />
                  </FormControl>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Tutar sonradan değiştirilemez. Tahsilat/Ödeme ekleyerek kalanı düşürebilirsiniz.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date */}
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vade Tarihi</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invoice Ref */}
            <FormField
              control={form.control}
              name="invoice_ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fatura / Referans No</FormLabel>
                  <FormControl>
                    <Input placeholder="FAT-2025-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ek notlar..." rows={2} {...field} />
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
                {isEditing ? 'Kaydet' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
