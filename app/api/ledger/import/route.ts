import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { revalidatePath } from 'next/cache'

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
      const docTypeLower = (tx.document_type || '').toLowerCase()
      const isInvoice = docTypeLower.includes('fatura') || docTypeLower.includes('fat')
      
      let transaction_type: 'invoice_out' | 'payment_out' | 'invoice_in' | 'payment_in' = 'payment_out'
      
      if (tx.debit > 0) {
        transaction_type = isInvoice ? 'invoice_out' : 'payment_out'
      } else {
        transaction_type = isInvoice ? 'invoice_in' : 'payment_in'
      }

      const amount = tx.debit > 0 ? tx.debit : tx.credit

      const { data: newTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          company_id: companyInfo.id,
          account_id: accountId,
          transaction_type,
          amount,
          category: 'Ekstre',
          description: tx.description || tx.document_type || 'PDF Ekstre İşlemi',
          document_no: tx.document_no || null,
          transaction_date: tx.date,
        } as any)
        .select('id')
        .single()

      if (txError) {
        console.error('Insert transaction error:', txError)
        throw txError
      }

      // Insert lines if any
      if (tx.lines && tx.lines.length > 0 && newTx) {
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

        if (linesError) console.error('Insert lines error:', linesError)
      }
    }

    revalidatePath('/')
    revalidatePath('/accounts')
    revalidatePath('/accounts/[id]', 'page')
    revalidatePath(`/accounts/${accountId}`)
    revalidatePath('/transactions')

    return NextResponse.json({ success: true, count: transactions.length })
  } catch (error: any) {
    console.error('Ledger Import Error:', error)
    return NextResponse.json(
      { error: 'Kayıt sırasında hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}
