'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ArrowUpDown,
  GitMerge,
  Landmark,
  FileCheck,
  FileText,
  Receipt,
  Building2,
  Check,
  ChevronsUpDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const navItems = [
  {
    label: 'Ana Menü',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        active: true,
      },
      {
        title: 'Cari Hesaplar',
        href: '/accounts',
        icon: Users,
        active: true,
      },
      {
        title: 'Borç / Alacak',
        href: '/payables',
        icon: ArrowUpDown,
        active: true,
      },
    ],
  },
  {
    label: 'Yakında',
    items: [
      {
        title: 'Mutabakat',
        href: '/reconciliation',
        icon: GitMerge,
        active: false,
      },
      {
        title: 'Krediler',
        href: '/loans',
        icon: Landmark,
        active: false,
      },
      {
        title: 'Çekler',
        href: '/checks',
        icon: FileCheck,
        active: false,
      },
      {
        title: 'Senetler',
        href: '/notes',
        icon: FileText,
        active: false,
      },
      {
        title: 'Fatura Arşivi',
        href: '/invoices',
        icon: Receipt,
        active: false,
      },
    ],
  },
]

export function AppSidebar({ companyInfo }: { companyInfo: any }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSwitchCompany(companyId: string) {
    await fetch('/api/company/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    })
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {companyInfo ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Building2 className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {companyInfo.name}
                        </span>
                        <span className="truncate text-xs">Şirket Hesabı</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  {companyInfo.allCompanies.map((company: any) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => handleSwitchCompany(company.id)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <Building2 className="size-4 shrink-0" />
                      </div>
                      <span className="flex-1 truncate">{company.name}</span>
                      {companyInfo.id === company.id && (
                        <Check className="size-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={<Link href="/settings/company" className="flex items-center gap-2 p-2" />}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md bg-background border">
                      <div className="text-xl leading-none font-light mb-[2px]">+</div>
                    </div>
                    <span className="flex-1 truncate">Yeni Şirket Ekle</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
              FD
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold leading-none truncate">FinanceDesk</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Muhasebe Uygulaması</span>
            </div>
          </div>
        )}
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
          v1.0.0 · Ücretsiz Plan
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
