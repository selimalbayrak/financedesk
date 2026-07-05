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
}

export function PayableFormSheet({
  open,
  onOpenChange,
  accounts,
  payable,
  defaultType = 'payable',
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
      } else {
        await supabase.from('payables').insert({
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
          <SheetTitle>{isEditing ? 'Edit' : 'New'} Payable / Receivable</SheetTitle>
          <SheetDescription>
            Record an amount owed to or from an account.
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
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payable">Payable (I owe)</SelectItem>
                      <SelectItem value="receivable">Receivable (They owe me)</SelectItem>
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
                  <FormLabel>Account *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account..." />
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
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. January invoice payment" {...field} />
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
                  <FormLabel>Amount (₺) *</FormLabel>
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
                      Amount cannot be changed after creation. Record a payment to reduce balance.
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
                  <FormLabel>Due Date</FormLabel>
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
                  <FormLabel>Invoice Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-2025-001" {...field} />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2 pb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
