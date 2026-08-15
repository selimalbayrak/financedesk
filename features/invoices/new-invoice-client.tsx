'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Account, Stock } from '@/types/database.types'
import { createInvoice } from './actions'

interface NewInvoiceClientProps {
  accounts: Account[]
  stocks: Stock[]
}

interface InvoiceItemForm {
  stock_id: string
  quantity: number
  unit_price: number
  tax_rate: number
  total: number
}

export function NewInvoiceClient({ accounts, stocks }: NewInvoiceClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'PURCHASE' | 'SALES'>('SALES')
  const [accountId, setAccountId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  
  const [items, setItems] = useState<InvoiceItemForm[]>([{ stock_id: '', quantity: 1, unit_price: 0, tax_rate: 20, total: 0 }])

  const handleAddItem = () => {
    setItems([...items, { stock_id: '', quantity: 1, unit_price: 0, tax_rate: 20, total: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof InvoiceItemForm, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto calculate total for this line
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? value : newItems[index].quantity
      const p = field === 'unit_price' ? value : newItems[index].unit_price
      newItems[index].total = q * p
    }

    // Auto set price when stock selected
    if (field === 'stock_id') {
      const selectedStock = stocks.find(s => s.id === value)
      if (selectedStock) {
        newItems[index].unit_price = selectedStock.unit_price
        newItems[index].total = newItems[index].quantity * selectedStock.unit_price
      }
    }

    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = items.reduce((sum, item) => sum + (item.total * item.tax_rate / 100), 0)
  const grandTotal = totalAmount + taxAmount

  const filteredAccounts = accounts.filter(a => {
    if (type === 'SALES') return a.type === 'customer' || a.type === 'both'
    if (type === 'PURCHASE') return a.type === 'supplier' || a.type === 'both'
    return true
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accountId || !invoiceNumber || !issueDate) {
      toast.error('Lütfen zorunlu alanları doldurun.')
      return
    }

    if (items.length === 0 || items.some(i => !i.stock_id)) {
      toast.error('Lütfen geçerli fatura kalemleri ekleyin.')
      return
    }

    setLoading(true)

    try {
      await createInvoice({
        type,
        account_id: accountId,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        items
      })
      
      toast.success('Fatura başarıyla oluşturuldu (Taslak).')
      router.push('/invoices')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-24 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Yeni Fatura Kes</h1>
            <p className="text-muted-foreground">Satış veya alış faturası taslağı oluşturun.</p>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Kaydediliyor...' : 'Taslak Olarak Kaydet'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 rounded-3xl shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Fatura Detayları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fatura Tipi</Label>
                <div className="flex bg-muted p-1 rounded-xl w-full">
                  <Button
                    type="button"
                    variant={type === 'SALES' ? 'secondary' : 'ghost'}
                    onClick={() => setType('SALES')}
                    className={`rounded-lg flex-1 gap-2 ${type === 'SALES' ? 'bg-white shadow-sm text-green-600' : ''}`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Satış Faturası
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'PURCHASE' ? 'secondary' : 'ghost'}
                    onClick={() => setType('PURCHASE')}
                    className={`rounded-lg flex-1 gap-2 ${type === 'PURCHASE' ? 'bg-white shadow-sm text-red-600' : ''}`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Alış Faturası
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{type === 'SALES' ? 'Müşteri' : 'Tedarikçi'}</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')}>
                  <SelectTrigger className="h-11 rounded-xl bg-muted/50">
                    <SelectValue placeholder="Seçiniz..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64">
                    {filteredAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id} className="rounded-lg">
                        {(a as any).chart_of_accounts?.code ? `${(a as any).chart_of_accounts.code} - ${a.name}` : a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fatura No</Label>
                <Input 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)} 
                  placeholder="INV-0001" 
                  className="h-11 rounded-xl bg-muted/50" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Düzenleme Tarihi</Label>
                <Input 
                  type="date" 
                  value={issueDate} 
                  onChange={(e) => setIssueDate(e.target.value)} 
                  className="h-11 rounded-xl bg-muted/50" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Vade Tarihi (Opsiyonel)</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  className="h-11 rounded-xl bg-muted/50" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Toplamlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Ara Toplam</span>
              <span className="font-medium text-foreground">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Toplam KDV</span>
              <span className="font-medium text-foreground">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(taxAmount)}</span>
            </div>
            <div className="h-px w-full bg-border" />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">Genel Toplam</span>
              <span className="font-bold text-xl text-primary">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 rounded-3xl shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
            <CardTitle>Fatura Kalemleri</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="rounded-lg h-9 gap-2">
              <Plus className="w-4 h-4" />
              Satır Ekle
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium w-[40%]">Ürün / Hizmet</th>
                    <th className="h-10 px-4 text-left font-medium w-[15%]">Miktar</th>
                    <th className="h-10 px-4 text-left font-medium w-[15%]">Birim Fiyat</th>
                    <th className="h-10 px-4 text-left font-medium w-[10%]">KDV (%)</th>
                    <th className="h-10 px-4 text-right font-medium w-[15%]">Tutar</th>
                    <th className="h-10 px-4 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="p-3">
                        <Select value={item.stock_id} onValueChange={(val) => handleItemChange(index, 'stock_id', val)}>
                          <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue placeholder="Ürün seçin..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {stocks.map(s => (
                              <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                {s.code} - {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          min="0.001" 
                          step="any"
                          value={item.quantity || ''} 
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-10 rounded-lg"
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={item.unit_price || ''} 
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-10 rounded-lg"
                        />
                      </td>
                      <td className="p-3">
                        <Select value={item.tax_rate.toString()} onValueChange={(val) => handleItemChange(index, 'tax_rate', parseFloat(val || '0'))}>
                          <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl min-w-[80px]">
                            <SelectItem value="0" className="rounded-lg">%0</SelectItem>
                            <SelectItem value="1" className="rounded-lg">%1</SelectItem>
                            <SelectItem value="10" className="rounded-lg">%10</SelectItem>
                            <SelectItem value="20" className="rounded-lg">%20</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.total)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
