export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0 is Sunday, 6 is Saturday
}

// Very basic implementation of fixed Turkish National Holidays
// A real app would use a more robust calculation for movable religious holidays (Ramadan, Sacrifice)
const fixedHolidays = [
  { month: 0, date: 1 },   // Yılbaşı (New Year's Day)
  { month: 3, date: 23 },  // Ulusal Egemenlik ve Çocuk Bayramı (April 23)
  { month: 4, date: 1 },   // Emek ve Dayanışma Günü (May 1)
  { month: 4, date: 19 },  // Atatürk'ü Anma, Gençlik ve Spor Bayramı (May 19)
  { month: 6, date: 15 },  // Demokrasi ve Milli Birlik Günü (July 15)
  { month: 7, date: 30 },  // Zafer Bayramı (August 30)
  { month: 9, date: 29 },  // Cumhuriyet Bayramı (October 29)
]

export function isHoliday(date: Date): boolean {
  const month = date.getMonth()
  const day = date.getDate()
  
  return fixedHolidays.some(h => h.month === month && h.date === day)
}

export function getDefaultStatusForDate(date: Date): 'full_day' | 'half_day' | 'absent' | 'holiday' | 'paid_leave' | 'unpaid_leave' {
  if (isHoliday(date) || isWeekend(date)) {
    return 'holiday'
  }
  return 'full_day'
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1)
  const days: Date[] = []
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}
