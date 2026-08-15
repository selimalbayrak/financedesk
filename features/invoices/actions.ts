'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { revalidatePath } from 'next/cache'

export async function createInvoice(data: any) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Şirket bulunamadı')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  // 1. Insert Invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      company_id: companyInfo.id,
      account_id: data.account_id,
      type: data.type,
      invoice_number: data.invoice_number,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      ettn: data.ettn || null,
      tax_number: data.tax_number || null,
      tax_office: data.tax_office || null,
      total_amount: data.total_amount,
      tax_amount: data.tax_amount,
      grand_total: data.grand_total,
      status: 'DRAFT',
      created_by: authData.user?.id
    })
    .select()
    .single()

  if (invoiceError) throw new Error(invoiceError.message)

  // 2. Insert Items
  if (data.items && data.items.length > 0) {
    const itemsToInsert = data.items.map((item: any) => ({
      invoice_id: invoice.id,
      stock_id: item.stock_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      total: item.total
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert)

    if (itemsError) throw new Error(itemsError.message)
  }

  revalidatePath('/invoices')
  return invoice
}

export async function deleteInvoice(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Şirket bulunamadı')

  const supabase = await createClient()
  
  // Immutability trigger on DB will block if status is APPROVED
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/invoices')
}

export async function approveInvoice(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Şirket bulunamadı')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  const { error } = await supabase.rpc('approve_invoice', {
    p_invoice_id: id,
    p_user_id: authData.user?.id
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/invoices')
  revalidatePath('/finance')
  revalidatePath('/stocks')
  revalidatePath('/accounts')
}
