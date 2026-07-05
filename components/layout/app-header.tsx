'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
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

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  accounts: 'Current Accounts',
  payables: 'Payables & Receivables',
  reconciliation: 'Reconciliation',
  loans: 'Loans',
  checks: 'Checks',
  notes: 'Promissory Notes',
  invoices: 'Invoice Archive',
}

export function AppHeader() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="flex h-14 items-center gap-2 border-b px-4 sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1 h-8 w-8" />
      <Separator orientation="vertical" className="h-4" />

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

      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
