import { z } from 'zod'

export const statementTransactionSchema = z.object({
  date: z.string(),
  document_no: z.string().nullable().optional(),
  document_type: z.string().nullable().optional(),
  description: z.string(),
  debit_raw: z.string(),
  credit_raw: z.string()
})

export const statementArraySchema = z.array(statementTransactionSchema)

export const ccTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount_raw: z.string()
})

export const ccStatementSchema = z.object({
  card_limit: z.string().nullable().optional(),
  statement_debt: z.string().nullable().optional(),
  transactions: z.array(ccTransactionSchema)
})

export const loanInstallmentSchema = z.object({
  due_date: z.string(),
  amount_due: z.number()
})

export const loanStatementSchema = z.object({
  bank_name: z.string(),
  loan_amount: z.number(),
  total_repayment: z.number(),
  interest_rate: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  monthly_installment: z.number(),
  installments: z.array(loanInstallmentSchema)
})
