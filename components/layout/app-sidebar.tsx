'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ArrowUpDown,
  GitMerge,
  Landmark,
  FileCheck,
  FileText,
  Receipt,
  ChevronRight,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Main',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        active: true,
      },
      {
        title: 'Current Accounts',
        href: '/accounts',
        icon: Users,
        active: true,
      },
      {
        title: 'Payables & Receivables',
        href: '/payables',
        icon: ArrowUpDown,
        active: true,
      },
    ],
  },
  {
    label: 'Coming Soon',
    items: [
      {
        title: 'Reconciliation',
        href: '/reconciliation',
        icon: GitMerge,
        active: false,
      },
      {
        title: 'Loans',
        href: '/loans',
        icon: Landmark,
        active: false,
      },
      {
        title: 'Checks',
        href: '/checks',
        icon: FileCheck,
        active: false,
      },
      {
        title: 'Promissory Notes',
        href: '/notes',
        icon: FileText,
        active: false,
      },
      {
        title: 'Invoice Archive',
        href: '/invoices',
        icon: Receipt,
        active: false,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            FD
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-none truncate">FinanceDesk</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Business Accounting</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navItems.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    {item.active ? (
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        isActive={false}
                        tooltip={item.title}
                        className="opacity-40 cursor-not-allowed pointer-events-none"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          v1.0.0 · Free Tier
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
