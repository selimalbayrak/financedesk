import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ArrowDownCircle, ArrowUpCircle, PackagePlus, PackageMinus, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
export const dynamic = 'force-dynamic'

const TYPE_CONFIG = {
  payment_out: { label: 'Gönderilen Ödeme', icon: ArrowUpCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
  payment_in: { label: 'Alınan Ödeme', icon: ArrowDownCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  invoice_out: { label: 'Kesilen Fatura', icon: PackageMinus, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  invoice_in: { label: 'Gelen Fatura', icon: PackagePlus, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
  safe_transfer: { label: 'Kasa Transferi', icon: ArrowRightLeft, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
}

export default async function TransactionsPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      *,
      account:accounts(name),
      safe:safes!safe_id(name),
      to_safe:safes!to_safe_id(name)
    `)
    .eq('company_id', companyInfo.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Son İşlemler</h1>
          <p className="text-muted-foreground">Tüm cari hesaplar ve kasalardaki son hareketleriniz.</p>
        </div>
        <Link href="/transactions/import">
          <Button variant="outline" className="bg-card text-foreground rounded-full shadow-sm hover:bg-muted">
            <PackagePlus className="w-4 h-4 mr-2" />
            PDF'den Aktar
          </Button>
        </Link>
      </div>

      <Card className="rounded-3xl border shadow-sm divide-y overflow-hidden">
        {transactions?.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Henüz işlem bulunmuyor.
          </div>
        )}
        
        {transactions?.map((t: any) => {
          const config = TYPE_CONFIG[t.transaction_type as keyof typeof TYPE_CONFIG]
          if (!config) return null
          
          return (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-2xl ${config.color}`}>
                  <config.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {t.transaction_type === 'safe_transfer' ? 'Kasalar Arası Transfer' : (t.account?.name || t.description || 'Diğer İşlem')}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{new Date(t.transaction_date).toLocaleDateString('tr-TR')}</span>
                    
                    {t.transaction_type === 'safe_transfer' ? (
                      <>
                        <span>•</span>
                        <span>{t.safe?.name} &rarr; {t.to_safe?.name}</span>
                      </>
                    ) : (
                      t.safe && (
                        <>
                          <span>•</span>
                          <span>{t.safe.name}</span>
                        </>
                      )
                    )}

                    {(t.payment_method || t.bank_detail) && (
                      <>
                        <span>•</span>
                        <span>{t.payment_method} {t.bank_detail && `(${t.bank_detail})`}</span>
                      </>
                    )}
                    {t.invoice_number && (
                      <>
                        <span>•</span>
                        <span>Fatura: {t.invoice_number}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className={`font-semibold tabular-nums ${config.color.split(' ')[0]}`}>
                  {Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(t.amount / 100)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {config.label}
                </span>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
