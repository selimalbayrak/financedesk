import { createClient } from '@/lib/supabase/server'
import { PayablesTable } from '@/features/payables/payables-table'
import { getActiveCompany } from '@/lib/company'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Borç & Alacak',
}

export default async function PayablesPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Şirket hesabı bulunamadı. Lütfen giriş yaptığınızdan emin olun.
      </div>
    )
  }

  const supabase = await createClient()

  const [{ data: payables }, { data: accounts }] = await Promise.all([
    supabase
      .from('payables')
      .select('*, account:accounts(id, name, company_name, type)')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('accounts')
      .select('id, name, company_name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <PayablesTable
      payables={(payables ?? []) as any}
      accounts={accounts ?? []}
      companyId={companyInfo.id}
    />
  )
}
