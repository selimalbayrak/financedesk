'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoneyInput } from '@/components/ui/money-input'
import { createChequeNote } from './actions'
import { toast } from 'sonner'

export function ChequeForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [type, setType] = useState<'cheque' | 'promissory_note'>('cheque')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      await createChequeNote({
        type: formData.get('type') as any,
        direction: formData.get('direction') as any,
        amount,
        issue_date: formData.get('issue_date') as string,
        due_date: formData.get('due_date') as string,
        contact_name: formData.get('contact_name') as string,
        bank_name: formData.get('bank_name') as string,
        document_number: formData.get('document_number') as string,
        notes: formData.get('notes') as string,
      })
      toast.success('Başarıyla eklendi!')
      router.push('/finance?tab=cheques')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in-up">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni Çek / Senet</h1>
      </div>

      <form onSubmit={onSubmit} className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Evrak Tipi</Label>
            <Select name="type" required value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cheque">Çek</SelectItem>
                <SelectItem value="promissory_note">Senet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Yönü</Label>
            <Select name="direction" required defaultValue="in">
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Alınan (Müşteriden)</SelectItem>
                <SelectItem value="out">Verilen (Tedarikçiye)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tutar</Label>
          <MoneyInput name="amount" value={amount} onChange={setAmount} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Düzenlenme Tarihi</Label>
            <Input name="issue_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Vade Tarihi</Label>
            <Input name="due_date" type="date" required className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Muhatap (Kimden Alındı / Kime Verildi)</Label>
          <Input name="contact_name" required placeholder="Firma veya kişi adı" className="h-12 rounded-xl" />
        </div>

        {type === 'cheque' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banka Adı</Label>
              <Input name="bank_name" placeholder="Örn: Garanti BBVA" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Belge Numarası</Label>
              <Input name="document_number" placeholder="Çek numarası" className="h-12 rounded-xl" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Notlar</Label>
          <Textarea name="notes" placeholder="İsteğe bağlı notlar..." className="min-h-[100px] rounded-xl" />
        </div>

        <Button type="submit" size="lg" className="w-full h-12 rounded-xl" disabled={loading}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </form>
    </div>
  )
}
