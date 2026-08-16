import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { AssetsClient } from '@/features/assets/assets-client'
import { redirect } from 'next/navigation'

export default async function AssetsPage() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    redirect('/companies')
  }

  const supabase = await createClient()

  // Fetch Assets
  const { data: assets } = await supabase
    .from('fixed_assets')
    .select(`
      *,
      chart_of_accounts (
        id, code, name
      )
    `)
    .eq('company_id', companyInfo.id)
    .order('created_at', { ascending: false })

  // Fetch Group 25 Accounts for new asset parent selection
  const { data: assetGroups } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('company_id', companyInfo.id)
    .like('code', '25%')
    .eq('type', 'SUB') // Usually Group 25 items (250, 252, etc) are seeded as SUB.
    .order('code')

  // Fetch target accounts for sales (Safes, Banks, Caris)
  const { data: targetAccounts } = await supabase
    .from('accounts')
    .select(`
      *,
      chart_of_accounts (
        id, code, name
      )
    `)
    .eq('company_id', companyInfo.id)
    .eq('is_active', true)
    .order('name')

  return (
    <AssetsClient 
      assets={assets || []} 
      assetGroups={assetGroups || []} 
      targetAccounts={targetAccounts || []} 
    />
  )
}
