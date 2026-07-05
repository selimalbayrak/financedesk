import { createClient } from '@/lib/supabase/server'
import { AccountsTable } from '@/features/accounts/accounts-table'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Current Accounts',
}

export default async function AccountsPage() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return <AccountsTable accounts={accounts ?? []} />
}
