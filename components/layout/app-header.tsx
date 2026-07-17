'use client'

import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  accounts: 'Current Accounts',
  payables: 'Payables & Receivables',
  reconciliation: 'Reconciliation',
  loans: 'Loans',
  checks: 'Checks',
  notes: 'Promissory Notes',
  invoices: 'Invoice Archive',
  employees: 'Personeller',
}

export function AppHeader({ companyInfo }: { companyInfo?: any }) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="flex h-14 items-center gap-2 px-4 sticky top-0 z-40 bg-background/80 backdrop-blur-sm lg:max-w-5xl lg:mx-auto lg:w-full print:hidden">


      <Breadcrumb>
        <BreadcrumbList>
          {segments.length === 0 ? (
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              {segments.map((segment, idx) => {
                const isLast = idx === segments.length - 1
                const label = routeLabels[segment] ?? segment
                const href = '/' + segments.slice(0, idx + 1).join('/')
                return (
                  <span key={segment} className="flex items-center gap-1.5">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                )
              })}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu companyInfo={companyInfo} />
      </div>
    </header>
  )
}
