-- 1. Update transactions table
ALTER TABLE "public"."transactions" ADD COLUMN IF NOT EXISTS "to_safe_id" uuid REFERENCES "public"."safes"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."transactions" ADD COLUMN IF NOT EXISTS "invoice_number" text;

-- Update constraint for transaction_type
ALTER TABLE "public"."transactions" DROP CONSTRAINT IF EXISTS "transactions_transaction_type_check";
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_transaction_type_check" CHECK (transaction_type IN ('payment_out', 'payment_in', 'invoice_out', 'invoice_in', 'safe_transfer'));

-- 2. Update account_balances view
-- We drop both views first because safe_balances depends on transactions, just to be clean.
DROP VIEW IF EXISTS "public"."safe_balances";
DROP VIEW IF EXISTS "public"."account_balances";

CREATE OR REPLACE VIEW "public"."account_balances" AS
SELECT
  a.id,
  a.user_id,
  a.company_id,
  a.name,
  a.company_name,
  a.tax_number,
  a.tax_office,
  a.phone,
  a.email,
  a.city,
  a.district,
  a.type,
  a.created_at,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_out', 'payment_out') THEN t.amount ELSE 0 END), 0) AS positive_total,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_in', 'payment_in') THEN t.amount ELSE 0 END), 0) AS negative_total,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_out', 'payment_out') THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_in', 'payment_in') THEN t.amount ELSE 0 END), 0) AS balance
FROM
  "public"."accounts" a
LEFT JOIN
  "public"."transactions" t ON a.id = t.account_id AND t.deleted_at IS NULL
WHERE
  a.deleted_at IS NULL
GROUP BY
  a.id, a.user_id, a.company_id, a.name, a.company_name, a.tax_number, a.tax_office, a.phone, a.email, a.city, a.district, a.type, a.created_at;

-- 3. Update safe_balances view for safe_transfer
CREATE OR REPLACE VIEW "public"."safe_balances" AS
SELECT
  s.id,
  s.company_id,
  s.name,
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_in' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.to_safe_id = s.id THEN t.amount -- We are the receiver
      ELSE 0 
    END
  ), 0) AS total_in,
  
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_out' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.safe_id = s.id THEN t.amount -- We are the sender
      ELSE 0 
    END
  ), 0) AS total_out,

  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_in' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.to_safe_id = s.id THEN t.amount
      ELSE 0 
    END
  ), 0) -
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_out' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.safe_id = s.id THEN t.amount
      ELSE 0 
    END
  ), 0) AS balance
FROM
  "public"."safes" s
LEFT JOIN
  "public"."transactions" t ON (s.id = t.safe_id OR s.id = t.to_safe_id) AND t.deleted_at IS NULL
WHERE
  s.deleted_at IS NULL
GROUP BY
  s.id, s.company_id, s.name;
