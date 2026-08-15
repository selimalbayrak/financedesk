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
import { createWarehouse, updateWarehouse } from './actions'
import { toast } from 'sonner'
import type { Warehouse } from '@/types/database.types'

interface WarehouseFormSheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  warehouseToEdit?: Warehouse | null
}

export function WarehouseFormSheet({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  warehouseToEdit
}: WarehouseFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = setControlledOpen || setUncontrolledOpen

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) {
      setName(warehouseToEdit?.name || '')
    }
  }, [open, warehouseToEdit])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (warehouseToEdit) {
        await updateWarehouse(warehouseToEdit.id, { name })
        toast.success('Depo bilgileri güncellendi!')
      } else {
        await createWarehouse({ name })
        toast.success('Yeni depo eklendi!')
      }
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!warehouseToEdit

  return (
    <>
      {controlledOpen === undefined && (
        <Button 
          onClick={() => setOpen(true)}
          className="gap-2 rounded-2xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Yeni Depo Ekle
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md w-full border-l-0 shadow-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">{isEdit ? 'Depoyu Düzenle' : 'Yeni Depo Ekle'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Depo adını güncelleyin.' : 'Şirketinizdeki yeni depoyu tanımlayın.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Depo Adı *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Merkez Depo, Şube Depo 1..." 
                  required 
                  autoComplete="off"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="rounded-xl h-12 px-6"
                disabled={loading}
              >
                İptal
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl h-12 px-8 shadow-lg shadow-primary/25"
                disabled={loading}
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
