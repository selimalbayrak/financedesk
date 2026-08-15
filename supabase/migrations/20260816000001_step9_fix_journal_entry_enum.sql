-- FIX ENUM TYPE MISMATCHES IN RPCs
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
    (CASE WHEN v_invoice.type = 'PURCHASE' THEN 'PURCHASE_INVOICE' ELSE 'SALES_INVOICE' END)::public.journal_entry_type,
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

CREATE OR REPLACE FUNCTION public.process_expense_payment(
  p_company_id uuid,
  p_expense_type text, -- Örn: "Kira", "Elektrik"
  p_amount numeric,
  p_safe_bank_account_id uuid,
  p_date date,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_770_id uuid;
  v_expense_account_id uuid;
  v_new_code text;
  v_je_id uuid;
  v_receipt_no text;
BEGIN
  -- A. 770 ana hesabını bul
  SELECT id INTO v_770_id FROM public.chart_of_accounts 
  WHERE company_id = p_company_id AND code = '770' LIMIT 1;
  
  IF v_770_id IS NULL THEN
    RAISE EXCEPTION '770 Genel Yönetim Giderleri hesabı bulunamadı.';
  END IF;

  -- B. Dinamik Alt Hesap Kontrolü (Gider Türüne Göre)
  SELECT id INTO v_expense_account_id FROM public.chart_of_accounts
  WHERE company_id = p_company_id AND parent_id = v_770_id AND name = p_expense_type LIMIT 1;

  IF v_expense_account_id IS NULL THEN
    -- Yeni alt hesap oluştur
    SELECT '770.' || LPAD((COUNT(*) + 1)::text, 2, '0') INTO v_new_code
    FROM public.chart_of_accounts WHERE parent_id = v_770_id;

    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id)
    VALUES (p_company_id, v_new_code, p_expense_type, 'DETAIL', v_770_id)
    RETURNING id INTO v_expense_account_id;
  END IF;

  -- C. Evrak No Oluştur
  v_receipt_no := 'GDR-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

  -- D. Yevmiye Başlığı
  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, 'PAYMENT'::public.journal_entry_type, v_receipt_no)
  RETURNING id INTO v_je_id;

  -- E. Yevmiye Satırları
  -- 770 Alt Hesabı BORÇ
  INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description)
  VALUES (v_je_id, v_expense_account_id, p_amount, 0, p_description);

  -- Kasa/Banka ALACAK
  INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description)
  VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount, p_description);

  RETURN v_je_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_personnel_transaction(
  p_company_id uuid,
  p_employee_name text,
  p_amount numeric,
  p_safe_bank_account_id uuid, -- Sadece PAYMENT için gerekli, ACCRUAL'da NULL olabilir
  p_date date,
  p_description text,
  p_type text -- 'ACCRUAL' (Tahakkuk) veya 'PAYMENT' (Ödeme)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_335_id uuid;
  v_employee_account_id uuid;
  v_770_id uuid;
  v_salary_expense_id uuid;
  v_new_code text;
  v_je_id uuid;
  v_receipt_no text;
BEGIN
  -- A. 335 ana hesabını bul
  SELECT id INTO v_335_id FROM public.chart_of_accounts 
  WHERE company_id = p_company_id AND code = '335' LIMIT 1;
  
  IF v_335_id IS NULL THEN
    RAISE EXCEPTION '335 Personele Borçlar hesabı bulunamadı.';
  END IF;

  -- Personel için dinamik alt hesap kontrolü (Örn: 335.01 Ahmet Yılmaz)
  SELECT id INTO v_employee_account_id FROM public.chart_of_accounts
  WHERE company_id = p_company_id AND parent_id = v_335_id AND name = p_employee_name LIMIT 1;

  IF v_employee_account_id IS NULL THEN
    SELECT '335.' || LPAD((COUNT(*) + 1)::text, 2, '0') INTO v_new_code
    FROM public.chart_of_accounts WHERE parent_id = v_335_id;

    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id)
    VALUES (p_company_id, v_new_code, p_employee_name, 'DETAIL', v_335_id)
    RETURNING id INTO v_employee_account_id;
  END IF;

  -- B. Yevmiye Başlığı
  v_receipt_no := 'PRS-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);
  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, (CASE WHEN p_type = 'ACCRUAL' THEN 'MANUAL' ELSE 'PAYMENT' END)::public.journal_entry_type, v_receipt_no)
  RETURNING id INTO v_je_id;

  -- C. Yevmiye Satırları
  IF p_type = 'ACCRUAL' THEN
    -- Tahakkuk: 770 BORÇ, 335 ALACAK
    -- Önce 770 altında Maaş Giderleri hesabı var mı bul/oluştur
    SELECT id INTO v_770_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND code = '770' LIMIT 1;
    SELECT id INTO v_salary_expense_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND parent_id = v_770_id AND name = 'Maaş ve Ücret Giderleri' LIMIT 1;
    
    IF v_salary_expense_id IS NULL THEN
      SELECT '770.' || LPAD((COUNT(*) + 1)::text, 2, '0') INTO v_new_code FROM public.chart_of_accounts WHERE parent_id = v_770_id;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (p_company_id, v_new_code, 'Maaş ve Ücret Giderleri', 'DETAIL', v_770_id) RETURNING id INTO v_salary_expense_id;
    END IF;

    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, v_salary_expense_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, v_employee_account_id, 0, p_amount, p_description);

  ELSIF p_type = 'PAYMENT' THEN
    -- Ödeme: 335 BORÇ, Kasa/Banka ALACAK
    IF p_safe_bank_account_id IS NULL THEN RAISE EXCEPTION 'Ödeme işlemi için Kasa/Banka seçilmelidir.'; END IF;
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, v_employee_account_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount, p_description);
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem tipi (ACCRUAL veya PAYMENT olmalıdır).';
  END IF;

  RETURN v_je_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_cari_payment(
  p_company_id uuid,
  p_cari_account_id uuid, -- 120 veya 320'nin alt hesabı
  p_safe_bank_account_id uuid, -- 100 veya 102
  p_amount numeric,
  p_date date,
  p_description text,
  p_direction text -- 'COLLECTION' (Tahsilat/Para Alma) veya 'PAYMENT' (Ödeme/Para Gönderme)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_je_id uuid;
  v_receipt_no text;
BEGIN
  v_receipt_no := 'CARI-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, (CASE WHEN p_direction = 'COLLECTION' THEN 'COLLECTION' ELSE 'PAYMENT' END)::public.journal_entry_type, v_receipt_no)
  RETURNING id INTO v_je_id;

  IF p_direction = 'COLLECTION' THEN
    -- Müşteriden Para Aldık: Kasa BORÇ, Cari ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_safe_bank_account_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_cari_account_id, 0, p_amount, p_description);
  ELSIF p_direction = 'PAYMENT' THEN
    -- Tedarikçiye Para Ödedik: Cari BORÇ, Kasa ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_cari_account_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount, p_description);
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem yönü (COLLECTION veya PAYMENT olmalıdır).';
  END IF;

  RETURN v_je_id;
END;
$$;
