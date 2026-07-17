'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function createChequeNote(data: {
  type: 'cheque' | 'promissory_note'
  direction: 'in' | 'out'
  amount: number
  issue_date: string
  due_date: string
  contact_name: string
  bank_name?: string
  document_number?: string
  notes?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  
  const { error } = await supabase.from('cheques_notes').insert({
    company_id: companyInfo.id,
    type: data.type,
    direction: data.direction,
    status: 'portfolio',
    amount: data.amount,
    issue_date: data.issue_date,
    due_date: data.due_date,
    contact_name: data.contact_name,
    bank_name: data.bank_name || null,
    document_number: data.document_number || null,
    notes: data.notes || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/finance')
  revalidatePath('/')
}

export async function createLoan(data: {
  bank_name: string
  loan_amount: number
  total_repayment: number
  interest_rate?: number
  start_date: string
  end_date: string
  monthly_installment: number
  notes?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  
  const { data: loan, error } = await supabase.from('loans').insert({
    company_id: companyInfo.id,
    bank_name: data.bank_name,
    loan_amount: data.loan_amount,
    total_repayment: data.total_repayment,
    interest_rate: data.interest_rate || null,
    start_date: data.start_date,
    end_date: data.end_date,
    monthly_installment: data.monthly_installment,
    status: 'active',
    notes: data.notes || null,
  }).select().single()

  if (error) throw new Error(error.message)

  // Generate installments
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  
  let current = new Date(startDate)
  current.setMonth(current.getMonth() + 1) // First installment is next month
  
  const installmentsToInsert = []
  
  while (current <= endDate || installmentsToInsert.length < 1) {
    installmentsToInsert.push({
      company_id: companyInfo.id,
      loan_id: loan.id,
      due_date: current.toISOString().split('T')[0],
      amount_due: data.monthly_installment,
      amount_paid: 0,
      status: 'pending'
    })
    current.setMonth(current.getMonth() + 1)
  }

  // Adjust the last installment if it doesn't match total_repayment
  const totalGenerated = installmentsToInsert.length * data.monthly_installment
  if (totalGenerated !== data.total_repayment && installmentsToInsert.length > 0) {
    const diff = data.total_repayment - totalGenerated
    installmentsToInsert[installmentsToInsert.length - 1].amount_due += diff
  }

  const { error: instError } = await supabase.from('loan_installments').insert(installmentsToInsert)
  
  if (instError) throw new Error(instError.message)

  revalidatePath('/finance')
  revalidatePath('/')
}
