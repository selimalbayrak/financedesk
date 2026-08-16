'use client'

import { useState } from 'react'
import { Plus, Search, CarFront, Landmark, Computer, Trash2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { createFixedAsset, sellFixedAsset, deleteFixedAsset } from './actions'
import { toast } from 'sonner'
import type { FixedAsset, ChartOfAccount, Account } from '@/types/database.types'

interface AssetsClientProps {
  assets: FixedAsset[]
  assetGroups: ChartOfAccount[] // 250, 252, 253, 254, 255
  targetAccounts: Account[] // Cariler, Kasalar, Bankalar vb. (for sale)
}

export function AssetsClient({ assets, assetGroups, targetAccounts }: AssetsClientProps) {
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState<FixedAsset | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    (a.chart_of_accounts?.code && a.chart_of_accounts.code.includes(search))
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    
    const data = {
      name: formData.get('name') as string,
      purchase_date: formData.get('purchase_date') as string,
      purchase_price: Math.round(parseFloat(formData.get('purchase_price') as string || '0') * 100),
      parent_account_id: formData.get('parent_account_id') as string,
    }

    try {
      const res = await createFixedAsset(data)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Duran varlık başarıyla eklendi!')
        setShowAddModal(false)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault()
    if (!showSellModal) return
    setLoading(true)
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    
    const sale_price = Math.round(parseFloat(formData.get('sale_price') as string || '0') * 100)
    const target_account_id = formData.get('target_account_id') as string

    try {
      const res = await sellFixedAsset(showSellModal.id, sale_price, target_account_id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Satış işlemi başarıyla muhasebeleştirildi!')
        setShowSellModal(null)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz? (Bağlı hesap planı silinmez)')) return
    try {
      const res = await deleteFixedAsset(id)
      if (res.error) toast.error(res.error)
      else toast.success('Kayıt silindi')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maddi Duran Varlıklar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Araçlar, binalar, demirbaşlar ve ekipmanlarınız (25 Grubu).
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="rounded-xl h-10 px-4 shadow-lg shadow-primary/25 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Varlık Ekle
        </Button>
      </div>

      <Card className="rounded-2xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Varlık adı veya kod ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-background/50 border-muted"
            />
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="h-11 px-4 text-left font-medium text-muted-foreground">Kod</th>
                    <th className="h-11 px-4 text-left font-medium text-muted-foreground">Varlık Adı</th>
                    <th className="h-11 px-4 text-left font-medium text-muted-foreground">Alış Tarihi</th>
                    <th className="h-11 px-4 text-right font-medium text-muted-foreground">Maliyet Tutarı</th>
                    <th className="h-11 px-4 text-center font-medium text-muted-foreground">Durum</th>
                    <th className="h-11 px-4 text-right font-medium text-muted-foreground">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Computer className="w-8 h-8 opacity-20" />
                          <p>Kayıtlı varlık bulunamadı.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(asset => (
                      <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-mono text-xs">{asset.chart_of_accounts?.code}</td>
                        <td className="p-4 font-medium">{asset.name}</td>
                        <td className="p-4">{new Date(asset.purchase_date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(asset.purchase_price)}</td>
                        <td className="p-4 text-center">
                          {asset.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                              Satıldı / Çıkış
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {asset.status === 'ACTIVE' && (
                              <Button variant="outline" size="sm" onClick={() => setShowSellModal(asset)} className="h-8 rounded-lg text-xs font-medium">
                                <ArrowRightLeft className="w-3 h-3 mr-1.5" />
                                Satış / Çıkış
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)} className="h-8 w-8 text-muted-foreground hover:text-red-600 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Yeni Varlık Ekle</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="rounded-full">
                <Search className="w-5 h-5 opacity-0" />
              </Button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-5 overflow-y-auto">
              <div className="space-y-2">
                <Label>Varlık Grubu (Ana Hesap) *</Label>
                <Select name="parent_account_id" required>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Grup seçiniz..." />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {assetGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Varlık Adı *</Label>
                <Input name="name" required placeholder="Örn: 2024 Model Fiat Egea" className="h-11 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alış Tarihi *</Label>
                  <Input type="date" name="purchase_date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Maliyet / Alış Tutarı *</Label>
                  <Input type="number" step="0.01" name="purchase_price" required placeholder="0.00" className="h-11 rounded-xl text-right" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl h-11 px-6">İptal</Button>
                <Button type="submit" disabled={loading} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/25">
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-xl border overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Varlık Satışı / Çıkışı</h2>
                <p className="text-sm text-muted-foreground">{showSellModal.name}</p>
              </div>
            </div>
            
            <form onSubmit={handleSell} className="p-6 flex flex-col gap-5">
              <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maliyet Tutarı:</span>
                  <span className="font-medium">{formatCurrency(showSellModal.purchase_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hesap Kodu:</span>
                  <span className="font-medium">{showSellModal.chart_of_accounts?.code}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Satış Bedelinin Aktarılacağı Hesap *</Label>
                <Select name="target_account_id" required>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Kasa, Banka veya Cari Seçin..." />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {targetAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {(a as any).chart_of_accounts?.code ? `${(a as any).chart_of_accounts.code} - ${a.name}` : a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Bu hesap borçlandırılacaktır.</p>
              </div>

              <div className="space-y-2">
                <Label>Satış Bedeli (KDV Dahil) *</Label>
                <Input type="number" step="0.01" name="sale_price" required placeholder="0.00" className="h-11 rounded-xl text-right font-medium text-lg" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                <Button type="button" variant="outline" onClick={() => setShowSellModal(null)} className="rounded-xl h-11 px-6">İptal</Button>
                <Button type="submit" disabled={loading} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/25">
                  {loading ? 'İşleniyor...' : 'Satışı Onayla'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
