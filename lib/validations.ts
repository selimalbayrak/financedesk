import { z } from 'zod'

// ─── Account Schema ──────────────────────────────────────────────────────────

export const accountSchema = z.object({
  type: z.enum(['customer', 'supplier', 'both']),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  company_name: z.string().max(150).optional().or(z.literal('')),
  tax_number: z.string().max(20).optional().or(z.literal('')),
  tax_office: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type AccountFormValues = z.infer<typeof accountSchema>

// ─── Payable Schema ───────────────────────────────────────────────────────────

export const payableSchema = z.object({
  account_id: z.string().min(1, 'Please select an account'),
  type: z.enum(['payable', 'receivable']),
  description: z.string().min(2, 'Description is required').max(300),
  original_amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  due_date: z.string().optional().or(z.literal('')),
  invoice_ref: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type PayableFormValues = z.infer<typeof payableSchema>

// ─── Payment Schema ───────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  payment_date: z.string().min(1, 'Payment date is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

// ─── Login Schema ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ─── Employee Schema ──────────────────────────────────────────────────────────

export const employeeSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır').max(100),
  role: z.string().max(100).optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  wage_type: z.enum(['monthly', 'daily']),
  wage_amount: z.number().min(0, 'Maaş 0 veya daha büyük olmalıdır'),
  daily_food_allowance: z.number().min(0),
  daily_transport_allowance: z.number().min(0),
  is_active: z.boolean(),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>

export const employeeTransactionSchema = z.object({
  transaction_type: z.enum(['advance_payment', 'salary_payment']),
  amount: z.number().min(0.01, 'Tutar 0 dan büyük olmalıdır'),
  date: z.string().min(1, 'Tarih seçmelisiniz'),
  description: z.string().optional().or(z.literal('')),
  safe_id: z.string().optional().or(z.literal('')), // Optional for earnings, required for payments
}).superRefine((data, ctx) => {
  if ((data.transaction_type === 'advance_payment' || data.transaction_type === 'salary_payment') && (!data.safe_id || data.safe_id === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ödeme için kasa seçmelisiniz',
      path: ['safe_id']
    })
  }
})

export type EmployeeTransactionFormValues = z.infer<typeof employeeTransactionSchema>
