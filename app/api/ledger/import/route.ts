import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'

export async function POST(req: NextRequest) {
  try {
    const companyInfo = await getActiveCompany()
    if (!companyInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { accountId, transactions } = body

    if (!accountId || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Insert all transactions
    for (const tx of transactions) {
      // Determine type based on debit/credit
      // debit = Müşterinin borçlanması = bizim alacağımız (receivable equivalent / debit)
      // credit = Müşterinin ödeme yapması = bizim borcumuz (payable equivalent / credit)
      const type = tx.debit > 0 ? 'debit' : 'credit'
      const amount = tx.debit > 0 ? tx.debit : tx.credit

      const { data: newTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          company_id: companyInfo.id,
          account_id: accountId,
          type,
          amount,
          category: 'Ekstre',
          description: tx.description || tx.document_type,
          document_no: tx.document_no,
          document_type: tx.document_type,
          transaction_date: tx.date,
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Insert lines if any
      if (tx.lines && tx.lines.length > 0) {
        const linesToInsert = tx.lines.map((line: any) => ({
          transaction_id: newTx.id,
          item_code: line.item_code,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          amount: line.amount,
        }))

        const { error: linesError } = await supabase
          .from('transaction_lines')
          .insert(linesToInsert)

        if (linesError) throw linesError
      }
    }

    return NextResponse.json({ success: true, count: transactions.length })
  } catch (error: any) {
    console.error('Ledger Import Error:', error)
    return NextResponse.json(
      { error: 'Kayıt sırasında hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
