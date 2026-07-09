'use client'

import { User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/actions'

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Şirket Ayarları</span>
        </DropdownMenuItem> */}
        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Çıkış Yap</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
