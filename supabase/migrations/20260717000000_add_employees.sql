-- 1. Create employees table
CREATE TABLE IF NOT EXISTS "public"."employees" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "role" text,
  "start_date" date,
  "wage_type" text NOT NULL DEFAULT 'monthly', -- 'monthly' or 'daily'
  "wage_amount" integer NOT NULL DEFAULT 0, -- in kuruş
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- Employee policies
ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage employees in their companies" ON "public"."employees"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- 2. Create employee_transactions table
CREATE TABLE IF NOT EXISTS "public"."employee_transactions" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
  "employee_id" uuid NOT NULL REFERENCES "public"."employees"("id") ON DELETE CASCADE,
  "safe_id" uuid REFERENCES "public"."safes"("id") ON DELETE RESTRICT,
  "transaction_type" text NOT NULL, -- 'work_day', 'advance_payment', 'salary_payment'
  "amount" integer NOT NULL DEFAULT 0, -- in kuruş
  "date" date NOT NULL,
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- Employee transactions policies
ALTER TABLE "public"."employee_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage employee_transactions in their companies" ON "public"."employee_transactions"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- constraint for employee transaction types
ALTER TABLE "public"."employee_transactions" ADD CONSTRAINT "employee_transactions_transaction_type_check" 
  CHECK (transaction_type IN ('work_day', 'advance_payment', 'salary_payment'));

-- 3. Create employee_balances view
-- Balance Logic:
-- (+) Employee earns money (hakediş): work_day
-- (-) Employee receives money (ödenen): advance_payment, salary_payment
CREATE OR REPLACE VIEW "public"."employee_balances" AS
SELECT
  e.id,
  e.company_id,
  e.name,
  e.role,
  e.start_date,
  e.wage_type,
  e.wage_amount,
  e.is_active,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('work_day') THEN t.amount ELSE 0 END), 0) AS total_earned,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('advance_payment', 'salary_payment') THEN t.amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('work_day') THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('advance_payment', 'salary_payment') THEN t.amount ELSE 0 END), 0) AS balance
FROM
  "public"."employees" e
LEFT JOIN
  "public"."employee_transactions" t ON e.id = t.employee_id AND t.deleted_at IS NULL
WHERE
  e.deleted_at IS NULL
GROUP BY
  e.id, e.company_id, e.name, e.role, e.start_date, e.wage_type, e.wage_amount, e.is_active;

-- 4. Update safe_balances view to include employee payments
DROP VIEW IF EXISTS "public"."safe_balances";

CREATE OR REPLACE VIEW "public"."safe_balances" AS
WITH all_safe_transactions AS (
  -- Normal transactions where safe_id is the sender (money out)
  SELECT safe_id as sid, amount as amount_out, 0 as amount_in 
  FROM "public"."transactions" 
  WHERE transaction_type = 'payment_out' AND deleted_at IS NULL AND safe_id IS NOT NULL
  
  UNION ALL
  
  -- Normal transactions where safe_id is the receiver (money in)
  SELECT safe_id as sid, 0 as amount_out, amount as amount_in 
  FROM "public"."transactions" 
  WHERE transaction_type = 'payment_in' AND deleted_at IS NULL AND safe_id IS NOT NULL
  
  UNION ALL
  
  -- Safe transfers where safe_id is the sender (money out)
  SELECT safe_id as sid, amount as amount_out, 0 as amount_in 
  FROM "public"."transactions" 
  WHERE transaction_type = 'safe_transfer' AND deleted_at IS NULL AND safe_id IS NOT NULL
  
  UNION ALL
  
  -- Safe transfers where to_safe_id is the receiver (money in)
  SELECT to_safe_id as sid, 0 as amount_out, amount as amount_in 
  FROM "public"."transactions" 
  WHERE transaction_type = 'safe_transfer' AND deleted_at IS NULL AND to_safe_id IS NOT NULL
  
  UNION ALL
  
  -- Employee payments where safe_id is the sender (money out)
  SELECT safe_id as sid, amount as amount_out, 0 as amount_in 
  FROM "public"."employee_transactions" 
  WHERE transaction_type IN ('advance_payment', 'salary_payment') AND deleted_at IS NULL AND safe_id IS NOT NULL
)
SELECT 
  s.id, 
  s.company_id, 
  s.name, 
  COALESCE(SUM(ast.amount_in), 0) as total_in,
  COALESCE(SUM(ast.amount_out), 0) as total_out,
  COALESCE(SUM(ast.amount_in), 0) - COALESCE(SUM(ast.amount_out), 0) as balance
FROM "public"."safes" s
LEFT JOIN all_safe_transactions ast ON s.id = ast.sid
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.company_id, s.name;
