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
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { accountSchema, type AccountFormValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/types/database.types'

interface AccountFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
  companyId: string
}

export function AccountFormSheet({ open, onOpenChange, account, companyId }: AccountFormSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!account

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: account?.type ?? 'customer',
      name: account?.name ?? '',
      company_name: account?.company_name ?? '',
      tax_number: account?.tax_number ?? '',
      tax_office: account?.tax_office ?? '',
      email: account?.email ?? '',
      phone: account?.phone ?? '',
      address: account?.address ?? '',
      city: account?.city ?? '',
      notes: account?.notes ?? '',
    },
  })

  async function onSubmit(values: AccountFormValues) {
    const supabase = createClient()
    const cleanValues = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
    )

    startTransition(async () => {
      const db = supabase
      if (isEditing && account) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from('accounts')
          .update({ ...cleanValues, updated_at: new Date().toISOString() })
          .eq('id', account.id)
          .eq('company_id', companyId)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from('accounts').insert({ ...cleanValues, company_id: companyId })
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Cari Düzenle' : 'Yeni Cari Hesap'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Cari hesap bilgilerini güncelleyin.' : 'Yeni bir müşteri veya tedarikçi hesabı oluşturun.'}
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
                  <FormLabel>Hesap Tipi *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tip seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">Müşteri</SelectItem>
                      <SelectItem value="supplier">Tedarikçi</SelectItem>
                      <SelectItem value="both">İkisi de</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yetkili / Ad Soyad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ahmet Yılmaz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company */}
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firma Ünvanı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örnek Ltd. Şti." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vergi Bilgileri</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tax_number"
                render={({ field }) => (
                  <FormItem>
                     <FormLabel>Vergi / TC Kimlik No</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_office"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vergi Dairesi</FormLabel>
                    <FormControl>
                      <Input placeholder="Kadıköy VD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">İletişim</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Posta</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ornek@firma.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="0555 000 0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şehir</FormLabel>
                    <FormControl>
                      <Input placeholder="İstanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Açık adres..." rows={2} {...field} />
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
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cari ile ilgili ek notlar..." rows={3} {...field} />
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
