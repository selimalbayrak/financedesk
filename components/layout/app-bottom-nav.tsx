'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Plus, Wallet, Briefcase, CreditCard, Package, Building2, FileText, BookOpen, CarFront } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AppBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[98%] max-w-[900px] print:hidden">
      <div className="flex items-center justify-start sm:justify-between px-2 sm:px-6 py-2 sm:py-3 rounded-full bg-background/90 backdrop-blur-xl border border-border/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] overflow-x-auto no-scrollbar gap-2 sm:gap-4">
        
        {/* Dashboard */}
        <Link 
          href="/"
          title="Ana Sayfa"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname === '/' ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Home className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/accounts"
          title="Cariler"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/accounts') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/safes"
          title="Kasa / Banka"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/safes') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Wallet className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/invoices"
          title="Faturalar"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/invoices') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <FileText className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/finance"
          title="Finansman"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/finance') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        {/* Center: Floating FAB (No longer escaping container to prevent clipping) */}
        <div className="shrink-0 px-1 sm:px-2 flex items-center justify-center">
          <Link href="/transactions/new">
            <Button 
              size="icon" 
              title="Hızlı İşlem"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-[0_10px_20px_-10px_var(--primary)] hover:scale-110 transition-transform bg-primary text-primary-foreground"
            >
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
            </Button>
          </Link>
        </div>

        <Link 
          href="/employees"
          title="Personel"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/employees') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Users className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/stocks"
          title="Stoklar"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/stocks') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Package className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/warehouses"
          title="Depolar"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/warehouses') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Building2 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/assets"
          title="Maddi Duran Varlıklar"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/assets') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <CarFront className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

        <Link 
          href="/accounting/trial-balance"
          title="Muhasebe"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[44px] sm:min-w-[48px]",
            pathname.startsWith('/accounting') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </Link>

      </div>
    </div>
  )
}
