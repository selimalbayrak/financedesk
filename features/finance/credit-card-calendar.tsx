'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CreditCard, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface CreditCardCalendarProps {
  creditCards: any[]
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export function CreditCardCalendar({ creditCards }: CreditCardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const daysInMonth = lastDay.getDate()
  // Adjust starting day to Monday (0 for Monday, 6 for Sunday)
  let startingDay = firstDay.getDay() - 1
  if (startingDay < 0) startingDay = 6

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const resetToToday = () => {
    setCurrentDate(new Date())
  }

  const today = new Date()
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month

  // Collect events for each day of the month
  const getEventsForDay = (dayNum: number) => {
    const events: Array<{ type: 'cutoff' | 'due'; cardName: string; bankName: string; amount?: number }> = []

    creditCards.forEach(card => {
      if (Number(card.cutoff_day) === dayNum) {
        events.push({
          type: 'cutoff',
          cardName: card.name,
          bankName: card.bank_name || ''
        })
      }
      if (Number(card.due_day) === dayNum) {
        events.push({
          type: 'due',
          cardName: card.name,
          bankName: card.bank_name || '',
          amount: card.current_debt
        })
      }
    })

    return events
  }

  // Days array
  const calendarDays = []
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d)
  }

  return (
    <Card className="border shadow-sm bg-card/60 backdrop-blur-xl overflow-hidden text-left">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                Kredi Kartı Ödeme & Kesim Takvimi
              </h3>
              <p className="text-xs text-muted-foreground">
                {MONTH_NAMES[month]} {year} dönemi kesim ve son ödeme günleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetToToday} className="h-8 text-xs rounded-xl">
              Bugün
            </Button>
            <div className="flex items-center border rounded-xl bg-background">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-l-xl">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-xs font-bold w-28 text-center">
                {MONTH_NAMES[month]} {year}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-r-xl">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted-foreground pb-2">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dayNum, index) => {
            if (dayNum === null) {
              return <div key={`empty-${index}`} className="min-h-[70px] bg-muted/10 rounded-xl border border-transparent" />
            }

            const isToday = isCurrentMonthToday && today.getDate() === dayNum
            const events = getEventsForDay(dayNum)

            return (
              <div 
                key={`day-${dayNum}`}
                className={`min-h-[75px] p-1.5 rounded-xl border transition-all flex flex-col justify-start gap-1 ${
                  isToday 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' 
                    : events.length > 0 
                      ? 'border-border bg-card' 
                      : 'border-border/30 bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}>
                    {dayNum}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[55px] scrollbar-none">
                  {events.map((ev, evIdx) => (
                    <div 
                      key={evIdx}
                      className={`text-[10px] p-1 rounded-md leading-tight flex items-center justify-between gap-1 font-semibold ${
                        ev.type === 'cutoff'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span className="truncate flex items-center gap-0.5">
                        {ev.type === 'cutoff' ? <Scissors className="w-2.5 h-2.5 shrink-0" /> : <CreditCard className="w-2.5 h-2.5 shrink-0" />}
                        {ev.cardName}
                      </span>
                      <span className="text-[9px] opacity-80 uppercase shrink-0">
                        {ev.type === 'cutoff' ? 'Kesim' : 'Son Ödeme'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
