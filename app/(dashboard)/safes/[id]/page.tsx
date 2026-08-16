import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { SafeDetailsClient } from '@/features/safes/safe-details-client'
import { redirect } from 'next/navigation'

export default async function SafeDetailsPage({ params }: { params: { id: string } }) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    redirect('/companies')
  }

  const supabase = await createClient()

  const { data: safe } = await supabase
    .from('safes')
    .select('*, chart_of_accounts(id, code, name)')
    .eq('id', params.id)
    .eq('company_id', companyInfo.id)
    .single()

  if (!safe) {
    redirect('/safes')
  }

  // Fetch transactions (journal_entry_lines) for this safe
  const { data: transactions } = await supabase
    .from('journal_entry_lines')
    .select(`
      id,
      amount,
      is_debit,
      created_at,
      journal_entries (
        id,
        date,
        description,
        type
      )
    `)
    .eq('chart_of_account_id', safe.chart_of_account_id)
    .order('created_at', { ascending: false })

  return <SafeDetailsClient safe={safe} transactions={transactions || []} />
}
