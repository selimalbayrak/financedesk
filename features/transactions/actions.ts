'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function createTransaction(data: {
  account_id?: string
  safe_id: string
  to_safe_id?: string
  transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in' | 'safe_transfer' | 'income' | 'expense'
  amount: number
  description: string
  transaction_date: string
  payment_method?: string
  bank_detail?: string
  invoice_number?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    throw new Error('Company not found')
  }

  const supabase = await createClient()
  
  const { error } = await supabase.from('transactions').insert({
    company_id: companyInfo.id,
    account_id: data.account_id || null,
    safe_id: data.safe_id,
    to_safe_id: data.to_safe_id || null,
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description,
    transaction_date: data.transaction_date,
    payment_method: data.payment_method || null,
    bank_detail: data.bank_detail || null,
    invoice_number: data.invoice_number || null,
    category: data.transaction_type,
    currency: 'TRY'
  } as any) // Using any since Database types might be slightly strict due to multiple edits

  if (error) {
    console.error('Create transaction error:', error)
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/accounts')
  if (data.account_id) {
    revalidatePath(`/accounts/${data.account_id}`)
  }
  revalidatePath('/transactions')
  revalidatePath('/safes')
}

export async function batchCreateTransactions(transactions: any[]) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    throw new Error('Company not found')
  }

  const supabase = await createClient()
  
  const formattedTransactions = transactions.map(data => ({
    company_id: companyInfo.id,
    account_id: data.account_id || null,
    safe_id: data.safe_id,
    to_safe_id: data.to_safe_id || null,
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description,
    transaction_date: data.transaction_date,
    payment_method: data.payment_method || null,
    bank_detail: data.bank_detail || null,
    invoice_number: data.invoice_number || null,
    category: data.transaction_type,
    currency: 'TRY'
  }))

  const { error } = await supabase.from('transactions').insert(formattedTransactions)

  if (error) {
    console.error('Batch create transactions error:', error)
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath('/transactions')
  revalidatePath('/safes')
}
