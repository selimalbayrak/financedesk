import { Metadata } from 'next'
import { DebugClient } from './debug-client'

export const metadata: Metadata = {
  title: 'Hata Keşif & Sistem Testi | FinanceDesk'
}

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Hata Keşif & Sistem Testi (Debug)</h1>
        <p className="text-muted-foreground mt-2">
          Uygulamadaki kritik işlevleri simüle ederek canlı veritabanında yapısal bir sorun olup olmadığını test edin.
        </p>
      </div>
      
      <DebugClient />
    </div>
  )
}
