'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'
import { deleteJournalEntry } from '@/features/transactions/actions'

export type TestResult = {
  name: string
  status: 'PASSED' | 'FAILED' | 'WARNING'
  message: string
}

export async function runDebugTests() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Aktif şirket bulunamadı.' }

  const supabase = await createClient()
  const results: TestResult[] = []

  // 1. Check if Transactions table has journal_entry_id (Step 15 Migration check)
  const { error: txColError } = await supabase
    .from('transactions')
    .select('journal_entry_id')
    .limit(1)

  if (txColError && txColError.message.includes('Could not find the \'journal_entry_id\' column')) {
    results.push({ name: 'İşlem Silme Entegrasyonu (Cascade Delete)', status: 'FAILED', message: 'Step 15 SQL (journal_entry_id) çalıştırılmamış. Lütfen çalıştırın.' })
  } else {
    results.push({ name: 'İşlem Silme Entegrasyonu (Cascade Delete)', status: 'PASSED', message: 'Bağlantı sütunu (transactions.journal_entry_id) mevcut.' })
  }

  // 2. Check if process_asset_sale accepts the correct parameters (Step 14 Migration check)
  const dummyAssetId = '00000000-0000-0000-0000-000000000000'
  const dummyAccountId = '00000000-0000-0000-0000-000000000000'
  
  const { error: rpcError } = await supabase.rpc('process_asset_sale', {
    p_company_id: companyInfo.id,
    p_asset_id: dummyAssetId,
    p_sale_price: 1,
    p_target_account_id: dummyAccountId,
    p_date: new Date().toISOString().split('T')[0],
    p_description: 'Test'
  })

  if (rpcError && rpcError.message.includes('Could not find')) {
    results.push({ name: 'Varlık Satışı Fonksiyonu (Asset Sale)', status: 'FAILED', message: 'Step 14 SQL (process_asset_sale) güncellenmemiş. Lütfen SQL kodunu Supabase\'de çalıştırın.' })
  } else if (rpcError && rpcError.message.includes('Varlık bulunamadı')) {
    results.push({ name: 'Varlık Satışı Fonksiyonu (Asset Sale)', status: 'PASSED', message: 'Fonksiyon güncel ve parametreleri doğru alıyor.' })
  } else {
    results.push({ name: 'Varlık Satışı Fonksiyonu (Asset Sale)', status: 'WARNING', message: 'Bilinmeyen durum: ' + rpcError?.message })
  }

  // E2E Simulation
  try {
    const simResults = await runE2ESimulation(supabase, companyInfo.id)
    results.push(...simResults)
  } catch (err: any) {
    results.push({ name: 'E2E Simülasyonu', status: 'FAILED', message: 'Simülasyon çöktü: ' + err.message })
  }

  return { success: true, results }
}

async function runE2ESimulation(supabase: any, companyId: string): Promise<TestResult[]> {
  const results: TestResult[] = []
  
  // Cleanup arrays
  const coaIds: string[] = []
  const safeIds: string[] = []
  const accountIds: string[] = []
  const assetIds: string[] = []
  let createdJournalId: string | null = null

  try {
    // 1. Create Mock COA for Kasa
    const { data: coaKasa, error: err1 } = await supabase.from('chart_of_accounts').insert({
      company_id: companyId,
      code: '100.99.999', // dummy code
      name: 'DEBUG_TEST_KASASI',
      type: 'DETAIL'
    }).select().single()
    if (err1) throw err1
    coaIds.push(coaKasa.id)

    // 2. Create Mock Kasa
    const { data: safe, error: err2 } = await supabase.from('safes').insert({
      company_id: companyId,
      name: 'DEBUG_TEST_KASASI',
      type: 'kasa',
      currency: 'TRY',
      chart_of_account_id: coaKasa.id
    }).select().single()
    if (err2) throw err2
    safeIds.push(safe.id)

    // 3. Create Mock COA for Cari
    const { data: coaCari, error: err3 } = await supabase.from('chart_of_accounts').insert({
      company_id: companyId,
      code: '120.99.999', // dummy code
      name: 'DEBUG_TEST_CARISI',
      type: 'DETAIL'
    }).select().single()
    if (err3) throw err3
    coaIds.push(coaCari.id)

    // 4. Create Mock Cari
    const { data: account, error: err4 } = await supabase.from('accounts').insert({
      company_id: companyId,
      name: 'DEBUG_TEST_CARISI',
      type: 'customer',
      currency: 'TRY',
      chart_of_account_id: coaCari.id
    }).select().single()
    if (err4) throw err4
    accountIds.push(account.id)

    // 5. Test Cari Payment
    // Kasadan Cariye Ödeme (Kasa çıkar, Cari girer)
    const { data: journalId, error: paymentErr } = await supabase.rpc('process_cari_payment', {
      p_company_id: companyId,
      p_account_id: account.id,
      p_safe_bank_account_id: safe.id,
      p_amount: 100000, // 1000 TL
      p_transaction_type: 'payment_out',
      p_date: new Date().toISOString().split('T')[0],
      p_description: 'DEBUG_PAYMENT'
    })
    
    if (paymentErr) throw new Error('Cari Payment RPC failed: ' + paymentErr.message)
    createdJournalId = journalId
    
    // Insert into transactions (this is what the client does normally)
    const { data: tx, error: txErr } = await supabase.from('transactions').insert({
      company_id: companyId,
      account_id: account.id,
      safe_id: safe.id,
      transaction_type: 'payment_out',
      amount: 100000,
      description: 'DEBUG_PAYMENT',
      transaction_date: new Date().toISOString(),
      journal_entry_id: journalId
    }).select().single()
    
    if (txErr) throw new Error('Transaction insert failed: ' + txErr.message)

    results.push({ name: 'E2E: Cari Tahsilat & Yevmiye Fişi', status: 'PASSED', message: 'Kasa-Cari entegre işlemi başarıyla gerçekleşti.' })

    // 6. Test Cascade Delete
    // We will call the delete action
    const delRes = await deleteJournalEntry(journalId)
    if (delRes.error) throw new Error('Delete Journal Entry failed: ' + delRes.error)
    
    // Verify Cascade Delete
    const { data: checkTx } = await supabase.from('transactions').select('id').eq('id', tx.id).single()
    if (checkTx) throw new Error('Cascade delete failed! Transaction record still exists.')

    const { data: checkJe } = await supabase.from('journal_entry_lines').select('id').eq('journal_entry_id', journalId)
    if (checkJe && checkJe.length > 0) throw new Error('Cascade delete failed! Journal entry lines still exist.')

    results.push({ name: 'E2E: İşlem İptali ve Cascade Delete', status: 'PASSED', message: 'İşlem iptal edildiğinde (ister kasadan, ister cariden) veritabanındaki bağlı tüm kayıtlar siliniyor.' })

  } catch (err: any) {
    results.push({ name: 'E2E Simülasyon Adımı', status: 'FAILED', message: err.message })
  } finally {
    // 7. Cleanup
    if (createdJournalId) await supabase.from('journal_entries').delete().eq('id', createdJournalId)
    for (const id of assetIds) await supabase.from('fixed_assets').delete().eq('id', id)
    for (const id of accountIds) await supabase.from('accounts').delete().eq('id', id)
    for (const id of safeIds) await supabase.from('safes').delete().eq('id', id)
    for (const id of coaIds) await supabase.from('chart_of_accounts').delete().eq('id', id)
  }

  return results
}
