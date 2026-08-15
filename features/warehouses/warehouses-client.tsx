'use client'

import { useState } from 'react'
import { Plus, Building2, Pencil, Trash2, MoreVertical, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WarehouseFormSheet } from './warehouse-form-sheet'
import { deleteWarehouse } from './actions'
import { toast } from 'sonner'
import type { Warehouse } from '@/types/database.types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface WarehousesClientProps {
  warehouses: Warehouse[]
}

export function WarehousesClient({ warehouses }: WarehousesClientProps) {
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = (warehouse: Warehouse) => {
    setWarehouseToEdit(warehouse)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!warehouseToDelete) return
    setIsDeleting(true)
    try {
      await deleteWarehouse(warehouseToDelete.id)
      toast.success('Depo silindi!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
      setWarehouseToDelete(null)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-3xl shadow-sm border border-border/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Depolar</h1>
          <p className="text-muted-foreground mt-1">Stoklarınızın bulunduğu depoları yönetin.</p>
        </div>
        <WarehouseFormSheet 
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open)
            if (!open) setWarehouseToEdit(null)
          }}
          warehouseToEdit={warehouseToEdit}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id} className="rounded-3xl border-border/50 hover:border-primary/20 transition-all hover:shadow-md group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem 
                      onClick={() => handleEdit(warehouse)}
                      className="rounded-lg cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setWarehouseToDelete(warehouse)}
                      className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <h3 className="font-semibold text-lg line-clamp-1" title={warehouse.name}>{warehouse.name}</h3>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-sm">Aktif Depo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {warehouses.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl">
            <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Henüz Depo Yok</h3>
            <p className="text-muted-foreground">Stoklarınızı yönetmek için ilk deponuzu oluşturun.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!warehouseToDelete} onOpenChange={(open) => !open && setWarehouseToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Depoyu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu depoyu silmek istediğinize emin misiniz? Bu işlem depoyu devre dışı bırakır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
