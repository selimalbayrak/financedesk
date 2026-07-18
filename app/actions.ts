'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function switchCompany(companyId: string) {
  const cookieStore = await cookies()
  cookieStore.set('active_company_id', companyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  })
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateCompanyName(companyId: string, newName: string) {
  const supabase = await createClient()
  await supabase.from('companies').update({ name: newName }).eq('id', companyId)
  revalidatePath('/', 'layout')
}

export async function createNewCompany(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmış kullanıcı bulunamadı.' }

  // Insert company
  const { data: company, error: compErr } = await supabase
    .from('companies')
    .insert({ name })
    .select('id')
    .single()

  if (compErr || !company) return { error: `Şirket oluşturulamadı: ${compErr.message}` }

  // Insert company_user link as owner
  const { error: linkErr } = await supabase
    .from('company_users')
    .insert({
      company_id: company.id,
      user_id: user.id,
      role: 'owner'
    })

  if (linkErr) return { error: `Şirket yetkilendirmesi başarısız: ${linkErr.message}` }

  // Switch to the newly created company
  await switchCompany(company.id)
  return { success: true }
}

export async function addMemberToCompany(email: string, role: string) {
  const supabase = await createClient()
  const activeCompany = await getActiveCompany()
  if (!activeCompany) return { error: 'Aktif şirket bulunamadı.' }
  if (activeCompany.role !== 'owner' && activeCompany.role !== 'admin') {
    return { error: 'Bu işlem için yetkiniz yok (Yalnızca Sahip veya Yönetici).' }
  }

  const { data, error } = await supabase.rpc('add_user_to_company_by_email', {
    p_company_id: activeCompany.id,
    p_email: email,
    p_role: role
  })

  if (error) return { error: error.message }
  if (data && data.error) return { error: data.error }

  revalidatePath('/settings')
  return { success: true }
}

export async function removeMemberFromCompany(userId: string) {
  const supabase = await createClient()
  const activeCompany = await getActiveCompany()
  if (!activeCompany) return { error: 'Aktif şirket bulunamadı.' }
  if (activeCompany.role !== 'owner' && activeCompany.role !== 'admin') {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    return { error: 'Kendinizi şirketten çıkaramazsınız.' }
  }

  const { error } = await supabase
    .from('company_users')
    .delete()
    .eq('company_id', activeCompany.id)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateMemberRole(userId: string, newRole: string) {
  const supabase = await createClient()
  const activeCompany = await getActiveCompany()
  if (!activeCompany) return { error: 'Aktif şirket bulunamadı.' }
  if (activeCompany.role !== 'owner' && activeCompany.role !== 'admin') {
    return { error: 'Bu işlem için yetkiniz yok.' }
  }

  const { error } = await supabase
    .from('company_users')
    .update({ role: newRole })
    .eq('company_id', activeCompany.id)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateUserProfile(displayName: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName }
  })

  if (error) return { error: error.message }
  
  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}
