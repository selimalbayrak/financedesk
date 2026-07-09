-- 1. Create safes table
CREATE TABLE IF NOT EXISTS "public"."safes" (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- Safes policies
ALTER TABLE "public"."safes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage safes in their companies" ON "public"."safes"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- 2. Modify transactions to add safe_id and bank_detail
-- We need to drop view first because we are modifying transactions
DROP VIEW IF EXISTS "public"."account_balances";

-- Add safe_id. Since we might have existing transactions, we add it as nullable first,
-- but we should ideally assign a default safe. Let's make it nullable for now, but UI will enforce it.
ALTER TABLE "public"."transactions" ADD COLUMN IF NOT EXISTS "safe_id" uuid REFERENCES "public"."safes"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."transactions" ADD COLUMN IF NOT EXISTS "bank_detail" text;

-- (Optional) If you want to automatically create a "Merkez Kasa" for existing transactions:
-- INSERT INTO "public"."safes" (company_id, name)
-- SELECT DISTINCT company_id, 'Merkez Kasa' FROM "public"."transactions";
-- UPDATE "public"."transactions" t SET safe_id = s.id FROM "public"."safes" s WHERE t.company_id = s.company_id AND t.safe_id IS NULL;

-- 3. Re-create account_balances view properly
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

-- 4. Create safe_balances view
-- Balance Logic for Safes:
-- (+) Para Girişi (Money In): payment_in (Müşteri bize ödeme yaptı), loan_received, etc. (we only use payment_in for now)
-- (-) Para Çıkışı (Money Out): payment_out (Tedarikçiye ödeme yaptık)
-- Fatura (invoice_in/out) kasayı etkilemez! Çünkü fatura paranın gelip gittiği anlamına gelmez, borç/alacak oluşturur.
CREATE OR REPLACE VIEW "public"."safe_balances" AS
SELECT
  s.id,
  s.company_id,
  s.name,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'payment_in' THEN t.amount ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS total_out,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'payment_in' THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.transaction_type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS balance
FROM
  "public"."safes" s
LEFT JOIN
  "public"."transactions" t ON s.id = t.safe_id AND t.deleted_at IS NULL
WHERE
  s.deleted_at IS NULL
GROUP BY
  s.id, s.company_id, s.name;
