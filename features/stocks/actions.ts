'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function getStockCategories() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  // Sadece 15 ile başlayan ve MAIN olmayan (SUB veya DETAIL) hesapları getir
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('company_id', companyInfo.id)
    .like('code', '15%')
    .neq('type', 'MAIN')
    .order('code')

  if (error) return { error: error.message }
  return { success: true, data }
}

export async function createStockCategory(name: string, fields: { name: string; type: string }[], base_code?: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  const { data, error } = await supabase
    .from('stock_categories')
    .insert({
      company_id: companyInfo.id,
      name,
      base_code: base_code || null,
      fields,
      created_by
    } as any)
    .select()
    .single()

  if (error) return { error: error.message }

  return { success: true, data }
}

export async function createStock(data: {
  name: string
  chart_of_account_id: string // This is the parent ID from dropdown
  attributes?: Record<string, any>
  unit?: string
  unit_price: number // in cents
  quantity_on_hand: number
  min_stock_level: number
  description?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  // 1. Get the parent account code
  const { data: parentAccount, error: parentErr } = await supabase
    .from('chart_of_accounts')
    .select('code')
    .eq('id', data.chart_of_account_id)
    .single()
    
  if (parentErr || !parentAccount) return { error: 'Kategori (Üst Hesap) bulunamadı.' }

  // 2. Generate next code via RPC
  const { data: newCode, error: rpcErr } = await supabase
    .rpc('generate_next_account_code', {
      p_company_id: companyInfo.id,
      p_parent_code: parentAccount.code
    })

  if (rpcErr || !newCode) return { error: 'Kod oluşturulamadı: ' + (rpcErr?.message || 'Bilinmeyen hata') }

  // 3. Create the new DETAIL account in chart_of_accounts
  const { data: newAccount, error: accErr } = await supabase
    .from('chart_of_accounts')
    .insert({
      company_id: companyInfo.id,
      code: newCode,
      name: data.name,
      type: 'DETAIL',
      parent_id: data.chart_of_account_id,
      created_by
    } as any)
    .select()
    .single()

  if (accErr) return { error: 'Muhasebe hesabı açılamadı: ' + accErr.message }

  // 4. Create the stock
  const { data: stock, error } = await supabase
    .from('stocks')
    .insert({
      company_id: companyInfo.id,
      code: newCode,
      name: data.name,
      chart_of_account_id: newAccount.id,
      attributes: data.attributes || {},
      unit: data.unit || 'Adet',
      unit_price: data.unit_price,
      quantity_on_hand: data.quantity_on_hand,
      min_stock_level: data.min_stock_level || 0,
      description: data.description || null,
      created_by
    } as any)
    .select()
    .single()

  if (error) return { error: error.message }

  // Record initial stock movement if quantity > 0
  if (data.quantity_on_hand > 0 && stock) {
    await supabase.from('stock_movements').insert({
      company_id: companyInfo.id,
      stock_id: stock.id,
      movement_type: 'in',
      quantity: data.quantity_on_hand,
      unit_price: data.unit_price,
      total_amount: data.quantity_on_hand * data.unit_price,
      notes: 'Başlangıç Stok Girişi',
      created_by
    } as any)
  }

  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true, stock }
}

export async function updateStock(id: string, data: {
  name: string
  chart_of_account_id?: string
  attributes?: Record<string, any>
  unit?: string
  unit_price: number
  quantity_on_hand: number
  min_stock_level: number
  description?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  // Sadece ad, fiyat, miktar vb güncellenebilir. Hesap planı değişirse yeni kod üretilmeli (şimdilik desteklemiyoruz)
  const { error } = await supabase
    .from('stocks')
    .update({
      name: data.name,
      attributes: data.attributes || {},
      unit: data.unit || 'Adet',
      unit_price: data.unit_price,
      quantity_on_hand: data.quantity_on_hand,
      min_stock_level: data.min_stock_level || 0,
      description: data.description || null,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', id)
    .eq('company_id', companyInfo.id)

  if (error) return { error: error.message }

  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true }
}

export async function deleteStock(id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('stocks')
    .delete()
    .eq('id', id)
    .eq('company_id', companyInfo.id)

  if (error) return { error: error.message }

  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true }
}

export async function addStockMovement(data: {
  stock_id: string
  account_id?: string
  movement_type: 'in' | 'out'
  quantity: number
  unit_price: number
  notes?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  // 1. Fetch stock
  const { data: stock, error: fetchErr } = await supabase
    .from('stocks')
    .select('*')
    .eq('id', data.stock_id)
    .eq('company_id', companyInfo.id)
    .single()

  if (fetchErr || !stock) return { error: 'Stok ürünü bulunamadı.' }

  const total_amount = Math.round(data.quantity * data.unit_price)
  
  let transaction_id: string | null = null

  const { data: authData } = await supabase.auth.getUser()
  const user_id = authData.user?.id || null

  // 2. Insert transaction if account_id is provided
  if (data.account_id) {
    if (user_id) {
      const { data: trx, error: trxErr } = await supabase.from('transactions').insert({
        user_id,
        company_id: companyInfo.id,
        account_id: data.account_id,
        transaction_type: data.movement_type === 'in' ? 'invoice_in' : 'invoice_out', // Alış faturası (borç artar) veya Satış faturası (alacak artar)
        category: 'Stok',
        amount: total_amount,
        currency: 'TRY',
        transaction_date: new Date().toISOString().split('T')[0],
        description: `Stok İşlemi: ${stock.name} - ${data.quantity} Adet`,
        notes: data.notes || null,
        created_by: user_id
      } as any).select().single()
      
      if (!trxErr && trx) {
        transaction_id = trx.id
      }
    }
  }

  // 3. Insert stock movement
  const { error: moveErr } = await supabase.from('stock_movements').insert({
    company_id: companyInfo.id,
    stock_id: data.stock_id,
    account_id: data.account_id || null,
    transaction_id: transaction_id,
    movement_type: data.movement_type,
    quantity: data.quantity,
    unit_price: data.unit_price,
    total_amount,
    notes: data.notes || (data.movement_type === 'in' ? 'Stok Girişi (Alış)' : 'Stok Çıkışı (Satış)'),
    created_by: user_id
  } as any)

  if (moveErr) return { error: moveErr.message }

  // 4. Update stock quantity_on_hand
  const newQty = data.movement_type === 'in'
    ? Number(stock.quantity_on_hand || 0) + Number(data.quantity)
    : Number(stock.quantity_on_hand || 0) - Number(data.quantity)

  await supabase
    .from('stocks')
    .update({
      quantity_on_hand: newQty,
      unit_price: data.unit_price, // Update unit price to latest cost/sale price?
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', data.stock_id)

  revalidatePath('/stocks')
  revalidatePath('/accounts')
  revalidatePath('/transactions')
  revalidatePath('/')
  return { success: true }
}

export async function initializeUniformChartOfAccounts() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  // 1. Delete all existing stock movements to remove foreign key constraints
  const { error: err1 } = await supabase
    .from('stock_movements')
    .delete()
    .eq('company_id', companyInfo.id)
  if (err1) return { error: err1.message }

  // 2. Delete all existing stocks
  const { error: err2 } = await supabase
    .from('stocks')
    .delete()
    .eq('company_id', companyInfo.id)
  if (err2) return { error: err2.message }

  // 3. Delete all chart of accounts (foreign keys in accounts, safes, loans will be set to NULL)
  const { error: err3 } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('company_id', companyInfo.id)
  if (err3) return { error: err3.message }

  // 4. Insert base chart of accounts hierarchically
  const { DEFAULT_CHART_OF_ACCOUNTS } = require('@/lib/constants/chart-of-accounts')
  
  const mainAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter((a: any) => a.type === 'MAIN' && !a.parentCode)
  const groupAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter((a: any) => a.type === 'MAIN' && a.parentCode)
  const subAccounts = DEFAULT_CHART_OF_ACCOUNTS.filter((a: any) => a.type === 'SUB')

  const idMap = new Map<string, string>()

  // Class (1 digit)
  if (mainAccounts.length > 0) {
    const { data: insertedMains, error: mainErr } = await supabase
      .from('chart_of_accounts')
      .insert(mainAccounts.map((a: any) => ({
        company_id: companyInfo.id,
        code: a.code,
        name: a.name,
        type: 'MAIN',
        created_by
      })))
      .select()
    if (mainErr) return { error: mainErr.message }
    insertedMains?.forEach(m => idMap.set(m.code, m.id))
  }

  // Group (2 digits)
  if (groupAccounts.length > 0) {
    const { data: insertedGroups, error: groupErr } = await supabase
      .from('chart_of_accounts')
      .insert(groupAccounts.map((a: any) => ({
        company_id: companyInfo.id,
        code: a.code,
        name: a.name,
        type: 'MAIN',
        parent_id: a.parentCode ? idMap.get(a.parentCode) : null,
        created_by
      })))
      .select()
    if (groupErr) return { error: groupErr.message }
    insertedGroups?.forEach(g => idMap.set(g.code, g.id))
  }

  // Account (3 digits)
  if (subAccounts.length > 0) {
    const { error: subErr } = await supabase
      .from('chart_of_accounts')
      .insert(subAccounts.map((a: any) => ({
        company_id: companyInfo.id,
        code: a.code,
        name: a.name,
        type: 'SUB',
        parent_id: a.parentCode ? idMap.get(a.parentCode) : null,
        created_by
      })))
    if (subErr) return { error: subErr.message }
  }

  revalidatePath('/stocks')
  revalidatePath('/accounts')
  revalidatePath('/safes')
  revalidatePath('/finance')
  revalidatePath('/')
  return { success: true }
}

export async function transferStock(data: {
  stock_id: string
  source_warehouse_id: string
  destination_warehouse_id: string
  quantity: number
  notes?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) throw new Error('Company not found')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  const { error } = await supabase.rpc('transfer_stock', {
    p_company_id: companyInfo.id,
    p_stock_id: data.stock_id,
    p_source_warehouse_id: data.source_warehouse_id,
    p_destination_warehouse_id: data.destination_warehouse_id,
    p_quantity: data.quantity,
    p_notes: data.notes || '',
    p_created_by: authData.user?.id || null
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/stocks')
}


export async function createStockSubAccount(name: string, parent_account_id: string) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const created_by = authData.user?.id || null

  const { data: parentAccount, error: parentErr } = await supabase
    .from('chart_of_accounts')
    .select('code')
    .eq('id', parent_account_id)
    .single()
    
  if (parentErr || !parentAccount) return { error: 'Kategori (Üst Hesap) bulunamadı.' }

  const { data: newCode, error: rpcErr } = await supabase
    .rpc('generate_next_account_code', {
      p_company_id: companyInfo.id,
      p_parent_code: parentAccount.code
    })

  if (rpcErr || !newCode) return { error: 'Kod oluşturulamadı: ' + (rpcErr?.message || 'Bilinmeyen hata') }

  const { data: newAccount, error: accErr } = await supabase
    .from('chart_of_accounts')
    .insert({
      company_id: companyInfo.id,
      code: newCode,
      name,
      type: 'SUB',
      parent_id: parent_account_id,
      created_by
    } as any)
    .select()
    .single()

  if (accErr) return { error: 'Alt kategori açılamadı: ' + accErr.message }

  revalidatePath('/stocks')
  return { success: true, data: newAccount }
}
