import { getTrialBalance } from '@/features/accounting/actions'
import TrialBalanceClient from '@/features/accounting/trial-balance-client'

export const dynamic = 'force-dynamic'

export default async function TrialBalancePage() {
  const { data } = await getTrialBalance()
  
  return <TrialBalanceClient initialData={data || []} />
}
