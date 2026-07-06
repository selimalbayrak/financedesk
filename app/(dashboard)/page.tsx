import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  CalendarClock,
} from 'lucide-react'
import { formatCurrency, formatDate, isDueSoon, isOverdue } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
import { getActiveCompany } from '@/lib/company'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

type PayableRow = {
  id: string
  type: 'payable' | 'receivable'
  description: string
  original_amount: number
  remaining_amount: number
  due_date: string | null
  status: string
  account: { name: string; company_name: string | null } | null
}

type LoanRow = {
  id: string
  remaining_balance: number
}

type TxRow = {
  id: string
  type: 'debit' | 'credit'
  amount: number
  description: string | null
  category: string
  transaction_date: string
  account: { name: string } | null
}

async function getDashboardData(companyId: string) {
  const supabase = await createClient()

  const [
    { data: payablesRaw },
    { data: loansRaw },
    { data: txRaw },
  ] = await Promise.all([
    supabase
      .from('payables')
      .select('id, type, description, original_amount, remaining_amount, due_date, status, account:accounts(name, company_name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .neq('status', 'paid'),
    supabase
      .from('loans')
      .select('id, remaining_balance')
      .eq('company_id', companyId)
      .eq('status', 'active'),
    supabase
      .from('transactions')
      .select('id, type, amount, description, category, transaction_date, account:accounts(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const payables = (payablesRaw ?? []) as unknown as PayableRow[]
  const loans = (loansRaw ?? []) as unknown as LoanRow[]
  const recentTransactions = (txRaw ?? []) as unknown as TxRow[]

  const totalReceivable = payables
    .filter((p) => p.type === 'receivable')
    .reduce((sum, p) => sum + p.remaining_amount, 0)

  const totalPayable = payables
    .filter((p) => p.type === 'payable')
    .reduce((sum, p) => sum + p.remaining_amount, 0)

  const totalLoanBalance = loans.reduce((sum, l) => sum + l.remaining_balance, 0)

  const upcoming = payables
    .filter((p) => p.due_date && (isDueSoon(p.due_date) || isOverdue(p.due_date)))
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  return {
    totalReceivable,
    totalPayable,
    totalLoanBalance,
    upcoming,
    recentTransactions,
  }
}

export default async function DashboardPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Şirket hesabı bulunamadı. Lütfen giriş yaptığınızdan emin olun.
      </div>
    )
  }

  const data = await getDashboardData(companyInfo.id)

  return (
    <div className="space-y-6 animate-in-up">
      <PageHeader
        title="Ana Ekran"
        description="Finansal durumunuza genel bir bakış"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Alacak"
          value={data.totalReceivable}
          icon={ArrowDownCircle}
          description="Müşterilerden beklenen"
          trend="positive"
        />
        <StatCard
          title="Toplam Borç"
          value={data.totalPayable}
          icon={ArrowUpCircle}
          description="Tedarikçilere ödenecek"
          trend="negative"
        />
        <StatCard
          title="Kredi Borçları"
          value={data.totalLoanBalance}
          icon={Landmark}
          description="Kalan kredi anaparaları"
          trend="negative"
        />
        <StatCard
          title="Bu Hafta Ödenecekler"
          value={data.upcoming.reduce((s, p) => s + p.remaining_amount, 0)}
          icon={CalendarClock}
          description={`Yaklaşan ${data.upcoming.length} işlem`}
          trend={data.upcoming.length > 0 ? 'negative' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Yaklaşan & Vadesi Geçenler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                🎉 Bu hafta bekleyen ödeme veya tahsilat yok
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcoming.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.account?.company_name || item.account?.name || 'Bilinmiyor'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${
                          item.type === 'receivable'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {item.type === 'receivable' ? '+' : '-'}{formatCurrency(item.remaining_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.due_date)}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Son İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Henüz işlem bulunmuyor
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {tx.description ?? tx.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.account?.name ?? '—'} · {formatDate(tx.transaction_date)}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                      tx.type === 'credit'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
