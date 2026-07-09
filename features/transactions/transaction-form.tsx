'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, PackagePlus, PackageMinus, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTransaction } from './actions'
import { toast } from 'sonner'

type Account = {
  id: string
  name: string
  company_name: string | null
}

const TRANSACTION_TYPES = [
  { id: 'payment_out', label: 'Gönderilen Ödeme', icon: ArrowUpCircle, color: 'text-rose-500' },
  { id: 'payment_in', label: 'Alınan Ödeme', icon: ArrowDownCircle, color: 'text-emerald-500' },
  { id: 'invoice_out', label: 'Fatura Kestik (Verilen)', icon: PackageMinus, color: 'text-emerald-500' },
  { id: 'invoice_in', label: 'Fatura Geldi (Alınan)', icon: PackagePlus, color: 'text-rose-500' },
  { id: 'safe_transfer', label: 'Kasalar Arası Transfer', icon: ArrowRightLeft, color: 'text-blue-500' },
] as const

const PAYMENT_METHODS = [
  'Nakit', 'Havale/EFT', 'Kredi Kartı', 'Çek', 'Senet'
]

export function TransactionForm({ accounts, safes }: { accounts: Account[], safes: Array<{id: string, name: string}> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<typeof TRANSACTION_TYPES[number]['id']>('payment_out')
  const [paymentMethod, setPaymentMethod] = useState<string>('Nakit')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const amountStr = formData.get('amount') as string
    const amount = Math.round(parseFloat(amountStr.replace(',', '.')) * 100)

    try {
      await createTransaction({
        account_id: type === 'safe_transfer' ? undefined : (formData.get('account_id') as string),
        safe_id: formData.get('safe_id') as string,
        to_safe_id: type === 'safe_transfer' ? (formData.get('to_safe_id') as string) : undefined,
        transaction_type: type,
        amount,
        description: formData.get('description') as string,
        transaction_date: formData.get('transaction_date') as string,
        invoice_number: (type === 'invoice_in' || type === 'invoice_out') 
          ? (formData.get('invoice_number') as string)
          : undefined,
        payment_method: (type === 'payment_in' || type === 'payment_out' || type === 'safe_transfer') 
          ? paymentMethod
          : undefined,
        bank_detail: (paymentMethod === 'Havale/EFT') ? (formData.get('bank_detail') as string) : undefined
      })
      toast.success('İşlem başarıyla eklendi!')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni İşlem Ekle</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-4">
          <Label>Ne İşlemi Eklemek İstiyorsunuz?</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TRANSACTION_TYPES.map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  type === t.id 
                    ? 'border-primary bg-primary/5 shadow-sm scale-[1.02]' 
                    : 'border-border/50 hover:bg-muted'
                }`}
              >
                <t.icon className={`w-8 h-8 ${t.color}`} />
                <span className="text-sm font-medium text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {type !== 'safe_transfer' && (
              <div className="space-y-2">
                <Label htmlFor="account_id">Cari Hesap (Kişi/Firma)</Label>
                <Select name="account_id" required>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Bir cari seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.company_name || acc.name} {acc.company_name ? `(${acc.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="safe_id">{type === 'safe_transfer' ? 'Gönderen Kasa/Banka' : 'Hangi Kasadan/Kasaya?'}</Label>
              <Select name="safe_id" required>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Kasa seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {safes.map(safe => (
                    <SelectItem key={safe.id} value={safe.id}>
                      {safe.name}
                    </SelectItem>
                  ))}
                  {safes.length === 0 && (
                    <SelectItem value="none" disabled>Kasa bulunamadı</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {type === 'safe_transfer' && (
              <div className="space-y-2">
                <Label htmlFor="to_safe_id">Alan Kasa/Banka</Label>
                <Select name="to_safe_id" required>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Alıcı kasa seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {safes.map(safe => (
                      <SelectItem key={safe.id} value={safe.id}>
                        {safe.name}
                      </SelectItem>
                    ))}
                    {safes.length === 0 && (
                      <SelectItem value="none" disabled>Kasa bulunamadı</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (TL)</Label>
              <Input 
                id="amount" 
                name="amount" 
                type="number" 
                step="0.01" 
                min="0"
                required 
                className="h-12 rounded-xl text-lg font-semibold"
                placeholder="0.00" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Tarih</Label>
              <Input 
                id="transaction_date" 
                name="transaction_date" 
                type="date" 
                required 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          {(type === 'invoice_in' || type === 'invoice_out') && (
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Fatura Numarası (İsteğe bağlı)</Label>
              <Input 
                id="invoice_number" 
                name="invoice_number" 
                className="h-12 rounded-xl uppercase"
                placeholder="Örn: ABC2024000000123" 
              />
            </div>
          )}

          {(type === 'payment_out' || type === 'payment_in' || type === 'safe_transfer') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Ödeme Şekli</Label>
                <Select name="payment_method" value={paymentMethod} onValueChange={(val) => { if (val) setPaymentMethod(val) }}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {paymentMethod === 'Havale/EFT' && (
                <div className="space-y-2">
                  <Label htmlFor="bank_detail">Banka Adı / Detayı (İsteğe bağlı)</Label>
                  <Input 
                    id="bank_detail" 
                    name="bank_detail" 
                    className="h-12 rounded-xl"
                    placeholder="Örn: Ziraat, Garanti..." 
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama (İsteğe bağlı)</Label>
            <Textarea 
              id="description" 
              name="description" 
              className="resize-none rounded-xl"
              placeholder="Örn: Nisan ayı taksidi, Kömür alımı vb."
            />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          {loading ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
        </Button>
      </form>
    </div>
  )
}
