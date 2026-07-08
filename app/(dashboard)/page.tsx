import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Wallet
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getActiveCompany } from '@/lib/company'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

type TxRow = {
  id: string
  transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in'
  amount: number
  description: string | null
  category: string
  transaction_date: string
  account: { name: string } | null
}

async function getDashboardData(companyId: string) {
  const supabase = await createClient()

  // 1. Get all account balances
  const { data: balancesRaw } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('company_id', companyId)

  const balances = balancesRaw ?? []
  
  // Total of positive balances (Bizim Alacağımız)
  const totalReceivable = balances
    .filter(b => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0)

  // Total of negative balances (Bizim Borcumuz) - Note: stored as negative, so Math.abs
  const totalPayable = balances
    .filter(b => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0)

  // 2. Get recent transactions
  const { data: txRaw } = await supabase
    .from('transactions')
    .select('id, transaction_type, amount, description, category, transaction_date, account:accounts(name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentTransactions = (txRaw ?? []) as unknown as TxRow[]

  return {
    totalReceivable,
    totalPayable,
    netBalance: totalReceivable - totalPayable,
    recentTransactions,
  }
}

export default async function DashboardPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Lütfen önce bir şirket seçin veya oluşturun.
      </div>
    )
  }

  const data = await getDashboardData(companyInfo.id)

  return (
    <div className="space-y-6 animate-in-up">
      <PageHeader
        title="Ana Ekran"
        description="Şirketinizin genel finansal durumu"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Bizim Alacağımız"
          value={data.totalReceivable}
          icon={ArrowDownCircle}
          description="Bize olan toplam borçlar"
          trend="positive"
        />
        <StatCard
          title="Bizim Borcumuz"
          value={data.totalPayable}
          icon={ArrowUpCircle}
          description="Bizim yapacağımız toplam ödemeler"
          trend="negative"
        />
        <StatCard
          title="Net Durum"
          value={data.netBalance}
          icon={Wallet}
          description="Alacak - Borç Farkı"
          trend={data.netBalance >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid gap-4">
        {/* Recent Transactions */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="w-4 h-4" />
              <CardTitle className="text-sm font-semibold">Son Eklenen İşlemler</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Henüz hiçbir işlem bulunmuyor
              </p>
            ) : (
              <div className="divide-y">
                {data.recentTransactions.map((tx) => {
                  const isPositive = tx.transaction_type === 'payment_in' || tx.transaction_type === 'invoice_out'
                  const label = 
                    tx.transaction_type === 'payment_in' ? 'Alınan Ödeme' :
                    tx.transaction_type === 'payment_out' ? 'Gönderilen Ödeme' :
                    tx.transaction_type === 'invoice_in' ? 'Alınan Ürün/Hizmet' :
                    'Verilen Ürün/Hizmet'

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {tx.account?.name ?? 'Bilinmeyen Cari'}
                        </p>
                        <p className="text-xs text-muted-foreground flex gap-2 mt-1">
                          <span className="font-medium text-foreground/70">{label}</span>
                          <span>&bull;</span>
                          <span>{formatDate(tx.transaction_date)}</span>
                          {tx.description && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate">{tx.description}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
