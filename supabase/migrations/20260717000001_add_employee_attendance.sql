-- Add daily allowances to employees table
ALTER TABLE employees ADD COLUMN daily_food_allowance bigint NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN daily_transport_allowance bigint NOT NULL DEFAULT 0;

-- Create employee_attendance table
CREATE TABLE employee_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('full_day', 'half_day', 'absent', 'holiday', 'paid_leave', 'unpaid_leave')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for employee_attendance
CREATE POLICY "Users can view their company's employee attendance"
    ON employee_attendance FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert employee attendance to their companies"
    ON employee_attendance FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company's employee attendance"
    ON employee_attendance FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their company's employee attendance"
    ON employee_attendance FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

-- Recreate employee_balances view to calculate total_earned from attendance instead of wage_earning transactions
DROP VIEW IF EXISTS employee_balances;

CREATE VIEW employee_balances AS
WITH earning_calculations AS (
    SELECT 
        employee_id,
        company_id,
        SUM(
            CASE 
                WHEN status IN ('full_day', 'holiday', 'paid_leave') THEN 1
                WHEN status = 'half_day' THEN 0.5
                ELSE 0
            END
        ) as worked_days,
        SUM(
            CASE 
                WHEN status IN ('full_day', 'half_day') THEN 1
                ELSE 0
            END
        ) as allowance_days
    FROM employee_attendance
    GROUP BY employee_id, company_id
),
payment_calculations AS (
    SELECT 
        employee_id,
        SUM(amount) as total_paid
    FROM employee_transactions
    WHERE transaction_type IN ('advance_payment', 'salary_payment')
      AND deleted_at IS NULL
    GROUP BY employee_id
)
SELECT 
    e.id,
    e.company_id,
    e.name,
    e.role,
    e.start_date,
    e.wage_type,
    e.wage_amount,
    e.daily_food_allowance,
    e.daily_transport_allowance,
    e.is_active,
    -- total_earned = (wage_amount / 30) * worked_days + (daily_food + daily_transport) * allowance_days
    COALESCE(
        ROUND((e.wage_amount::numeric / 30) * COALESCE(ec.worked_days, 0)) + 
        ((e.daily_food_allowance + e.daily_transport_allowance) * COALESCE(ec.allowance_days, 0)), 
        0
    ) as total_earned,
    COALESCE(pc.total_paid, 0) as total_paid,
    -- Balance = Earned - Paid
    COALESCE(
        ROUND((e.wage_amount::numeric / 30) * COALESCE(ec.worked_days, 0)) + 
        ((e.daily_food_allowance + e.daily_transport_allowance) * COALESCE(ec.allowance_days, 0)), 
        0
    ) - COALESCE(pc.total_paid, 0) as balance
FROM employees e
LEFT JOIN earning_calculations ec ON e.id = ec.employee_id
LEFT JOIN payment_calculations pc ON e.id = pc.employee_id
WHERE e.deleted_at IS NULL;
