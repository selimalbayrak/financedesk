-- ============================================================
-- FinanceDesk — Complete Database Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── ACCOUNTS (Cari Hesaplar) ────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
  name         text NOT NULL,
  company_name text,
  tax_number   text,
  tax_office   text,
  email        text,
  phone        text,
  address      text,
  city         text,
  notes        text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- ─── TRANSACTIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       uuid REFERENCES accounts(id),
  type             text NOT NULL CHECK (type IN ('debit', 'credit')),
  category         text NOT NULL,
  amount           bigint NOT NULL DEFAULT 0,  -- kuruş (1/100 TRY)
  currency         text NOT NULL DEFAULT 'TRY',
  description      text,
  reference_no     text,
  transaction_date date NOT NULL,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);

-- ─── PAYABLES (Borçlar & Alacaklar) ─────────────────────────
CREATE TABLE IF NOT EXISTS payables (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       uuid NOT NULL REFERENCES accounts(id),
  type             text NOT NULL CHECK (type IN ('payable', 'receivable')),
  description      text NOT NULL,
  original_amount  bigint NOT NULL,
  remaining_amount bigint NOT NULL,
  due_date         date,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  invoice_ref      text,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payables_user_id ON payables(user_id);
CREATE INDEX IF NOT EXISTS idx_payables_account_id ON payables(account_id);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);

-- ─── PAYABLE PAYMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payable_payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  payable_id   uuid NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  amount       bigint NOT NULL,
  payment_date date NOT NULL,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payable_payments_user_id ON payable_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payable_payments_payable_id ON payable_payments(payable_id);

-- ─── RECONCILIATIONS (Mutabakat) ─────────────────────────────
CREATE TABLE IF NOT EXISTS reconciliations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       uuid NOT NULL REFERENCES accounts(id),
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  my_balance       bigint NOT NULL,
  supplier_balance bigint NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'agreed', 'disputed', 'resolved')),
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_user_id ON reconciliations(user_id);

-- ─── LOANS (Krediler) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name          text NOT NULL,
  loan_type          text DEFAULT 'term_loan',
  original_amount    bigint NOT NULL,
  remaining_balance  bigint NOT NULL,
  interest_rate      numeric(6,4) NOT NULL,
  installment_amount bigint,
  start_date         date NOT NULL,
  end_date           date,
  next_payment_date  date,
  status             text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'defaulted')),
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

-- ─── LOAN PAYMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id      uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  principal    bigint NOT NULL,
  interest     bigint NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- ─── CHECKS (Çekler) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   uuid REFERENCES accounts(id),
  direction    text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  check_number text,
  bank_name    text,
  amount       bigint NOT NULL,
  issue_date   date,
  due_date     date NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_checks_user_id ON checks(user_id);
CREATE INDEX IF NOT EXISTS idx_checks_due_date ON checks(due_date);

-- ─── PROMISSORY NOTES (Senetler) ─────────────────────────────
CREATE TABLE IF NOT EXISTS promissory_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   uuid REFERENCES accounts(id),
  direction    text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  note_number  text,
  amount       bigint NOT NULL,
  issue_date   date,
  due_date     date NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'collected', 'paid', 'protested', 'cancelled')),
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON promissory_notes(user_id);

-- ─── INVOICES (Fatura Arşivi) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   uuid REFERENCES accounts(id),
  direction    text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  invoice_no   text NOT NULL,
  invoice_date date NOT NULL,
  amount       bigint NOT NULL,
  tax_amount   bigint DEFAULT 0,
  description  text,
  file_path    text,
  file_name    text,
  tags         text[],
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payable_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE promissory_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;

-- NOTE: (SELECT auth.uid()) evaluated once per query, not per row — better performance
CREATE POLICY "owner_all_accounts"         ON accounts         FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_transactions"     ON transactions     FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_payables"         ON payables         FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_payable_payments" ON payable_payments FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_reconciliations"  ON reconciliations  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_loans"            ON loans            FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_loan_payments"    ON loan_payments    FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_checks"           ON checks           FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_promissory_notes" ON promissory_notes FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_all_invoices"         ON invoices         FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Account balance view (sum of transactions per account)
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id,
  a.name,
  a.type,
  a.user_id,
  COALESCE(SUM(CASE WHEN t.type = 'debit'  THEN t.amount ELSE 0 END), 0) AS debit_total,
  COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0) AS credit_total,
  COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.type, a.user_id;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_accounts         BEFORE UPDATE ON accounts         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_transactions     BEFORE UPDATE ON transactions     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_payables         BEFORE UPDATE ON payables         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_reconciliations  BEFORE UPDATE ON reconciliations  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_loans            BEFORE UPDATE ON loans            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_checks           BEFORE UPDATE ON checks           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_promissory_notes BEFORE UPDATE ON promissory_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_invoices         BEFORE UPDATE ON invoices         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
