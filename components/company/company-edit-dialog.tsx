'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCompanyName } from '@/app/actions'
import { Loader2 } from 'lucide-react'

interface CompanyEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  currentName: string
}

export function CompanyEditDialog({ open, onOpenChange, companyId, currentName }: CompanyEditDialogProps) {
  const [name, setName] = useState(currentName)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (!name.trim()) return
    startTransition(async () => {
      await updateCompanyName(companyId, name.trim())
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Şirket Adını Düzenle</DialogTitle>
          <DialogDescription>
            Şirketinizin görünen adını buradan değiştirebilirsiniz. Bu isim aynı zamanda mutabakat mektuplarında "Gönderen" olarak kullanılacaktır.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Şirket Adı / Ünvanı</Label>
            <Input
              id="companyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Şirket Adı"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
