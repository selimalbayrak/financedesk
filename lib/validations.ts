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
