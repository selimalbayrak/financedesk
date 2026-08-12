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
    { data: stockCategories }
  ] = await Promise.all([
    supabase
      .from('stocks')
      .select('*, stock_categories(*)')
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
      .from('stock_categories')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('name')
  ])



  return (
    <StocksClient
      stocks={stocks ?? []}
      movements={movements ?? []}
      accounts={accounts ?? []}
      stockCategories={stockCategories ?? []}
    />
  )
}
