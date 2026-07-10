import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { ImportForm } from '@/features/transactions/import-form'
import { redirect } from 'next/navigation'

export default async function ImportTransactionPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  const [{ data: accounts }, { data: safes }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, company_name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('safes')
      .select('id, name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name')
  ])

  return (
    <div className="pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">PDF'den İçe Aktar</h1>
        <p className="text-muted-foreground mt-1">Banka veya Cari hesap ekstrelerinizi yükleyerek işlemleri otomatik oluşturun.</p>
      </div>
      <ImportForm accounts={accounts ?? []} safes={safes ?? []} />
    </div>
  )
}
