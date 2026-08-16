'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { revalidatePath } from 'next/cache'

export async function createWarehouse(data: { name: string }) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  
  const { error } = await supabase.from('warehouses').insert({
    company_id: companyInfo.id,
    name: data.name,
    created_by: authData.user?.id || null,
    is_active: true
  } as any)

  if (error) throw new Error(error.message)
  
  revalidatePath('/warehouses')
  revalidatePath('/stocks')
}

export async function updateWarehouse(id: string, data: { name: string }) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { error } = await supabase.from('warehouses').update({
    name: data.name,
    updated_at: new Date().toISOString()
  } as any).eq('id', id).eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/warehouses')
  revalidatePath('/stocks')
}

export async function deleteWarehouse(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { error } = await supabase.from('warehouses').update({
    is_active: false,
    updated_at: new Date().toISOString()
  } as any).eq('id', id).eq('company_id', companyInfo.id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/warehouses')
  revalidatePath('/stocks')
}
