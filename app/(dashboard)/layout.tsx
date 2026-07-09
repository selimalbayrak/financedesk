import { AppHeader } from '@/components/layout/app-header'
import { AppBottomNav } from '@/components/layout/app-bottom-nav'
import { getActiveCompany } from '@/lib/company'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const companyInfo = await getActiveCompany()

  if (!companyInfo) {
    // Handling no-company logic
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 relative">
      <AppHeader companyInfo={companyInfo} />
      <main className="flex-1 p-6 lg:max-w-5xl lg:mx-auto lg:w-full">
        {children}
      </main>
      <AppBottomNav />
    </div>
  )
}
