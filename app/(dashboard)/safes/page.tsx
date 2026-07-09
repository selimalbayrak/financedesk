import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SafesTable } from '@/features/safes/safes-table'
import { SafeFormSheet } from '@/features/safes/safe-form-sheet'

export const dynamic = 'force-dynamic'

export default async function SafesPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: safes } = await supabase
    .from('safe_balances')
    .select('*')
    .eq('company_id', companyInfo.id)
    .order('name')

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Kasalar ve Bankalar</h1>
          <p className="text-muted-foreground">Şirket içi nakit ve banka hesaplarınızı yönetin.</p>
        </div>
        <SafeFormSheet />
      </div>

      <SafesTable data={safes ?? []} />
    </div>
  )
}
