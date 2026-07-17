import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { DashboardClient } from '@/features/dashboard/dashboard-client'

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

export default async function DashboardPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Lütfen önce bir şirket seçin veya oluşturun.
      </div>
    )
  }

  const supabase = await createClient()

  // 1. Get all account balances
  const { data: balancesRaw } = await supabase
    .from('account_balances')
    .select('balance')
    .eq('company_id', companyInfo.id)

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
    .eq('company_id', companyInfo.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentTransactions = (txRaw ?? []) as unknown as TxRow[]

  // 3. Get employees and balances
  const { data: employeesRaw } = await supabase
    .from('employee_balances')
    .select('id, name, balance')
    .eq('company_id', companyInfo.id)
    .eq('is_active', true)
    .order('name')

  const employees = employeesRaw ?? []

  const dashboardData = {
    totalReceivable,
    totalPayable,
    netBalance: totalReceivable - totalPayable,
    recentTransactions,
    employees,
  }

  return <DashboardClient data={dashboardData} />
}

