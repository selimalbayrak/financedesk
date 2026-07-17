import { LoanForm } from '@/features/finance/loan-form'
import { getActiveCompany } from '@/lib/company'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yeni Kredi Tanımla',
}

export default async function NewLoanPage() {
  const companyInfo = await getActiveCompany()
  
  if (!companyInfo) {
    redirect('/')
  }

  return <LoanForm />
}
