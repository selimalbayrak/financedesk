import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SafesTable } from '@/features/safes/safes-table'
import { SafeFormSheet } from '@/features/safes/safe-form-sheet'
import { SafeTransferForm } from '@/features/safes/safe-transfer-form'

export const dynamic = 'force-dynamic'

export default async function SafesPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  
  const [
    { data: safesRaw },
    { data: chartOfAccounts }
  ] = await Promise.all([
    supabase
      .from('safe_balances')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('name'),
    supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('company_id', companyInfo.id)
  ])

  const coaMap = new Map((chartOfAccounts || []).map(c => [c.id, c.code]))

  const safes = (safesRaw ?? []).map(safe => ({
    ...safe,
    account_code: safe.chart_of_account_id ? coaMap.get(safe.chart_of_account_id) || null : null
  }))

  return (
    <div className="space-y-6 pb-24">
      <SafesTable data={safes ?? []} />
    </div>
  )
}
