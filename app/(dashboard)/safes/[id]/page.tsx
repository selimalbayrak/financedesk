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
  let mappedTransactions = []
  
  if (safe.chart_of_account_id) {
    const { data: transactions } = await supabase
      .from('journal_entry_lines')
      .select(`
        id,
        debit,
        credit,
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

    mappedTransactions = (transactions || []).map(t => ({
      ...t,
      amount: t.debit > 0 ? t.debit : t.credit,
      is_debit: t.debit > 0
    }))
  } else {
    // Fallback for old safes without chart_of_account_id (read from transactions table)
    const { data: oldTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('safe_id', safe.id)
      .order('transaction_date', { ascending: false })
      
    mappedTransactions = (oldTx || []).map(t => ({
      id: t.id,
      amount: t.amount,
      is_debit: t.transaction_type.includes('in'),
      created_at: t.created_at,
      journal_entries: {
        id: t.id,
        date: t.transaction_date,
        description: t.description || 'Eski İşlem',
        type: 'OLD_TX'
      }
    }))
  }

  return <SafeDetailsClient safe={safe} transactions={mappedTransactions} />
}
