import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { EmployeeDetailView } from '@/features/employees/employee-detail-view'
import type { Metadata } from 'next'

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EmployeeDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('employees').select('name').eq('id', id).single()
  return {
    title: data?.name ?? 'Personel Detayı',
  }
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params
  const companyInfo = await getActiveCompany()

  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()

  const [
    { data: employeeRaw },
    { data: transactions },
    { data: safesRaw }
  ] = await Promise.all([
    supabase.from('employee_balances').select('*').eq('id', id).eq('company_id', companyInfo.id).single(),
    supabase
      .from('employee_transactions')
      .select('*')
      .eq('employee_id', id)
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('safe_balances')
      .select('*')
      .eq('company_id', companyInfo.id)
      .order('name', { ascending: true })
  ])

  if (!employeeRaw) notFound()

  return (
    <EmployeeDetailView
      employee={employeeRaw as any}
      transactions={transactions ?? []}
      safes={safesRaw ?? []}
      companyId={companyInfo.id}
    />
  )
}
