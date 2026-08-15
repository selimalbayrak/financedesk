'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Pencil, Trash2, X, RefreshCw, ArrowRightLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { createStock, updateStock, deleteStock, addStockMovement, createStockCategory, initializeUniformChartOfAccounts, createStockSubAccount } from './actions'
import { toast } from 'sonner'
import { useHotkeys } from 'react-hotkeys-hook'
import * as XLSX from 'xlsx'
import type { Stock, StockMovement, Account, ChartOfAccount, Warehouse } from '@/types/database.types'
import { StockTransferForm } from './stock-transfer-form'

interface StocksClientProps {
  stocks: Stock[]
  movements: StockMovement[]
  accounts: Account[]
  chartOfAccounts: ChartOfAccount[]
  warehouses: Warehouse[]
}

export function StocksClient({ stocks, movements, accounts, chartOfAccounts: initialAccounts, warehouses }: StocksClientProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items')

  // New Stock Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [editStock, setEditStock] = useState<Stock | null>(null)
  
  // Category State
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(initialAccounts)
  const [selectedCatId, setSelectedCatId] = useState<string>('')
  const [showNewCatModal, setShowNewCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatParentId, setNewCatParentId] = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [attributes, setAttributes] = useState<Record<string, any>>({})

  // Stock Movement Modal State
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [movementStock, setMovementStock] = useState<Stock | null>(null)
  const [movementType, setMovementType] = useState<'in' | 'out'>('in')
  const [movementQty, setMovementQty] = useState('1')
  const [movementUnitPrice, setMovementUnitPrice] = useState('0')
  const [movementAccountId, setMovementAccountId] = useState('')
  const [movementNotes, setMovementNotes] = useState('')

  const [loading, setLoading] = useState(false)

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName || !newCatParentId) return
    setCatLoading(true)
    try {
      const res = await createStockSubAccount(newCatName, newCatParentId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Kategori başarıyla oluşturuldu!')
        setChartOfAccounts([...chartOfAccounts, res.data])
        setSelectedCatId(res.data.id)
        setShowNewCatModal(false)
        setNewCatName('')
        setNewCatParentId('')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCatLoading(false)
    }
  }
  const [trackMinStock, setTrackMinStock] = useState(false)

  // Set trackMinStock when editing
  useEffect(() => {
    if (editStock) {
      if (Number(editStock.min_stock_level) > 0) {
        setTrackMinStock(true)
      } else {
        setTrackMinStock(false)
      }
    } else {
      setTrackMinStock(false)
    }
  }, [editStock])

  // Unique categories for filter
  const catFilterOptions = chartOfAccounts.map(c => ({ id: c.id, name: c.code + ' - ' + c.name }))

  // Filtered stocks
  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.code.toLowerCase().includes(search.toLowerCase()) ||
                          (s.chart_of_accounts?.name?.toLowerCase().includes(search.toLowerCase()))
    const matchesCat = selectedCategory === 'all' || s.chart_of_account_id === selectedCategory
    return matchesSearch && matchesCat
  })

  // Summary Metrics
  const totalItems = stocks.length
  const lowStockItems = stocks.filter(s => Number(s.quantity_on_hand) <= Number(s.min_stock_level || 0))
  const totalValue = stocks.reduce((acc, s) => acc + (Number(s.quantity_on_hand) * Number(s.unit_price || 0)), 0)

  // Handle Category Select
  const handleCategoryChange = (val: string | null) => {
    if (!val) return
    setSelectedCatId(val)
    if (!editStock || editStock.chart_of_account_id !== val) {
      setAttributes({}) // reset attributes on category change
    }
  }

  // Handle Add/Edit Stock Submit
  const handleStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const data = {
      name: formData.get('name') as string,
      chart_of_account_id: selectedCatId,
      attributes: attributes,
      unit: formData.get('unit') as string || 'Adet',
      unit_price: Math.round(parseFloat(formData.get('unit_price') as string || '0') * 100),
      quantity_on_hand: parseFloat(formData.get('quantity_on_hand') as string || '0'),
      min_stock_level: parseFloat(formData.get('min_stock_level') as string || '0'),
      description: formData.get('description') as string,
    }

    try {
      let res
      if (editStock) {
        res = await updateStock(editStock.id, data)
      } else {
        res = await createStock(data)
      }

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(editStock ? 'Stok ürünü güncellendi!' : 'Yeni stok ürünü eklendi!')
        setShowAddModal(false)
        setEditStock(null)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Stock Movement Submit
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementStock) return
    setLoading(true)

    try {
      const res = await addStockMovement({
        stock_id: movementStock.id,
        account_id: movementAccountId || undefined,
        movement_type: movementType,
        quantity: parseFloat(movementQty || '0'),
        unit_price: Math.round(parseFloat(movementUnitPrice || '0') * 100),
        notes: movementNotes || undefined
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(movementType === 'in' ? 'Stok girişi kaydedildi!' : 'Stok çıkışı kaydedildi!')
        setShowMovementModal(false)
        setMovementStock(null)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ürününü silmek istediğinize emin misiniz?`)) return
    const res = await deleteStock(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Stok ürünü silindi.')
    }
  }

  const handleOpenAddModal = () => {
    setEditStock(null)
    setSelectedCatId('')
    setAttributes({})
    setShowAddModal(true)
  }

  // Hotkeys
  useHotkeys('ctrl+n, cmd+n', (e) => {
    e.preventDefault()
    handleOpenAddModal()
  }, { enableOnFormTags: false })

  useHotkeys('ctrl+e, cmd+e', (e) => {
    e.preventDefault()
    exportToExcel()
  }, { enableOnFormTags: false })

  const handleInitAccounts = async () => {
    if (window.confirm('UYARI: Mevcut tüm stok ve kategoriler silinerek Tekdüzen Hesap Planı başlatılacak. Emin misiniz?')) {
      setLoading(true)
      const res = await initializeUniformChartOfAccounts()
      if (res.error) toast.error(res.error)
      else {
        toast.success('Tekdüzen Hesap Planı başarıyla başlatıldı!')
        window.location.reload()
      }
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const data = filteredStocks.map(s => ({
      'Stok Kodu': s.code,
      'Stok Adı': s.name,
      'Kategori': s.chart_of_accounts?.name || '',
      'Birim': s.unit || '',
      'Birim Fiyatı': s.unit_price / 100,
      'Miktar': s.quantity_on_hand,
      'Kritik Seviye': s.min_stock_level,
      'Açıklama': s.description || '',
      'Oluşturan (ID)': s.created_by || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Stok_Listesi")
    XLSX.writeFile(wb, "Stok_Listesi.xlsx")
  }

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Stok & Ürün Takibi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deponuzdaki tüm hammaddeleri, mamulleri ve stok hareketlerini anlık takip edin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} title="Excel'e Aktar (Ctrl+E)" className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 rounded-lg">
            <Download className="w-4 h-4" />
            Dışa Aktar
          </Button>
          <StockTransferForm stocks={stocks} warehouses={warehouses} />
          <Button onClick={handleOpenAddModal} title="Yeni Stok Ekle (Ctrl+N)" className="rounded-xl shadow-md gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Yeni Stok Ekle
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Toplam Ürün Çeşidi</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalItems} Kalem</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kritik Stok Uyarısı</p>
              <p className={`text-2xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                {lowStockItems.length} Ürün Azaldı
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${lowStockItems.length > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Toplam Stok Değeri</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <RefreshCw className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border p-3 rounded-2xl">
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'items' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('items')}
              size="sm"
              className="rounded-xl text-xs"
            >
              Stok Ürünleri ({stocks.length})
            </Button>
            <Button 
              variant={activeTab === 'movements' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('movements')}
              size="sm"
              className="rounded-xl text-xs"
            >
              Stok Hareket Geçmişi ({movements.length})
            </Button>
          </div>

          {activeTab === 'items' && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Koda, isme göre ara..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs"
                />
              </div>

              {catFilterOptions.length > 0 && (
                <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val!)}>
                  <SelectTrigger className="h-9 w-36 text-xs rounded-xl truncate">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border z-[200]">
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    {catFilterOptions.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Stock Items Table */}
        {activeTab === 'items' && (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Stok Kodu</th>
                    <th className="px-4 py-3">Ürün Adı / Açıklama</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-right">Mevcut Miktar</th>
                    <th className="px-4 py-3 text-right">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right">Toplam Değer</th>
                    <th className="px-4 py-3 text-center">Durum</th>
                    <th className="px-4 py-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Henüz stok kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map(stock => {
                      const isLow = Number(stock.min_stock_level) > 0 && Number(stock.quantity_on_hand) <= Number(stock.min_stock_level)
                      const stockVal = Number(stock.quantity_on_hand) * Number(stock.unit_price || 0)

                      return (
                        <tr key={stock.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-primary">
                            {stock.code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{stock.name}</div>
                            {stock.description && (
                              <div className="text-[11px] text-muted-foreground">{stock.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {stock.chart_of_accounts?.name ? (
                              <span className="bg-muted px-2 py-0.5 rounded-md font-medium">
                                {stock.chart_of_accounts.name}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">
                            {stock.quantity_on_hand} <span className="text-xs text-muted-foreground font-normal">{stock.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-xs">
                            {formatCurrency(stock.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(stockVal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {Number(stock.min_stock_level) > 0 ? (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isLow ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              }`}>
                                {isLow ? 'Azaldı' : 'Yeterli'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
                                onClick={() => {
                                  setMovementStock(stock)
                                  setMovementType('in')
                                  setMovementUnitPrice((stock.unit_price / 100).toString())
                                  setShowMovementModal(true)
                                }}
                              >
                                Giriş/Çıkış
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg cursor-pointer text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditStock(stock)
                                  setSelectedCatId(stock.chart_of_account_id || '')
                                  setAttributes(stock.attributes || {})
                                  setShowAddModal(true)
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg cursor-pointer text-muted-foreground hover:text-rose-600"
                                onClick={() => handleDelete(stock.id, stock.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 2: Stock Movements History */}
        {activeTab === 'movements' && (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">İşlem Tipi</th>
                    <th className="px-4 py-3">Stok Kodu / Ürün</th>
                    <th className="px-4 py-3">Cari Hesap</th>
                    <th className="px-4 py-3 text-right">Miktar</th>
                    <th className="px-4 py-3 text-right">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right">Toplam Tutar</th>
                    <th className="px-4 py-3">Notlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Henüz stok hareket kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    movements.map(m => {
                      const stock = stocks.find(s => s.id === m.stock_id)
                      const account = accounts.find(a => a.id === m.account_id)
                      const isIn = m.movement_type === 'in'

                      return (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            {new Date(m.movement_date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isIn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            }`}>
                              {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {isIn ? 'Stok Girişi' : 'Stok Çıkışı'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{stock?.name || 'Bilinmeyen Ürün'}</div>
                            <div className="text-xs text-muted-foreground font-mono">{stock?.code}</div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {account ? account.company_name || account.name : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">
                            {m.quantity} {stock?.unit}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-xs">
                            {formatCurrency(m.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
                            {formatCurrency(m.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {m.notes || '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal 1: Add/Edit Stock */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <form onSubmit={handleStockSubmit} className="relative bg-card border w-full max-w-md p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b shrink-0">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Package className="w-5 h-5" />
                {editStock ? 'Stok Ürününü Düzenle' : 'Yeni Stok Kartı Ekle'}
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto pr-2 pb-2 -mr-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category">Üst Kategori Seçimi *</Label>
                    <button type="button" onClick={() => setShowNewCatModal(true)} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Yeni Kategori Ekle
                    </button>
                  </div>
                  <Select value={selectedCatId || undefined} onValueChange={handleCategoryChange} required>
                    <SelectTrigger className="h-9 rounded-lg truncate w-full">
                      <SelectValue placeholder="Hesap Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border z-[200] max-w-[250px]">
                      {chartOfAccounts.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="truncate">{cat.code} - {cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unit">Birim</Label>
                  <Select name="unit" defaultValue={editStock?.unit || 'Adet'}>
                    <SelectTrigger className="h-9 rounded-lg">
                      <SelectValue placeholder="Birim Seç" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border z-[200]">
                      <SelectItem value="Adet">Adet</SelectItem>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Gram">Gram</SelectItem>
                      <SelectItem value="Litre">Litre</SelectItem>
                      <SelectItem value="Ton">Ton</SelectItem>
                      <SelectItem value="Metre">Metre</SelectItem>
                      <SelectItem value="Paket">Paket</SelectItem>
                      <SelectItem value="Kutu">Kutu</SelectItem>
                      <SelectItem value="Çuval">Çuval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="name">Ürün Adı *</Label>
                <Input id="name" name="name" defaultValue={editStock?.name || ''} placeholder="Örn: 20x20 Profil Boru" required className="h-9 rounded-lg" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="unit_price">Birim Fiyat (TL)</Label>
                  <Input id="unit_price" name="unit_price" type="number" step="0.01" defaultValue={editStock ? (editStock.unit_price / 100) : ''} placeholder="0.00" className="h-9 rounded-lg" />
                </div>
              </div>



              <div className="space-y-1 mt-2">
                <Label htmlFor="quantity_on_hand">Mevcut Stok Miktarı</Label>
                <Input id="quantity_on_hand" name="quantity_on_hand" type="number" step="any" defaultValue={editStock?.quantity_on_hand || '0'} className="h-9 rounded-lg" />
              </div>

              <div className="p-3 bg-muted/20 border rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={trackMinStock} 
                    onChange={e => setTrackMinStock(e.target.checked)} 
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-medium text-foreground">Kritik Stok Uyarısı Kullan</span>
                </label>
                {trackMinStock && (
                  <div className="pl-6 space-y-1 animate-in-up fade-in duration-200">
                    <Label htmlFor="min_stock_level" className="text-muted-foreground">Uyarı Sınırı (Min Limit)</Label>
                    <Input id="min_stock_level" name="min_stock_level" type="number" step="any" defaultValue={editStock?.min_stock_level || '10'} className="h-9 rounded-lg" />
                  </div>
                )}
                {!trackMinStock && (
                  <input type="hidden" name="min_stock_level" value="0" />
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">Açıklama / Notlar</Label>
                <Input id="description" name="description" defaultValue={editStock?.description || ''} className="h-9 rounded-lg" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="rounded-xl">İptal</Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-6">{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Stock Movement (Giriş/Çıkış) */}
      {showMovementModal && movementStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowMovementModal(false)} />
          <form onSubmit={handleMovementSubmit} className="relative bg-card border w-full max-w-sm p-6 rounded-3xl shadow-lg space-y-4 z-10 animate-in-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Stok Giriş / Çıkış
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowMovementModal(false)} className="rounded-full h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-xs">
              <span className="text-muted-foreground">Ürün: </span>
              <span className="font-bold text-foreground">{movementStock.name} ({movementStock.code})</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>İşlem Yönü</Label>
                <Select value={movementType} onValueChange={(val: any) => setMovementType(val)}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border z-[200]">
                    <SelectItem value="in">Stok Girişi (Alış/Depoya Ekle)</SelectItem>
                    <SelectItem value="out">Stok Çıkışı (Satış/Depodan Düş)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Miktar ({movementStock.unit})</Label>
                  <Input type="number" step="any" value={movementQty} onChange={e => setMovementQty(e.target.value)} required className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label>Birim Fiyat (TL)</Label>
                  <Input type="number" step="0.01" value={movementUnitPrice} onChange={e => setMovementUnitPrice(e.target.value)} className="h-9 rounded-lg" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>İlişkili Cari Hesap (Opsiyonel)</Label>
                <Select value={movementAccountId} onValueChange={(val) => setMovementAccountId(val!)}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Cari hesap seçin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border z-[200]">
                    <SelectItem value="">Seçim Yok</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.company_name || acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Açıklama / Fatura No</Label>
                <Input value={movementNotes} onChange={e => setMovementNotes(e.target.value)} placeholder="Örn: Fatura No: 123456" className="h-9 rounded-lg" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setShowMovementModal(false)} className="rounded-xl">İptal</Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95">
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCatModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-xl border overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Yeni Alt Kategori Ekle</h2>
                <p className="text-sm text-muted-foreground mt-1">Stoklarınız için yeni bir alt hesap grubu oluşturun.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowNewCatModal(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateCategory} className="p-6 flex flex-col gap-5">
              <div className="space-y-2">
                <Label>Ana Grup Seçimi *</Label>
                <Select value={newCatParentId} onValueChange={setNewCatParentId} required>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Örn: 153 Ticari Mallar" />
                  </SelectTrigger>
                  <SelectContent className="z-[250]">
                    {chartOfAccounts.filter(a => a.type === 'SUB').map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.code} - {cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kategori Adı *</Label>
                <Input 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)} 
                  placeholder="Örn: Gıda Ürünleri" 
                  required 
                  className="h-10 rounded-xl"
                  autoComplete="off"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowNewCatModal(false)} className="rounded-xl h-10 px-5" disabled={catLoading}>İptal</Button>
                <Button type="submit" className="rounded-xl h-10 px-6 shadow-lg shadow-primary/25" disabled={catLoading}>
                  {catLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
