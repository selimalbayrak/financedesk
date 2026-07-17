'use client'

import React, { useState, useEffect } from 'react'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowDownCircle, ArrowUpCircle, Activity, Wallet, PackagePlus, Settings, Users, Landmark } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TxRow {
  id: string
  transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in'
  amount: number
  description: string | null
  category: string
  transaction_date: string
  account: { name: string } | null
}

interface EmployeeRow {
  id: string
  name: string
  balance: number
}

interface DashboardData {
  totalReceivable: number
  totalPayable: number
  netBalance: number
  recentTransactions: TxRow[]
  employees: EmployeeRow[]
  financeSummary?: {
    totalLoanRemaining: number
    totalChequesIn: number
    totalChequesOut: number
  }
}

interface DashboardClientProps {
  data: DashboardData
}

type WidgetKey = 'kpi' | 'transactions' | 'employees' | 'finance'

const WIDGET_NAMES: Record<WidgetKey, string> = {
  kpi: 'Özet (Cari Alacak/Borç)',
  transactions: 'Son İşlemler',
  employees: 'Personel Maaş ve Avansları',
  finance: 'Kredi ve Çek/Senet Özetleri'
}

export function DashboardClient({ data }: DashboardClientProps) {
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>({
    kpi: true,
    transactions: true,
    employees: true,
    finance: true
  })
  const [mounted, setMounted] = useState(false)

  // Load from local storage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('dashboard_widgets')
    if (saved) {
      try {
        setWidgets(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const toggleWidget = (key: WidgetKey) => {
    const newWidgets = { ...widgets, [key]: !widgets[key] }
    setWidgets(newWidgets)
    localStorage.setItem('dashboard_widgets', JSON.stringify(newWidgets))
  }

  // Calculate total employee debt
  const totalEmployeeDebt = data.employees.reduce((acc, emp) => acc + emp.balance, 0)

  if (!mounted) return null // avoid hydration mismatch

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Ana Ekran"
          description="Şirketinizin genel finansal durumu"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
            <Settings className="w-4 h-4" />
            Özelleştir
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border">
            {Object.entries(WIDGET_NAMES).map(([key, label]) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={widgets[key as WidgetKey]}
                onCheckedChange={() => toggleWidget(key as WidgetKey)}
                className="cursor-pointer"
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* KPI Cards */}
      {widgets.kpi && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Bizim Alacağımız"
            value={data.totalReceivable}
            icon={ArrowDownCircle}
            description="Cari hesaplardan toplam alacaklar"
            trend="positive"
          />
          <StatCard
            title="Bizim Borcumuz"
            value={data.totalPayable}
            icon={ArrowUpCircle}
            description="Cari hesaplara toplam borçlar"
            trend="negative"
          />
          <StatCard
            title="Cari Net Durum"
            value={data.netBalance}
            icon={Wallet}
            description="Alacak - Borç Farkı"
            trend={data.netBalance >= 0 ? 'positive' : 'negative'}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        
        {/* Recent Transactions */}
        {widgets.transactions && (
          <Card className="border-border/50 shadow-sm md:col-span-1">
            <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Activity className="w-4 h-4" />
                <CardTitle className="text-sm font-semibold">Son Eklenen İşlemler</CardTitle>
              </div>
              <Link href="/transactions/import">
                <Button variant="outline" size="sm" className="h-8 rounded-full">
                  <PackagePlus className="w-3.5 h-3.5 mr-2" />
                  PDF'den Aktar
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {data.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Henüz hiçbir işlem bulunmuyor
                </p>
              ) : (
                <div className="divide-y">
                  {data.recentTransactions.map((tx) => {
                    const isPositive = tx.transaction_type === 'payment_in' || tx.transaction_type === 'invoice_out'
                    const label = 
                      tx.transaction_type === 'payment_in' ? 'Alınan Ödeme' :
                      tx.transaction_type === 'payment_out' ? 'Gönderilen Ödeme' :
                      tx.transaction_type === 'invoice_in' ? 'Alınan Ürün/Hizmet' :
                      'Verilen Ürün/Hizmet'

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {tx.account?.name ?? (tx.description || 'Diğer İşlem')}
                          </p>
                          <p className="text-xs text-muted-foreground flex gap-2 mt-1">
                            <span className="font-medium text-foreground/70">{label}</span>
                            <span>&bull;</span>
                            <span>{formatDate(tx.transaction_date)}</span>
                            {tx.description && tx.account && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate">{tx.description}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Finance Summary Widget */}
        {widgets.finance && data.financeSummary && (
          <Card className="border-border/50 shadow-sm md:col-span-1">
            <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Landmark className="w-4 h-4" />
                <CardTitle className="text-sm font-semibold">Finansman Durumu</CardTitle>
              </div>
              <Link href="/finance">
                <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-primary">
                  Tümünü Gör
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                <div>
                  <span className="text-xs text-muted-foreground block">Kalan Kredi Borcu</span>
                  <span className="text-lg font-bold text-rose-600">
                    {formatCurrency(data.financeSummary.totalLoanRemaining)}
                  </span>
                </div>
                <Landmark className="w-8 h-8 text-rose-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <span className="text-xs text-muted-foreground block">Portföydeki Çekler</span>
                  <span className="text-base font-bold text-emerald-600">
                    {formatCurrency(data.financeSummary.totalChequesIn)}
                  </span>
                </div>
                <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                  <span className="text-xs text-muted-foreground block">Verilen Çekler</span>
                  <span className="text-base font-bold text-rose-600">
                    {formatCurrency(data.financeSummary.totalChequesOut)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employees */}
        {widgets.employees && (
          <Card className="border-border/50 shadow-sm md:col-span-1">
            <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-4 h-4" />
                <CardTitle className="text-sm font-semibold">Personel Durumu</CardTitle>
              </div>
              <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900">
                Toplam Borcumuz: {formatCurrency(totalEmployeeDebt)}
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {data.employees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Henüz personel bulunmuyor
                </p>
              ) : (
                <div className="divide-y">
                  {data.employees.map((emp) => (
                    <Link href={`/employees/${emp.id}`} key={emp.id} className="block hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {emp.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Detayları Görüntüle
                          </p>
                        </div>
                        <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                          emp.balance > 0
                            ? 'text-rose-600 dark:text-rose-400' // If they have a positive balance, company OWES them
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {emp.balance > 0 ? (
                            <>Alacağı: {formatCurrency(emp.balance)}</>
                          ) : (
                            <>Avans Fazlası: {formatCurrency(Math.abs(emp.balance))}</>
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
