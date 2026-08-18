import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { SafeDetailsClient } from '@/features/safes/safe-details-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SafeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    redirect('/companies')
  }

  const supabase = await createClient()

  const { data: safe } = await supabase
    .from('safes')
    .select('*, chart_of_accounts(id, code, name)')
    .eq('id', id)
    .eq('company_id', companyInfo.id)
    .single()

  if (!safe) {
    redirect('/safes')
  }

  // Fetch transactions from BOTH sources and merge
  let mappedTransactions: any[] = []
  
  // Source 1: Journal entry lines (new muhasebe system)
  if (safe.chart_of_account_id) {
    const { data: jelTx } = await supabase
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

    const jelMapped = (jelTx || []).map(t => ({
      ...t,
      amount: Number(t.debit) > 0 ? Number(t.debit) : Number(t.credit),
      is_debit: Number(t.debit) > 0,
      source: 'journal'
    }))
    mappedTransactions.push(...jelMapped)
  }

  // Source 2: Transactions table (legacy + cari payment inserts)
  const { data: oldTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('safe_id', safe.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    
  const oldMapped = (oldTx || []).map(t => ({
    id: 'tx-' + t.id,
    amount: Number(t.amount),
    is_debit: t.transaction_type?.includes('in'),
    created_at: t.created_at,
    source: 'transactions',
    journal_entries: {
      id: 'tx-' + t.id,
      date: t.transaction_date,
      description: t.description || t.transaction_type || 'İşlem',
      type: 'TX'
    }
  }))
  
  // Deduplicate: if journal entries exist for the same operation, prefer journal. 
  // Simple approach: include all from both sources, sort by date desc
  mappedTransactions.push(...oldMapped)
  mappedTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return <SafeDetailsClient safe={safe} transactions={mappedTransactions} />
}
