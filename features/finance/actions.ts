'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function createChequeNote(data: {
  type: 'cheque' | 'promissory_note'
  direction: 'in' | 'out'
  amount: number // in cents
  issue_date: string
  due_date: string
  contact_name: string
  account_id?: string
  bank_name?: string
  document_number?: string
  notes?: string
  // Vade farkı (discount) parameters
  apply_discount?: boolean
  discount_rate?: number
  discount_amount?: number // in cents
  net_amount?: number // in cents
  safe_id?: string
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    
    // Status is 'cashed' if discount is applied, otherwise 'portfolio'
    const status = data.apply_discount ? 'cashed' : 'portfolio'

    const { data: cheque, error } = await supabase.from('cheques_notes').insert({
      company_id: companyInfo.id,
      type: data.type,
      direction: data.direction,
      status: status,
      amount: data.amount,
      issue_date: data.issue_date,
      due_date: data.due_date,
      contact_name: data.contact_name,
      account_id: data.account_id || null,
      bank_name: data.bank_name || null,
      document_number: data.document_number || null,
      notes: data.notes || null,
    }).select().single()

    if (error) return { error: error.message }

    // If there is a selected account, create transactions to reflect this on their balance
    if (data.account_id) {
      const transactionType = data.direction === 'in' ? 'payment_in' : 'payment_out'
      const description = `${data.type === 'cheque' ? 'Çek' : 'Senet'} Girişi - Vade: ${data.due_date}`

      // Create primary transaction (affects account balance)
      // If discount is applied, it goes to safe_id. If not, safe_id is null (sits in portfolio)
      const { error: txError } = await supabase.from('transactions').insert({
        company_id: companyInfo.id,
        account_id: data.account_id,
        safe_id: data.apply_discount ? data.safe_id : null,
        transaction_type: transactionType,
        amount: data.amount, // Full amount
        description: description,
        transaction_date: data.issue_date,
        payment_method: data.type === 'cheque' ? 'Çek' : 'Senet',
      })

      if (txError) return { error: `Cari hareket oluşturulamadı: ${txError.message}` }

      // If discount is applied, create an Expense transaction for the discount (vade farkı)
      if (data.apply_discount && data.discount_amount && data.discount_amount > 0 && data.safe_id) {
        const { error: expError } = await supabase.from('transactions').insert({
          company_id: companyInfo.id,
          safe_id: data.safe_id,
          transaction_type: 'payment_out', // Gider/Ödeme Çıkışı
          amount: data.discount_amount,
          description: `${data.type === 'cheque' ? 'Çek' : 'Senet'} Kırdırma Vade Farkı Kesintisi (${data.discount_rate}%)`,
          transaction_date: data.issue_date,
          payment_method: 'Nakit',
        })

        if (expError) return { error: `Vade farkı gider kaydı oluşturulamadı: ${expError.message}` }
      }
    }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function createLoan(data: {
  bank_name: string
  loan_amount: number // in cents
  total_repayment: number // in cents
  interest_rate?: number
  start_date: string
  end_date: string
  monthly_installment: number // in cents
  notes?: string
  installments?: Array<{ due_date: string; amount_due: number }> // in cents
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

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

    if (error) return { error: error.message }

    const installmentsToInsert = []

    if (data.installments && data.installments.length > 0) {
      // Use parsed/custom installments
      for (const inst of data.installments) {
        installmentsToInsert.push({
          company_id: companyInfo.id,
          loan_id: loan.id,
          due_date: inst.due_date,
          amount_due: inst.amount_due,
          amount_paid: 0,
          status: 'pending'
        })
      }
    } else {
      // Auto-generate installments
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      
      let current = new Date(startDate)
      current.setMonth(current.getMonth() + 1) // First installment is next month
      
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
    }

    const { error: instError } = await supabase.from('loan_installments').insert(installmentsToInsert)
    
    if (instError) return { error: `Taksitler oluşturulamadı: ${instError.message}` }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function payLoanInstallment(installmentId: string, safeId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch the installment
    const { data: inst, error: instFetchErr } = await supabase
      .from('loan_installments')
      .select('*, loans(bank_name, id, total_repayment)')
      .eq('id', installmentId)
      .single()

    if (instFetchErr || !inst) return { error: 'Taksit bulunamadı.' }

    // 2. Update installment status
    const { error: updateErr } = await supabase
      .from('loan_installments')
      .update({
        status: 'paid',
        amount_paid: inst.amount_due,
        payment_date: new Date().toISOString().split('T')[0],
        safe_id: safeId
      })
      .eq('id', installmentId)

    if (updateErr) return { error: updateErr.message }

    // 3. Create a payment_out transaction from the selected safe
    const bankName = (inst.loans as any)?.bank_name || 'Banka'
    const { error: txError } = await supabase.from('transactions').insert({
      company_id: companyInfo.id,
      safe_id: safeId,
      transaction_type: 'payment_out',
      amount: inst.amount_due,
      description: `${bankName} Kredi Taksit Ödemesi`,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'Havale/EFT',
    })

    if (txError) return { error: `Kasa hareketi oluşturulamadı: ${txError.message}` }

    // 4. Check if all installments for this loan are paid. If so, mark loan as paid_off
    const { data: allInsts, error: fetchAllErr } = await supabase
      .from('loan_installments')
      .select('status')
      .eq('loan_id', inst.loan_id)

    if (!fetchAllErr && allInsts) {
      const allPaid = allInsts.every(i => i.status === 'paid')
      if (allPaid) {
        await supabase
          .from('loans')
          .update({ status: 'paid_off' })
          .eq('id', inst.loan_id)
      }
    }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}
