export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          type: 'customer' | 'supplier' | 'both'
          name: string
          company_name: string | null
          tax_number: string | null
          tax_office: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          type: 'debit' | 'credit'
          category: string
          amount: number // stored as BIGINT kuruş, divide by 100 for display
          currency: string
          document_type: string | null
          document_no: string | null
          description: string | null
          reference_no: string | null
          transaction_date: string
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      transaction_lines: {
        Row: {
          id: string
          transaction_id: string
          item_code: string | null
          description: string | null
          quantity: number | null
          unit_price: number | null
          amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transaction_lines']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transaction_lines']['Insert']>
      }
      payables: {
        Row: {
          id: string
          user_id: string
          account_id: string
          type: 'payable' | 'receivable'
          description: string
          original_amount: number
          remaining_amount: number
          due_date: string | null
          status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          invoice_ref: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['payables']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payables']['Insert']>
      }
      payable_payments: {
        Row: {
          id: string
          user_id: string
          payable_id: string
          amount: number
          payment_date: string
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payable_payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payable_payments']['Insert']>
      }
      loans: {
        Row: {
          id: string
          user_id: string
          bank_name: string
          loan_type: string
          original_amount: number
          remaining_balance: number
          interest_rate: number
          installment_amount: number | null
          start_date: string
          end_date: string | null
          next_payment_date: string | null
          status: 'active' | 'closed' | 'defaulted'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['loans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['loans']['Insert']>
      }
      checks: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          direction: 'incoming' | 'outgoing'
          check_number: string | null
          bank_name: string | null
          amount: number
          issue_date: string | null
          due_date: string
          status: 'pending' | 'cleared' | 'bounced' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['checks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['checks']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          direction: 'incoming' | 'outgoing'
          invoice_no: string
          invoice_date: string
          amount: number
          tax_amount: number
          total_amount: number
          description: string | null
          file_path: string | null
          file_name: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'total_amount' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
    }
    Views: {
      account_balances: {
        Row: {
          id: string
          name: string
          type: string
          debit_total: number
          credit_total: number
          balance: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenient type aliases
export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export type TransactionLine = Database['public']['Tables']['transaction_lines']['Row']
export type TransactionLineInsert = Database['public']['Tables']['transaction_lines']['Insert']

export type Payable = Database['public']['Tables']['payables']['Row']
export type PayableInsert = Database['public']['Tables']['payables']['Insert']
export type PayableUpdate = Database['public']['Tables']['payables']['Update']

export type PayablePayment = Database['public']['Tables']['payable_payments']['Row']
export type PayablePaymentInsert = Database['public']['Tables']['payable_payments']['Insert']

export type Loan = Database['public']['Tables']['loans']['Row']
export type Check = Database['public']['Tables']['checks']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']

// Extended types with joins
export type PayableWithAccount = Payable & {
  account: Pick<Account, 'id' | 'name' | 'company_name' | 'type'>
}

export type TransactionWithAccount = Transaction & {
  account: Pick<Account, 'id' | 'name'> | null
}

export type TransactionWithLines = Transaction & {
  transaction_lines: TransactionLine[]
}
