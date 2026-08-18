'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveCompany } from '@/lib/company'

export async function runDebugTests() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Aktif şirket bulunamadı.' }

  const supabase = await createClient()
  const results = []

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

  // If the error says "Could not find the 'process_asset_sale' function with the requested arguments", the migration is missing.
  if (rpcError && rpcError.message.includes('Could not find')) {
    results.push({ name: 'Varlık Satışı Fonksiyonu (Asset Sale)', status: 'FAILED', message: 'Step 14 SQL (process_asset_sale) güncellenmemiş. Lütfen SQL kodunu Supabase\'de çalıştırın.' })
  } else if (rpcError && rpcError.message.includes('Varlık bulunamadı')) {
    // This is the expected error if the function exists and accepts these params!
    results.push({ name: 'Varlık Satışı Fonksiyonu (Asset Sale)', status: 'PASSED', message: 'Fonksiyon güncel ve parametreleri doğru alıyor.' })
  } else {
    results.push({ name: 'Varlık Satışı Fonksiyonu (Asset Sale)', status: 'WARNING', message: 'Bilinmeyen durum: ' + rpcError?.message })
  }

  return { success: true, results }
}
