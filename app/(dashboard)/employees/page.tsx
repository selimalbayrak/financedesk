import { createClient } from '@/lib/supabase/server'
import { EmployeesTable } from '@/features/employees/employees-table'
import { getActiveCompany } from '@/lib/company'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Personeller',
}

export default async function EmployeesPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Şirket hesabı bulunamadı. Lütfen giriş yaptığınızdan emin olun.
      </div>
    )
  }

  const supabase = await createClient()

  const { data: employeesRaw } = await supabase
    .from('employee_balances')
    .select('*')
    .eq('company_id', companyInfo.id)
    .order('name', { ascending: true })

  const employees = employeesRaw ?? []

  return <EmployeesTable employees={employees as any} companyId={companyInfo.id} />
}
