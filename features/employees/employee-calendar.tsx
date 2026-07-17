'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react'
import { getDaysInMonth, getDefaultStatusForDate } from '@/lib/holidays'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface EmployeeCalendarProps {
  employeeId: string
  companyId: string
}

type AttendanceStatus = 'full_day' | 'half_day' | 'absent' | 'holiday' | 'paid_leave' | 'unpaid_leave'

interface AttendanceRecord {
  id?: string
  date: string
  status: AttendanceStatus
}

const statusColors: Record<AttendanceStatus, string> = {
  full_day: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  half_day: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  absent: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  holiday: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  paid_leave: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  unpaid_leave: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
}

const statusLabels: Record<AttendanceStatus, string> = {
  full_day: 'Tam',
  half_day: 'Yarım',
  absent: 'Yok',
  holiday: 'Tatil',
  paid_leave: 'Ü. İzin',
  unpaid_leave: 'Ü.siz İzin'
}

export function EmployeeCalendar({ employeeId, companyId }: EmployeeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadAttendance = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    // Start and end of current month
    const startDate = new Date(year, month, 1).toLocaleDateString('en-CA')
    const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA')

    const { data, error } = await supabase
      .from('employee_attendance')
      .select('id, date, status')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      toast.error('Puantaj yüklenirken hata oluştu')
    } else if (data) {
      const newRecords: Record<string, AttendanceRecord> = {}
      
      // First populate with existing records
      data.forEach(r => {
        newRecords[r.date] = { id: r.id, date: r.date, status: r.status as AttendanceStatus }
      })

      // Fill missing days with defaults
      const days = getDaysInMonth(year, month)
      days.forEach(d => {
        const dateStr = d.toLocaleDateString('en-CA')
        if (!newRecords[dateStr]) {
          newRecords[dateStr] = { 
            date: dateStr, 
            status: getDefaultStatusForDate(d) 
          }
        }
      })
      
      setRecords(newRecords)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadAttendance()
  }, [year, month, employeeId])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const toggleStatus = (dateStr: string) => {
    const currentStatus = records[dateStr].status
    const statusOrder: AttendanceStatus[] = ['full_day', 'half_day', 'absent', 'holiday', 'paid_leave', 'unpaid_leave']
    const currentIndex = statusOrder.indexOf(currentStatus)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    
    setRecords({
      ...records,
      [dateStr]: { ...records[dateStr], status: nextStatus }
    })
  }

  const handleSave = () => {
    startTransition(async () => {
      const supabase = createClient()
      const recordsToUpsert = Object.values(records).map(r => {
        const record: any = {
          company_id: companyId,
          employee_id: employeeId,
          date: r.date,
          status: r.status
        }
        if (r.id) record.id = r.id
        return record
      })
      
      const { error } = await supabase
        .from('employee_attendance')
        .upsert(recordsToUpsert, { onConflict: 'employee_id, date' })
        
      if (error) {
        toast.error('Puantaj kaydedilirken hata oluştu')
        console.error(error)
      } else {
        toast.success('Puantaj başarıyla kaydedildi')
        router.refresh()
        loadAttendance()
      }
    })
  }

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
  const daysInMonth = getDaysInMonth(year, month)

  // Calculate stats
  let fullDays = 0, halfDays = 0, absent = 0, holidays = 0
  Object.values(records).forEach(r => {
    if (r.status === 'full_day') fullDays++
    if (r.status === 'half_day') halfDays++
    if (r.status === 'absent') absent++
    if (r.status === 'holiday') holidays++
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-4">
          <CardTitle>Puantaj (Takvim)</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[100px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isPending || isLoading}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Kaydet
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Padding for first day of month */}
              {Array.from({ length: daysInMonth[0].getDay() === 0 ? 6 : daysInMonth[0].getDay() - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 bg-muted/20 rounded-md border border-transparent"></div>
              ))}
              
              {daysInMonth.map(day => {
                const dateStr = day.toLocaleDateString('en-CA')
                const record = records[dateStr]
                if (!record) return null
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => toggleStatus(dateStr)}
                    className={`flex flex-col items-center justify-center h-14 rounded-md border transition-all hover:brightness-95 ${statusColors[record.status]}`}
                  >
                    <span className="text-lg font-bold">{day.getDate()}</span>
                    <span className="text-[10px] font-medium tracking-tight -mt-1">{statusLabels[record.status]}</span>
                  </button>
                )
              })}
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground bg-muted/30 p-2 rounded-lg">
              <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${statusColors.full_day.split(' ')[0]}`} /> Tam Gün ({fullDays})</div>
              <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${statusColors.half_day.split(' ')[0]}`} /> Yarım Gün ({halfDays})</div>
              <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${statusColors.absent.split(' ')[0]}`} /> Yok ({absent})</div>
              <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${statusColors.holiday.split(' ')[0]}`} /> Tatil ({holidays})</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
