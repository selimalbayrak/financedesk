'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { revalidatePath } from 'next/cache'

export async function createSafe(data: { name: string, type: 'kasa' | 'banka' }) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  const parentCode = data.type === 'kasa' ? '100' : '102'

  // Generate next code via RPC
  const { data: newCode, error: rpcErr } = await supabase
    .rpc('generate_next_account_code', {
      p_company_id: companyInfo.id,
      p_parent_code: parentCode
    })

  if (rpcErr || !newCode) throw new Error('Kod oluşturulamadı: ' + (rpcErr?.message || 'Bilinmeyen hata'))

  // Find parent_id for the parentCode
  const { data: parentAccount, error: parentErr } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('company_id', companyInfo.id)
    .eq('code', parentCode)
    .single()

  if (parentErr || !parentAccount) throw new Error(`${parentCode} ana hesabı bulunamadı. Lütfen Tekdüzen Hesap Planını başlatın.`)

  // Create the new DETAIL account
  const { data: newAccount, error: accErr } = await supabase
    .from('chart_of_accounts')
    .insert({
      company_id: companyInfo.id,
      code: newCode,
      name: data.name,
      type: 'DETAIL',
      parent_id: parentAccount.id,
      created_by
    } as any)
    .select()
    .single()

  if (accErr) throw new Error('Muhasebe hesabı açılamadı: ' + accErr.message)

  const { error } = await supabase.from('safes').insert({
    company_id: companyInfo.id,
    name: data.name,
    chart_of_account_id: newAccount.id
  } as any)

  if (error) throw new Error(error.message)
  
  revalidatePath('/safes')
  revalidatePath('/transactions/new')
}

export async function updateSafe(id: string, data: { name: string }) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { error } = await supabase.from('safes').update({
    name: data.name,
    updated_at: new Date().toISOString()
  }).eq('id', id).eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/safes')
  revalidatePath('/transactions/new')
}

export async function deleteSafe(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { error } = await supabase.from('safes').update({
    deleted_at: new Date().toISOString()
  }).eq('id', id).eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/safes')
  revalidatePath('/transactions/new')
}

export async function transferFunds(data: {
  from_safe_id: string
  to_safe_id: string
  amount: number
  notes?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  const { error } = await supabase.rpc('transfer_funds', {
    p_company_id: companyInfo.id,
    p_sender_safe_id: data.from_safe_id,
    p_receiver_safe_id: data.to_safe_id,
    p_amount: data.amount,
    p_notes: data.notes || '',
    p_created_by: authData.user?.id || null
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/safes')
  revalidatePath('/transactions')
}
