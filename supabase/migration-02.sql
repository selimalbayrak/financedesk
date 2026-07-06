-- ============================================================
-- FinanceDesk — Migration 02: Multi-Company (Tenant) Support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. Create Company Users Table (Role-based access)
CREATE TABLE IF NOT EXISTS company_users (
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

-- Index for fast user company lookup
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);

-- 3. Data Migration: Create a default company for existing users and link them
DO $$
DECLARE
  rec RECORD;
  new_company_id uuid;
BEGIN
  FOR rec IN 
    -- Find unique users who have accounts but no company yet
    SELECT DISTINCT user_id FROM accounts
  LOOP
    -- Create a default company for the user
    INSERT INTO companies (name) VALUES ('Benim Şirketim') RETURNING id INTO new_company_id;
    
    -- Link the user to the new company as owner
    INSERT INTO company_users (company_id, user_id, role) VALUES (new_company_id, rec.user_id, 'owner') ON CONFLICT DO NOTHING;

    -- We'll add the company_id column and update records in the next step
  END LOOP;
END $$;

-- 4. Add company_id to all tables (nullable first)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payables ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payable_payments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE reconciliations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE promissory_notes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- 5. Data Migration: Assign existing records to the user's default company
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT company_id, user_id FROM company_users WHERE role = 'owner'
  LOOP
    UPDATE accounts SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE transactions SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE payables SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE payable_payments SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE reconciliations SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE loans SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE loan_payments SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE checks SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE promissory_notes SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE invoices SET company_id = rec.company_id WHERE user_id = rec.user_id AND company_id IS NULL;
  END LOOP;
END $$;

-- 6. Make company_id NOT NULL for all tables
-- NOTE: We keep user_id as well to track "created_by" but it's no longer the sole security bound
ALTER TABLE accounts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE payables ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE payable_payments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE reconciliations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE loans ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE loan_payments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE checks ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE promissory_notes ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN company_id SET NOT NULL;

-- 7. Add Indexes for company_id
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_payables_company_id ON payables(company_id);
CREATE INDEX IF NOT EXISTS idx_payable_payments_company_id ON payable_payments(company_id);

-- 8. Recreate the account_balances view to include company_id
DROP VIEW IF EXISTS account_balances;
CREATE VIEW account_balances AS
SELECT
  a.id,
  a.name,
  a.type,
  a.company_id,
  a.user_id,
  COALESCE(SUM(CASE WHEN t.type = 'debit'  THEN t.amount ELSE 0 END), 0) AS debit_total,
  COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0) AS credit_total,
  COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.type, a.company_id, a.user_id;


-- ============================================================
-- NEW RLS POLICIES (Company-based isolation)
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see companies they belong to
DROP POLICY IF EXISTS "user_companies" ON companies;
CREATE POLICY "user_companies" ON companies FOR SELECT TO authenticated
USING (id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

-- Company Users: Users can see all members of their companies
DROP POLICY IF EXISTS "user_company_members" ON company_users;
CREATE POLICY "user_company_members" ON company_users FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

-- Update policies for all existing tables to check company_id instead of just user_id
-- We drop the old policies first
DROP POLICY IF EXISTS "owner_all_accounts" ON accounts;
DROP POLICY IF EXISTS "owner_all_transactions" ON transactions;
DROP POLICY IF EXISTS "owner_all_payables" ON payables;
DROP POLICY IF EXISTS "owner_all_payable_payments" ON payable_payments;
DROP POLICY IF EXISTS "owner_all_reconciliations" ON reconciliations;
DROP POLICY IF EXISTS "owner_all_loans" ON loans;
DROP POLICY IF EXISTS "owner_all_loan_payments" ON loan_payments;
DROP POLICY IF EXISTS "owner_all_checks" ON checks;
DROP POLICY IF EXISTS "owner_all_promissory_notes" ON promissory_notes;
DROP POLICY IF EXISTS "owner_all_invoices" ON invoices;

-- Create new company-based policies
-- NOTE: We use a subquery to check if the user is in the company_users table for that company_id
CREATE POLICY "company_all_accounts" ON accounts FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_transactions" ON transactions FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_payables" ON payables FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_payable_payments" ON payable_payments FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_reconciliations" ON reconciliations FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_loans" ON loans FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_loan_payments" ON loan_payments FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_checks" ON checks FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_promissory_notes" ON promissory_notes FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "company_all_invoices" ON invoices FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())));

-- ============================================================
-- AUTO-CREATE COMPANY TRIGGER
-- Automatically create a default company when a new user signs up
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS trigger AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Create default company
  INSERT INTO public.companies (name)
  VALUES ('Benim Şirketim')
  RETURNING id INTO new_company_id;

  -- Add user as owner
  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (new_company_id, new.id, 'owner');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();
