import { createClient } from '@/lib/supabase/server'
import { AccountsTable } from '@/features/accounts/accounts-table'
import { getActiveCompany } from '@/lib/company'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cari Hesaplar',
}

export default async function AccountsPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Şirket hesabı bulunamadı. Lütfen giriş yaptığınızdan emin olun.
      </div>
    )
  }

  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('company_id', companyInfo.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return <AccountsTable accounts={accounts ?? []} companyId={companyInfo.id} />
}
