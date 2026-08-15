'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processExpensePayment(
  expenseType: string,
  amount: number,
  safeBankAccountId: string,
  date: string,
  description: string
) {
  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return { success: false, error: 'Kullanıcı bulunamadı.' }
  
  const { data: companyUser, error: companyUserError } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .single()
    
  if (companyUserError || !companyUser) return { success: false, error: 'Şirket bulunamadı.' }

  const { error } = await supabase.rpc('process_expense_payment', {
    p_company_id: companyUser.company_id,
    p_expense_type: expenseType,
    p_amount: amount,
    p_safe_bank_account_id: safeBankAccountId,
    p_date: date,
    p_description: description
  })

  if (error) {
    console.error('Expense RPC Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/transactions')
  revalidatePath('/accounting/journals')
  return { success: true }
}

export async function processPersonnelTransaction(
  employeeName: string,
  amount: number,
  safeBankAccountId: string | null,
  date: string,
  description: string,
  type: 'ACCRUAL' | 'PAYMENT'
) {
  const supabase = await createClient()
  
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return { success: false, error: 'Kullanıcı bulunamadı.' }
  
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .single()
    
  if (!companyUser) return { success: false, error: 'Şirket bulunamadı.' }

  const { error } = await supabase.rpc('process_personnel_transaction', {
    p_company_id: companyUser.company_id,
    p_employee_name: employeeName,
    p_amount: amount,
    p_safe_bank_account_id: safeBankAccountId,
    p_date: date,
    p_description: description,
    p_type: type
  })

  if (error) {
    console.error('Personnel RPC Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/employees')
  revalidatePath('/accounting/journals')
  return { success: true }
}

export async function processCariPayment(
  cariAccountId: string,
  safeBankAccountId: string,
  amount: number,
  date: string,
  description: string,
  direction: 'COLLECTION' | 'PAYMENT'
) {
  const supabase = await createClient()
  
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return { success: false, error: 'Kullanıcı bulunamadı.' }
  
  const { data: companyUser } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userData.user.id)
    .single()
    
  if (!companyUser) return { success: false, error: 'Şirket bulunamadı.' }

  const { error } = await supabase.rpc('process_cari_payment', {
    p_company_id: companyUser.company_id,
    p_cari_account_id: cariAccountId,
    p_safe_bank_account_id: safeBankAccountId,
    p_amount: amount,
    p_date: date,
    p_description: description,
    p_direction: direction
  })

  if (error) {
    console.error('Cari Payment RPC Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/accounts')
  revalidatePath('/accounting/journals')
  return { success: true }
}
