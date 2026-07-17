'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, History, Plus, Wallet, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AppBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[400px] print:hidden">
      <div className="flex items-center justify-between px-8 py-4 rounded-[2.5rem] bg-background/70 backdrop-blur-xl border border-border/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]">
        
        {/* Dashboard */}
        <Link 
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            pathname === '/' ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Home className="w-7 h-7 stroke-[2.5]" />
        </Link>

        {/* Accounts */}
        <Link 
          href="/accounts"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            pathname.startsWith('/accounts') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Briefcase className="w-7 h-7 stroke-[2.5]" />
        </Link>

        {/* Floating FAB */}
        <div className="relative -top-8 px-4">
          <Link href="/transactions/new">
            <Button 
              size="icon" 
              className="w-16 h-16 rounded-full shadow-[0_10px_20px_-10px_var(--primary)] hover:scale-110 transition-transform bg-primary text-primary-foreground"
            >
              <Plus className="w-8 h-8 stroke-[3]" />
            </Button>
          </Link>
        </div>

        {/* Safes */}
        <Link 
          href="/safes"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            pathname.startsWith('/safes') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Wallet className="w-7 h-7 stroke-[2.5]" />
        </Link>

        {/* Employees */}
        <Link 
          href="/employees"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            pathname.startsWith('/employees') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <Users className="w-7 h-7 stroke-[2.5]" />
        </Link>

        {/* Transactions (History) */}
        <Link 
          href="/transactions"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            pathname.startsWith('/transactions') ? "text-primary scale-110" : "text-muted-foreground hover:text-primary hover:scale-105"
          )}
        >
          <History className="w-7 h-7 stroke-[2.5]" />
        </Link>

      </div>
    </div>
  )
}
