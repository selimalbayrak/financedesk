import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { SettingsClient } from '@/features/settings/settings-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ayarlar ve Üye Yönetimi',
}

export default async function SettingsPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Get current user profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get active company members
  const { data: membersRaw, error: rpcError } = await supabase.rpc('get_company_members', {
    p_company_id: companyInfo.id
  })

  if (rpcError) {
    console.error('Error fetching company members:', rpcError)
  }

  const members = membersRaw ?? []

  return (
    <SettingsClient
      currentUser={{
        id: user.id,
        email: user.email ?? '',
        displayName: user.user_metadata?.display_name ?? ''
      }}
      companyInfo={companyInfo}
      members={members}
    />
  )
}
