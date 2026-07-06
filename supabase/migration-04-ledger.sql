-- ============================================================
-- FinanceDesk — Migration 04: Ledger & Transaction Lines
-- ============================================================

-- 1. Add document fields to transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS document_no TEXT;

-- 2. Create transaction_lines table for detailed items
CREATE TABLE IF NOT EXISTS transaction_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_code TEXT,
    description TEXT,
    quantity NUMERIC(10,3),
    unit_price NUMERIC(15,5),
    amount BIGINT NOT NULL DEFAULT 0, -- kuruş
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transaction_lines_tx_id ON transaction_lines(transaction_id);

-- 3. Enable RLS
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view transaction lines if they can view the parent transaction
CREATE POLICY "Users can view transaction lines" ON transaction_lines FOR SELECT USING (
    transaction_id IN (
        SELECT id FROM transactions WHERE company_id IN (
            SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())
        )
    )
);

-- Users can insert transaction lines if they can insert the parent transaction
CREATE POLICY "Users can insert transaction lines" ON transaction_lines FOR INSERT WITH CHECK (
    transaction_id IN (
        SELECT id FROM transactions WHERE company_id IN (
            SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())
        )
    )
);

-- Users can update transaction lines
CREATE POLICY "Users can update transaction lines" ON transaction_lines FOR UPDATE USING (
    transaction_id IN (
        SELECT id FROM transactions WHERE company_id IN (
            SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())
        )
    )
);

-- Users can delete transaction lines
CREATE POLICY "Users can delete transaction lines" ON transaction_lines FOR DELETE USING (
    transaction_id IN (
        SELECT id FROM transactions WHERE company_id IN (
            SELECT company_id FROM company_users WHERE user_id = (SELECT auth.uid())
        )
    )
);
