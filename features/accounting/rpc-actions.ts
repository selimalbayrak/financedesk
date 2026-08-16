'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function processExpensePayment(
  expenseType: string,
  amount: number,
  safeBankAccountId: string,
  date: string,
  description: string
) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { success: false, error: 'Şirket bulunamadı.' }

  const supabase = await createClient()

  const { error } = await supabase.rpc('process_expense_payment', {
    p_company_id: companyInfo.id,
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
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { success: false, error: 'Şirket bulunamadı.' }

  const supabase = await createClient()

  const { error } = await supabase.rpc('process_personnel_transaction', {
    p_company_id: companyInfo.id,
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
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { success: false, error: 'Şirket bulunamadı.' }

  const supabase = await createClient()

  const { error } = await supabase.rpc('process_cari_payment', {
    p_company_id: companyInfo.id,
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

  revalidatePath('/', 'layout')
  return { success: true }
}
