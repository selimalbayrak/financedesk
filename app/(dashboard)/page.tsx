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

  // 4. Get finance summary stats (loans & cheques)
  const [
    { data: activeLoansInstallments },
    { data: activeCheques }
  ] = await Promise.all([
    supabase
      .from('loan_installments')
      .select('amount_due, status')
      .in('status', ['pending', 'late'])
      .eq('company_id', companyInfo.id),
    supabase
      .from('cheques_notes')
      .select('amount, direction, status')
      .eq('status', 'portfolio')
      .eq('company_id', companyInfo.id)
  ])

  const totalLoanRemaining = (activeLoansInstallments ?? []).reduce((sum, i) => sum + i.amount_due, 0)
  const totalChequesIn = (activeCheques ?? []).filter(c => c.direction === 'in').reduce((sum, c) => sum + c.amount, 0)
  const totalChequesOut = (activeCheques ?? []).filter(c => c.direction === 'out').reduce((sum, c) => sum + c.amount, 0)

  const dashboardData = {
    totalReceivable,
    totalPayable,
    netBalance: totalReceivable - totalPayable,
    recentTransactions,
    employees,
    financeSummary: {
      totalLoanRemaining,
      totalChequesIn,
      totalChequesOut
    }
  }

  return <DashboardClient data={dashboardData} />
}

