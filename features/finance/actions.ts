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
  interest_amount?: number // in cents
  commission_amount?: number // in cents
  bank_expense_amount?: number // in cents
  net_target?: 'safe' | 'account'
  net_target_id?: string
  expense_target?: 'safe' | 'account'
  expense_target_id?: string
  safe_id?: string // legacy fallback
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    
    // Status is always 'portfolio' because discounted cheques also remain active until maturity
    const status = 'portfolio'

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
      // Since it is just entered and sits in portfolio, safe_id is null
      const { error: txError } = await supabase.from('transactions').insert({
        company_id: companyInfo.id,
        account_id: data.account_id,
        safe_id: null,
        transaction_type: transactionType,
        amount: data.amount, // Full amount
        description: description,
        transaction_date: data.issue_date,
        payment_method: data.type === 'cheque' ? 'Çek' : 'Senet',
        category: transactionType,
        currency: 'TRY'
      })

      if (txError) return { error: `Cari hareket oluşturulamadı: ${txError.message}` }

      // If discount is applied immediately on creation (kırdırma)
      if (data.apply_discount && (data.net_target_id || data.safe_id)) {
        const totalDiscount = (data.interest_amount || 0) + (data.commission_amount || 0) + (data.bank_expense_amount || 0)
        const netAmount = data.amount - totalDiscount
        const isIncoming = data.direction === 'in'
        const netTargetType = data.net_target || 'safe'
        const netTargetId = data.net_target_id || data.safe_id!

        // 1. Net amount enters/leaves the chosen target (safe or account)
        const { error: netTxErr } = await supabase.from('transactions').insert({
          company_id: companyInfo.id,
          safe_id: netTargetType === 'safe' ? netTargetId : null,
          account_id: netTargetType === 'account' ? netTargetId : null,
          transaction_type: isIncoming ? 'payment_in' : 'payment_out',
          amount: netAmount,
          description: `${data.type === 'cheque' ? 'Çek' : 'Senet'} Kırdırma Tahsilatı (Net Tutar)`,
          transaction_date: data.issue_date,
          payment_method: 'Havale/EFT',
          category: isIncoming ? 'payment_in' : 'payment_out',
          currency: 'TRY'
        })
        if (netTxErr) return { error: `Net tutar tahsilat kaydı oluşturulamadı: ${netTxErr.message}` }

        // 2. Discount fee transaction (Faiz, Komisyon, Masraf)
        if (totalDiscount > 0) {
          const descText = isIncoming
            ? `${data.type === 'cheque' ? 'Çek' : 'Senet'} Kırdırma Gideri (Faiz: ${((data.interest_amount || 0)/100).toFixed(2)} TL, Komisyon: ${((data.commission_amount || 0)/100).toFixed(2)} TL, Masraf: ${((data.bank_expense_amount || 0)/100).toFixed(2)} TL)`
            : `${data.type === 'cheque' ? 'Çek' : 'Senet'} Erken Ödeme İndirim Geliri (Faiz: ${((data.interest_amount || 0)/100).toFixed(2)} TL, Komisyon: ${((data.commission_amount || 0)/100).toFixed(2)} TL, Masraf: ${((data.bank_expense_amount || 0)/100).toFixed(2)} TL)`

          if (data.expense_target === 'account' && data.expense_target_id) {
            const { error: expError } = await supabase.from('transactions').insert({
              company_id: companyInfo.id,
              account_id: data.expense_target_id,
              transaction_type: 'payment_out', // Always payment_out for deductions/masraf
              amount: totalDiscount,
              description: descText,
              transaction_date: data.issue_date,
              payment_method: 'Nakit',
              category: 'payment_out',
              currency: 'TRY'
            })
            if (expError) return { error: `Müşteri masraf yansıtma kaydı oluşturulamadı: ${expError.message}` }
          } else {
            const targetSafeId = data.expense_target_id || data.safe_id!
            const { error: expError } = await supabase.from('transactions').insert({
              company_id: companyInfo.id,
              safe_id: targetSafeId,
              transaction_type: 'payment_out', // Always payment_out for deductions/masraf
              amount: totalDiscount,
              description: descText,
              transaction_date: data.issue_date,
              payment_method: 'Nakit',
              category: 'payment_out',
              currency: 'TRY'
            })
            if (expError) return { error: `Vade farkı gider kaydı oluşturulamadı: ${expError.message}` }
          }
        }
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
      description: `${bankName} Kredi Taksit Ödemesi (Taksit ID: ${installmentId})`,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'Havale/EFT',
      category: 'payment_out',
      currency: 'TRY'
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

export async function unpayLoanInstallment(installmentId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch the installment
    const { data: inst, error: instFetchErr } = await supabase
      .from('loan_installments')
      .select('*, loans(bank_name, id)')
      .eq('id', installmentId)
      .single()

    if (instFetchErr || !inst) return { error: 'Taksit bulunamadı.' }
    if (inst.status !== 'paid') return { error: 'Bu taksit zaten ödenmemiş.' }

    // 2. Revert installment status
    const { error: updateErr } = await supabase
      .from('loan_installments')
      .update({
        status: 'pending',
        amount_paid: 0,
        payment_date: null,
        safe_id: null
      })
      .eq('id', installmentId)

    if (updateErr) return { error: updateErr.message }

    // 3. Delete the transaction associated with this installment payment
    const txDescription = `${(inst.loans as any)?.bank_name || 'Banka'} Kredi Taksit Ödemesi (Taksit ID: ${installmentId})`
    
    const { error: txDeleteErr } = await supabase
      .from('transactions')
      .delete()
      .eq('company_id', companyInfo.id)
      .eq('description', txDescription)

    if (txDeleteErr) {
      console.error('Revert transaction error:', txDeleteErr)
    }

    // 4. Update the loan status back to active
    await supabase
      .from('loans')
      .update({ status: 'active' })
      .eq('id', inst.loan_id)

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function cashChequeNote(data: {
  chequeId: string
  applyDiscount: boolean
  interestAmount?: number // in cents
  commissionAmount?: number // in cents
  bankExpenseAmount?: number // in cents
  netTarget: 'safe' | 'account'
  netTargetId: string
  expenseTarget?: 'safe' | 'account'
  expenseTargetId?: string // safeId or accountId
  safeId?: string // legacy fallback
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch the cheque
    const { data: cheque, error: fetchErr } = await supabase
      .from('cheques_notes')
      .select('*')
      .eq('id', data.chequeId)
      .single()

    if (fetchErr || !cheque) return { error: 'Çek/Senet bulunamadı.' }
    if (cheque.status === 'cashed') return { error: 'Bu evrak zaten tahsil edilmiş.' }

    const today = new Date()

    let discountAmount = 0
    if (data.applyDiscount) {
      discountAmount = (data.interestAmount || 0) + (data.commissionAmount || 0) + (data.bankExpenseAmount || 0)
    }
    const netAmount = cheque.amount - discountAmount

    // 2. Update cheque status to cashed ONLY if not cashing early (kırdırma)
    if (!data.applyDiscount) {
      const { error: updateErr } = await supabase
        .from('cheques_notes')
        .update({
          status: 'cashed'
        })
        .eq('id', data.chequeId)

      if (updateErr) return { error: updateErr.message }
    }

    // 3. Create transactions
    const isIncoming = cheque.direction === 'in'

    if (data.applyDiscount) {
      // Net amount enters/leaves the chosen target (safe or account)
      const { error: txError } = await supabase.from('transactions').insert({
        company_id: companyInfo.id,
        safe_id: data.netTarget === 'safe' ? data.netTargetId : null,
        account_id: data.netTarget === 'account' ? data.netTargetId : null,
        transaction_type: isIncoming ? 'payment_in' : 'payment_out',
        amount: netAmount, // This is net amount paid/received
        description: isIncoming 
          ? `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Kırdırma Tahsilatı (Net Tutar)`
          : `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Erken Ödemesi (Net Tutar)`,
        transaction_date: today.toISOString().split('T')[0],
        payment_method: 'Havale/EFT',
        category: isIncoming ? 'payment_in' : 'payment_out',
        currency: 'TRY'
      })

      if (txError) return { error: `${isIncoming ? 'Tahsilat' : 'Ödeme'} kaydı oluşturulamadı: ${txError.message}` }
    } else {
      // Normal cashing to the selected safe
      const { error: txError } = await supabase.from('transactions').insert({
        company_id: companyInfo.id,
        safe_id: data.safeId!,
        transaction_type: isIncoming ? 'payment_in' : 'payment_out',
        amount: cheque.amount,
        description: isIncoming 
          ? `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Tahsilatı`
          : `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Ödemesi`,
        transaction_date: today.toISOString().split('T')[0],
        payment_method: 'Havale/EFT',
        category: isIncoming ? 'payment_in' : 'payment_out',
        currency: 'TRY'
      })

      if (txError) return { error: `${isIncoming ? 'Tahsilat' : 'Ödeme'} kaydı oluşturulamadı: ${txError.message}` }
    }

    // Transaction 2: If there's a discount expense/income
    if (data.applyDiscount && discountAmount > 0) {
      const descText = isIncoming
        ? `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Kırdırma Gideri (Faiz: ${((data.interestAmount || 0)/100).toFixed(2)} TL, Komisyon: ${((data.commissionAmount || 0)/100).toFixed(2)} TL, Masraf: ${((data.bankExpenseAmount || 0)/100).toFixed(2)} TL)`
        : `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Erken Ödeme İndirim Geliri (Faiz: ${((data.interestAmount || 0)/100).toFixed(2)} TL, Komisyon: ${((data.commissionAmount || 0)/100).toFixed(2)} TL, Masraf: ${((data.bankExpenseAmount || 0)/100).toFixed(2)} TL)`

      if (data.expenseTarget === 'account' && data.expenseTargetId) {
        // Charge/Credit the customer account
        const { error: expError } = await supabase.from('transactions').insert({
          company_id: companyInfo.id,
          account_id: data.expenseTargetId,
          transaction_type: 'payment_out', // Always payment_out for deductions/masraf
          amount: discountAmount,
          description: descText,
          transaction_date: today.toISOString().split('T')[0],
          payment_method: 'Nakit',
          category: 'payment_out',
          currency: 'TRY'
        })
        if (expError) return { error: `Müşteri borç/alacak yansıtma kaydı oluşturulamadı: ${expError.message}` }
      } else {
        // Charge/Credit the selected safe/bank
        const targetSafeId = data.expenseTargetId || data.netTargetId
        const { error: expError } = await supabase.from('transactions').insert({
          company_id: companyInfo.id,
          safe_id: targetSafeId,
          transaction_type: 'payment_out', // Always payment_out for deductions/masraf
          amount: discountAmount,
          description: descText,
          transaction_date: today.toISOString().split('T')[0],
          payment_method: 'Nakit',
          category: 'payment_out',
          currency: 'TRY'
        })
        if (expError) return { error: `Vade farkı gider/gelir kaydı oluşturulamadı: ${expError.message}` }
      }
    }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function createFactoryExpense(data: {
  expense_type: string
  amount: number // in cents
  due_date?: string
  description?: string
  is_recurring: boolean
  recurrence_day?: number
  start_date?: string
  monthly_amount?: number // in cents
  attachment_url?: string
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    const { error } = await supabase.from('factory_expenses').insert({
      company_id: companyInfo.id,
      expense_type: data.expense_type,
      amount: data.is_recurring ? (data.monthly_amount || 0) : data.amount,
      due_date: data.is_recurring ? (data.start_date || new Date().toISOString().split('T')[0]) : (data.due_date || new Date().toISOString().split('T')[0]),
      status: 'unpaid',
      description: data.description || null,
      is_recurring: data.is_recurring,
      recurrence_day: data.is_recurring ? data.recurrence_day : null,
      start_date: data.is_recurring ? data.start_date : null,
      months_paid: data.is_recurring ? 0 : null,
      monthly_amount: data.is_recurring ? data.monthly_amount : null,
      attachment_url: data.attachment_url || null
    })

    if (error) return { error: error.message }
    revalidatePath('/finance')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function payFactoryExpense(expenseId: string, safeId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch expense details
    const { data: expense, error: fetchErr } = await supabase
      .from('factory_expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('company_id', companyInfo.id)
      .single()

    if (fetchErr || !expense) return { error: 'Gider kaydı bulunamadı.' }
    if (expense.status === 'paid') return { error: 'Bu gider zaten ödenmiş.' }

    const today = new Date().toISOString().split('T')[0]

    // 2. Create transaction first
    const { error: txError } = await supabase.from('transactions').insert({
      company_id: companyInfo.id,
      safe_id: safeId,
      transaction_type: 'payment_out',
      amount: expense.amount,
      description: `Fabrika Gideri: ${expense.expense_type === 'Rent' ? 'Kira' : expense.expense_type} (${expense.description || ''})`,
      transaction_date: today,
      payment_method: 'Havale/EFT',
      category: 'payment_out',
      currency: 'TRY'
    })

    if (txError) return { error: `Gider ödemesi kasa kaydı oluşturulamadı: ${txError.message}` }

    // 3. Update expense status
    const { error: updateErr } = await supabase
      .from('factory_expenses')
      .update({
        status: 'paid',
        paid_date: today,
        safe_id: safeId
      })
      .eq('id', expenseId)
      .eq('company_id', companyInfo.id)

    if (updateErr) return { error: `Gider durumu güncellenemedi: ${updateErr.message}` }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function payRecurringFactoryExpense(expenseId: string, safeId: string, monthsToPay: number) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch expense details
    const { data: expense, error: fetchErr } = await supabase
      .from('factory_expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('company_id', companyInfo.id)
      .single()

    if (fetchErr || !expense) return { error: 'Gider kaydı bulunamadı.' }
    if (!expense.is_recurring) return { error: 'Bu gider tekrarlanan tipte değil.' }

    const today = new Date().toISOString().split('T')[0]
    const payAmount = (expense.monthly_amount || expense.amount) * monthsToPay

    // 2. Create transaction
    const { error: txError } = await supabase.from('transactions').insert({
      company_id: companyInfo.id,
      safe_id: safeId,
      transaction_type: 'payment_out',
      amount: payAmount,
      description: `Fabrika Gideri: ${expense.expense_type === 'Rent' ? 'Kira' : expense.expense_type} (${monthsToPay} Aylık Ödeme)`,
      transaction_date: today,
      payment_method: 'Havale/EFT',
      category: 'payment_out',
      currency: 'TRY'
    })

    if (txError) return { error: `Kasa ödeme kaydı oluşturulamadı: ${txError.message}` }

    // 3. Update months_paid
    const { error: updateErr } = await supabase
      .from('factory_expenses')
      .update({
        months_paid: (expense.months_paid || 0) + monthsToPay
      })
      .eq('id', expenseId)
      .eq('company_id', companyInfo.id)

    if (updateErr) return { error: `Gider kaydı güncellenemedi: ${updateErr.message}` }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function deleteFactoryExpense(expenseId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('factory_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('company_id', companyInfo.id)

    if (error) return { error: error.message }
    revalidatePath('/finance')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function createCreditCard(data: {
  card_name: string
  card_type: 'personal' | 'company'
  bank_name: string
  limit_amount: number // in cents
  cutoff_day: number
  due_day: number
  min_payment_ratio?: number
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    const { error } = await supabase.from('credit_cards').insert({
      company_id: companyInfo.id,
      card_name: data.card_name,
      card_type: data.card_type,
      bank_name: data.bank_name,
      limit_amount: data.limit_amount,
      cutoff_day: data.cutoff_day,
      due_day: data.due_day,
      min_payment_ratio: data.min_payment_ratio !== undefined ? data.min_payment_ratio : 40
    })

    if (error) return { error: error.message }
    revalidatePath('/finance')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function deleteCreditCard(cardId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', cardId)
      .eq('company_id', companyInfo.id)

    if (error) return { error: error.message }
    revalidatePath('/finance')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function payCreditCardDebt(cardId: string, safeId: string, amount: number) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch card details
    const { data: card, error: fetchErr } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .single()

    if (fetchErr || !card) return { error: 'Kredi kartı bulunamadı.' }

    const today = new Date().toISOString().split('T')[0]

    // 2. Create card payment transaction (negative amount since it reduces debt)
    const { error: ccTxErr } = await supabase.from('credit_card_transactions').insert({
      card_id: cardId,
      transaction_date: today,
      description: 'Kredi Kartı Borç Ödemesi',
      amount: -amount // reduces debt
    })

    if (ccTxErr) return { error: `Kart hareket kaydı oluşturulamadı: ${ccTxErr.message}` }

    // 3. Create safe outflow transaction (money leaving safe)
    const { error: safeTxErr } = await supabase.from('transactions').insert({
      company_id: companyInfo.id,
      safe_id: safeId,
      transaction_type: 'payment_out',
      amount: amount,
      description: `${card.bank_name} - ${card.card_name} Kredi Kartı Ödemesi`,
      transaction_date: today,
      payment_method: 'Havale/EFT',
      category: 'payment_out',
      currency: 'TRY'
    })

    if (safeTxErr) return { error: `Kasa ödeme kaydı oluşturulamadı: ${safeTxErr.message}` }

    // 4. Update current debt
    const { error: updateErr } = await supabase
      .from('credit_cards')
      .update({
        current_debt: Math.max(0, card.current_debt - amount)
      })
      .eq('id', cardId)

    if (updateErr) return { error: `Kart bakiyesi güncellenemedi: ${updateErr.message}` }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function importCreditCardTransactions(cardId: string, transactionsList: Array<{ transaction_date: string; description: string; amount: number }>) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Insert transactions
    const rows = transactionsList.map(t => ({
      card_id: cardId,
      transaction_date: t.transaction_date,
      description: t.description,
      amount: t.amount // positive is spending, negative is payment/refund
    }))

    const { error: insertErr } = await supabase.from('credit_card_transactions').insert(rows)
    if (insertErr) return { error: `Kart hareketleri eklenemedi: ${insertErr.message}` }

    // 2. Fetch the card details to update current_debt
    const { data: card, error: fetchErr } = await supabase
      .from('credit_cards')
      .select('current_debt')
      .eq('id', cardId)
      .single()

    if (fetchErr || !card) return { error: 'Kredi kartı bulunamadı.' }

    // Sum all transaction amounts
    const netTransactionDebt = transactionsList.reduce((sum, t) => sum + t.amount, 0)
    const newDebt = Math.max(0, card.current_debt + netTransactionDebt)

    const { error: updateErr } = await supabase
      .from('credit_cards')
      .update({ current_debt: newDebt })
      .eq('id', cardId)

    if (updateErr) return { error: `Kredi kartı borcu güncellenemedi: ${updateErr.message}` }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function deleteChequeNote(chequeId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('cheques_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', chequeId)
      .eq('company_id', companyInfo.id)

    if (error) return { error: error.message }
    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function updateChequeNote(chequeId: string, data: {
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
  status?: 'portfolio' | 'endorsed' | 'cashed' | 'bounced'
}) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('cheques_notes')
      .update({
        type: data.type,
        direction: data.direction,
        amount: data.amount,
        issue_date: data.issue_date,
        due_date: data.due_date,
        contact_name: data.contact_name,
        account_id: data.account_id || null,
        bank_name: data.bank_name || null,
        document_number: data.document_number || null,
        notes: data.notes || null,
        status: data.status || 'portfolio',
        updated_at: new Date().toISOString()
      })
      .eq('id', chequeId)
      .eq('company_id', companyInfo.id)

    if (error) return { error: error.message }
    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}

export async function transferChequeNote(chequeId: string, targetAccountId: string) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) return { error: 'Şirket bulunamadı.' }

    const supabase = await createClient()

    // 1. Fetch cheque details
    const { data: cheque, error: fetchErr } = await supabase
      .from('cheques_notes')
      .select('*')
      .eq('id', chequeId)
      .single()

    if (fetchErr || !cheque) return { error: 'Çek/Senet bulunamadı.' }

    // 2. Fetch target account details
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('name, company_name')
      .eq('id', targetAccountId)
      .single()

    if (accErr || !account) return { error: 'Alıcı cari hesap bulunamadı.' }

    const supplierName = account.company_name || account.name

    // 3. Update cheque status and append ciro info to notes
    const newNotes = `${cheque.notes || ''}\n[Ciro Edildi: ${new Date().toLocaleDateString('tr-TR')} - Alıcı: ${supplierName}]`
    const { error: updateErr } = await supabase
      .from('cheques_notes')
      .update({
        status: 'endorsed',
        notes: newNotes
      })
      .eq('id', chequeId)

    if (updateErr) return { error: `Çek durumu güncellenemedi: ${updateErr.message}` }

    // 4. Create payment_out transaction to the supplier Cari
    const { error: txErr } = await supabase.from('transactions').insert({
      company_id: companyInfo.id,
      account_id: targetAccountId,
      transaction_type: 'payment_out',
      amount: cheque.amount,
      description: `${cheque.type === 'cheque' ? 'Çek' : 'Senet'} Ciro Edildi (Evrak No: ${cheque.document_number || 'Bilinmiyor'})`,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: cheque.type === 'cheque' ? 'Çek' : 'Senet',
      category: 'payment_out',
      currency: 'TRY'
    })

    if (txErr) return { error: `Ciro cari hareketi oluşturulamadı: ${txErr.message}` }

    revalidatePath('/finance')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' }
  }
}
