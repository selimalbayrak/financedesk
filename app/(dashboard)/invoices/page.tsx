import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoicesClient } from '@/features/invoices/invoices-client'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, accounts(*)')
    .eq('company_id', companyInfo.id)
    .order('issue_date', { ascending: false })

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Faturalar</h1>
        <p className="text-muted-foreground">Alış ve satış faturalarınızı yönetin, muhasebe fişlerini otomatik oluşturun.</p>
      </div>

      <InvoicesClient invoices={invoices ?? []} />
    </div>
  )
}
