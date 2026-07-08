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

  const { data: accountsRaw } = await supabase
    .from('accounts')
    .select('*, account_balances(balance)')
    .eq('company_id', companyInfo.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  const accounts = (accountsRaw ?? []).map(acc => ({
    ...acc,
    balance: (acc.account_balances as any)?.[0]?.balance ?? 0
  }))

  return <AccountsTable accounts={accounts as any} companyId={companyInfo.id} />
}
