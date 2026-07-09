'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSafe, updateSafe } from './actions'
import { toast } from 'sonner'

interface SafeFormSheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  safeToEdit?: { id: string; name: string }
}

export function SafeFormSheet({ open: controlledOpen, onOpenChange: setControlledOpen, safeToEdit }: SafeFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setUncontrolledOpen

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) {
      setName(safeToEdit?.name || '')
    }
  }, [open, safeToEdit])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      if (safeToEdit) {
        await updateSafe(safeToEdit.id, { name })
        toast.success('Kasa başarıyla güncellendi!')
      } else {
        await createSafe({ name })
        toast.success('Kasa başarıyla eklendi!')
      }
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!safeToEdit

  return (
    <>
      {controlledOpen === undefined && (
        <Button 
          onClick={() => setOpen(true)}
          className="gap-2 rounded-2xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Yeni Kasa Ekle
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md w-full border-l-0 shadow-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">{isEdit ? 'Kasayı Düzenle' : 'Yeni Kasa / Banka Ekle'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Kasa veya banka hesabı adını güncelleyin.' : 'Şirketinizdeki nakit kasanızı veya banka hesabınızı buraya tanımlayın.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Kasa Adı</Label>
              <Input 
                id="name" 
                name="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
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
