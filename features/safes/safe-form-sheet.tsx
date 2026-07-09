'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSafe } from './actions'
import { toast } from 'sonner'

export function SafeFormSheet() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      await createSafe({
        name: formData.get('name') as string
      })
      toast.success('Kasa başarıyla eklendi!')
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="gap-2 rounded-2xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
      >
        <Plus className="w-4 h-4" />
        Yeni Kasa Ekle
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md w-full border-l-0 shadow-2xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">Yeni Kasa / Banka Ekle</SheetTitle>
          <SheetDescription>
            Şirketinizdeki nakit kasanızı veya banka hesabınızı buraya tanımlayın.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Kasa Adı</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="Örn: Merkez Kasa, Ziraat Bankası..." 
              required 
              autoComplete="off"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="rounded-xl h-12 px-6"
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl h-12 px-8 shadow-md"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    </>
  )
}
