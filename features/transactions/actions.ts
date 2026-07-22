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
  revalidatePath('/accounts/[id]', 'page')
  revalidatePath('/transactions')
  revalidatePath('/safes')
}

export async function updateTransaction(id: string, data: {
  transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in' | 'safe_transfer' | 'income' | 'expense'
  amount: number
  description: string
  transaction_date: string
  document_no?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('account_id')
    .eq('id', id)
    .eq('company_id', companyInfo.id)
    .single()

  const { error } = await supabase.from('transactions').update({
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description,
    transaction_date: data.transaction_date,
    document_no: data.document_no || null,
    category: data.transaction_type,
  } as any).eq('id', id).eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath('/accounts/[id]', 'page')
  if (existingTx?.account_id) {
    revalidatePath(`/accounts/${existingTx.account_id}`)
  }
  revalidatePath('/transactions')
  revalidatePath('/safes')
}

export async function deleteTransaction(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('account_id')
    .eq('id', id)
    .eq('company_id', companyInfo.id)
    .single()

  await supabase.from('transaction_lines').delete().eq('transaction_id', id)
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath('/accounts/[id]', 'page')
  if (existingTx?.account_id) {
    revalidatePath(`/accounts/${existingTx.account_id}`)
  }
  revalidatePath('/transactions')
  revalidatePath('/safes')
}

export async function deleteAllAccountTransactions(accountId: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  
  const { data: txs } = await supabase.from('transactions').select('id').eq('account_id', accountId).eq('company_id', companyInfo.id)
  
  if (txs && txs.length > 0) {
    const txIds = txs.map(t => t.id)
    
    // Chunk size for bulk operations to prevent 414 URI Too Long
    const chunkSize = 50
    for (let i = 0; i < txIds.length; i += chunkSize) {
      const chunk = txIds.slice(i, i + chunkSize)
      
      // Delete lines first due to RLS cascade issue
      await supabase.from('transaction_lines').delete().in('transaction_id', chunk)
      
      // Delete transactions chunk
      const { error } = await supabase.from('transactions').delete().in('id', chunk).eq('company_id', companyInfo.id)
      if (error) throw new Error(error.message)
    }
  }

  revalidatePath('/')
  revalidatePath('/accounts')
  revalidatePath('/accounts/[id]', 'page')
  revalidatePath(`/accounts/${accountId}`)
  revalidatePath('/transactions')
  revalidatePath('/safes')
}

export async function createEmployeeTransaction(data: {
  employee_id: string
  safe_id: string
  transaction_type: 'advance_payment' | 'salary_payment'
  amount: number
  description: string
  date: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    throw new Error('Company not found')
  }

  const supabase = await createClient()
  
  const { error } = await supabase.from('employee_transactions').insert({
    company_id: companyInfo.id,
    employee_id: data.employee_id,
    safe_id: data.safe_id,
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description,
    date: data.date
  })

  if (error) {
    console.error('Create employee transaction error:', error)
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/employees')
  revalidatePath(`/employees/${data.employee_id}`)
  revalidatePath('/safes')
}

export async function createStockReceipt(data: {
  account_id?: string
  safe_id?: string
  stock_id: string
  movement_type: 'in' | 'out'
  quantity: number
  unit_price: number
  description?: string
  transaction_date: string
  invoice_number?: string
  payment_method?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  // 1. Fetch stock
  const { data: stock, error: fetchErr } = await supabase
    .from('stocks')
    .select('*')
    .eq('id', data.stock_id)
    .eq('company_id', companyInfo.id)
    .single()

  if (fetchErr || !stock) return { error: 'Stok ürünü bulunamadı.' }

  const total_amount = Math.round(data.quantity * data.unit_price)

  // 2. Create Transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      company_id: companyInfo.id,
      account_id: data.account_id || null,
      safe_id: data.safe_id || null,
      transaction_type: data.movement_type === 'in' ? 'payment_out' : 'payment_in',
      amount: total_amount,
      description: data.description || (data.movement_type === 'in' ? 'Stok Girişi (Alış)' : 'Stok Çıkışı (Satış)'),
      transaction_date: data.transaction_date,
      invoice_number: data.invoice_number,
      payment_method: data.payment_method
    } as any)
    .select()
    .single()

  if (txError) return { error: txError.message }

  // 3. Create Stock Movement
  const { error: moveErr } = await supabase.from('stock_movements').insert({
    company_id: companyInfo.id,
    stock_id: data.stock_id,
    account_id: data.account_id || null,
    transaction_id: tx.id,
    movement_type: data.movement_type,
    quantity: data.quantity,
    unit_price: data.unit_price,
    total_amount,
    notes: data.description || (data.movement_type === 'in' ? 'Stok Girişi (Alış)' : 'Stok Çıkışı (Satış)')
  } as any)

  if (moveErr) {
    await supabase.from('transactions').delete().eq('id', tx.id)
    return { error: moveErr.message }
  }

  // 4. Update Stock Quantity
  const newQty = data.movement_type === 'in'
    ? Number(stock.quantity_on_hand || 0) + Number(data.quantity)
    : Number(stock.quantity_on_hand || 0) - Number(data.quantity)

  await supabase
    .from('stocks')
    .update({
      quantity_on_hand: newQty,
      unit_price: data.unit_price,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', data.stock_id)

  revalidatePath('/transactions')
  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true }
}
