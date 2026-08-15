'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { transferStock } from './actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Warehouse } from '@/types/database.types'

interface Stock {
  id: string
  name: string
  code: string
  quantity_on_hand: number
  unit: string | null
}

interface StockTransferFormProps {
  stocks: Stock[]
  warehouses: Warehouse[]
}

export function StockTransferForm({ stocks, warehouses }: StockTransferFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [stockId, setStockId] = useState<string>('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('')
  const [destWarehouseId, setDestWarehouseId] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stockId || !sourceWarehouseId || !destWarehouseId) {
      toast.error('Lütfen ürün ve depoları seçin.')
      return
    }

    if (sourceWarehouseId === destWarehouseId) {
      toast.error('Çıkış ve giriş deposu aynı olamaz.')
      return
    }

    const transferQty = parseFloat(quantity)
    if (isNaN(transferQty) || transferQty <= 0) {
      toast.error('Geçerli bir miktar girin.')
      return
    }

    setLoading(true)

    try {
      await transferStock({
        stock_id: stockId,
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destWarehouseId,
        quantity: transferQty,
        notes: notes
      })
      toast.success('Stok virmanı başarıyla tamamlandı!')
      setOpen(false)
      
      // Reset form
      setStockId('')
      setSourceWarehouseId('')
      setDestWarehouseId('')
      setQuantity('')
      setNotes('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedStock = stocks.find(s => s.id === stockId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-primary/20 bg-transparent hover:bg-primary/5 hover:text-accent-foreground h-10 px-4 py-2 gap-2 rounded-2xl">
          <ArrowRightLeft className="w-4 h-4" />
          Depolar Arası Transfer
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Stok Virmanı</DialogTitle>
          <DialogDescription>
            Ürünlerinizi depolarınız arasında transfer edin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Transfer Edilecek Ürün</Label>
            <Select value={stockId} onValueChange={(val) => setStockId(val || '')}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Ürün Seç" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {stocks.map(stock => (
                  <SelectItem key={stock.id} value={stock.id} className="rounded-lg">
                    {stock.code} - {stock.name} (Toplam: {stock.quantity_on_hand} {stock.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Çıkış Deposu</Label>
              <Select value={sourceWarehouseId} onValueChange={(val) => setSourceWarehouseId(val || '')}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Depo Seç" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id} className="rounded-lg">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Giriş Deposu</Label>
              <Select value={destWarehouseId} onValueChange={(val) => setDestWarehouseId(val || '')}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Depo Seç" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id} className="rounded-lg">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Transfer Miktarı {selectedStock ? `(${selectedStock.unit})` : ''}</Label>
            <Input 
              id="quantity" 
              type="number" 
              step="any"
              min="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0" 
              required 
              autoComplete="off"
              className="h-12 rounded-xl text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Açıklama (İsteğe Bağlı)</Label>
            <Input 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Merkezden şubeye sevk..." 
              autoComplete="off"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="rounded-xl h-12 px-6"
              disabled={loading}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              className="rounded-xl h-12 px-8 shadow-lg shadow-primary/25"
              disabled={loading}
            >
              {loading ? 'İşleniyor...' : 'Transferi Tamamla'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
