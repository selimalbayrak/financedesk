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
          company_id: string
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
      employees: {
        Row: {
          id: string
          company_id: string
          name: string
          role: string | null
          start_date: string | null
          wage_type: string
          wage_amount: number
          daily_food_allowance: number
          daily_transport_allowance: number
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      employee_attendance: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          date: string
          status: 'full_day' | 'half_day' | 'absent' | 'holiday' | 'paid_leave' | 'unpaid_leave'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['employee_attendance']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['employee_attendance']['Insert']>
      }
      employee_transactions: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          safe_id: string | null
          transaction_type: string
          amount: number
          date: string
          description: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['employee_transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['employee_transactions']['Insert']>
      }
      safes: {
        Row: {
          id: string
          company_id: string
          name: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['safes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['safes']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          company_id: string
          account_id: string | null
          safe_id: string | null
          to_safe_id: string | null
          transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in' | 'safe_transfer' | 'income' | 'expense'
          payment_method: string | null
          bank_detail: string | null
          category: string
          amount: number // stored as BIGINT kuruş, divide by 100 for display
          currency: string
          document_type: string | null
          document_no: string | null
          invoice_number: string | null
          description: string | null
          reference_no: string | null
          transaction_date: string
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          to_safe_id?: string | null
          invoice_number?: string | null
          transaction_type?: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in' | 'safe_transfer' | 'income' | 'expense'
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      transaction_lines: {
        Row: {
          id: string
          transaction_id: string
          company_id: string
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
    }
    Views: {
      account_balances: {
        Row: {
          id: string
          user_id: string
          company_id: string
          type: 'customer' | 'supplier' | 'both'
          name: string
          company_name: string | null
          tax_number: string | null
          tax_office: string | null
          email: string | null
          phone: string | null
          city: string | null
          created_at: string
          positive_total: number
          negative_total: number
          balance: number
        }
      }
      employee_balances: {
        Row: {
          id: string
          company_id: string
          name: string
          role: string | null
          start_date: string | null
          wage_type: string
          wage_amount: number
          daily_food_allowance: number
          daily_transport_allowance: number
          is_active: boolean
          total_earned: number
          total_paid: number
          balance: number
        }
      }
      safe_balances: {
        Row: {
          id: string
          company_id: string
          name: string
          total_in: number
          total_out: number
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

export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update']

export type EmployeeTransaction = Database['public']['Tables']['employee_transactions']['Row']
export type EmployeeTransactionInsert = Database['public']['Tables']['employee_transactions']['Insert']
export type EmployeeTransactionUpdate = Database['public']['Tables']['employee_transactions']['Update']

export type Safe = Database['public']['Tables']['safes']['Row']
export type SafeInsert = Database['public']['Tables']['safes']['Insert']
export type SafeUpdate = Database['public']['Tables']['safes']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type TransactionLine = Database['public']['Tables']['transaction_lines']['Row']
export type TransactionLineInsert = Database['public']['Tables']['transaction_lines']['Insert']
export type TransactionLineUpdate = Database['public']['Tables']['transaction_lines']['Update']

export type AccountBalance = Database['public']['Views']['account_balances']['Row']
export type SafeBalance = Database['public']['Views']['safe_balances']['Row']
export type EmployeeBalance = Database['public']['Views']['employee_balances']['Row']

// Extended types with joins
export type TransactionWithAccount = Transaction & {
  account: Pick<Account, 'id' | 'name'> | null
}

export type TransactionWithLines = Transaction & {
  transaction_lines: TransactionLine[]
}
