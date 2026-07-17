import { ChequeForm } from '@/features/finance/cheque-form'
import { getActiveCompany } from '@/lib/company'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yeni Çek/Senet',
}

export default async function NewChequePage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  return <ChequeForm />
}
