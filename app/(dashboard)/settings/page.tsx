import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { SettingsClient } from '@/features/settings/settings-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ayarlar ve Üye Yönetimi',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Get current user profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const companyInfo = await getActiveCompany()

  // Get active company members (only if company is selected)
  let members: any[] = []
  if (companyInfo) {
    const { data: membersRaw, error: rpcError } = await supabase.rpc('get_company_members', {
      p_company_id: companyInfo.id
    })

    if (rpcError) {
      console.error('Error fetching company members:', rpcError)
    } else {
      members = membersRaw ?? []
    }
  }

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
