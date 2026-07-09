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
          transaction_type: 'payment_out' | 'payment_in' | 'invoice_out' | 'invoice_in'
          payment_method: string | null
          bank_detail: string | null
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
          name: string
          type: string
          positive_total: number
          negative_total: number
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

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export type TransactionLine = Database['public']['Tables']['transaction_lines']['Row']
export type TransactionLineInsert = Database['public']['Tables']['transaction_lines']['Insert']

export type Safe = Database['public']['Tables']['safes']['Row']
export type SafeInsert = Database['public']['Tables']['safes']['Insert']
export type SafeUpdate = Database['public']['Tables']['safes']['Update']

// Extended types with joins
export type TransactionWithAccount = Transaction & {
  account: Pick<Account, 'id' | 'name'> | null
}

export type TransactionWithLines = Transaction & {
  transaction_lines: TransactionLine[]
}
