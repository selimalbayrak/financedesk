'use client'

import { User, LogOut, Building, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout, switchCompany } from '@/app/actions'
import { useTransition } from 'react'

export function UserMenu({ companyInfo }: { companyInfo?: any }) {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
        
        {companyInfo && companyInfo.allCompanies && companyInfo.allCompanies.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Şirketler</DropdownMenuLabel>
            {companyInfo.allCompanies.map((c: any) => (
              <DropdownMenuItem 
                key={c.id} 
                onClick={() => {
                  if (c.id !== companyInfo.id) {
                    startTransition(() => {
                      switchCompany(c.id)
                    })
                  }
                }}
                className={`cursor-pointer ${c.id === companyInfo.id ? 'bg-accent text-accent-foreground font-medium' : ''}`}
                disabled={isPending}
              >
                <Building className="mr-2 h-4 w-4" />
                <span className="flex-1 truncate">{c.name}</span>
                {c.id === companyInfo.id && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => {
            startTransition(() => {
              logout()
            })
          }} 
          className="text-destructive focus:text-destructive cursor-pointer"
          disabled={isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Çıkış Yap</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
