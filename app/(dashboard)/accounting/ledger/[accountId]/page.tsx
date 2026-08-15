import { getAccountLedger, getAccountDetails } from '@/features/accounting/actions'
import LedgerClient from '@/features/accounting/ledger-client'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LedgerPage({ params }: { params: { accountId: string } }) {
  const accountRes = await getAccountDetails(params.accountId)
  if (!accountRes.success || !accountRes.data) {
    notFound()
  }

  const { data } = await getAccountLedger(params.accountId)
  
  return <LedgerClient initialData={data || []} account={accountRes.data} accountId={params.accountId} />
}
