import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { StocksClient } from '@/features/stocks/stocks-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stok ve Ürün Takibi | FinanceDesk',
}

export default async function StocksPage() {
  const companyInfo = await getActiveCompany()

  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()

  const [
    { data: stocks },
    { data: movements },
    { data: accounts },
    { data: chartOfAccounts },
    { data: warehouses }
  ] = await Promise.all([
    supabase
      .from('stocks')
      .select('*, chart_of_accounts(*)')
      .eq('company_id', companyInfo.id)
      .order('code'),
    supabase
      .from('stock_movements')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyInfo.id)
      .like('code', '15%')
      .neq('type', 'MAIN')
      .order('code'),
    supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', companyInfo.id)
      .eq('is_active', true)
      .order('name')
  ])



  return (
    <StocksClient
      stocks={stocks ?? []}
      movements={movements ?? []}
      accounts={accounts ?? []}
      chartOfAccounts={chartOfAccounts ?? []}
      warehouses={warehouses ?? []}
    />
  )
}
