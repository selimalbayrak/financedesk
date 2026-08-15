-- Migration: step5_invoices_journals

-- 1. Create Enums
CREATE TYPE "public"."journal_entry_type" AS ENUM ('PURCHASE_INVOICE', 'SALES_INVOICE', 'PAYMENT', 'COLLECTION', 'TRANSFER', 'MANUAL');
CREATE TYPE "public"."invoice_type" AS ENUM ('PURCHASE', 'SALES');
CREATE TYPE "public"."invoice_status" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- 2. Create journal_entries table
CREATE TABLE IF NOT EXISTS "public"."journal_entries" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "date" date NOT NULL,
    "description" text NOT NULL,
    "receipt_no" text,
    "type" "public"."journal_entry_type" NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "created_by" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."journal_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage journal_entries in their companies" ON "public"."journal_entries"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- 3. Create journal_entry_lines table
CREATE TABLE IF NOT EXISTS "public"."journal_entry_lines" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "journal_entry_id" uuid NOT NULL REFERENCES "public"."journal_entries"("id") ON DELETE CASCADE,
    "chart_of_account_id" uuid NOT NULL REFERENCES "public"."chart_of_accounts"("id") ON DELETE CASCADE,
    "debit" numeric(15,2) NOT NULL DEFAULT 0,
    "credit" numeric(15,2) NOT NULL DEFAULT 0,
    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."journal_entry_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage journal_entry_lines in their companies" ON "public"."journal_entry_lines"
  FOR ALL USING (
    "journal_entry_id" IN (SELECT "id" FROM "public"."journal_entries" WHERE "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid()))
  );

-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "company_id" uuid NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "account_id" uuid NOT NULL REFERENCES "public"."accounts"("id") ON DELETE CASCADE,
    "type" "public"."invoice_type" NOT NULL,
    "invoice_number" text NOT NULL,
    "issue_date" date NOT NULL,
    "due_date" date,
    "ettn" uuid,
    "tax_number" text,
    "tax_office" text,
    "total_amount" numeric(15,2) NOT NULL DEFAULT 0,
    "tax_amount" numeric(15,2) NOT NULL DEFAULT 0,
    "grand_total" numeric(15,2) NOT NULL DEFAULT 0,
    "status" "public"."invoice_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    "created_by" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage invoices in their companies" ON "public"."invoices"
  FOR ALL USING (
    "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid())
  );

-- Immutability rule for APPROVED invoices
CREATE OR REPLACE FUNCTION public.check_invoice_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'APPROVED' THEN
    RAISE EXCEPTION 'Onaylanmış (APPROVED) bir fatura değiştirilemez veya silinemez!';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_immutable
BEFORE UPDATE OR DELETE ON "public"."invoices"
FOR EACH ROW
EXECUTE FUNCTION public.check_invoice_immutable();

-- 5. Create invoice_items table
CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "invoice_id" uuid NOT NULL REFERENCES "public"."invoices"("id") ON DELETE CASCADE,
    "stock_id" uuid NOT NULL REFERENCES "public"."stocks"("id") ON DELETE CASCADE,
    "quantity" numeric(15,3) NOT NULL,
    "unit_price" numeric(15,2) NOT NULL,
    "tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
    "total" numeric(15,2) NOT NULL,
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage invoice_items in their companies" ON "public"."invoice_items"
  FOR ALL USING (
    "invoice_id" IN (SELECT "id" FROM "public"."invoices" WHERE "company_id" IN (SELECT "company_id" FROM "public"."company_users" WHERE "user_id" = auth.uid()))
  );

-- Immutability rule for invoice items linked to APPROVED invoices
CREATE OR REPLACE FUNCTION public.check_invoice_item_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.invoice_status;
BEGIN
  -- For UPDATE/DELETE use OLD.invoice_id, for INSERT use NEW.invoice_id
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = OLD.invoice_id;
  ELSE
    SELECT status INTO v_status FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;

  IF v_status = 'APPROVED' THEN
    RAISE EXCEPTION 'Onaylanmış (APPROVED) bir faturanın kalemleri değiştirilemez, eklenemez veya silinemez!';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_item_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "public"."invoice_items"
FOR EACH ROW
EXECUTE FUNCTION public.check_invoice_item_immutable();

-- 6. RPC Function for Approving Invoice
CREATE OR REPLACE FUNCTION public.approve_invoice(p_invoice_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice record;
  v_item record;
  v_journal_id uuid;
  v_coa_customer_supplier uuid;
  v_coa_vat uuid;
  v_coa_sales uuid;
  v_coa_stock uuid;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
BEGIN
  -- 1. Get invoice details
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'Fatura bulunamadı!';
  END IF;

  IF v_invoice.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Sadece DRAFT (Taslak) durumundaki faturalar onaylanabilir!';
  END IF;

  -- 2. Get Customer/Supplier COA
  SELECT chart_of_account_id INTO v_coa_customer_supplier 
  FROM public.accounts WHERE id = v_invoice.account_id;

  IF v_coa_customer_supplier IS NULL THEN
    RAISE EXCEPTION 'Cari hesabın muhasebe kodu (chart_of_account_id) eksik!';
  END IF;

  -- 3. Create Journal Entry
  INSERT INTO public.journal_entries (company_id, date, description, receipt_no, type, created_by)
  VALUES (
    v_invoice.company_id, 
    v_invoice.issue_date, 
    CASE WHEN v_invoice.type = 'PURCHASE' THEN 'Alış Faturası: ' || v_invoice.invoice_number ELSE 'Satış Faturası: ' || v_invoice.invoice_number END, 
    v_invoice.invoice_number,
    CASE WHEN v_invoice.type = 'PURCHASE' THEN 'PURCHASE_INVOICE'::public.journal_entry_type ELSE 'SALES_INVOICE'::public.journal_entry_type END,
    p_user_id
  ) RETURNING id INTO v_journal_id;

  -- 4. Process based on type
  IF v_invoice.type = 'PURCHASE' THEN
    -- Get VAT Account (191)
    SELECT id INTO v_coa_vat FROM public.chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND code LIKE '191%' AND is_active = true 
    ORDER BY code ASC LIMIT 1;
    
    IF v_coa_vat IS NULL THEN RAISE EXCEPTION '191 (İndirilecek KDV) hesabı bulunamadı!'; END IF;

    -- Process Items
    FOR v_item IN SELECT * FROM public.invoice_items WHERE invoice_id = p_invoice_id LOOP
      -- Get Stock COA (153 or similar)
      SELECT chart_of_account_id INTO v_coa_stock FROM public.stocks WHERE id = v_item.stock_id;
      IF v_coa_stock IS NULL THEN RAISE EXCEPTION 'Stoğun muhasebe kodu eksik! Stock ID: %', v_item.stock_id; END IF;
      
      -- Debit Stock
      INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit)
      VALUES (v_journal_id, v_coa_stock, v_item.total, 0);
      v_total_debit := v_total_debit + v_item.total;

      -- Stock Movement (IN)
      INSERT INTO public.stock_movements (company_id, stock_id, movement_type, quantity, unit_price, notes, created_by)
      VALUES (v_invoice.company_id, v_item.stock_id, 'in', v_item.quantity, v_item.unit_price, 'Alış Faturası: ' || v_invoice.invoice_number, p_user_id);
      
      -- Update stock quantity_on_hand
      UPDATE public.stocks SET quantity_on_hand = quantity_on_hand + v_item.quantity WHERE id = v_item.stock_id;
    END LOOP;

    -- Debit VAT
    IF v_invoice.tax_amount > 0 THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit)
      VALUES (v_journal_id, v_coa_vat, v_invoice.tax_amount, 0);
      v_total_debit := v_total_debit + v_invoice.tax_amount;
    END IF;

    -- Credit Supplier
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit)
    VALUES (v_journal_id, v_coa_customer_supplier, 0, v_invoice.grand_total);
    v_total_credit := v_total_credit + v_invoice.grand_total;

  ELSEIF v_invoice.type = 'SALES' THEN
    -- Get VAT Account (391)
    SELECT id INTO v_coa_vat FROM public.chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND code LIKE '391%' AND is_active = true
    ORDER BY code ASC LIMIT 1;
    IF v_coa_vat IS NULL THEN RAISE EXCEPTION '391 (Hesaplanan KDV) hesabı bulunamadı!'; END IF;

    -- Get Sales Account (600)
    SELECT id INTO v_coa_sales FROM public.chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND code LIKE '600%' AND is_active = true
    ORDER BY code ASC LIMIT 1;
    IF v_coa_sales IS NULL THEN RAISE EXCEPTION '600 (Yurtiçi Satışlar) hesabı bulunamadı!'; END IF;

    -- Debit Customer
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit)
    VALUES (v_journal_id, v_coa_customer_supplier, v_invoice.grand_total, 0);
    v_total_debit := v_total_debit + v_invoice.grand_total;

    -- Process Items for stock movements (No SMM logic for Sales as per user)
    FOR v_item IN SELECT * FROM public.invoice_items WHERE invoice_id = p_invoice_id LOOP
      -- Stock Movement (OUT)
      INSERT INTO public.stock_movements (company_id, stock_id, movement_type, quantity, unit_price, notes, created_by)
      VALUES (v_invoice.company_id, v_item.stock_id, 'out', v_item.quantity, v_item.unit_price, 'Satış Faturası: ' || v_invoice.invoice_number, p_user_id);
      
      -- Update stock quantity_on_hand
      UPDATE public.stocks SET quantity_on_hand = quantity_on_hand - v_item.quantity WHERE id = v_item.stock_id;
    END LOOP;

    -- Credit Sales (Subtotal)
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit)
    VALUES (v_journal_id, v_coa_sales, 0, v_invoice.total_amount);
    v_total_credit := v_total_credit + v_invoice.total_amount;

    -- Credit VAT
    IF v_invoice.tax_amount > 0 THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit)
      VALUES (v_journal_id, v_coa_vat, 0, v_invoice.tax_amount);
      v_total_credit := v_total_credit + v_invoice.tax_amount;
    END IF;

  END IF;

  -- 5. Check Double-Entry rule
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Double-entry kuralı ihlali! Borç (%) ve Alacak (%) toplamları eşit değil.', v_total_debit, v_total_credit;
  END IF;

  -- 6. Update Invoice Status to APPROVED
  -- Temporarily disable trigger check by updating directly
  ALTER TABLE "public"."invoices" DISABLE TRIGGER trg_invoice_immutable;
  UPDATE public.invoices SET status = 'APPROVED' WHERE id = p_invoice_id;
  ALTER TABLE "public"."invoices" ENABLE TRIGGER trg_invoice_immutable;

END;
$$;
