import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewInvoiceClient } from '@/features/invoices/new-invoice-client'

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()

  const [
    { data: accounts },
    { data: stocks }
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('stocks')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('code')
  ])

  return <NewInvoiceClient accounts={accounts ?? []} stocks={stocks ?? []} />
}
