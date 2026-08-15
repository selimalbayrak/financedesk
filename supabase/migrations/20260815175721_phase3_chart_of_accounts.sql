-- Migration: phase3_chart_of_accounts

-- Create chart_of_account_type enum
CREATE TYPE "public"."chart_of_account_type" AS ENUM ('MAIN', 'SUB', 'DETAIL');

-- Create chart_of_accounts table
CREATE TABLE IF NOT EXISTS "public"."chart_of_accounts" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "type" "public"."chart_of_account_type" NOT NULL,
    "parent_id" uuid REFERENCES "public"."chart_of_accounts"("id") ON DELETE CASCADE,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "created_by" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chart_of_accounts_code_company_key" UNIQUE ("code", "company_id")
);

ALTER TABLE "public"."chart_of_accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage chart_of_accounts in their companies" ON "public"."chart_of_accounts"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- Modify existing tables to link to chart_of_accounts
ALTER TABLE "public"."accounts" ADD COLUMN "chart_of_account_id" uuid REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."safes" ADD COLUMN "chart_of_account_id" uuid REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."loans" ADD COLUMN "chart_of_account_id" uuid REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL;

-- Create warehouses table
CREATE TABLE IF NOT EXISTS "public"."warehouses" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "created_by" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."warehouses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage warehouses in their companies" ON "public"."warehouses"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- Add TRANSFER to movement_type constraint in stock_movements
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the check constraint for movement_type
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.stock_movements'::regclass
  AND contype = 'c';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.stock_movements DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_movement_type_check" CHECK (movement_type IN ('in', 'out', 'transfer'));

-- Add warehouse and account code columns to stock_movements
ALTER TABLE "public"."stock_movements" ADD COLUMN "source_warehouse_id" uuid REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;
ALTER TABLE "public"."stock_movements" ADD COLUMN "destination_warehouse_id" uuid REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;
ALTER TABLE "public"."stock_movements" ADD COLUMN "account_code" text;

-- Replace stock_categories with chart_of_accounts for stocks
ALTER TABLE "public"."stocks" DROP CONSTRAINT IF EXISTS "stocks_category_id_fkey";
ALTER TABLE "public"."stocks" RENAME COLUMN "category_id" TO "chart_of_account_id";
ALTER TABLE "public"."stocks" ADD CONSTRAINT "stocks_chart_of_account_id_fkey" FOREIGN KEY ("chart_of_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL;

-- Drop stock_categories table
DROP TABLE IF EXISTS "public"."stock_categories" CASCADE;

-- Create RPC function generate_next_account_code
CREATE OR REPLACE FUNCTION public.generate_next_account_code(p_company_id uuid, p_parent_code text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_latest_code text;
  v_next_num integer;
  v_next_code text;
BEGIN
  -- Get the highest code that starts with parent_code + '.'
  SELECT code INTO v_latest_code
  FROM public.chart_of_accounts
  WHERE company_id = p_company_id
    AND code LIKE p_parent_code || '.%'
  ORDER BY code DESC
  LIMIT 1;

  IF v_latest_code IS NULL THEN
    -- No children exist yet, start with .001
    v_next_code := p_parent_code || '.001';
  ELSE
    -- Extract the last part (e.g. from 150.01.005 -> 005)
    v_next_num := CAST(SUBSTRING(v_latest_code FROM '\.([0-9]+)$') AS integer) + 1;
    v_next_code := p_parent_code || '.' || LPAD(v_next_num::text, 3, '0');
  END IF;

  RETURN v_next_code;
END;
$$;
