'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TrialBalanceRow = {
  id: string
  code: string
  name: string
  type: string
  parent_id: string | null
  total_debit: number
  total_credit: number
  debit_balance: number
  credit_balance: number
}

export type LedgerRow = {
  is_opening: boolean
  entry_id: string | null
  entry_date: string
  receipt_no: string
  description: string
  debit: number
  credit: number
  running_balance: number
}

export async function getTrialBalance(startDate?: string, endDate?: string) {
  const supabase = await createClient()
  
  // Get active company
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return { success: false, error: 'Kullanıcı bulunamadı.' }
  
  const { data: companyUser, error: companyUserError } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .single()
    
  if (companyUserError || !companyUser) return { success: false, error: 'Şirket bulunamadı.' }

  const { data, error } = await supabase.rpc('get_trial_balance', {
    p_company_id: companyUser.company_id,
    p_start_date: startDate || null,
    p_end_date: endDate || null
  })

  if (error) {
    console.error('Error fetching trial balance:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as TrialBalanceRow[] }
}

export async function getAccountLedger(accountId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return { success: false, error: 'Kullanıcı bulunamadı.' }
  
  const { data: companyUser, error: companyUserError } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .single()
    
  if (companyUserError || !companyUser) return { success: false, error: 'Şirket bulunamadı.' }

  const { data, error } = await supabase.rpc('get_account_ledger', {
    p_company_id: companyUser.company_id,
    p_account_id: accountId,
    p_start_date: startDate || null,
    p_end_date: endDate || null
  })

  if (error) {
    console.error('Error fetching account ledger:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as LedgerRow[] }
}

export async function getJournalEntries(startDate?: string, endDate?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('journal_entries')
    .select(`
      *,
      journal_entry_lines (
        *,
        chart_of_accounts ( code, name )
      )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching journals:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getAccountDetails(accountId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('id', accountId)
    .single()
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}
