'use client'

import { useState, useRef, useTransition } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, ArrowRight, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { batchCreateTransactions } from './actions'
import { useRouter } from 'next/navigation'

interface Props {
  accounts: { id: string; name: string; company_name: string | null }[]
  safes: { id: string; name: string }[]
}

type ParsedTransaction = {
  date: string
  document_no: string
  document_type: string
  description: string
  debit: number
  credit: number
}

type PreparedTransaction = {
  transaction_date: string
  description: string
  amount: number
  transaction_type: 'payment_in' | 'payment_out'
  safe_id: string
  account_id?: string
  invoice_number?: string
  bank_detail?: string
}

export function ImportForm({ accounts, safes }: Props) {
  const router = useRouter()
  const [statementType, setStatementType] = useState<'bank' | 'ledger' | ''>('')
  const [selectedSafeId, setSelectedSafeId] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedTransaction[] | null>(null)
  
  // For Bank Statement: each row needs an account_id
  const [rowAccounts, setRowAccounts] = useState<Record<number, string>>({})
  // For Ledger Statement: each row needs a safe_id
  const [rowSafes, setRowSafes] = useState<Record<number, string>>({})

  const [globalSafeId, setGlobalSafeId] = useState<string>('')
  const [globalAccountId, setGlobalAccountId] = useState<string>('')

  const handleApplyGlobalSafe = () => {
    if (!globalSafeId) return
    const newSafes: Record<number, string> = {}
    parsedData?.forEach((_, i) => newSafes[i] = globalSafeId)
    setRowSafes(newSafes)
  }

  const handleApplyGlobalAccount = () => {
    if (!globalAccountId) return
    const newAccounts: Record<number, string> = {}
    parsedData?.forEach((_, i) => newAccounts[i] = globalAccountId)
    setRowAccounts(newAccounts)
  }

  const [isPending, startTransition] = useTransition()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !statementType) return
    if (statementType === 'bank' && !selectedSafeId) return
    if (statementType === 'ledger' && !selectedAccountId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('statementType', statementType)

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData
      })

      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()

      if (!res.ok || !contentType.includes('application/json')) {
        let errorMessage = 'Sunucuda beklenmeyen bir hata oluştu.'
        if (text.includes('<html') || !contentType.includes('application/json')) {
          if (res.status === 413) errorMessage = "Yüklenen PDF dosyası çok büyük (Limit: 4.5MB)."
          else if (res.status === 504) errorMessage = "İşlem zaman aşımına uğradı (504). Lütfen daha küçük veya az sayfalı bir belge deneyin."
          else errorMessage = `Sunucu Hatası (${res.status}): Lütfen tekrar deneyin.`
        } else {
          try {
            const errObj = JSON.parse(text)
            errorMessage = errObj.error || text
          } catch (_) {}
        }
        throw new Error(errorMessage)
      }

      const data = JSON.parse(text)
      if (data.error) {
        alert('Hata: ' + data.error)
      } else if (data.transactions) {
        setParsedData(data.transactions)
      }
    } catch (err: any) {
      alert('Beklenmeyen bir hata oluştu:\n' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const updateRow = (index: number, field: keyof ParsedTransaction, value: any) => {
    setParsedData(prev => prev ? prev.map((item, i) => i === index ? { ...item, [field]: value } : item) : null)
  }

  const updateAmount = (index: number, isCredit: boolean, newAmountStr: string) => {
    const val = parseFloat(newAmountStr)
    if (isNaN(val)) return
    const newKurus = Math.round(val * 100)
    
    setParsedData(prev => prev ? prev.map((item, i) => {
      if (i !== index) return item
      if (isCredit) {
        return { ...item, credit: newKurus }
      } else {
        return { ...item, debit: newKurus }
      }
    }) : null)
  }

  const deleteRow = (index: number) => {
    setParsedData(prev => prev ? prev.filter((_, i) => i !== index) : null)
  }

  const handleSave = () => {
    if (!parsedData) return

    const preparedTransactions: PreparedTransaction[] = []

    for (let i = 0; i < parsedData.length; i++) {
      const t = parsedData[i]
      
      // Determine if it's an IN or OUT
      // For bank: debit > 0 means money went OUT (bank debited us) -> Wait!
      // Bank statement convention in Turkey: 
      // Borç (Debit) = Para Çıkışı (Payment Out)
      // Alacak (Credit) = Para Girişi (Payment In)
      // The prompt specifically instructs: "Para GİRDİYSE credit, ÇIKTIYSA debit".
      
      // For Ledger:
      // Borç (Debit) = Müşteri bize borçlandı (Invoice Out / Payment Out)
      // Alacak (Credit) = Müşteri bize ödedi (Invoice In / Payment In)
      
      // We will map everything to payment_in / payment_out for simplicity in this MVP 
      // (ignoring invoices for now since it's just cashflow).
      
      let amount = 0;
      let type: 'payment_in' | 'payment_out' = 'payment_out';

      if (statementType === 'bank') {
        if (t.credit > 0) {
          amount = t.credit;
          type = 'payment_in';
        } else if (t.debit > 0) {
          amount = t.debit;
          type = 'payment_out';
        }
      } else {
        // Ledger
        if (t.credit > 0) {
          amount = t.credit;
          type = 'payment_in';
        } else if (t.debit > 0) {
          amount = t.debit;
          type = 'payment_out';
        }
      }

      if (amount === 0) continue; // Skip zero amount rows

      const prepared: PreparedTransaction = {
        transaction_date: t.date,
        description: t.description,
        amount: amount, // do not divide by 100, we need kuruş in DB
        transaction_type: type,
        invoice_number: t.document_no || undefined,
        safe_id: statementType === 'bank' ? selectedSafeId : rowSafes[i],
        account_id: statementType === 'ledger' ? selectedAccountId : rowAccounts[i]
      }

      // If Bank statement, require account_id for each row. If missing, we skip or error? 
      // For now, we will just pass it, if it's missing it will be null in DB which is allowed.
      
      // If Ledger statement, require safe_id for each row. 
      if (statementType === 'ledger' && !prepared.safe_id) {
        alert(`${i + 1}. satır için Kasa seçimi eksik!`);
        return;
      }

      preparedTransactions.push(prepared)
    }

    startTransition(async () => {
      try {

        await batchCreateTransactions(preparedTransactions)
        router.push('/transactions')
      } catch (e: any) {
        alert("Kaydetme hatası: " + e.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {!parsedData ? (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label>Ekstre Tipi</Label>
              <Select value={statementType} onValueChange={(val: any) => setStatementType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ekstre türünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banka Hesap Ekstresi</SelectItem>
                  <SelectItem value="ledger">Cari Hesap Ekstresi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statementType === 'bank' && (
              <div className="space-y-4">
                <Label>Hangi Kasa/Banka?</Label>
                <Select value={selectedSafeId} onValueChange={(val) => setSelectedSafeId(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kasa veya banka seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {safes.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {safes.length === 0 && <SelectItem value="none" disabled>Kasa bulunamadı</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}

            {statementType === 'ledger' && (
              <div className="space-y-4">
                <Label>Hangi Cari?</Label>
                <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cari hesap seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.company_name || a.name}</SelectItem>
                    ))}
                    {accounts.length === 0 && <SelectItem value="none" disabled>Cari bulunamadı</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(statementType === 'bank' && selectedSafeId) || (statementType === 'ledger' && selectedAccountId) ? (
              <div className="space-y-4">
                <Label>PDF Dosyası</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/60 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {file ? file.name : "PDF dosyasını seçmek için tıklayın"}
                  </p>
                  <p className="text-xs text-muted-foreground">Sadece .pdf formatı desteklenir</p>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            ) : null}

            {file && (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="w-full h-12 bg-primary/90 hover:bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Yapay Zeka Analiz Ediyor...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-5 w-5" />
                    Yükle ve Analiz Et
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground">Önizleme ve Eşleştirme</h3>
                <p className="text-sm text-muted-foreground">İşlemleri kontrol edip eksik bilgileri doldurun.</p>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isPending}
                className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full shadow-lg shadow-emerald-500/20"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Tümünü Kaydet
              </Button>
            </div>
            
            {/* Bulk Apply Bar */}
            <div className="px-6 py-3 border-b border-border/50 bg-muted/20 flex flex-wrap gap-4 items-end">
              {statementType === 'bank' ? (
                <div className="flex items-end gap-2 max-w-sm w-full">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Tüm Satırlara Uygula (Cari Seç)</Label>
                    <Select value={globalAccountId} onValueChange={(val) => setGlobalAccountId(val || '')}>
                      <SelectTrigger className="h-8 bg-background">
                        <SelectValue placeholder="Toplu Cari Seç">
                          {globalAccountId === 'none' ? 'Cari Yok' : accounts.find(a => a.id === globalAccountId)?.company_name || accounts.find(a => a.id === globalAccountId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.company_name || a.name}</SelectItem>
                        ))}
                        <SelectItem value="none">Cari Yok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="secondary" size="sm" className="h-8" onClick={handleApplyGlobalAccount} disabled={!globalAccountId}>Uygula</Button>
                </div>
              ) : (
                <div className="flex items-end gap-2 max-w-sm w-full">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Tüm Satırlara Uygula (Kasa Seç)</Label>
                    <Select value={globalSafeId} onValueChange={(val) => setGlobalSafeId(val || '')}>
                      <SelectTrigger className="h-8 bg-background">
                        <SelectValue placeholder="Toplu Kasa Seç">
                          {safes.find(s => s.id === globalSafeId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {safes.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="secondary" size="sm" className="h-8" onClick={handleApplyGlobalSafe} disabled={!globalSafeId}>Uygula</Button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">TARİH</th>
                    <th className="px-4 py-3 font-medium">AÇIKLAMA</th>
                    <th className="px-4 py-3 font-medium">TUTAR</th>
                    <th className="px-4 py-3 font-medium">{statementType === 'bank' ? 'CARİ EŞLEŞTİRME' : 'KASA SEÇİMİ'}</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {parsedData.map((t, index) => {
                    const isCredit = t.credit > 0;
                    const amount = (isCredit ? t.credit : t.debit) / 100;
                    
                    return (
                      <tr key={index} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          <Input 
                            value={t.date} 
                            onChange={(e) => updateRow(index, 'date', e.target.value)}
                            className="h-8 w-28 text-xs"
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground min-w-[200px]">
                          {t.document_type ? <span className="font-medium text-foreground block mb-0.5 text-xs">{t.document_type}</span> : null}
                          <Input 
                            value={t.description} 
                            onChange={(e) => updateRow(index, 'description', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className={isCredit ? "text-emerald-500" : "text-destructive"}>
                              {isCredit ? '+' : '-'}
                            </span>
                            <Input 
                              type="number"
                              value={amount}
                              onChange={(e) => updateAmount(index, isCredit, e.target.value)}
                              className="h-8 w-24 text-xs tabular-nums"
                              step="0.01"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 min-w-[200px]">
                          {statementType === 'bank' ? (
                            <Select 
                              value={rowAccounts[index] || ''} 
                              onValueChange={(val) => setRowAccounts(prev => ({...prev, [index]: val || ''}))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Cari Seç">
                                  {rowAccounts[index] === 'none' ? 'Cari Yok (Masraf/Gelir)' : accounts.find(a => a.id === rowAccounts[index])?.company_name || accounts.find(a => a.id === rowAccounts[index])?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(a => (
                                  <SelectItem key={a.id} value={a.id}>{a.company_name || a.name}</SelectItem>
                                ))}
                                <SelectItem value="none">Cari Yok (Masraf/Gelir)</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select 
                              value={rowSafes[index] || ''} 
                              onValueChange={(val) => setRowSafes(prev => ({...prev, [index]: val || ''}))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Kasa Seç">
                                  {safes.find(s => s.id === rowSafes[index])?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {safes.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteRow(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {parsedData.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Bu belgede herhangi bir işlem bulunamadı.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
