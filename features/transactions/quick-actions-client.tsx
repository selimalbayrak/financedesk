'use client'

import { 
  Building2, 
  CarFront, 
  FileText, 
  Landmark, 
  ArrowRightLeft, 
  Banknote,
  Receipt,
  Users
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export function QuickActionsClient() {
  const actions = [
    {
      title: 'Fatura Kes / Kaydet',
      description: 'Yeni alış veya satış faturası oluşturun.',
      icon: <Receipt className="w-8 h-8 text-blue-600" />,
      href: '/invoices/new',
      color: 'bg-blue-50 dark:bg-blue-900/20',
      hover: 'hover:border-blue-500/50 hover:shadow-blue-500/20'
    },
    {
      title: 'Gider İşle',
      description: 'Fatura dışı kira, aidat vb. giderlerinizi girin.',
      icon: <FileText className="w-8 h-8 text-rose-600" />,
      href: '/transactions?action=expense',
      color: 'bg-rose-50 dark:bg-rose-900/20',
      hover: 'hover:border-rose-500/50 hover:shadow-rose-500/20'
    },
    {
      title: 'Para Al / Gönder',
      description: 'Carilerinizle (Müşteri/Tedarikçi) nakit işlemi yapın.',
      icon: <Banknote className="w-8 h-8 text-emerald-600" />,
      href: '/accounts?action=payment',
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
      hover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/20'
    },
    {
      title: 'Kasa & Banka Virmanı',
      description: 'Kendi kasalarınız ve bankalarınız arası para transferi.',
      icon: <ArrowRightLeft className="w-8 h-8 text-violet-600" />,
      href: '/safes?action=transfer',
      color: 'bg-violet-50 dark:bg-violet-900/20',
      hover: 'hover:border-violet-500/50 hover:shadow-violet-500/20'
    },
    {
      title: 'Yeni Cari Ekle',
      description: 'Sisteme yeni bir müşteri veya tedarikçi kaydedin.',
      icon: <Building2 className="w-8 h-8 text-orange-600" />,
      href: '/accounts?action=new',
      color: 'bg-orange-50 dark:bg-orange-900/20',
      hover: 'hover:border-orange-500/50 hover:shadow-orange-500/20'
    },
    {
      title: 'Yeni Demirbaş / Taşıt',
      description: 'Şirketinize ait maddi duran varlıkları kaydedin.',
      icon: <CarFront className="w-8 h-8 text-cyan-600" />,
      href: '/assets?action=new',
      color: 'bg-cyan-50 dark:bg-cyan-900/20',
      hover: 'hover:border-cyan-500/50 hover:shadow-cyan-500/20'
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Hızlı İşlem Merkezi</h1>
        <p className="text-muted-foreground">
          Yapmak istediğiniz muhasebe işlemini seçin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action, idx) => (
          <Link key={idx} href={action.href} className="block group">
            <Card className={`h-full border-2 border-transparent transition-all duration-300 shadow-sm ${action.hover} bg-card/50 backdrop-blur-sm overflow-hidden`}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-2xl ${action.color} transition-transform duration-300 group-hover:scale-110`}>
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
