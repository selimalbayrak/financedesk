import { ChequeForm } from '@/features/finance/cheque-form'
import { getActiveCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yeni Çek/Senet',
}

export default async function NewChequePage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()
  
  const [
    { data: accounts },
    { data: safes }
  ] = await Promise.all([
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

  return <ChequeForm accounts={accounts ?? []} safes={safes ?? []} />
}
