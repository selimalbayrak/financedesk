-- Create cheques_notes table
CREATE TABLE IF NOT EXISTS cheques_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('cheque', 'promissory_note')),
    direction text NOT NULL CHECK (direction IN ('in', 'out')),
    status text NOT NULL CHECK (status IN ('portfolio', 'endorsed', 'cashed', 'bounced')),
    amount bigint NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    contact_name text NOT NULL,
    bank_name text,
    document_number text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE cheques_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's cheques_notes"
    ON cheques_notes FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert cheques_notes to their companies"
    ON cheques_notes FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company's cheques_notes"
    ON cheques_notes FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their company's cheques_notes"
    ON cheques_notes FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name text NOT NULL,
    loan_amount bigint NOT NULL,
    total_repayment bigint NOT NULL,
    interest_rate numeric(5,2),
    start_date date NOT NULL,
    end_date date NOT NULL,
    monthly_installment bigint NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'paid_off')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's loans"
    ON loans FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert loans to their companies"
    ON loans FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company's loans"
    ON loans FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their company's loans"
    ON loans FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

-- Create loan_installments table
CREATE TABLE IF NOT EXISTS loan_installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    due_date date NOT NULL,
    amount_due bigint NOT NULL,
    amount_paid bigint NOT NULL DEFAULT 0,
    status text NOT NULL CHECK (status IN ('pending', 'paid', 'late')),
    payment_date date,
    safe_id uuid REFERENCES safes(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's loan_installments"
    ON loan_installments FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert loan_installments to their companies"
    ON loan_installments FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company's loan_installments"
    ON loan_installments FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their company's loan_installments"
    ON loan_installments FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));
