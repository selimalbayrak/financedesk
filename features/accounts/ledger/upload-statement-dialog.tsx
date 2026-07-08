'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface UploadStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
}

export function UploadStatementDialog({ open, onOpenChange, accountId }: UploadStatementDialogProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
      setParsedData(null)
    }
  }

  const handleParse = async () => {
    if (!file) return

    setIsParsing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error(`Sunucu Hatası: ${text.substring(0, 100)}`)
      }

      if (!res.ok) {
        throw new Error(`${data.error || 'İşleme hatası'}: ${data.details || ''}`)
      }

      setParsedData(data.transactions)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = async () => {
    if (!parsedData) return

    setIsImporting(true)
    setError(null)

    try {
      const res = await fetch('/api/ledger/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          transactions: parsedData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Kaydetme hatası')
      }

      onOpenChange(false)
      setFile(null)
      setParsedData(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsImporting(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setParsedData(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val)
      if (!val) resetState()
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PDF Ekstre Aktarımı (Yapay Zeka)</DialogTitle>
          <DialogDescription>
            Tedarikçi veya müşterinizin gönderdiği hesap ekstresini (PDF) yükleyin. Sistem, içindeki tüm işlemleri ve fatura kalemlerini otomatik okuyacaktır.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!parsedData && (
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="pdf">Ekstre Dosyası (PDF)</Label>
                <Input id="pdf" type="file" accept=".pdf" onChange={handleFileChange} />
              </div>
              
              {error && (
                <div className="flex items-start gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <Button onClick={handleParse} disabled={!file || isParsing} className="w-full sm:w-auto">
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Belge Okunuyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Analiz Et ve Önizle
                  </>
                )}
              </Button>
            </div>
          )}

          {parsedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg text-sm font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>Belge başarıyla okundu! Toplam {parsedData.length} işlem bulundu. Lütfen kaydedilmeden önce kontrol edin.</span>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-[400px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 sticky top-0 uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Tarih</th>
                      <th className="px-3 py-2">Belge Türü/No</th>
                      <th className="px-3 py-2">Açıklama</th>
                      <th className="px-3 py-2 text-right">Borç</th>
                      <th className="px-3 py-2 text-right">Alacak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedData.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="px-3 py-2 whitespace-nowrap">{tx.date}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{tx.document_type}</div>
                          <div className="text-muted-foreground">{tx.document_no}</div>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[150px]">{tx.description}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-medium tabular-nums">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-rose-600 font-medium tabular-nums">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          {parsedData && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'İşlemleri Sisteme Kaydet'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
