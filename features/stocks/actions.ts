'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActiveCompany } from '@/lib/company'

export async function createStock(data: {
  code: string
  name: string
  category?: string
  unit?: string
  unit_price: number // in cents
  quantity_on_hand: number
  min_stock_level: number
  description?: string
}) {
  const companyInfo = await getActiveCompany()
  if (!companyInfo) return { error: 'Company not found' }

  const supabase = await createClient()

  const { data: stock, error } = await supabase
    .from('stocks')
    .insert({
      company_id: companyInfo.id,
      code: data.code,
      name: data.name,
      category: data.category || null,
      unit: data.unit || 'Adet',
      unit_price: data.unit_price,
      quantity_on_hand: data.quantity_on_hand,
      min_stock_level: data.min_stock_level || 0,
      description: data.description || null
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
      notes: 'Başlangıç Stok Girişi'
    } as any)
  }

  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true, stock }
}

export async function updateStock(id: string, data: {
  code: string
  name: string
  category?: string
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
      category: data.category || null,
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

  // 2. Insert stock movement
  const { error: moveErr } = await supabase.from('stock_movements').insert({
    company_id: companyInfo.id,
    stock_id: data.stock_id,
    account_id: data.account_id || null,
    movement_type: data.movement_type,
    quantity: data.quantity,
    unit_price: data.unit_price,
    total_amount,
    notes: data.notes || (data.movement_type === 'in' ? 'Stok Girişi (Alış)' : 'Stok Çıkışı (Satış)')
  } as any)

  if (moveErr) return { error: moveErr.message }

  // 3. Update stock quantity_on_hand
  const newQty = data.movement_type === 'in'
    ? Number(stock.quantity_on_hand || 0) + Number(data.quantity)
    : Number(stock.quantity_on_hand || 0) - Number(data.quantity)

  await supabase
    .from('stocks')
    .update({
      quantity_on_hand: newQty,
      unit_price: data.unit_price,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', data.stock_id)

  revalidatePath('/stocks')
  revalidatePath('/')
  return { success: true }
}
