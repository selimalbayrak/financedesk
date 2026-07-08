'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function createTransaction(data: {
  account_id: string
  transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in'
  amount: number
  description: string
  transaction_date: string
  payment_method?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    throw new Error('Company not found')
  }

  const supabase = await createClient()
  
  const { error } = await supabase.from('transactions').insert({
    company_id: companyInfo.id,
    account_id: data.account_id,
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description,
    transaction_date: data.transaction_date,
    payment_method: data.payment_method || null,
    category: data.transaction_type,
    currency: 'TRY'
  })

  if (error) {
    console.error('Create transaction error:', error)
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath(`/accounts/${data.account_id}`)
  revalidatePath('/transactions')
}
