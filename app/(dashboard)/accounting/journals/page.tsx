import { getJournalEntries } from '@/features/accounting/actions'
import JournalsClient from '@/features/accounting/journals-client'

export const dynamic = 'force-dynamic'

export default async function JournalsPage() {
  const { data } = await getJournalEntries()
  
  return <JournalsClient initialData={data || []} />
}
