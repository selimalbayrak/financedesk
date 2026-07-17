import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/features/transactions/transaction-form'
import { redirect } from 'next/navigation'

export default async function NewTransactionPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  const [{ data: accounts }, { data: safes }, { data: employees }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, company_name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('safes')
      .select('id, name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('employees')
      .select('id, name')
      .eq('company_id', companyInfo.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')
  ])

  return (
    <div className="pb-24">
      <TransactionForm accounts={accounts ?? []} safes={safes ?? []} employees={employees ?? []} />
    </div>
  )
}
