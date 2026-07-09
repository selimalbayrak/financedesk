'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { revalidatePath } from 'next/cache'

export async function createSafe(data: { name: string }) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { error } = await supabase.from('safes').insert({
    company_id: companyInfo.id,
    name: data.name
  })

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
