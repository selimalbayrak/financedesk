import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { getActiveCompany } from '@/lib/company'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const companyInfo = await getActiveCompany()

  // If the user has no company access at all, redirect to a setup or unauthorized page
  if (!companyInfo) {
    // For now we just let them hit the layout, but in a real app you'd redirect to a "Create Company" flow
  }

  return (
    <SidebarProvider>
      <AppSidebar companyInfo={companyInfo} />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
