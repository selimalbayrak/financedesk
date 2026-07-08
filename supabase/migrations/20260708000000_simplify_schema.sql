-- Drop unused tables and their policies
DROP TABLE IF EXISTS "public"."payable_payments" CASCADE;
DROP TABLE IF EXISTS "public"."payables" CASCADE;
DROP TABLE IF EXISTS "public"."loans" CASCADE;
DROP TABLE IF EXISTS "public"."checks" CASCADE;
DROP TABLE IF EXISTS "public"."invoices" CASCADE;

-- We also need to drop the view if it exists because it relies on the old transactions structure
DROP VIEW IF EXISTS "public"."account_balances";

-- Modify transactions table
ALTER TABLE "public"."transactions" DROP COLUMN IF EXISTS "type";
ALTER TABLE "public"."transactions" ADD COLUMN "transaction_type" text NOT NULL DEFAULT 'payment_out';
ALTER TABLE "public"."transactions" ADD COLUMN "payment_method" text;

-- Add constraints for the new type
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_transaction_type_check" CHECK (transaction_type IN ('payment_out', 'payment_in', 'invoice_out', 'invoice_in'));

-- Recreate the view with the new logic
-- Balance Logic:
-- (+) Alacağımız Var (They owe us): invoice_out (We sold them something), payment_out (We sent them money)
-- (-) Borcumuz Var (We owe them): invoice_in (They sold us something), payment_in (They sent us money)
CREATE OR REPLACE VIEW "public"."account_balances" AS
SELECT
  a.id,
  a.user_id,
  a.company_id,
  a.name,
  a.type,
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
  a.id, a.user_id, a.company_id, a.name, a.type;
