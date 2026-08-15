const fs = require('fs');
let file = fs.readFileSync('features/stocks/stocks-client.tsx', 'utf8');

file = file.replace(
  'const [selectedCatId, setSelectedCatId] = useState<string>(\'\')',
  `const [selectedCatId, setSelectedCatId] = useState<string>('')
  const [showNewCatModal, setShowNewCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatParentId, setNewCatParentId] = useState('')
  const [catLoading, setCatLoading] = useState(false)`
);

file = file.replace(
  'const [loading, setLoading] = useState(false)',
  `const [loading, setLoading] = useState(false)

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
  }`
);

file = file.replace(
  `<Label htmlFor="category">Üst Kategori Seçimi *</Label>`,
  `<div className="flex items-center justify-between">
                    <Label htmlFor="category">Üst Kategori Seçimi *</Label>
                    <button type="button" onClick={() => setShowNewCatModal(true)} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Yeni Kategori Ekle
                    </button>
                  </div>`
);

file = file.replace(
  '    </div>\n  )\n}\n',
  `
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
`
);

fs.writeFileSync('features/stocks/stocks-client.tsx', file);
