-- Migration: step10_fixed_assets

-- 1. Create fixed_assets table
CREATE TABLE IF NOT EXISTS "public"."fixed_assets" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "chart_of_account_id" uuid NOT NULL REFERENCES "public"."chart_of_accounts"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "purchase_date" date NOT NULL,
    "purchase_price" numeric NOT NULL,
    "status" text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'DISPOSED')),
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "created_by" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."fixed_assets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage fixed_assets in their companies" ON "public"."fixed_assets"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- 2. Update generate_next_account_code with Gap Filling and p_type
DROP FUNCTION IF EXISTS public.generate_next_account_code(uuid, text);
CREATE OR REPLACE FUNCTION public.generate_next_account_code(p_company_id uuid, p_parent_code text, p_type text DEFAULT 'DETAIL')
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_pad integer;
  v_pattern text;
  v_next_num integer := 1;
  v_next_code text;
  v_existing_nums integer[];
  i integer;
BEGIN
  IF p_type = 'SUB' THEN
    v_pad := 2;
  ELSE
    v_pad := 3;
  END IF;

  v_pattern := p_parent_code || '.%';

  SELECT array_agg(CAST(SUBSTRING(code FROM '\.([0-9]+)$') AS integer) ORDER BY CAST(SUBSTRING(code FROM '\.([0-9]+)$') AS integer))
  INTO v_existing_nums
  FROM public.chart_of_accounts
  WHERE company_id = p_company_id
    AND code LIKE v_pattern
    AND code ~ ('^' || REPLACE(p_parent_code, '.', '\.') || '\.[0-9]{' || v_pad || '}$');

  IF v_existing_nums IS NOT NULL THEN
    FOR i IN 1..array_length(v_existing_nums, 1) LOOP
      IF v_existing_nums[i] = v_next_num THEN
        v_next_num := v_next_num + 1;
      ELSIF v_existing_nums[i] > v_next_num THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;

  v_next_code := p_parent_code || '.' || LPAD(v_next_num::text, v_pad, '0');
  
  RETURN v_next_code;
END;
$$;

-- 3. Create Asset Sale RPC
CREATE OR REPLACE FUNCTION public.process_asset_sale(
    p_company_id uuid,
    p_asset_id uuid,
    p_sale_price numeric,
    p_target_account_id uuid,
    p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_asset_record record;
    v_journal_id uuid;
    v_cost_price numeric;
    v_diff numeric;
    v_profit_loss_account_id uuid;
BEGIN
    SELECT * INTO v_asset_record FROM public.fixed_assets WHERE id = p_asset_id AND company_id = p_company_id AND status = 'ACTIVE';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Aktif varlık bulunamadı.';
    END IF;

    v_cost_price := v_asset_record.purchase_price;
    v_diff := p_sale_price - v_cost_price;

    INSERT INTO public.journal_entries (
        company_id, type, date, description, created_by
    ) VALUES (
        p_company_id, 'MANUAL'::public.journal_entry_type, CURRENT_DATE, v_asset_record.name || ' Satışı', p_created_by
    ) RETURNING id INTO v_journal_id;

    -- Target Account (Safe/Cari) - Debit
    INSERT INTO public.journal_entry_lines (
        journal_entry_id, chart_of_account_id, amount, is_debit
    ) VALUES (
        v_journal_id, p_target_account_id, p_sale_price, true
    );

    -- Asset Account - Credit
    INSERT INTO public.journal_entry_lines (
        journal_entry_id, chart_of_account_id, amount, is_debit
    ) VALUES (
        v_journal_id, v_asset_record.chart_of_account_id, v_cost_price, false
    );

    -- Profit/Loss handling
    IF v_diff > 0 THEN
        -- Profit -> 679 (Credit)
        SELECT id INTO v_profit_loss_account_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND code LIKE '679%' LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION '679 hesabı bulunamadı.'; END IF;
        
        INSERT INTO public.journal_entry_lines (
            journal_entry_id, chart_of_account_id, amount, is_debit
        ) VALUES (
            v_journal_id, v_profit_loss_account_id, v_diff, false
        );
    ELSIF v_diff < 0 THEN
        -- Loss -> 689 (Debit)
        SELECT id INTO v_profit_loss_account_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND code LIKE '689%' LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION '689 hesabı bulunamadı.'; END IF;

        INSERT INTO public.journal_entry_lines (
            journal_entry_id, chart_of_account_id, amount, is_debit
        ) VALUES (
            v_journal_id, v_profit_loss_account_id, ABS(v_diff), true
        );
    END IF;

    UPDATE public.fixed_assets SET status = 'SOLD' WHERE id = p_asset_id;

    RETURN v_journal_id;
END;
$$;
