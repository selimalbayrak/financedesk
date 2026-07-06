import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountDetailView } from '@/features/accounts/account-detail-view'
import { getActiveCompany } from '@/lib/company'
import type { Metadata } from 'next'

interface AccountDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: AccountDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('accounts').select('name, company_name').eq('id', id).single()
  const account = data as { name: string; company_name: string | null } | null
  return {
    title: account?.company_name ?? account?.name ?? 'Cari Hesap Detayı',
  }
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { id } = await params
  const companyInfo = await getActiveCompany()

  if (!companyInfo) {
    redirect('/')
  }

  const supabase = await createClient()

  const [{ data: account }, { data: transactions }, { data: payables }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).eq('company_id', companyInfo.id).single(),
    supabase
      .from('transactions')
      .select('*, transaction_lines(*)')
      .eq('account_id', id)
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('payables')
      .select('*')
      .eq('account_id', id)
      .eq('company_id', companyInfo.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (!account) notFound()

  return (
    <AccountDetailView
      account={account}
      transactions={transactions ?? []}
      payables={payables ?? []}
      companyId={companyInfo.id}
    />
  )
}
