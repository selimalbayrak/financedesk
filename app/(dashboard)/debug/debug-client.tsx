'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Play, Activity } from 'lucide-react'
import { runDebugTests } from './actions'

type TestResult = {
  name: string
  status: 'PASSED' | 'FAILED' | 'WARNING'
  message: string
}

export function DebugClient() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [hasRun, setHasRun] = useState(false)

  const handleRunTests = async () => {
    setLoading(true)
    setHasRun(true)
    try {
      const res = await runDebugTests()
      if (res.error) {
        alert(res.error)
      } else if (res.results) {
        setResults(res.results)
      }
    } catch (e: any) {
      alert('Test sırasında hata oluştu: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Sistem Check-Up
          </CardTitle>
          <CardDescription>
            Canlı veritabanınızdaki tablo yapılarını ve fonksiyonları test eder. Bu işlem veri eklemez veya silmez (güvenlidir).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRunTests} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Testler Çalışıyor...' : (hasRun ? 'Testleri Tekrar Çalıştır' : 'Testleri Başlat')}
            {!loading && <Play className="w-4 h-4 ml-2" />}
          </Button>

          {hasRun && (
            <div className="mt-6 space-y-3 animate-in fade-in duration-300">
              <h3 className="font-semibold text-lg border-b pb-2">Test Sonuçları</h3>
              {results.length === 0 && !loading && (
                <p className="text-muted-foreground">Gösterilecek sonuç yok.</p>
              )}
              {results.map((result, i) => (
                <div key={i} className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-start gap-4 ${
                  result.status === 'PASSED' ? 'bg-green-500/10 border-green-500/20' :
                  result.status === 'FAILED' ? 'bg-destructive/10 border-destructive/20' :
                  'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                  <div className="mt-0.5">
                    {result.status === 'PASSED' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                     result.status === 'FAILED' ? <AlertCircle className="w-5 h-5 text-destructive" /> :
                     <AlertCircle className="w-5 h-5 text-yellow-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      result.status === 'PASSED' ? 'text-green-700 dark:text-green-400' :
                      result.status === 'FAILED' ? 'text-destructive' :
                      'text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {result.name}
                    </h4>
                    <p className="text-sm mt-1 text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {results.some(r => r.status === 'FAILED') && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">⚠️ Eksik Güncellemeler Tespit Edildi</CardTitle>
            <CardDescription>
              Test sonuçlarında FAILED (Başarısız) olan öğeler, uygulamanın (örneğin Varlık Satışı işleminin) çalışmasını engelliyor. Lütfen yapay zeka asistanının (Antigravity) verdiği son SQL kodlarını Supabase SQL Editor üzerinden canlı veritabanınızda çalıştırdığınıza emin olun.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
