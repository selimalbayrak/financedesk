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

  // Insert default categories if none exist (for initial setup)
  if (stockCategories && stockCategories.length === 0) {
    const defaultCategories = [
      { company_id: companyInfo.id, name: 'Araba', fields: [{name: 'Marka', type: 'text'}, {name: 'Model', type: 'text'}, {name: 'Yıl', type: 'number'}, {name: 'Plaka', type: 'text'}] },
      { company_id: companyInfo.id, name: 'Tapu', fields: [{name: 'İl', type: 'text'}, {name: 'İlçe', type: 'text'}, {name: 'Mahalle', type: 'text'}, {name: 'Ada', type: 'text'}, {name: 'Parsel', type: 'text'}] },
      { company_id: companyInfo.id, name: 'Yardımcı Malzeme', fields: [{name: 'Özellik', type: 'text'}] },
      { company_id: companyInfo.id, name: 'Ham Madde', fields: [{name: 'Kalite', type: 'text'}, {name: 'Tür', type: 'text'}] }
    ]
    const { data: newCats } = await supabase.from('stock_categories').insert(defaultCategories).select()
    if (newCats) {
      stockCategories.push(...newCats)
    }
  }

  return (
    <StocksClient
      stocks={stocks ?? []}
      movements={movements ?? []}
      accounts={accounts ?? []}
      stockCategories={stockCategories ?? []}
    />
  )
}
