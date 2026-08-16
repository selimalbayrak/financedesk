'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function createFixedAsset(data: {
  name: string
  purchase_date: string
  purchase_price: number // in cents
  parent_account_id: string // e.g., 254 Taşıtlar id
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Şirket bulunamadı' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  // 1. Get parent account (e.g. 254)
  const { data: parentAccount, error: parentErr } = await supabase
    .from('chart_of_accounts')
    .select('code')
    .eq('id', data.parent_account_id)
    .single()
    
  if (parentErr || !parentAccount) return { error: 'Ana hesap bulunamadı.' }

  // 2. First, generate SUB account (e.g. 254.01) if not exists, or just generate DETAIL directly (254.01.001)
  // According to standard, we usually have a SUB group first. But to keep it simple and consistent, we'll just generate a DETAIL account under the parent. 
  // Wait, our new RPC supports p_type.
  // Let's create a DETAIL account directly under the parent for simplicity, or we can use the RPC.
  const { data: newCode, error: rpcErr } = await supabase
    .rpc('generate_next_account_code', {
      p_company_id: companyInfo.id,
      p_parent_code: parentAccount.code,
      p_type: 'DETAIL'
    })

  if (rpcErr || !newCode) return { error: 'Kod oluşturulamadı: ' + (rpcErr?.message || 'Bilinmeyen hata') }

  // 3. Create the new DETAIL account in chart_of_accounts
  const { data: newAccount, error: accErr } = await supabase
    .from('chart_of_accounts')
    .insert({
      company_id: companyInfo.id,
      code: newCode,
      name: data.name,
      type: 'DETAIL',
      parent_id: data.parent_account_id,
      created_by
    } as any)
    .select()
    .single()

  if (accErr) return { error: 'Muhasebe hesabı açılamadı: ' + accErr.message }

  // 4. Create the Fixed Asset
  const { data: newAsset, error: assetErr } = await supabase
    .from('fixed_assets')
    .insert({
      company_id: companyInfo.id,
      chart_of_account_id: newAccount.id,
      name: data.name,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price,
      created_by
    } as any)
    .select()
    .single()

  if (assetErr) {
    // rollback account creation
    await supabase.from('chart_of_accounts').delete().eq('id', newAccount.id)
    return { error: 'Varlık kaydedilemedi: ' + assetErr.message }
  }

  revalidatePath('/assets')
  return { success: true, data: newAsset }
}

export async function sellFixedAsset(asset_id: string, sale_price: number, target_account_id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Şirket bulunamadı' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  const { data, error } = await supabase.rpc('process_asset_sale', {
    p_company_id: companyInfo.id,
    p_asset_id: asset_id,
    p_sale_price: sale_price,
    p_target_account_id: target_account_id,
    p_created_by: created_by
  })

  if (error) return { error: error.message }

  revalidatePath('/assets')
  return { success: true, data }
}

export async function deleteFixedAsset(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Şirket bulunamadı' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('fixed_assets')
    .delete()
    .eq('id', id)
    .eq('company_id', companyInfo.id)

  if (error) return { error: error.message }

  revalidatePath('/assets')
  return { success: true }
}
