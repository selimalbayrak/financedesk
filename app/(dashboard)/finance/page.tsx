import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { redirect } from 'next/navigation'
import { FinanceClient } from '@/features/finance/finance-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Finansman (Çek/Senet ve Kredi)',
}

export default async function FinancePage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()

  const [
    { data: cheques },
    { data: loans },
    { data: installments },
    { data: safes },
    { data: accounts },
    { data: expenses }
  ] = await Promise.all([
    supabase
      .from('cheques_notes')
      .select('*')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('due_date'),
    supabase
      .from('loans')
      .select('*')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('start_date', { ascending: false }),
    supabase
      .from('loan_installments')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('due_date'),
    supabase
      .from('safes')
      .select('id, name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('accounts')
      .select('id, name, company_name')
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('factory_expenses')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('due_date', { ascending: true })
  ])

  return (
    <FinanceClient 
      cheques={cheques ?? []}
      loans={loans ?? []}
      installments={installments ?? []}
      safes={safes ?? []}
      accounts={accounts ?? []}
      expenses={expenses ?? []}
      companyName={companyInfo.name}
    />
  )
}
