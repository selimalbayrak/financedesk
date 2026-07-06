import { cookies } from 'next/headers'
import { createClient } from './supabase/server'

export async function getActiveCompany() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get all companies the user has access to
  const { data: companyUsers } = await supabase
    .from('company_users')
    .select('company_id, role, companies(id, name)')
    .eq('user_id', user.id)

  if (!companyUsers || companyUsers.length === 0) return null

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('active_company_id')?.value

  // If cookie exists and user has access to it, use it
  const activeCompany = companyUsers.find(cu => cu.company_id === activeCompanyId)
  
  if (activeCompany) {
    return {
      id: activeCompany.company_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: (activeCompany.companies as any).name as string,
      role: activeCompany.role,
      allCompanies: companyUsers.map(cu => ({
        id: cu.company_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: (cu.companies as any).name as string,
        role: cu.role
      }))
    }
  }

  // Otherwise default to the first one
  return {
    id: companyUsers[0].company_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: (companyUsers[0].companies as any).name as string,
    role: companyUsers[0].role,
    allCompanies: companyUsers.map(cu => ({
      id: cu.company_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: (cu.companies as any).name as string,
      role: cu.role
    }))
  }
}
