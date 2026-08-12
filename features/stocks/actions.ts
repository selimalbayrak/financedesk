'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function getStockCategories() {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_categories')
    .select('*')
    .eq('company_id', companyInfo.id)
    .order('name')

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
  code: string
  name: string
  category_id?: string
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

  const { data: stock, error } = await supabase
    .from('stocks')
    .insert({
      company_id: companyInfo.id,
      code: data.code,
      name: data.name,
      category_id: data.category_id || null,
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
  code: string
  name: string
  category_id?: string
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

  const { error } = await supabase
    .from('stocks')
    .update({
      code: data.code,
      name: data.name,
      category_id: data.category_id || null,
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

  // 3. Delete all existing stock categories
  const { error: err3 } = await supabase
    .from('stock_categories')
    .delete()
    .eq('company_id', companyInfo.id)
  if (err3) return { error: err3.message }

  // 4. Insert base chart of account categories
  const baseCategories = [
    { name: 'İlk Madde ve Malzeme', base_code: '150.01' },
    { name: 'Yarı Mamuller - Üretim', base_code: '151.01' },
    { name: 'Mamuller', base_code: '152.01' },
    { name: 'Ticari Mallar', base_code: '153.01' },
    { name: 'Diğer Stoklar', base_code: '157.01' }
  ]

  for (const cat of baseCategories) {
    const { error: err4 } = await supabase
      .from('stock_categories')
      .insert({
        company_id: companyInfo.id,
        name: cat.name,
        base_code: cat.base_code,
        fields: [],
        created_by
      } as any)
    if (err4) return { error: err4.message }
  }

  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true }
}
