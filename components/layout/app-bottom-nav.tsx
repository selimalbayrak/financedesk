'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Plus, Wallet, Briefcase, CreditCard, Package, Building2, FileText, BookOpen, CarFront } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AppBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[800px] print:hidden">
      <div className="flex items-center justify-between px-6 py-4 rounded-[2.5rem] bg-background/80 backdrop-blur-xl border border-border/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] overflow-x-auto no-scrollbar gap-4 sm:gap-6">
        
        {/* Left Side: Financial Flow */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link 
            href="/"
            title="Ana Sayfa"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname === '/' ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <Home className="w-7 h-7 stroke-[2.5]" />
          </Link>

          <Link 
            href="/accounts"
            title="Cariler"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/accounts') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <Briefcase className="w-7 h-7 stroke-[2.5]" />
          </Link>

          <Link 
            href="/safes"
            title="Kasa / Banka"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/safes') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <Wallet className="w-7 h-7 stroke-[2.5]" />
          </Link>

          <Link 
            href="/invoices"
            title="Faturalar"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/invoices') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <FileText className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>

        {/* Center: Floating FAB */}
        <div className="relative -top-6 px-2 shrink-0">
          <Link href="/transactions/new">
            <Button 
              size="icon" 
              title="Hızlı İşlem"
              className="w-16 h-16 rounded-full shadow-[0_10px_20px_-10px_var(--primary)] hover:scale-110 transition-transform bg-primary text-primary-foreground"
            >
              <Plus className="w-8 h-8 stroke-[3]" />
            </Button>
          </Link>
        </div>

        {/* Right Side: Assets & Management */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link 
            href="/employees"
            title="Personel"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/employees') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <Users className="w-7 h-7 stroke-[2.5]" />
          </Link>

          <Link 
            href="/stocks"
            title="Stoklar"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/stocks') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <Package className="w-7 h-7 stroke-[2.5]" />
          </Link>

          <Link 
            href="/assets"
            title="Maddi Duran Varlıklar"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/assets') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <CarFront className="w-7 h-7 stroke-[2.5]" />
          </Link>

          <Link 
            href="/accounting/trial-balance"
            title="Muhasebe"
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px]",
              pathname.startsWith('/accounting') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
            )}
          >
            <BookOpen className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>

      </div>
    </div>
  )
}
