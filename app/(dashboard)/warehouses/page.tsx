import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { redirect } from 'next/navigation'
import { WarehousesClient } from '@/features/warehouses/warehouses-client'

export const dynamic = 'force-dynamic'

export default async function WarehousesPage() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) {
    redirect('/settings/company')
  }

  const supabase = await createClient()

  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .eq('company_id', companyInfo.id)
    .eq('is_active', true)
    .order('name')

  return <WarehousesClient warehouses={warehouses ?? []} />
}
