'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { paymentSchema, type PaymentFormValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { toKurus, formatCurrency, fromKurus } from '@/lib/utils'
import type { PayableWithAccount } from '@/types/database.types'

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payable: PayableWithAccount
}

export function RecordPaymentDialog({ open, onOpenChange, payable }: RecordPaymentDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const maxAmount = fromKurus(payable.remaining_amount)
  const paidAmount = fromKurus(payable.original_amount - payable.remaining_amount)
  const percentPaid = payable.original_amount > 0
    ? ((payable.original_amount - payable.remaining_amount) / payable.original_amount) * 100
    : 0

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: maxAmount,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  async function onSubmit(values: PaymentFormValues) {
    const supabase = createClient()
    const paymentKurus = toKurus(Math.min(values.amount, maxAmount))
    const newRemaining = Math.max(0, payable.remaining_amount - paymentKurus)
    const newStatus = newRemaining <= 0
      ? 'paid'
      : newRemaining < payable.original_amount
      ? 'partial'
      : 'pending'

    startTransition(async () => {
      await Promise.all([
        supabase.from('payable_payments').insert({
          payable_id: payable.id,
          amount: paymentKurus,
          payment_date: values.payment_date,
          notes: values.notes || null,
        }),
        supabase
          .from('payables')
          .update({
            remaining_amount: newRemaining,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payable.id),
      ])
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {payable.account.company_name || payable.account.name} — {payable.description}
          </DialogDescription>
        </DialogHeader>

        {/* Payment progress */}
        <div className="space-y-1.5 pb-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paid: {formatCurrency(toKurus(paidAmount))}</span>
            <span>Remaining: {formatCurrency(payable.remaining_amount)}</span>
          </div>
          <Progress value={percentPaid} className="h-1.5" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount (₺)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxAmount}
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Bank transfer ref #..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
